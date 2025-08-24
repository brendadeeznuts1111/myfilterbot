#!/usr/bin/env python3
"""
Enhanced Portal Server with WebSocket Support
Provides real-time updates and full API integration
"""

from flask import Flask, send_file, jsonify, request, make_response, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import os
import jwt
import hashlib
from datetime import datetime, timedelta
from functools import wraps
import sys
from pathlib import Path
import asyncio
import threading

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database import db, GroupMember, Customer, Transaction
from src.config import config

# Import Telegram dashboard components
from src.telegram_dashboard.message_streamer import TelegramMessageStreamer
from src.telegram_dashboard.group_monitor import TelegramGroupMonitor  
from src.telegram_dashboard.bot_status import TelegramBotMonitor
from src.telegram_dashboard.admin_interface import TelegramAdminInterface

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# JWT configuration
JWT_SECRET = 'your-jwt-secret-change-in-production'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Active WebSocket connections
active_connections = {}

# Initialize Telegram dashboard components
telegram_streamer = None
telegram_monitor = None
bot_monitor = None
admin_interface = None

def initialize_telegram_components():
    """Initialize Telegram dashboard components"""
    global telegram_streamer, telegram_monitor, bot_monitor, admin_interface
    
    try:
        # Initialize components
        telegram_streamer = TelegramMessageStreamer(config.token, config.admin_chat_id)
        telegram_monitor = TelegramGroupMonitor(config.token)
        bot_monitor = TelegramBotMonitor(config.token, config.admin_chat_id)
        admin_interface = TelegramAdminInterface(config.token, config.admin_chat_id)
        
        # Integrate components
        admin_interface.integrate_components(telegram_streamer, telegram_monitor, bot_monitor)
        
        # Set up message streaming callback for WebSocket
        def on_new_message(message_data):
            socketio.emit('telegram_message', message_data, namespace='/telegram')
        
        telegram_streamer.subscribe(on_new_message)
        
        print("Telegram dashboard components initialized successfully")
        return True
        
    except Exception as e:
        print(f"Error initializing Telegram components: {e}")
        return False

def generate_token(user_data):
    """Generate JWT token for authentication"""
    payload = {
        'user_id': user_data.get('customer_id'),
        'type': user_data.get('type', 'customer'),
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator for routes that require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.user = payload
        return f(*args, **kwargs)
    
    return decorated_function

def add_ngrok_headers(response):
    """Add headers to bypass ngrok warning page"""
    response.headers['ngrok-skip-browser-warning'] = 'true'
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.after_request
def after_request(response):
    """Apply ngrok headers to all responses"""
    return add_ngrok_headers(response)

# ============= Static File Routes =============

@app.route('/')
def serve_portal():
    """Serve the enhanced customer portal"""
    try:
        response = make_response(send_file('enhanced_customer_portal.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/admin')
def serve_admin_portal():
    """Serve the enhanced admin portal"""
    try:
        # Try ultimate version first, then enhanced, then basic
        try:
            response = make_response(send_file('admin_portal_ultimate.html'))
        except:
            try:
                response = make_response(send_file('enhanced_admin_portal.html'))
            except:
                response = make_response(send_file('admin_portal.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/cashier')
def serve_cashier_dashboard():
    """Serve the branded enhanced cashier dashboard"""
    try:
        response = make_response(send_file('admin_cashier_dashboard_branded.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        # Fallback to enhanced version
        try:
            response = make_response(send_file('admin_cashier_dashboard_enhanced.html'))
            return add_ngrok_headers(response)
        except:
            return jsonify({'error': str(e)}), 404

# ============= Branding Assets Routes =============

@app.route('/src/branding/<path:filename>')
def serve_branding_assets(filename):
    """Serve branding system assets"""
    try:
        file_path = f'src/branding/{filename}'
        response = make_response(send_file(file_path))
        
        # Set appropriate content type
        if filename.endswith('.css'):
            response.headers['Content-Type'] = 'text/css'
        elif filename.endswith('.js'):
            response.headers['Content-Type'] = 'application/javascript'
        elif filename.endswith('.json'):
            response.headers['Content-Type'] = 'application/json'
        
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': f'Branding asset not found: {filename}'}), 404

@app.route('/branding/core/metadata.json')
def serve_metadata():
    """Serve system metadata for branding system"""
    try:
        response = make_response(send_file('src/branding/core/metadata.json'))
        response.headers['Content-Type'] = 'application/json'
        return add_ngrok_headers(response)
    except Exception as e:
        # Fallback metadata
        metadata = {
            "system": {
                "name": "Fantdev Trading Bot",
                "version": "2.1.0-enhanced",
                "build": "2024.08.24.002",
                "environment": "development",
                "api_version": "3.2.1"
            },
            "company": {
                "name": "Fantdev Trading Systems",
                "display_name": "Fantdev Trading"
            },
            "branding": {
                "logo_text": "Fantdev Trading",
                "logo_icon": "fas fa-shield-alt",
                "theme_color": "#667eea"
            },
            "deployment": {
                "server_urls": {
                    "enhanced_portal": "http://localhost:5000",
                    "payment_api": "http://localhost:5001"
                }
            }
        }
        response = make_response(jsonify(metadata))
        return add_ngrok_headers(response)

# ============= Authentication Routes =============

@app.route('/api/login', methods=['POST'])
def login():
    """Customer login endpoint with JWT token"""
    try:
        data = request.json
        customer_id = data.get('customer_id', '').upper()
        password = data.get('password', '').upper()
        
        # Get customer from database
        customer = db.get_customer(customer_id)
        
        if not customer:
            return jsonify({'success': False, 'error': 'Customer ID not found'}), 401
        
        if customer.password != password:
            return jsonify({'success': False, 'error': 'Invalid password'}), 401
        
        # Generate JWT token
        token = generate_token({
            'customer_id': customer.customer_id,
            'type': 'customer'
        })
        
        # Update last activity
        customer.last_activity = datetime.now().isoformat()
        db.save()
        
        # Return customer data with token
        return jsonify({
            'success': True,
            'token': token,
            'customer': {
                'customer_id': customer.customer_id,
                'balance': customer.balance,
                'weekly_pnl': customer.weekly_pnl,
                'active': customer.active,
                'registered': customer.telegram_id is not None,
                'phone': customer.phone,
                'telegram_username': customer.telegram_username
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        # Simple admin authentication (enhance this in production)
        if username == 'admin' and password == 'admin123':
            token = generate_token({
                'user_id': 'admin',
                'type': 'admin'
            })
            
            return jsonify({
                'success': True,
                'token': token,
                'user': {
                    'username': 'admin',
                    'role': 'administrator'
                }
            })
        
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============= Customer API Routes =============

@app.route('/api/customer/<customer_id>')
@require_auth
def get_customer_data(customer_id):
    """Get customer data and statistics"""
    try:
        # Verify customer can only access their own data
        if request.user['type'] == 'customer' and request.user['user_id'] != customer_id.upper():
            return jsonify({'error': 'Unauthorized'}), 403
        
        customer = db.get_customer(customer_id.upper())
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Get transactions
        transactions = db.get_customer_transactions(customer_id)
        
        # Calculate statistics
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Daily stats
        daily_transactions = [
            t for t in transactions 
            if datetime.fromisoformat(t.timestamp).date() == today
        ]
        
        # Weekly stats
        weekly_transactions = [
            t for t in transactions 
            if datetime.fromisoformat(t.timestamp).date() >= week_ago
        ]
        
        # Calculate metrics
        daily_volume = sum(t.amount for t in daily_transactions if t.amount)
        weekly_volume = sum(t.amount for t in weekly_transactions if t.amount)
        
        wins = len([t for t in weekly_transactions if t.type == 'deposit'])
        losses = len([t for t in weekly_transactions if t.type == 'withdrawal'])
        win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0
        
        return jsonify({
            'customer': {
                'customer_id': customer.customer_id,
                'balance': customer.balance,
                'weekly_pnl': customer.weekly_pnl,
                'active': customer.active,
                'registered': customer.telegram_id is not None
            },
            'statistics': {
                'daily_volume': daily_volume,
                'weekly_volume': weekly_volume,
                'win_rate': round(win_rate, 2),
                'total_trades': len(weekly_transactions),
                'wins': wins,
                'losses': losses
            },
            'recent_transactions': [
                {
                    'timestamp': t.timestamp,
                    'type': t.type,
                    'amount': t.amount,
                    'status': t.status
                } for t in transactions[:10]
            ]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/customer/<customer_id>/transactions')
@require_auth
def get_customer_transactions(customer_id):
    """Get customer transaction history"""
    try:
        # Verify authorization
        if request.user['type'] == 'customer' and request.user['user_id'] != customer_id.upper():
            return jsonify({'error': 'Unauthorized'}), 403
        
        transactions = db.get_customer_transactions(customer_id.upper())
        
        # Apply filters
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        type_filter = request.args.get('type')
        
        if type_filter:
            transactions = [t for t in transactions if t.type == type_filter]
        
        # Paginate
        total = len(transactions)
        transactions = transactions[offset:offset + limit]
        
        return jsonify({
            'transactions': [
                {
                    'timestamp': t.timestamp,
                    'type': t.type,
                    'amount': t.amount,
                    'message': t.message,
                    'status': t.status
                } for t in transactions
            ],
            'pagination': {
                'total': total,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= Admin API Routes =============

@app.route('/api/admin/statistics')
@require_auth
def get_admin_statistics():
    """Get admin dashboard statistics"""
    try:
        if request.user['type'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        stats = db.get_statistics()
        members = db.get_group_members()
        
        # Calculate member statistics
        pending_members = [m for m in members if m.status == 'pending']
        approved_members = [m for m in members if m.status == 'approved']
        denied_members = [m for m in members if m.status == 'denied']
        
        return jsonify({
            'customers': stats,
            'members': {
                'total': len(members),
                'pending': len(pending_members),
                'approved': len(approved_members),
                'denied': len(denied_members),
                'groups': len(set(m.group_id for m in members))
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/members')
@require_auth
def get_members():
    """Get all group members"""
    try:
        if request.user['type'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        members = db.get_group_members()
        
        # Apply filters
        status_filter = request.args.get('status')
        group_filter = request.args.get('group_id')
        search = request.args.get('search', '').lower()
        
        if status_filter:
            members = [m for m in members if m.status == status_filter]
        
        if group_filter:
            members = [m for m in members if str(m.group_id) == group_filter]
        
        if search:
            members = [
                m for m in members 
                if search in m.username.lower() or search in m.group_name.lower()
            ]
        
        return jsonify({
            'members': [
                {
                    'telegram_id': m.telegram_id,
                    'username': m.username,
                    'group_id': m.group_id,
                    'group_name': m.group_name,
                    'join_date': m.join_date,
                    'status': m.status,
                    'customer_id': m.customer_id,
                    'permissions': m.permissions
                } for m in members
            ]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/members/<int:telegram_id>/approve', methods=['POST'])
@require_auth
def approve_member(telegram_id):
    """Approve a group member"""
    try:
        if request.user['type'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.json
        group_id = data.get('group_id')
        permissions = data.get('permissions', {})
        customer_id = data.get('customer_id')
        
        member = db.get_member(group_id, telegram_id)
        if not member:
            return jsonify({'error': 'Member not found'}), 404
        
        # Update member status
        member.status = 'approved'
        member.permissions = permissions
        if customer_id:
            member.customer_id = customer_id
        
        db.save()
        
        # Emit WebSocket event
        socketio.emit('member_approved', {
            'telegram_id': telegram_id,
            'username': member.username,
            'group_name': member.group_name
        }, room='admin')
        
        return jsonify({'success': True, 'message': 'Member approved'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/members/<int:telegram_id>/deny', methods=['POST'])
@require_auth
def deny_member(telegram_id):
    """Deny a group member"""
    try:
        if request.user['type'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.json
        group_id = data.get('group_id')
        reason = data.get('reason', '')
        
        member = db.get_member(group_id, telegram_id)
        if not member:
            return jsonify({'error': 'Member not found'}), 404
        
        # Update member status
        member.status = 'denied'
        member.permissions['deny_reason'] = reason
        
        db.save()
        
        # Emit WebSocket event
        socketio.emit('member_denied', {
            'telegram_id': telegram_id,
            'username': member.username,
            'reason': reason
        }, room='admin')
        
        return jsonify({'success': True, 'message': 'Member denied'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= WebSocket Events =============

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    print(f"Client connected: {request.sid}")
    active_connections[request.sid] = {
        'connected_at': datetime.now().isoformat()
    }

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    print(f"Client disconnected: {request.sid}")
    if request.sid in active_connections:
        del active_connections[request.sid]

@socketio.on('authenticate')
def handle_authenticate(data):
    """Authenticate WebSocket connection"""
    token = data.get('token')
    if not token:
        emit('auth_error', {'error': 'No token provided'})
        return
    
    payload = verify_token(token)
    if not payload:
        emit('auth_error', {'error': 'Invalid token'})
        return
    
    # Store user info
    active_connections[request.sid]['user'] = payload
    
    # Join appropriate room
    if payload['type'] == 'admin':
        join_room('admin')
        emit('auth_success', {'message': 'Joined admin room'})
    else:
        join_room(f"customer_{payload['user_id']}")
        emit('auth_success', {'message': 'Joined customer room'})

@socketio.on('subscribe_updates')
def handle_subscribe_updates(data):
    """Subscribe to real-time updates"""
    if request.sid not in active_connections:
        emit('error', {'error': 'Not authenticated'})
        return
    
    user = active_connections[request.sid].get('user')
    if not user:
        emit('error', {'error': 'Not authenticated'})
        return
    
    update_type = data.get('type', 'all')
    
    # Send initial data
    if user['type'] == 'admin':
        stats = db.get_statistics()
        emit('initial_data', {'statistics': stats})
    else:
        customer = db.get_customer(user['user_id'])
        if customer:
            emit('initial_data', {
                'balance': customer.balance,
                'weekly_pnl': customer.weekly_pnl
            })

# ============= Background Tasks =============

def broadcast_transaction_update(transaction):
    """Broadcast transaction updates to relevant clients"""
    try:
        # Notify customer
        socketio.emit('transaction_update', {
            'type': transaction.type,
            'amount': transaction.amount,
            'timestamp': transaction.timestamp,
            'status': transaction.status
        }, room=f"customer_{transaction.customer_id}")
        
        # Notify admin
        socketio.emit('new_transaction', {
            'customer_id': transaction.customer_id,
            'type': transaction.type,
            'amount': transaction.amount,
            'timestamp': transaction.timestamp
        }, room='admin')
    except Exception as e:
        print(f"Error broadcasting update: {e}")

def broadcast_balance_update(customer_id, new_balance, old_balance):
    """Broadcast balance updates"""
    try:
        change = new_balance - old_balance
        percentage = (change / old_balance * 100) if old_balance > 0 else 0
        
        socketio.emit('balance_update', {
            'balance': new_balance,
            'change': change,
            'percentage': round(percentage, 2)
        }, room=f"customer_{customer_id}")
        
        socketio.emit('customer_balance_update', {
            'customer_id': customer_id,
            'balance': new_balance,
            'change': change
        }, room='admin')
    except Exception as e:
        print(f"Error broadcasting balance update: {e}")

# ============= Health Check =============

# ============= Telegram Dashboard APIs =============

@app.route('/api/telegram/messages')
@require_auth
def get_telegram_messages():
    """Get recent Telegram messages"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        limit = int(request.args.get('limit', 50))
        chat_id = request.args.get('chat_id')
        
        if telegram_streamer:
            messages = telegram_streamer.get_recent_messages(
                limit=limit, 
                chat_id=int(chat_id) if chat_id else None
            )
            return jsonify({'messages': messages})
        else:
            return jsonify({'messages': [], 'error': 'Message streamer not initialized'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram/groups')
@require_auth
def get_telegram_groups():
    """Get monitored Telegram groups"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        if telegram_monitor:
            groups = telegram_monitor.get_monitored_groups()
            return jsonify({'groups': groups})
        else:
            return jsonify({'groups': [], 'error': 'Group monitor not initialized'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram/groups/<int:chat_id>')
@require_auth
def get_telegram_group_info(chat_id):
    """Get specific group information"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        if telegram_monitor:
            group_info = telegram_monitor.get_group_info(chat_id)
            if group_info:
                return jsonify({'group': group_info})
            else:
                return jsonify({'error': 'Group not found'}), 404
        else:
            return jsonify({'error': 'Group monitor not initialized'}), 503
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram/groups', methods=['POST'])
@require_auth
def add_telegram_group():
    """Add group to monitoring"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        
        if not chat_id:
            return jsonify({'error': 'chat_id is required'}), 400
        
        if telegram_monitor:
            success = await telegram_monitor.add_group_to_monitor(int(chat_id))
            if success:
                return jsonify({'success': True, 'message': 'Group added to monitoring'})
            else:
                return jsonify({'error': 'Failed to add group'}), 500
        else:
            return jsonify({'error': 'Group monitor not initialized'}), 503
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram/bot-status')
@require_auth
def get_bot_status():
    """Get bot health status"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        if bot_monitor:
            status = bot_monitor.get_current_status()
            stats = bot_monitor.get_statistics()
            trends = bot_monitor.get_performance_trends()
            
            return jsonify({
                'status': status,
                'statistics': stats,
                'performance_trends': trends
            })
        else:
            return jsonify({'error': 'Bot monitor not initialized'}), 503
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram/send-message', methods=['POST'])
@require_auth
def send_telegram_message():
    """Send message via Telegram"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        text = data.get('text')
        
        if not chat_id or not text:
            return jsonify({'error': 'chat_id and text are required'}), 400
        
        if admin_interface:
            result = await admin_interface.send_message(chat_id, text)
            return jsonify(result)
        else:
            return jsonify({'error': 'Admin interface not initialized'}), 503
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram/analytics/<int:chat_id>')
@require_auth
def get_chat_analytics(chat_id):
    """Get chat analytics"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        days = int(request.args.get('days', 7))
        
        if admin_interface:
            analytics = await admin_interface.get_chat_analytics(chat_id, days)
            return jsonify(analytics)
        else:
            return jsonify({'error': 'Admin interface not initialized'}), 503
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/telegram/statistics')
@require_auth
def get_telegram_statistics():
    """Get comprehensive Telegram statistics"""
    if request.user['type'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        stats = {}
        
        if telegram_streamer:
            stats['message_streamer'] = telegram_streamer.get_statistics()
        
        if telegram_monitor:
            stats['group_monitor'] = telegram_monitor.get_statistics()
        
        if bot_monitor:
            stats['bot_monitor'] = bot_monitor.get_statistics()
        
        if admin_interface:
            stats['admin_interface'] = admin_interface.get_statistics()
        
        return jsonify({
            'statistics': stats,
            'components_status': {
                'message_streamer': telegram_streamer is not None,
                'group_monitor': telegram_monitor is not None,
                'bot_monitor': bot_monitor is not None,
                'admin_interface': admin_interface is not None
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# WebSocket events for Telegram dashboard
@socketio.on('join_telegram_room')
def handle_join_telegram_room():
    """Join Telegram dashboard room"""
    if request.sid not in active_connections:
        emit('error', {'error': 'Not authenticated'})
        return
    
    user = active_connections[request.sid].get('user')
    if not user or user['type'] != 'admin':
        emit('error', {'error': 'Admin access required'})
        return
    
    join_room('telegram_dashboard')
    emit('joined_telegram_room', {'message': 'Successfully joined Telegram dashboard'})

@socketio.on('leave_telegram_room')
def handle_leave_telegram_room():
    """Leave Telegram dashboard room"""
    leave_room('telegram_dashboard')
    emit('left_telegram_room', {'message': 'Left Telegram dashboard'})

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    telegram_status = {
        'message_streamer': telegram_streamer is not None,
        'group_monitor': telegram_monitor is not None,
        'bot_monitor': bot_monitor is not None,
        'admin_interface': admin_interface is not None
    }
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'active_connections': len(active_connections),
        'database': 'connected' if db else 'disconnected',
        'telegram_components': telegram_status
    })

# ============= Error Handlers =============

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

# ============= Main =============

if __name__ == '__main__':
    print("=" * 50)
    print("ENHANCED PORTAL SERVER")
    print("=" * 50)
    print(f"Starting server on http://localhost:5000")
    print(f"WebSocket support enabled")
    print(f"Admin portal: http://localhost:5000/admin")
    print(f"Customer portal: http://localhost:5000/")
    print("-" * 50)
    
    # Initialize Telegram components
    print("Initializing Telegram dashboard components...")
    if initialize_telegram_components():
        print("✅ Telegram components initialized successfully")
        
        # Start async components
        def start_async_components():
            async def start_all():
                try:
                    if telegram_streamer:
                        await telegram_streamer.start_streaming()
                    if telegram_monitor:
                        await telegram_monitor.start_monitoring()
                    if bot_monitor:
                        await bot_monitor.start_monitoring()
                    print("✅ All async components started")
                except Exception as e:
                    print(f"❌ Error starting async components: {e}")
            
            asyncio.run(start_all())
        
        # Start async components in background thread
        async_thread = threading.Thread(target=start_async_components)
        async_thread.daemon = True
        async_thread.start()
        
    else:
        print("❌ Failed to initialize Telegram components")
    
    print("-" * 50)
    
    # Run with WebSocket support
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)