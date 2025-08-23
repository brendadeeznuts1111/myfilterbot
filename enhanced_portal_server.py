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

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'active_connections': len(active_connections),
        'database': 'connected' if db else 'disconnected'
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
    
    # Run with WebSocket support
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)