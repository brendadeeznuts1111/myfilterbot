#!/usr/bin/env python3
"""
Customer Portal Web Server for Fantdev Trading Bot
Serves the customer portal with ngrok compatibility
"""

from flask import Flask, send_file, jsonify, request, make_response
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
from functools import wraps
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database import db, GroupMember
from src.config import config

app = Flask(__name__)
CORS(app)

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

@app.route('/')
def serve_portal():
    """Serve the customer portal HTML"""
    try:
        # Use the API-enabled portal
        response = make_response(send_file('customer_portal_api.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/admin')
def serve_admin_portal():
    """Serve the admin portal for group management"""
    try:
        response = make_response(send_file('admin_portal.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/login', methods=['POST'])
def login():
    """Customer login endpoint"""
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
        
        # Return customer data
        return jsonify({
            'success': True,
            'customer': {
                'customer_id': customer.customer_id,
                'balance': customer.balance,
                'weekly_pnl': customer.weekly_pnl,
                'active': customer.active,
                'registered': customer.telegram_id is not None
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/customer/<customer_id>')
def get_customer_data(customer_id):
    """Get customer data and statistics"""
    try:
        customer = db.get_customer(customer_id.upper())
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Get transactions
        transactions = db.get_customer_transactions(customer_id)
        
        # Calculate today's activity
        today = datetime.now().date()
        today_transactions = [
            t for t in transactions 
            if datetime.fromisoformat(t.timestamp).date() == today
        ]
        
        # Calculate daily P&L for chart (simulated for last 7 days)
        daily_pnl = []
        for i in range(6, -1, -1):
            day = datetime.now() - timedelta(days=i)
            day_txs = [
                t for t in transactions
                if datetime.fromisoformat(t.timestamp).date() == day.date()
            ]
            
            day_total = sum(
                t.amount if t.type == 'deposit' else -t.amount
                for t in day_txs if t.amount
            )
            daily_pnl.append(day_total)
        
        # Format transactions for display
        formatted_transactions = []
        for tx in transactions[:10]:  # Last 10 transactions
            formatted_transactions.append({
                'type': tx.type,
                'amount': tx.amount,
                'time': datetime.fromisoformat(tx.timestamp).strftime('%b %d %I:%M %p'),
                'status': tx.status,
                'message': tx.message[:100] if tx.message else ''
            })
        
        return jsonify({
            'customer_id': customer.customer_id,
            'balance': customer.balance,
            'weekly_pnl': customer.weekly_pnl,
            'active': customer.active,
            'registered': customer.telegram_id is not None,
            'today_activity': len(today_transactions),
            'daily_pnl': daily_pnl,
            'transactions': formatted_transactions,
            'alerts': {
                'low_balance': customer.balance < 100,
                'inactive': customer.last_activity and (
                    datetime.now() - datetime.fromisoformat(customer.last_activity)
                ).days > 3
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def get_global_stats():
    """Get global statistics"""
    try:
        stats = db.get_statistics()
        top_performers = db.get_top_performers(5)
        
        return jsonify({
            'total_customers': stats.get('total_customers', 0),
            'active_customers': stats.get('active_customers', 0),
            'total_balance': stats.get('total_balance', 0),
            'total_weekly_pnl': stats.get('total_weekly_pnl', 0),
            'registered_users': stats.get('registered_users', 0),
            'top_performers': [
                {
                    'customer_id': c.customer_id,
                    'weekly_pnl': c.weekly_pnl
                }
                for c in top_performers
            ]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<customer_id>')
def get_customer_transactions(customer_id):
    """Get detailed transaction history"""
    try:
        transactions = db.get_customer_transactions(customer_id.upper(), limit=100)
        
        formatted = []
        for tx in transactions:
            formatted.append({
                'timestamp': tx.timestamp,
                'type': tx.type,
                'amount': tx.amount,
                'message': tx.message,
                'from_user': tx.from_user,
                'status': tx.status
            })
        
        return jsonify({
            'transactions': formatted,
            'count': len(formatted)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/members')
def get_members():
    """Get all group members with their permissions"""
    try:
        members = db.get_group_members()
        member_stats = db.get_member_stats()
        
        formatted_members = []
        for member in members:
            formatted_members.append({
                'member_id': member.member_id,
                'telegram_id': member.telegram_id,
                'username': member.username,
                'group_id': member.group_id,
                'group_name': member.group_name,
                'join_date': member.join_date,
                'status': member.status,
                'permissions': member.permissions,
                'customer_id': member.customer_id
            })
        
        return jsonify({
            'members': formatted_members,
            'stats': member_stats
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/pending')
def get_pending_members():
    """Get pending members awaiting approval"""
    try:
        pending = db.get_pending_members()
        
        formatted = []
        for member in pending:
            formatted.append({
                'member_id': member.member_id,
                'telegram_id': member.telegram_id,
                'username': member.username,
                'group_id': member.group_id,
                'group_name': member.group_name,
                'join_date': member.join_date,
                'requested_permissions': member.permissions
            })
        
        return jsonify({
            'pending': formatted,
            'count': len(formatted)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/members/approve', methods=['POST'])
def approve_member():
    """Approve a member with permissions"""
    try:
        data = request.json
        group_id = data.get('group_id')
        telegram_id = data.get('telegram_id')
        permissions = data.get('permissions', {})
        
        success = db.approve_member(group_id, telegram_id, permissions)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Member approved successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to approve member'
            }), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/members/deny', methods=['POST'])
def deny_member():
    """Deny a member"""
    try:
        data = request.json
        group_id = data.get('group_id')
        telegram_id = data.get('telegram_id')
        reason = data.get('reason', '')
        
        success = db.deny_member(group_id, telegram_id, reason)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Member denied'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to deny member'
            }), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/members/update', methods=['POST'])
def update_member_permissions():
    """Update member permissions"""
    try:
        data = request.json
        group_id = data.get('group_id')
        telegram_id = data.get('telegram_id')
        permissions = data.get('permissions')
        
        success = db.update_member_permissions(group_id, telegram_id, permissions)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Permissions updated'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update permissions'
            }), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/members/add', methods=['POST'])
def add_member():
    """Add a new member (simulated for testing)"""
    try:
        data = request.json
        
        member = GroupMember(
            member_id=f"M{datetime.now().strftime('%Y%m%d%H%M%S')}",
            telegram_id=data.get('telegram_id'),
            username=data.get('username'),
            group_id=data.get('group_id'),
            group_name=data.get('group_name'),
            join_date=datetime.now().isoformat(),
            status='pending'
        )
        
        success = db.add_member(member)
        
        if success:
            return jsonify({
                'success': True,
                'member_id': member.member_id,
                'message': 'Member added to pending'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to add member'
            }), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'database': os.path.exists('customer_database.json'),
        'customers_loaded': len(db.get_all_customers()),
        'members_loaded': len(db.get_group_members()),
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 FANTDEV CUSTOMER PORTAL SERVER")
    print("=" * 50)
    
    # Load database stats
    stats = db.get_statistics()
    print(f"📊 Database Status:")
    print(f"   • Customers: {stats.get('total_customers', 0)}")
    print(f"   • Total Balance: ${stats.get('total_balance', 0):,.2f}")
    print(f"   • Registered Users: {stats.get('registered_users', 0)}")
    
    print("-" * 50)
    print("🌐 Server starting on: http://localhost:5000")
    print("📱 To expose with ngrok:")
    print("   1. Run: ngrok http 5000")
    print("   2. Use the HTTPS URL provided")
    print("   3. Portal will bypass ngrok warning automatically")
    print("-" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=False)