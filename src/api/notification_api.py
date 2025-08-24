"""
Notification API endpoints for Flask portal server
Integrates with the notification service and WebSocket broadcasting
"""

from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional

from services.notification_service import (
    notification_service, 
    NotificationType, 
    NotificationPriority,
    NotificationChannel,
    NotificationPreferences
)

# Create blueprint for notification routes
notification_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

def get_current_user():
    """Get current user from session or headers"""
    # Check session first
    if 'user_id' in session and 'user_type' in session:
        return {
            'user_id': session['user_id'],
            'user_type': session['user_type']
        }
    
    # Check headers for API access
    user_id = request.headers.get('X-User-ID')
    user_type = request.headers.get('X-User-Type', 'customer')
    
    if user_id:
        return {
            'user_id': user_id,
            'user_type': user_type
        }
    
    return None

@notification_bp.route('/list', methods=['GET'])
@cross_origin()
def get_notifications():
    """Get notifications for current user"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    limit = int(request.args.get('limit', 50))
    unread_only = request.args.get('unread_only', '').lower() == 'true'
    
    try:
        notifications = notification_service.get_notifications(
            user['user_id'], 
            user['user_type'], 
            limit, 
            unread_only
        )
        
        return jsonify({
            'success': True,
            'data': {
                'notifications': notifications,
                'count': len(notifications),
                'unread_count': len([n for n in notifications if not n['read']])
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/unread-count', methods=['GET'])
@cross_origin()
def get_unread_count():
    """Get count of unread notifications"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        notifications = notification_service.get_notifications(
            user['user_id'], 
            user['user_type'], 
            100,  # Get more to count accurately
            unread_only=True
        )
        
        return jsonify({
            'success': True,
            'data': {
                'unread_count': len(notifications)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/<notification_id>/read', methods=['POST'])
@cross_origin()
def mark_notification_read(notification_id):
    """Mark notification as read"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        success = notification_service.mark_as_read(notification_id, user['user_id'])
        
        if success:
            return jsonify({'success': True, 'message': 'Notification marked as read'})
        else:
            return jsonify({'error': 'Failed to mark notification as read'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/mark-all-read', methods=['POST'])
@cross_origin()
def mark_all_read():
    """Mark all notifications as read for user"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get all unread notifications and mark them as read
        unread_notifications = notification_service.get_notifications(
            user['user_id'], 
            user['user_type'], 
            100,
            unread_only=True
        )
        
        marked_count = 0
        for notification in unread_notifications:
            if notification_service.mark_as_read(notification['id'], user['user_id']):
                marked_count += 1
        
        return jsonify({
            'success': True, 
            'message': f'Marked {marked_count} notifications as read'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/preferences', methods=['GET'])
@cross_origin()
def get_preferences():
    """Get user notification preferences"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        preferences = notification_service.get_preferences(user['user_id'], user['user_type'])
        
        if not preferences:
            # Create default preferences
            default_prefs = notification_service.create_default_preferences(
                user['user_id'], user['user_type']
            )
            preferences = notification_service.get_preferences(user['user_id'], user['user_type'])
        
        return jsonify({
            'success': True,
            'data': preferences
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/preferences', methods=['POST'])
@cross_origin()
def update_preferences():
    """Update user notification preferences"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        
        # Convert string values back to enums
        channels = {}
        for type_str, channel_list in data.get('channels', {}).items():
            try:
                notification_type = NotificationType(type_str)
                channels[notification_type] = [NotificationChannel(ch) for ch in channel_list]
            except ValueError:
                continue
        
        frequency_limits = {}
        for type_str, limit in data.get('frequency_limits', {}).items():
            try:
                notification_type = NotificationType(type_str)
                frequency_limits[notification_type] = int(limit)
            except ValueError:
                continue
        
        preferences = NotificationPreferences(
            user_id=user['user_id'],
            user_type=user['user_type'],
            channels=channels,
            quiet_hours=data.get('quiet_hours', {}),
            frequency_limits=frequency_limits,
            enabled=data.get('enabled', True),
            created_at=data.get('created_at', datetime.now().isoformat()),
            updated_at=datetime.now().isoformat()
        )
        
        success = notification_service.save_preferences(preferences)
        
        if success:
            return jsonify({'success': True, 'message': 'Preferences updated successfully'})
        else:
            return jsonify({'error': 'Failed to update preferences'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/create', methods=['POST'])
@cross_origin()
def create_notification():
    """Create new notification (admin only)"""
    user = get_current_user()
    if not user or user['user_type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['target_user_id', 'target_user_type', 'type', 'priority']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Convert string values to enums
        try:
            notification_type = NotificationType(data['type'])
            priority = NotificationPriority(data['priority'])
        except ValueError as e:
            return jsonify({'error': f'Invalid enum value: {e}'}), 400
        
        # Create notification
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        notification = loop.run_until_complete(
            notification_service.create_notification(
                user_id=data['target_user_id'],
                user_type=data['target_user_type'],
                notification_type=notification_type,
                priority=priority,
                metadata=data.get('metadata', {}),
                custom_title=data.get('title'),
                custom_message=data.get('message'),
                expires_in_hours=data.get('expires_in_hours', 24)
            )
        )
        
        loop.close()
        
        if notification:
            return jsonify({
                'success': True,
                'message': 'Notification created successfully',
                'notification_id': notification.id
            })
        else:
            return jsonify({'error': 'Failed to create notification'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/broadcast', methods=['POST'])
@cross_origin()
def broadcast_notification():
    """Broadcast notification to all users of a type (admin only)"""
    user = get_current_user()
    if not user or user['user_type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['target_user_type', 'type', 'priority', 'title', 'message']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Convert string values to enums
        try:
            notification_type = NotificationType(data['type'])
            priority = NotificationPriority(data['priority'])
        except ValueError as e:
            return jsonify({'error': f'Invalid enum value: {e}'}), 400
        
        # This would need integration with your user database to get all users
        # For now, return a success message
        return jsonify({
            'success': True,
            'message': 'Broadcast notification queued',
            'target_type': data['target_user_type']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/test', methods=['POST'])
@cross_origin()
def test_notification():
    """Create test notification for current user"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        notification = loop.run_until_complete(
            notification_service.create_notification(
                user_id=user['user_id'],
                user_type=user['user_type'],
                notification_type=NotificationType.SYSTEM_UPDATE,
                priority=NotificationPriority.MEDIUM,
                custom_title="Test Notification",
                custom_message="This is a test notification to verify the system is working correctly.",
                metadata={'test': True, 'created_by': 'notification_api'},
                expires_in_hours=1
            )
        )
        
        loop.close()
        
        if notification:
            return jsonify({
                'success': True,
                'message': 'Test notification created successfully',
                'notification': {
                    'id': notification.id,
                    'title': notification.title,
                    'message': notification.message,
                    'type': notification.type.value,
                    'priority': notification.priority.value
                }
            })
        else:
            return jsonify({'error': 'Failed to create test notification'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notification_bp.route('/stats', methods=['GET'])
@cross_origin()
def get_notification_stats():
    """Get notification statistics (admin only)"""
    user = get_current_user()
    if not user or user['user_type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        # This would query the database for statistics
        # For now, return mock data
        stats = {
            'total_notifications': 1547,
            'unread_notifications': 89,
            'delivery_rate': 98.5,
            'channel_breakdown': {
                'web': 1200,
                'telegram': 800,
                'email': 600,
                'push': 200,
                'sms': 50
            },
            'type_breakdown': {
                'transaction': 650,
                'balance_update': 400,
                'security_alert': 100,
                'system_update': 150,
                'member_request': 75,
                'trade_signal': 120,
                'maintenance': 30,
                'account_update': 22
            }
        }
        
        return jsonify({
            'success': True,
            'data': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# WebSocket integration function
def broadcast_notification_websocket(notification_data: Dict, user_id: str, user_type: str):
    """
    Broadcast notification via WebSocket
    This should be called by the notification service
    """
    # This would integrate with your existing WebSocket server
    payload = {
        'type': 'notification',
        'event': 'new_notification',
        'data': notification_data,
        'timestamp': datetime.now().isoformat()
    }
    
    # TODO: Send payload to specific user via WebSocket
    print(f"WebSocket broadcast to {user_type}:{user_id}: {payload}")

def register_notification_api(app):
    """Register notification blueprint with Flask app"""
    app.register_blueprint(notification_bp)
    
    # Also register WebSocket handlers if available
    if hasattr(app, 'socketio'):
        register_socketio_handlers(app.socketio)

def register_socketio_handlers(socketio):
    """Register Socket.IO handlers for notifications"""
    
    @socketio.on('join_notifications')
    def handle_join_notifications(data):
        """Join user to their notification room"""
        user_id = data.get('user_id')
        user_type = data.get('user_type')
        
        if user_id and user_type:
            room = f"notifications_{user_type}_{user_id}"
            socketio.join_room(room)
            socketio.emit('notification_status', {
                'status': 'connected',
                'room': room
            })
    
    @socketio.on('mark_notification_read')
    def handle_mark_read(data):
        """Handle marking notification as read via WebSocket"""
        notification_id = data.get('notification_id')
        user_id = data.get('user_id')
        
        if notification_id and user_id:
            success = notification_service.mark_as_read(notification_id, user_id)
            socketio.emit('notification_read_response', {
                'notification_id': notification_id,
                'success': success
            })