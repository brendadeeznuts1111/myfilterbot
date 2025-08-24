#!/usr/bin/env python3
"""
Customer Portal Web Server for Fantdev Trading Bot
Serves the customer portal with ngrok compatibility
"""

from flask import Flask, send_file, jsonify, request, make_response
from flask_cors import CORS
import json
import os
import time
from datetime import datetime, timedelta
from functools import wraps
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database import db, GroupMember
from src.config import config
from src.error_handler import error_tracker, ErrorCategory, ErrorSeverity
# from src.api.notification_api import register_notification_api  # Temporarily disabled - missing services module

# Setup logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

@app.route('/manager.html')
def serve_manager():
    """Serve the Fire22 manager dashboard with authentication support"""
    try:
        # Get URL parameters for Fire22 integration
        agent_id = request.args.get('agentID', '')
        agent_type = request.args.get('agentType', '')
        token = request.args.get('token', '')
        operation = request.args.get('operation', '')
        
        # Log manager access attempt
        logger.info(f"Manager dashboard access - AgentID: {agent_id}, Type: {agent_type}, Operation: {operation}")
        
        response = make_response(send_file('manager.html'))
        
        # Add custom headers for Fire22 integration
        if agent_id:
            response.headers['X-Agent-ID'] = agent_id
        if agent_type:
            response.headers['X-Agent-Type'] = agent_type
            
        return add_ngrok_headers(response)
    except Exception as e:
        logger.error(f"Error serving manager dashboard: {e}")
        return jsonify({'error': str(e)}), 404

@app.route('/customer_database_2500.json')
def serve_large_database():
    """Serve the 2500 customer database for manager dashboard"""
    try:
        response = make_response(send_file('customer_database_2500.json'))
        response.headers['Content-Type'] = 'application/json'
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files (JS, CSS, images)"""
    try:
        static_path = os.path.join('static', filename)
        response = make_response(send_file(static_path))
        
        # Set appropriate content type
        if filename.endswith('.js'):
            response.headers['Content-Type'] = 'application/javascript'
        elif filename.endswith('.css'):
            response.headers['Content-Type'] = 'text/css'
        
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

@app.route('/cashier')
def serve_cashier_dashboard():
    """Serve the enhanced cashier dashboard"""
    try:
        response = make_response(send_file('admin_cashier_dashboard_enhanced.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/admin-chat')
def serve_admin_chat():
    """Serve the complete admin security center with all pages"""
    try:
        response = make_response(send_file('admin_security_center.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        # Fallback to old interface if new one doesn't exist
        try:
            response = make_response(send_file('admin_chat_interface.html'))
            return add_ngrok_headers(response)
        except:
            return jsonify({'error': str(e)}), 404

@app.route('/admin-security')
def serve_admin_security():
    """Serve the complete admin security center"""
    try:
        response = make_response(send_file('admin_security_center.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/login', methods=['POST'])
def login():
    """Enhanced customer login endpoint with JWT token generation"""
    try:
        data = request.json
        customer_id = data.get('customer_id', '').upper()
        password = data.get('password', '').upper()
        
        # Validate input
        if not customer_id or not password:
            return jsonify({'success': False, 'error': 'Customer ID and password are required'}), 400
        
        # Get customer from database
        customer = db.get_customer(customer_id)
        
        if not customer:
            return jsonify({'success': False, 'error': 'Customer ID not found'}), 401
        
        if customer.password != password:
            return jsonify({'success': False, 'error': 'Invalid password'}), 401
        
        # Generate JWT token (simplified for demo)
        import base64
        import json
        token_data = {
            'customer_id': customer_id,
            'issued_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(hours=24)).isoformat()
        }
        token = base64.b64encode(json.dumps(token_data).encode()).decode()
        
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
                'telegram_username': customer.telegram_username,
                'phone': customer.phone,
                'last_activity': customer.last_activity
            }
        })
    
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return jsonify({'success': False, 'error': 'Login failed. Please try again.'}), 500

@app.route('/api/customer/<customer_id>')
def get_customer_data(customer_id):
    """Enhanced customer data endpoint with config integration"""
    try:
        customer = db.get_customer(customer_id.upper())
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Load customer config for keywords
        customer_config = load_customer_config(customer_id.upper())
        
        # Get transactions
        transactions = db.get_customer_transactions(customer_id)
        
        # Calculate today's activity
        today = datetime.now().date()
        today_transactions = [
            t for t in transactions 
            if datetime.fromisoformat(t.timestamp).date() == today
        ]
        
        # Calculate daily P&L for chart (last 7 days)
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
        
        # Format transactions with keyword highlighting
        formatted_transactions = []
        for tx in transactions[:20]:  # Last 20 transactions
            tx_data = {
                'id': getattr(tx, 'id', f'TX{hash(tx.timestamp)}'[:8]),
                'type': tx.type,
                'amount': tx.amount,
                'time': datetime.fromisoformat(tx.timestamp).strftime('%b %d %I:%M %p'),
                'status': tx.status,
                'message': tx.message[:200] if tx.message else '',
                'from_user': getattr(tx, 'from_user', ''),
                'timestamp': tx.timestamp,
                'customer_id': customer_id,
                'description': f'{tx.type.title()} transaction'
            }
            
            # Mark if transaction matches customer keywords
            if customer_config and customer_config.get('keywords'):
                search_text = (tx_data['message'] + ' ' + tx_data['from_user']).lower()
                tx_data['keyword_match'] = any(
                    keyword.lower() in search_text 
                    for keyword in customer_config['keywords']
                )
            
            formatted_transactions.append(tx_data)
        
        # Calculate win rate and performance metrics
        win_transactions = [t for t in transactions if t.type == 'deposit']
        total_trades = len([t for t in transactions if t.type in ['deposit', 'withdrawal']])
        win_rate = (len(win_transactions) / total_trades * 100) if total_trades > 0 else 0
        
        return jsonify({
            'customer_id': customer.customer_id,
            'balance': customer.balance,
            'weekly_pnl': customer.weekly_pnl,
            'active': customer.active,
            'registered': customer.telegram_id is not None,
            'telegram_username': customer.telegram_username,
            'telegram_id': customer.telegram_id,
            'phone': customer.phone,
            'last_activity': customer.last_activity,
            'today_activity': len(today_transactions),
            'win_rate': round(win_rate, 1),
            'total_trades': total_trades,
            'daily_pnl': daily_pnl,
            'transactions': formatted_transactions,
            'customer_config': customer_config,
            'alerts': {
                'low_balance': customer.balance < 100,
                'inactive': customer.last_activity and (
                    datetime.now() - datetime.fromisoformat(customer.last_activity)
                ).days > 3,
                'telegram_disconnected': customer.telegram_id is None
            },
            'statistics': {
                'total_deposits': sum(t.amount for t in transactions if t.type == 'deposit' and t.amount),
                'total_withdrawals': sum(t.amount for t in transactions if t.type == 'withdrawal' and t.amount),
                'denied_count': len([t for t in transactions if t.type == 'denied'])
            }
        })
    
    except Exception as e:
        logger.error(f'Customer data error: {str(e)}')
        return jsonify({'error': str(e)}), 500

def load_customer_config(customer_id):
    """Load customer configuration from customer_config.json"""
    try:
        config_path = Path(__file__).parent / 'customer_config.json'
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
                return config.get('customers', {}).get(customer_id)
    except Exception as e:
        logger.warning(f'Could not load customer config: {e}')
    return None

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

@app.route('/api/reports')
def get_reports():
    """Get analytics and reports data"""
    try:
        customers = db.get_all_customers()
        
        # Calculate metrics
        total_customers = len(customers)
        active_customers = sum(1 for c in customers if c.active)
        total_balance = sum(c.balance for c in customers)
        avg_balance = total_balance / total_customers if total_customers > 0 else 0
        
        # Calculate weekly P&L
        weekly_pnl = sum(c.weekly_pnl for c in customers if c.weekly_pnl)
        
        # Mock transaction data (would come from actual transaction logs)
        deposits = 75200
        withdrawals = 42800
        deposit_count = 47
        withdrawal_count = 23
        
        # Top performers
        top_performers = []
        for customer in sorted(customers, key=lambda c: c.weekly_pnl or 0, reverse=True)[:3]:
            if customer.weekly_pnl and customer.weekly_pnl > 0:
                top_performers.append({
                    'id': customer.customer_id,
                    'pnl': customer.weekly_pnl,
                    'trades': 12  # Mock data
                })
        
        # Risk indicators
        large_positions = sum(1 for c in customers if c.balance > 10000)
        inactive_accounts = sum(1 for c in customers if not c.active)
        
        return jsonify({
            'totalVolume': 125340,
            'activeTraders': active_customers,
            'weeklyPnL': int(weekly_pnl),
            'riskScore': 3.2,
            'customerMetrics': {
                'total': total_customers,
                'active': active_customers,
                'new': 3,  # Mock data - would track registrations
                'avgBalance': int(avg_balance)
            },
            'transactions': {
                'deposits': deposits,
                'withdrawals': withdrawals,
                'netFlow': deposits - withdrawals,
                'depositCount': deposit_count,
                'withdrawalCount': withdrawal_count
            },
            'topPerformers': top_performers,
            'risk': {
                'largePositions': large_positions,
                'withdrawalSpike': 'Normal',
                'inactiveAccounts': inactive_accounts
            }
        })
        
    except Exception as e:
        logger.error(f"Error generating reports: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/config')
def get_config():
    """Get customer configuration data for branding"""
    try:
        # Load customer config
        config_path = 'customer_config.json'
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config_data = json.load(f)
                
            # Extract company info
            company_info = {
                'name': 'Fantdev Trading',
                'platform': 'Fantdev Trading Platform',
                'website': 'https://fire22.com',
                'total_customers': len(config_data.get('customers', {})),
                'group_chats': config_data.get('group_chats', {}),
                'global_keywords': config_data.get('global_keywords', [])
            }
            
            return jsonify({
                'success': True,
                'config': company_info
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Configuration file not found'
            }), 404
            
    except Exception as e:
        logger.error(f"Error loading config: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verify', methods=['POST'])
def process_verification():
    """Process approval/denial of security verifications"""
    try:
        data = request.json
        token = data.get('token')
        action = data.get('action')  # 'approve' or 'deny'
        admin_id = data.get('admin_id', 'Admin')
        user_id = data.get('user_id')
        
        # Log the verification action
        logger.info(f"Verification {action} for token {token} by {admin_id}")
        
        # Here you would integrate with the Telegram bot to send the actual command
        # For now, we'll simulate the processing
        
        # Update audit log (in production, this would be a database)
        audit_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': f"Verification {action}d",
            'token': token,
            'user_id': user_id,
            'admin': admin_id,
            'status': 'success'
        }
        
        return jsonify({
            'success': True,
            'message': f'Verification {action}d successfully',
            'audit_entry': audit_entry
        })
        
    except Exception as e:
        logger.error(f"Verification error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verifications/pending')
def get_pending_verifications():
    """Get all pending verifications"""
    try:
        # In production, this would query a database
        # For now, return mock data
        pending = [
            {
                'token': 'tok_' + datetime.now().strftime('%Y%m%d%H%M%S') + '_1',
                'user_id': '123456789',
                'username': '@john_doe',
                'customer_id': 'BB1045',
                'issue_type': 'Duplicate password',
                'timestamp': (datetime.now() - timedelta(minutes=5)).isoformat(),
                'priority': 'high'
            },
            {
                'token': 'tok_' + datetime.now().strftime('%Y%m%d%H%M%S') + '_2',
                'user_id': '987654321',
                'username': '@sarah_m',
                'customer_id': 'CC2056',
                'issue_type': 'Password reset',
                'timestamp': (datetime.now() - timedelta(minutes=12)).isoformat(),
                'priority': 'medium'
            }
        ]
        
        return jsonify({
            'success': True,
            'verifications': pending,
            'count': len(pending)
        })
        
    except Exception as e:
        logger.error(f"Error fetching pending verifications: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/audit-log')
def get_audit_log():
    """Get audit log entries"""
    try:
        # In production, this would query an audit database
        # For now, return mock data
        entries = [
            {
                'timestamp': (datetime.now() - timedelta(hours=1)).isoformat(),
                'action': 'Registration Approved',
                'user': '@john_doe',
                'admin': 'Admin',
                'status': 'success'
            },
            {
                'timestamp': (datetime.now() - timedelta(hours=2)).isoformat(),
                'action': 'Password Reset Denied',
                'user': '@sarah_m',
                'admin': 'Admin',
                'status': 'denied'
            },
            {
                'timestamp': (datetime.now() - timedelta(hours=3)).isoformat(),
                'action': 'Registration Approved',
                'user': '@michael_j',
                'admin': 'Admin',
                'status': 'success'
            }
        ]
        
        return jsonify({
            'success': True,
            'entries': entries,
            'total': len(entries)
        })
        
    except Exception as e:
        logger.error(f"Error fetching audit log: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/security-stats')
def get_security_stats():
    """Get real-time security statistics"""
    try:
        # Calculate current stats
        stats = {
            'pending_verifications': 4,
            'processed_today': 27,
            'avg_response_time': 43,  # seconds
            'system_status': 'online',
            'total_users': 342,
            'security_score': 94,  # percentage
            'failed_attempts': 12,
            'blocked_ips': 3
        }
        
        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error fetching security stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fire22/agents', methods=['GET'])
def get_agents_list():
    """Fire22 Manager API - Get list of agents by agent"""
    try:
        # Extract Fire22 parameters
        agent_id = request.args.get('agentID', '')
        agent_type = request.args.get('agentType', 'M')
        token = request.args.get('token', '')
        operation = request.args.get('operation', 'getListAgenstByAgent')
        agent_owner = request.args.get('agentOwner', '')
        
        # Log the Fire22 API call
        logger.info(f"Fire22 API call - AgentID: {agent_id}, Operation: {operation}, Owner: {agent_owner}")
        
        # Mock Fire22 response based on real agent structure
        agents_response = {
            'success': True,
            'operation': operation,
            'agentID': agent_id,
            'agentType': agent_type,
            'timestamp': datetime.now().isoformat(),
            'agents': [
                {
                    'agentID': 'BLAKEPPH',
                    'agentType': 'M',
                    'agentName': 'Blake Manager',
                    'status': 'active',
                    'commission': 15.5,
                    'balance': 12450.00,
                    'totalCustomers': 2525,
                    'activeCustomers': 2144,
                    'lastActivity': (datetime.now() - timedelta(minutes=5)).isoformat(),
                    'permissions': ['view_reports', 'manage_customers', 'process_payments'],
                    'site': 1,
                    'region': 'US',
                    'subAgents': []
                },
                {
                    'agentID': '3NOLAPPH',
                    'agentType': 'A',
                    'agentName': 'Nola Agent',
                    'status': 'active',
                    'commission': 8.5,
                    'balance': 5240.00,
                    'totalCustomers': 156,
                    'activeCustomers': 98,
                    'lastActivity': (datetime.now() - timedelta(hours=2)).isoformat(),
                    'permissions': ['view_reports', 'manage_customers'],
                    'site': 1,
                    'region': 'US',
                    'parentAgent': 'BLAKEPPH'
                }
            ],
            'summary': {
                'totalAgents': 2,
                'activeAgents': 2,
                'totalBalance': 17690.00,
                'totalCustomers': 2681,
                'totalCommission': 24.0
            }
        }
        
        # Add CORS headers for Fire22 integration
        response = make_response(jsonify(agents_response))
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        return response
        
    except Exception as e:
        logger.error(f"Error in Fire22 agents API: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'operation': operation,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/fire22/dashboard-data', methods=['GET'])
def get_fire22_dashboard_data():
    """Fire22 Manager API - Get dashboard data for manager"""
    try:
        agent_id = request.args.get('agentID', '')
        
        # Get actual customer data from our database
        customers = db.get_all_customers()
        stats = db.get_statistics()
        
        # Format for Fire22 manager dashboard
        dashboard_data = {
            'success': True,
            'agentID': agent_id,
            'timestamp': datetime.now().isoformat(),
            'stats': {
                'totalCustomers': len(customers),
                'activeCustomers': stats.get('active_customers', 0),
                'totalBalance': stats.get('total_balance', 0),
                'totalRevenue': round(stats.get('total_balance', 0) * 0.15, 2),  # 15% commission estimate
                'totalTransactions': sum(1 for c in customers if c.weekly_pnl != 0),
                'averageBalance': stats.get('total_balance', 0) / max(len(customers), 1)
            },
            'recentCustomers': [
                {
                    'customerID': c.customer_id,
                    'balance': c.balance,
                    'weeklyPnL': c.weekly_pnl or 0,
                    'active': c.active,
                    'lastActivity': c.last_activity or datetime.now().isoformat(),
                    'registrationStatus': 'registered' if c.telegram_id else 'pending'
                }
                for c in customers[:20]  # Last 20 customers
            ],
            'topPerformers': [
                {
                    'customerID': c.customer_id,
                    'weeklyPnL': c.weekly_pnl or 0,
                    'balance': c.balance
                }
                for c in sorted(customers, key=lambda x: x.weekly_pnl or 0, reverse=True)[:10]
            ],
            'alerts': [
                {
                    'type': 'info',
                    'message': f'System operational - {len(customers)} customers managed',
                    'timestamp': datetime.now().isoformat()
                }
            ]
        }
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.error(f"Error getting Fire22 dashboard data: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/export/<format_type>')
def export_reports(format_type):
    """Export reports in different formats"""
    try:
        customers = db.get_all_customers()
        
        if format_type == 'csv':
            # Generate CSV content
            csv_content = "Customer ID,Balance,Weekly P&L,Active,Phone,Last Activity\n"
            for customer in customers:
                csv_content += f"{customer.customer_id},{customer.balance},{customer.weekly_pnl or 0},{customer.active},{customer.phone or ''},{customer.last_activity or ''}\n"
            
            response = make_response(csv_content)
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=customers_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response
            
        elif format_type == 'json':
            # Generate JSON report
            report_data = {
                'generated_at': datetime.now().isoformat(),
                'total_customers': len(customers),
                'active_customers': sum(1 for c in customers if c.active),
                'total_balance': sum(c.balance for c in customers),
                'customers': [
                    {
                        'customer_id': c.customer_id,
                        'balance': c.balance,
                        'weekly_pnl': c.weekly_pnl or 0,
                        'active': c.active,
                        'phone': c.phone,
                        'last_activity': c.last_activity
                    } for c in customers
                ]
            }
            
            response = make_response(json.dumps(report_data, indent=2))
            response.headers['Content-Type'] = 'application/json'
            response.headers['Content-Disposition'] = f'attachment; filename=customers_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            return response
            
        else:
            return jsonify({'error': 'Unsupported format. Use csv or json'}), 400
            
    except Exception as e:
        logger.error(f"Error exporting reports: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Basic health check endpoint with error tracking integration"""
    try:
        customers = db.get_all_customers()
        members = db.get_group_members()
        
        # Get error statistics from error tracker
        error_stats = error_tracker.get_error_stats()
        recent_errors = error_tracker.get_recent_errors(limit=5, severity=ErrorSeverity.CRITICAL)
        
        health_status = {
            'status': 'healthy',
            'database': os.path.exists('customer_database.json'),
            'customers_loaded': len(customers),
            'members_loaded': len(members),
            'timestamp': datetime.now().isoformat(),
            'error_tracking': {
                'total_errors': error_stats.get('total', 0),
                'errors_last_24h': error_stats.get('last_24h', 0),
                'critical_errors': len(recent_errors),
                'resolved_errors': error_stats.get('resolved', 0)
            }
        }
        
        # Determine if system is healthy based on error count
        if error_stats.get('last_24h', 0) > 100:
            health_status['status'] = 'degraded'
        if len(recent_errors) > 0:
            health_status['status'] = 'unhealthy'
            
        return jsonify(health_status)
        
    except Exception as e:
        # Log health check failure to error tracker
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.HIGH,
            context={'endpoint': '/health', 'action': 'health_check'},
            recoverable=True
        )
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/health/detailed')
def detailed_health_check():
    """Detailed health check with comprehensive system status and error tracking"""
    start_time = time.time()
    
    try:
        # Check database files
        db_checks = {
            'customer_database': os.path.exists('customer_database.json'),
            'customer_database_2500': os.path.exists('customer_database_2500.json'),
            'customer_config': os.path.exists('customer_config.json'),
        }
        
        # Check critical paths
        path_checks = {
            'static_files': os.path.exists('static'),
            'templates': os.path.exists('templates'),
            'src_modules': os.path.exists('src'),
            'logs': os.path.exists('logs'),
        }
        
        # Get system stats
        try:
            stats = db.get_statistics()
            db_status = 'operational'
        except Exception as e:
            stats = {}
            db_status = f'error: {str(e)}'
            # Log database error
            error_tracker.log_error(
                error=e,
                category=ErrorCategory.DATABASE,
                severity=ErrorSeverity.HIGH,
                context={'endpoint': '/health/detailed', 'action': 'get_statistics'},
                recoverable=True
            )
        
        # Get error tracking statistics
        error_stats = error_tracker.get_error_stats()
        recent_critical = error_tracker.get_recent_errors(limit=3, severity=ErrorSeverity.CRITICAL)
        recent_high = error_tracker.get_recent_errors(limit=5, severity=ErrorSeverity.HIGH)
        
        # Determine overall health status
        health_status = 'healthy'
        if not all(db_checks.values()):
            health_status = 'degraded'
        if error_stats.get('last_24h', 0) > 50:
            health_status = 'degraded'
        if len(recent_critical) > 0 or db_status != 'operational':
            health_status = 'unhealthy'
        
        # Calculate uptime (approximate based on server start)
        uptime_seconds = int(time.time() - start_time)
        
        return jsonify({
            'status': health_status,
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': round((time.time() - start_time) * 1000, 2),
            'database': {
                'status': db_status,
                'files': db_checks,
                'customers_loaded': len(db.get_all_customers()),
                'members_loaded': len(db.get_group_members()),
                'total_balance': stats.get('total_balance', 0),
                'active_customers': stats.get('active_customers', 0)
            },
            'error_tracking': {
                'status': 'active',
                'total_errors': error_stats.get('total', 0),
                'errors_last_24h': error_stats.get('last_24h', 0),
                'errors_by_category': error_stats.get('by_category', {}),
                'errors_by_severity': error_stats.get('by_severity', {}),
                'resolved_errors': error_stats.get('resolved', 0),
                'critical_errors': [
                    {
                        'id': err.get('id'),
                        'category': err.get('category'),
                        'message': err.get('error_message', '')[:100],
                        'timestamp': err.get('timestamp')
                    } for err in recent_critical
                ],
                'high_priority_errors': len(recent_high)
            },
            'paths': path_checks,
            'endpoints': {
                'total': len(app.url_map._rules),
                'api': sum(1 for rule in app.url_map._rules if '/api/' in rule.rule),
                'admin': sum(1 for rule in app.url_map._rules if '/admin' in rule.rule),
            },
            'server': {
                'version': '2.0.0',
                'python_version': sys.version.split()[0],
                'platform': sys.platform,
                'uptime_seconds': uptime_seconds
            }
        })
        
    except Exception as e:
        # Log critical health check failure
        error_id = error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.CRITICAL,
            context={'endpoint': '/health/detailed', 'action': 'detailed_health_check'},
            recoverable=False
        )
        return jsonify({
            'status': 'error',
            'error': str(e),
            'error_id': error_id,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/health/live')
def liveness_probe():
    """Kubernetes-style liveness probe"""
    return jsonify({'status': 'alive', 'timestamp': datetime.now().isoformat()}), 200

@app.route('/health/ready')
def readiness_probe():
    """Kubernetes-style readiness probe with error tracking"""
    try:
        # Check if database is accessible
        customers = db.get_all_customers()
        
        # Check error tracking system
        error_stats = error_tracker.get_error_stats()
        critical_errors = error_tracker.get_recent_errors(limit=1, severity=ErrorSeverity.CRITICAL)
        
        # System is not ready if there are recent critical errors
        if len(critical_errors) > 0:
            error_tracker.log_error(
                error=Exception("System not ready due to critical errors"),
                category=ErrorCategory.API,
                severity=ErrorSeverity.MEDIUM,
                context={'endpoint': '/health/ready', 'critical_errors': len(critical_errors)},
                recoverable=True
            )
            return jsonify({
                'status': 'not_ready', 
                'error': 'Critical errors detected',
                'critical_error_count': len(critical_errors)
            }), 503
        
        if customers is not None:
            return jsonify({
                'status': 'ready',
                'timestamp': datetime.now().isoformat(),
                'error_stats': {
                    'last_24h': error_stats.get('last_24h', 0),
                    'resolved': error_stats.get('resolved', 0)
                }
            }), 200
        else:
            error_tracker.log_error(
                error=Exception("Database not loaded"),
                category=ErrorCategory.DATABASE,
                severity=ErrorSeverity.HIGH,
                context={'endpoint': '/health/ready'},
                recoverable=True
            )
            return jsonify({'status': 'not_ready', 'error': 'Database not loaded'}), 503
            
    except Exception as e:
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.HIGH,
            context={'endpoint': '/health/ready', 'action': 'readiness_check'},
            recoverable=True
        )
        return jsonify({'status': 'not_ready', 'error': str(e)}), 503

@app.route('/health/metrics')
def health_metrics():
    """Prometheus-style metrics endpoint with error tracking integration"""
    try:
        metrics = []
        
        # Database metrics
        customers = db.get_all_customers()
        members = db.get_group_members()
        stats = db.get_statistics()
        
        # Error tracking metrics
        error_stats = error_tracker.get_error_stats()
        critical_errors = error_tracker.get_recent_errors(limit=10, severity=ErrorSeverity.CRITICAL)
        
        # Determine health status based on errors
        health_status = 1  # healthy
        if error_stats.get('last_24h', 0) > 100:
            health_status = 0  # unhealthy
        if len(critical_errors) > 0:
            health_status = 0  # unhealthy
        
        # Database metrics
        metrics.append(f'# HELP portal_customers_total Total number of customers')
        metrics.append(f'# TYPE portal_customers_total gauge')
        metrics.append(f'portal_customers_total {len(customers)}')
        
        metrics.append(f'# HELP portal_members_total Total number of group members')
        metrics.append(f'# TYPE portal_members_total gauge')
        metrics.append(f'portal_members_total {len(members)}')
        
        metrics.append(f'# HELP portal_balance_total Total balance across all customers')
        metrics.append(f'# TYPE portal_balance_total gauge')
        metrics.append(f'portal_balance_total {stats.get("total_balance", 0)}')
        
        metrics.append(f'# HELP portal_active_customers Active customers count')
        metrics.append(f'# TYPE portal_active_customers gauge')
        metrics.append(f'portal_active_customers {stats.get("active_customers", 0)}')
        
        # Error tracking metrics
        metrics.append(f'# HELP portal_errors_total Total number of errors')
        metrics.append(f'# TYPE portal_errors_total counter')
        metrics.append(f'portal_errors_total {error_stats.get("total", 0)}')
        
        metrics.append(f'# HELP portal_errors_last_24h Errors in last 24 hours')
        metrics.append(f'# TYPE portal_errors_last_24h gauge')
        metrics.append(f'portal_errors_last_24h {error_stats.get("last_24h", 0)}')
        
        metrics.append(f'# HELP portal_errors_resolved Total resolved errors')
        metrics.append(f'# TYPE portal_errors_resolved counter')
        metrics.append(f'portal_errors_resolved {error_stats.get("resolved", 0)}')
        
        metrics.append(f'# HELP portal_critical_errors_active Active critical errors')
        metrics.append(f'# TYPE portal_critical_errors_active gauge')
        metrics.append(f'portal_critical_errors_active {len(critical_errors)}')
        
        # Error breakdown by category
        for category, count in error_stats.get('by_category', {}).items():
            metrics.append(f'# HELP portal_errors_by_category_{category.lower()} Errors by category: {category}')
            metrics.append(f'# TYPE portal_errors_by_category_{category.lower()} counter')
            metrics.append(f'portal_errors_by_category_{category.lower()} {count}')
        
        # Error breakdown by severity
        for severity, count in error_stats.get('by_severity', {}).items():
            metrics.append(f'# HELP portal_errors_by_severity_{severity.lower()} Errors by severity: {severity}')
            metrics.append(f'# TYPE portal_errors_by_severity_{severity.lower()} counter')
            metrics.append(f'portal_errors_by_severity_{severity.lower()} {count}')
        
        # Overall health status
        metrics.append(f'# HELP portal_health_status Portal health status (1=healthy, 0=unhealthy)')
        metrics.append(f'# TYPE portal_health_status gauge')
        metrics.append(f'portal_health_status {health_status}')
        
        return '\n'.join(metrics), 200, {'Content-Type': 'text/plain; version=0.0.4'}
        
    except Exception as e:
        # Log metrics generation failure
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.MEDIUM,
            context={'endpoint': '/health/metrics', 'action': 'generate_metrics'},
            recoverable=True
        )
        # Return minimal metrics on error
        return f'portal_health_status 0\nportal_metrics_error 1', 500, {'Content-Type': 'text/plain; version=0.0.4'}

@app.route('/health/errors')
def health_errors():
    """Get recent errors from error tracking system"""
    try:
        limit = request.args.get('limit', 10, type=int)
        category = request.args.get('category', None)
        severity = request.args.get('severity', None)
        
        # Get errors based on filters
        errors = error_tracker.get_recent_errors(limit=limit, category=category, severity=severity)
        error_stats = error_tracker.get_error_stats()
        
        # Format errors for response
        formatted_errors = []
        for error in errors:
            formatted_errors.append({
                'id': error.get('id'),
                'timestamp': error.get('timestamp'),
                'category': error.get('category'),
                'severity': error.get('severity'),
                'error_type': error.get('error_type'),
                'message': error.get('error_message', '')[:200],
                'resolved': error.get('resolved', False),
                'recoverable': error.get('recoverable', True),
                'user_id': error.get('user_id'),
                'context': error.get('context', {})
            })
        
        return jsonify({
            'errors': formatted_errors,
            'count': len(formatted_errors),
            'statistics': {
                'total': error_stats.get('total', 0),
                'last_24h': error_stats.get('last_24h', 0),
                'resolved': error_stats.get('resolved', 0),
                'by_category': error_stats.get('by_category', {}),
                'by_severity': error_stats.get('by_severity', {})
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.LOW,
            context={'endpoint': '/health/errors', 'action': 'get_errors'},
            recoverable=True
        )
        return jsonify({'error': str(e)}), 500

@app.route('/health/errors/<error_id>/resolve', methods=['POST'])
def resolve_health_error(error_id):
    """Mark an error as resolved"""
    try:
        resolution = request.json.get('resolution', 'Resolved via health check API')
        
        success = error_tracker.resolve_error(error_id, resolution)
        
        if success:
            return jsonify({
                'success': True,
                'error_id': error_id,
                'message': 'Error resolved successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Error not found'
            }), 404
            
    except Exception as e:
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.LOW,
            context={'endpoint': f'/health/errors/{error_id}/resolve', 'action': 'resolve_error'},
            recoverable=True
        )
        return jsonify({'error': str(e)}), 500

@app.route('/ping')
def ping():
    """Simple ping endpoint for uptime monitoring"""
    return 'pong', 200

@app.route('/status')
def status():
    """Status endpoint with minimal info"""
    return jsonify({
        'status': 'online',
        'service': 'Fantdev Trading Portal',
        'timestamp': datetime.now().isoformat()
    })

# Register notification API routes
# register_notification_api(app)  # Temporarily disabled - missing services module

# Register enhanced customer API routes
# from src.api.enhanced_customer_api import register_enhanced_customer_api  # Temporarily disabled - missing services module
# register_enhanced_customer_api(app)

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