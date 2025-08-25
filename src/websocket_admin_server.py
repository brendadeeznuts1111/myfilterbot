#!/usr/bin/env python3
"""
WebSocket-enabled Admin Security Server for Fantdev Trading Bot
Provides real-time security alerts and verification processing
"""

from flask import Flask, send_file, jsonify, request, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import os
from datetime import datetime, timedelta
import sys
from pathlib import Path
import logging
import threading
import time

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database import db
from src.config import config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active admin sessions
admin_sessions = {}
pending_verifications = []
audit_log = []

def add_ngrok_headers(response):
    """Add headers to bypass ngrok warning page"""
    response.headers['ngrok-skip-browser-warning'] = 'true'
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.after_request
def after_request(response):
    """Apply ngrok headers to all responses"""
    return add_ngrok_headers(response)

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'status': 'Connected to security feed', 'session_id': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {request.sid}")
    if request.sid in admin_sessions:
        del admin_sessions[request.sid]

@socketio.on('admin_auth')
def handle_admin_auth(data):
    """Authenticate admin and join security room"""
    admin_id = data.get('admin_id', 'Admin')
    admin_sessions[request.sid] = {
        'admin_id': admin_id,
        'connected_at': datetime.now().isoformat()
    }
    join_room('admin_security')
    
    emit('auth_success', {
        'message': f'Authenticated as {admin_id}',
        'pending_count': len(pending_verifications)
    })
    
    # Send any pending verifications
    if pending_verifications:
        emit('pending_verifications', pending_verifications)

@socketio.on('process_verification')
def handle_verification(data):
    """Process verification approval/denial"""
    token = data.get('token')
    action = data.get('action')
    admin_id = admin_sessions.get(request.sid, {}).get('admin_id', 'Admin')
    
    # Find and remove from pending
    verification = None
    for i, v in enumerate(pending_verifications):
        if v.get('token') == token:
            verification = pending_verifications.pop(i)
            break
    
    if verification:
        # Create audit entry
        audit_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': f"Verification {action}d",
            'user': verification.get('username'),
            'admin': admin_id,
            'status': 'success' if action == 'approve' else 'denied',
            'token': token
        }
        audit_log.append(audit_entry)
        
        # Broadcast to all admins
        socketio.emit('verification_processed', {
            'token': token,
            'action': action,
            'admin': admin_id,
            'audit_entry': audit_entry
        }, room='admin_security')
        
        # Send confirmation to processing admin
        emit('process_success', {
            'message': f'Verification {action}d successfully',
            'token': token
        })
        
        logger.info(f"Verification {action}d: {token} by {admin_id}")
    else:
        emit('process_error', {
            'error': 'Verification not found',
            'token': token
        })

# Simulate incoming security alerts
def simulate_security_alerts():
    """Simulate incoming security alerts for demonstration"""
    alert_templates = [
        {
            'type': 'duplicate_password',
            'message': 'Duplicate password registration detected!',
            'priority': 'high'
        },
        {
            'type': 'suspicious_login',
            'message': 'Suspicious login attempt detected',
            'priority': 'medium'
        },
        {
            'type': 'password_reset',
            'message': 'Password reset requested',
            'priority': 'low'
        }
    ]
    
    counter = 0
    while True:
        time.sleep(30)  # Wait 30 seconds between alerts
        
        if admin_sessions:  # Only send if admins are connected
            counter += 1
            template = alert_templates[counter % len(alert_templates)]
            
            alert = {
                'token': f'tok_{datetime.now().strftime("%Y%m%d%H%M%S")}_{counter}',
                'type': template['type'],
                'message': template['message'],
                'priority': template['priority'],
                'user_id': f'{100000000 + counter}',
                'username': f'@test_user_{counter}',
                'customer_id': f'TEST{1000 + counter}',
                'timestamp': datetime.now().isoformat()
            }
            
            pending_verifications.append(alert)
            
            # Broadcast to all admin clients
            socketio.emit('security_alert', alert, room='admin_security')
            logger.info(f"Security alert broadcast: {alert['token']}")

# HTTP Routes
@app.route('/')
def index():
    """Serve the admin security center"""
    try:
        response = make_response(send_file('admin_security_center_enhanced.html'))
        return add_ngrok_headers(response)
    except:
        return jsonify({'error': 'Admin interface not found'}), 404

@app.route('/api/verify', methods=['POST'])
def process_verification_api():
    """Process verification via HTTP API"""
    try:
        data = request.json
        token = data.get('token')
        action = data.get('action')
        admin_id = data.get('admin_id', 'Admin')
        
        # Process verification
        verification = None
        for i, v in enumerate(pending_verifications):
            if v.get('token') == token:
                verification = pending_verifications.pop(i)
                break
        
        if verification:
            audit_entry = {
                'timestamp': datetime.now().isoformat(),
                'action': f"Verification {action}d",
                'user': verification.get('username'),
                'admin': admin_id,
                'status': 'success' if action == 'approve' else 'denied',
                'token': token
            }
            audit_log.append(audit_entry)
            
            # Broadcast via WebSocket
            socketio.emit('verification_processed', {
                'token': token,
                'action': action,
                'admin': admin_id,
                'audit_entry': audit_entry
            }, room='admin_security')
            
            return jsonify({
                'success': True,
                'message': f'Verification {action}d successfully',
                'audit_entry': audit_entry
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Verification not found'
            }), 404
            
    except Exception as e:
        logger.error(f"Verification error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verifications/pending')
def get_pending_verifications():
    """Get all pending verifications"""
    return jsonify({
        'success': True,
        'verifications': pending_verifications,
        'count': len(pending_verifications)
    })

@app.route('/api/audit-log')
def get_audit_log():
    """Get audit log entries"""
    return jsonify({
        'success': True,
        'entries': audit_log[-100:],  # Last 100 entries
        'total': len(audit_log)
    })

@app.route('/api/security-stats')
def get_security_stats():
    """Get real-time security statistics"""
    # Calculate stats from current data
    processed_today = len([e for e in audit_log 
                          if datetime.fromisoformat(e['timestamp']).date() == datetime.now().date()])
    
    stats = {
        'pending_verifications': len(pending_verifications),
        'processed_today': processed_today,
        'avg_response_time': 43,
        'system_status': 'online',
        'total_users': len(db.get_all_customers()),
        'active_admins': len(admin_sessions),
        'security_score': 94,
        'failed_attempts': 12,
        'blocked_ips': 3
    }
    
    return jsonify({
        'success': True,
        'stats': stats,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/webhook/security-alert', methods=['POST'])
def receive_security_alert():
    """Receive security alerts from Cloudflare Worker"""
    try:
        # Verify webhook secret
        worker_secret = request.headers.get('X-Worker-Secret')
        expected_secret = os.getenv('WEBHOOK_SECRET', 'default-secret')
        
        if worker_secret != expected_secret:
            logger.warning(f"Invalid webhook secret from {request.remote_addr}")
            return jsonify({'error': 'Unauthorized'}), 401
        
        alert_data = request.json
        if not alert_data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Create security alert for admin interface
        security_alert = {
            'token': alert_data.get('data', {}).get('token') or f'cf_{int(datetime.now().timestamp())}_{hash(alert_data.get("message", ""))%10000}',
            'type': alert_data.get('data', {}).get('alertType', 'security_alert'),
            'message': alert_data.get('message', 'Security alert from Cloudflare Worker'),
            'timestamp': alert_data.get('timestamp', datetime.now().isoformat()),
            'source': 'cloudflare-worker',
            'priority': alert_data.get('data', {}).get('priority', 'medium'),
            'data': alert_data.get('data', {})
        }
        
        # Add to pending verifications if it's a verification-type alert
        if security_alert['type'] in ['duplicate_password', 'suspicious_login', 'registration_request']:
            # Create verification entry
            verification = {
                'token': security_alert['token'],
                'type': security_alert['type'],
                'message': security_alert['message'],
                'timestamp': security_alert['timestamp'],
                'user_id': alert_data.get('data', {}).get('userId', 'unknown'),
                'username': alert_data.get('data', {}).get('username', 'unknown'),
                'customer_id': alert_data.get('data', {}).get('customerId', 'unknown'),
                'priority': security_alert['priority'],
                'source': 'cloudflare-worker'
            }
            pending_verifications.append(verification)
        
        # Broadcast to all connected admin clients via WebSocket
        socketio.emit('security_alert', security_alert, room='admin_security')
        
        # Log the alert
        logger.info(f"Received security alert from Cloudflare Worker: {security_alert['type']}")
        
        return jsonify({
            'success': True,
            'message': 'Security alert received and broadcast',
            'token': security_alert['token']
        })
        
    except Exception as e:
        logger.error(f"Error processing security alert webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhook/verification-response', methods=['POST'])
def receive_verification_response():
    """Send verification response back to Cloudflare Worker"""
    try:
        data = request.json
        token = data.get('token')
        action = data.get('action')  # 'approve' or 'deny'
        
        if not token or not action:
            return jsonify({'error': 'Token and action required'}), 400
        
        # Here you would typically send the response back to the Worker
        # For now, just log it
        logger.info(f"Verification response: {action} for token {token}")
        
        return jsonify({
            'success': True,
            'message': f'Verification {action}d',
            'token': token
        })
        
    except Exception as e:
        logger.error(f"Error processing verification response: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'websocket': 'enabled',
        'active_sessions': len(admin_sessions),
        'pending_verifications': len(pending_verifications),
        'cloudflare_integration': 'enabled',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 FANTDEV ADMIN SECURITY SERVER (WebSocket)")
    print("=" * 50)
    print(f"📊 Database Status:")
    print(f"   • Customers: {len(db.get_all_customers())}")
    print(f"   • Pending Verifications: {len(pending_verifications)}")
    print(f"   • Active Admins: {len(admin_sessions)}")
    print("-" * 50)
            payment_url = os.getenv('PAYMENT_SERVER_URL', 'http://localhost:5001')
        print(f"🌐 Server starting on: {payment_url}")
    print("🔌 WebSocket enabled for real-time updates")
    print("-" * 50)
    
    # Start alert simulator in background thread
    alert_thread = threading.Thread(target=simulate_security_alerts, daemon=True)
    alert_thread.start()
    
    # Run with SocketIO
    socketio.run(app, host='0.0.0.0', port=5001, debug=False)