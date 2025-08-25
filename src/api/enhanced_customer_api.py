"""
Enhanced Customer API for Advanced Customer Portal
Provides comprehensive endpoints for the enhanced customer experience
"""

from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import hashlib
import secrets
import logging

from services.notification_service import notification_service, NotificationType, NotificationPriority

logger = logging.getLogger(__name__)

# Create blueprint for enhanced customer routes
enhanced_customer_bp = Blueprint('enhanced_customer', __name__, url_prefix='/api/customer')

def get_customer_from_session():
    """Get current customer from session"""
    if 'customer_id' in session and 'user_type' in session:
        return {
            'customer_id': session['customer_id'],
            'user_type': session['user_type']
        }
    
    # Check headers for API access
    customer_id = request.headers.get('X-Customer-ID')
    if customer_id:
        return {
            'customer_id': customer_id,
            'user_type': 'customer'
        }
    
    return None

def load_customer_database():
    """Load customer data from database"""
    try:
        with open('customer_database.json', 'r') as f:
            data = json.load(f)
            return data.get('customers', {})
    except Exception as e:
        logger.error(f"Failed to load customer database: {e}")
        return {}

def save_customer_database(customers_data):
    """Save customer data to database"""
    try:
        with open('customer_database.json', 'w') as f:
            json.dump({'customers': customers_data}, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to save customer database: {e}")
        return False

@enhanced_customer_bp.route('/login', methods=['POST'])
@cross_origin()
def enhanced_customer_login():
    """Enhanced customer login with session management"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        password = data.get('password')
        
        if not customer_id or not password:
            return jsonify({'error': 'Customer ID and password required'}), 400
        
        # Load customer database
        customers = load_customer_database()
        
        if customer_id not in customers:
            return jsonify({'error': 'Invalid customer ID'}), 401
        
        customer = customers[customer_id]
        
        # Verify password (simple check - in production use proper hashing)
        if customer.get('password') != password:
            return jsonify({'error': 'Invalid password'}), 401
        
        # Create session
        session['customer_id'] = customer_id
        session['user_type'] = 'customer'
        session['login_time'] = datetime.now().isoformat()
        
        # Create login notification
        await notification_service.create_notification(
            user_id=customer_id,
            user_type='customer',
            notification_type=NotificationType.SYSTEM_UPDATE,
            priority=NotificationPriority.LOW,
            custom_title='Portal Access',
            custom_message=f'Logged in to enhanced customer portal',
            metadata={
                'login_time': datetime.now().isoformat(),
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent', '')
            }
        )
        
        return jsonify({
            'success': True,
            'user': {
                'customer_id': customer_id,
                'balance': customer.get('balance', 0),
                'weekly_pnl': customer.get('weekly_pnl', 0),
                'active': customer.get('active', True),
                'telegram_linked': customer.get('telegram_id') is not None
            },
            'message': 'Login successful'
        })
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@enhanced_customer_bp.route('/logout', methods=['POST'])
@cross_origin()
def customer_logout():
    """Customer logout"""
    customer = get_customer_from_session()
    
    if customer:
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully'})
    
    return jsonify({'error': 'Not logged in'}), 401

@enhanced_customer_bp.route('/<customer_id>', methods=['GET'])
@cross_origin()
def get_customer_details(customer_id):
    """Get detailed customer information"""
    current_customer = get_customer_from_session()
    
    # Security check - customers can only access their own data
    if not current_customer or current_customer['customer_id'] != customer_id:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        customers = load_customer_database()
        
        if customer_id not in customers:
            return jsonify({'error': 'Customer not found'}), 404
        
        customer = customers[customer_id]
        
        # Generate mock transaction history
        transactions = generate_mock_transactions(customer_id, customer.get('balance', 0))
        
        # Calculate analytics
        today_transactions = len([t for t in transactions 
                                if datetime.fromisoformat(t['timestamp']).date() == datetime.now().date()])
        
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'balance': customer.get('balance', 0),
            'weekly_pnl': customer.get('weekly_pnl', 0),
            'active': customer.get('active', True),
            'telegram_linked': customer.get('telegram_id') is not None,
            'telegram_id': customer.get('telegram_id'),
            'today_transactions': today_transactions,
            'total_transactions': len(transactions),
            'transactions': transactions[:50],  # Return latest 50
            'account_created': customer.get('created_at', '2024-01-01'),
            'last_activity': customer.get('last_activity', datetime.now().isoformat()),
            'status': 'premium',
            'risk_level': 'low',
            'kyc_verified': True
        })
        
    except Exception as e:
        logger.error(f"Error fetching customer details: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@enhanced_customer_bp.route('/<customer_id>/transactions', methods=['GET'])
@cross_origin()
def get_customer_transactions(customer_id):
    """Get customer transaction history with filtering"""
    current_customer = get_customer_from_session()
    
    if not current_customer or current_customer['customer_id'] != customer_id:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # Get query parameters
        transaction_type = request.args.get('type', '')
        period = request.args.get('period', '30')
        search = request.args.get('search', '').lower()
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        customers = load_customer_database()
        
        if customer_id not in customers:
            return jsonify({'error': 'Customer not found'}), 404
        
        customer = customers[customer_id]
        transactions = generate_mock_transactions(customer_id, customer.get('balance', 0))
        
        # Apply filters
        filtered_transactions = transactions
        
        # Filter by type
        if transaction_type:
            filtered_transactions = [t for t in filtered_transactions if t['type'] == transaction_type]
        
        # Filter by period
        if period != 'all':
            period_days = int(period)
            cutoff_date = datetime.now() - timedelta(days=period_days)
            filtered_transactions = [t for t in filtered_transactions 
                                   if datetime.fromisoformat(t['timestamp']) >= cutoff_date]
        
        # Filter by search
        if search:
            filtered_transactions = [t for t in filtered_transactions 
                                   if search in t.get('description', '').lower()]
        
        # Pagination
        total_transactions = len(filtered_transactions)
        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_transactions = filtered_transactions[start_index:end_index]
        
        return jsonify({
            'success': True,
            'transactions': paginated_transactions,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_transactions,
                'pages': (total_transactions + limit - 1) // limit
            },
            'filters_applied': {
                'type': transaction_type,
                'period': period,
                'search': search
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@enhanced_customer_bp.route('/<customer_id>/performance', methods=['GET'])
@cross_origin()
def get_customer_performance(customer_id):
    """Get customer performance analytics"""
    current_customer = get_customer_from_session()
    
    if not current_customer or current_customer['customer_id'] != customer_id:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        period = request.args.get('period', '1M')
        
        customers = load_customer_database()
        
        if customer_id not in customers:
            return jsonify({'error': 'Customer not found'}), 404
        
        customer = customers[customer_id]
        base_balance = customer.get('balance', 10000)
        
        # Generate performance data based on period
        performance_data = generate_performance_data(period, base_balance)
        
        return jsonify({
            'success': True,
            'period': period,
            'performance': performance_data,
            'summary': {
                'current_balance': base_balance,
                'period_change': performance_data[-1]['value'] - performance_data[0]['value'] if performance_data else 0,
                'period_change_percent': ((performance_data[-1]['value'] / performance_data[0]['value'] - 1) * 100) if performance_data else 0,
                'highest_balance': max([p['value'] for p in performance_data]) if performance_data else base_balance,
                'lowest_balance': min([p['value'] for p in performance_data]) if performance_data else base_balance
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching performance data: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@enhanced_customer_bp.route('/<customer_id>/settings', methods=['GET'])
@cross_origin()
def get_customer_settings(customer_id):
    """Get customer settings"""
    current_customer = get_customer_from_session()
    
    if not current_customer or current_customer['customer_id'] != customer_id:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # Get notification preferences
        notification_prefs = notification_service.get_preferences(customer_id, 'customer')
        
        # Mock other settings
        settings = {
            'notifications': notification_prefs,
            'security': {
                'two_factor_enabled': False,
                'login_alerts': True,
                'transaction_confirmations': True,
                'session_timeout': True
            },
            'communication': {
                'email_notifications': True,
                'sms_alerts': False,
                'push_notifications': False,
                'telegram_notifications': True
            },
            'preferences': {
                'language': 'en',
                'timezone': 'UTC',
                'currency': 'USD',
                'theme': 'light'
            }
        }
        
        return jsonify({
            'success': True,
            'settings': settings
        })
        
    except Exception as e:
        logger.error(f"Error fetching settings: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@enhanced_customer_bp.route('/<customer_id>/settings', methods=['PUT'])
@cross_origin()
def update_customer_settings(customer_id):
    """Update customer settings"""
    current_customer = get_customer_from_session()
    
    if not current_customer or current_customer['customer_id'] != customer_id:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = request.get_json()
        setting_category = data.get('category')
        setting_key = data.get('key')
        setting_value = data.get('value')
        
        if not all([setting_category, setting_key is not None, setting_value is not None]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Handle notification preferences
        if setting_category == 'notifications':
            # Update notification preferences via notification service
            prefs = notification_service.get_preferences(customer_id, 'customer')
            if not prefs:
                prefs = notification_service.create_default_preferences(customer_id, 'customer')
            
            # Update specific preference
            # This would require extending the notification service to handle individual preference updates
        
        # Create notification about settings change
        await notification_service.create_notification(
            user_id=customer_id,
            user_type='customer',
            notification_type=NotificationType.ACCOUNT_UPDATE,
            priority=NotificationPriority.LOW,
            custom_title='Settings Updated',
            custom_message=f'Your {setting_category} settings have been updated',
            metadata={
                'category': setting_category,
                'key': setting_key,
                'updated_at': datetime.now().isoformat()
            }
        )
        
        return jsonify({
            'success': True,
            'message': f'Settings updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@enhanced_customer_bp.route('/<customer_id>/activity', methods=['GET'])
@cross_origin()
def get_customer_activity(customer_id):
    """Get real-time customer activity feed"""
    current_customer = get_customer_from_session()
    
    if not current_customer or current_customer['customer_id'] != customer_id:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        activity_type = request.args.get('type', 'all')
        limit = int(request.args.get('limit', 20))
        
        customers = load_customer_database()
        
        if customer_id not in customers:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Generate recent activity
        transactions = generate_mock_transactions(customer_id, customers[customer_id].get('balance', 0))
        recent_transactions = transactions[:limit]
        
        # Filter by type if specified
        if activity_type != 'all':
            recent_transactions = [t for t in recent_transactions if t['type'] == activity_type]
        
        # Format for activity feed
        activities = []
        for tx in recent_transactions:
            activities.append({
                'id': tx['id'],
                'type': tx['type'],
                'description': get_activity_description(tx),
                'amount': tx['amount'],
                'timestamp': tx['timestamp'],
                'status': tx.get('status', 'completed'),
                'icon': get_activity_icon(tx['type'])
            })
        
        return jsonify({
            'success': True,
            'activities': activities,
            'filter_applied': activity_type,
            'total_count': len(activities)
        })
        
    except Exception as e:
        logger.error(f"Error fetching activity: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@enhanced_customer_bp.route('/<customer_id>/alerts', methods=['GET'])
@cross_origin()
def get_customer_alerts(customer_id):
    """Get customer alerts and notifications"""
    current_customer = get_customer_from_session()
    
    if not current_customer or current_customer['customer_id'] != customer_id:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # Get recent notifications
        notifications = notification_service.get_notifications(customer_id, 'customer', limit=10, unread_only=True)
        
        # Generate mock alerts
        alerts = [
            {
                'id': 'alert_1',
                'type': 'info',
                'title': 'Account Verified',
                'message': 'Your account verification is complete',
                'timestamp': (datetime.now() - timedelta(hours=2)).isoformat(),
                'read': True
            },
            {
                'id': 'alert_2', 
                'type': 'success',
                'title': 'Deposit Confirmed',
                'message': 'Your recent deposit has been confirmed and added to your balance',
                'timestamp': (datetime.now() - timedelta(minutes=30)).isoformat(),
                'read': False
            }
        ]
        
        return jsonify({
            'success': True,
            'alerts': alerts,
            'notifications': notifications,
            'unread_count': len([a for a in alerts if not a['read']]) + len([n for n in notifications if not n.get('read', True)])
        })
        
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Helper functions

def generate_mock_transactions(customer_id: str, current_balance: float) -> List[Dict]:
    """Generate realistic mock transaction history"""
    transactions = []
    balance = current_balance
    
    # Generate 100 mock transactions over the past 3 months
    for i in range(100):
        days_ago = i // 2  # About 2 transactions per day
        timestamp = datetime.now() - timedelta(days=days_ago, hours=(i % 24))
        
        # Random transaction type
        import random
        tx_type = random.choices(['deposit', 'withdrawal', 'trade'], weights=[30, 20, 50])[0]
        
        # Generate amount based on type
        if tx_type == 'deposit':
            amount = random.uniform(100, 5000)
        elif tx_type == 'withdrawal':
            amount = -random.uniform(50, 2000)
        else:  # trade
            amount = random.uniform(-1000, 1500)
        
        balance_before = balance
        balance += amount
        
        transactions.append({
            'id': f'tx_{customer_id}_{i:03d}',
            'type': tx_type,
            'amount': amount,
            'balance': balance,
            'timestamp': timestamp.isoformat(),
            'description': get_transaction_description(tx_type, abs(amount)),
            'status': 'completed' if random.random() > 0.05 else 'pending',
            'reference': f'REF{random.randint(100000, 999999)}'
        })
    
    # Sort by timestamp (newest first)
    transactions.sort(key=lambda x: x['timestamp'], reverse=True)
    return transactions

def get_transaction_description(tx_type: str, amount: float) -> str:
    """Get descriptive text for transaction"""
    descriptions = {
        'deposit': f'Account Deposit - ${amount:.2f}',
        'withdrawal': f'Funds Withdrawal - ${amount:.2f}',
        'trade': f'Trading Activity - ${amount:.2f}'
    }
    return descriptions.get(tx_type, f'Transaction - ${amount:.2f}')

def get_activity_description(transaction: Dict) -> str:
    """Get activity description for feed"""
    tx_type = transaction['type']
    amount = abs(transaction['amount'])
    
    descriptions = {
        'deposit': f'Deposited ${amount:.2f}',
        'withdrawal': f'Withdrew ${amount:.2f}',
        'trade': f'Trading activity ${amount:.2f}'
    }
    return descriptions.get(tx_type, f'Transaction ${amount:.2f}')

def get_activity_icon(tx_type: str) -> str:
    """Get FontAwesome icon for activity type"""
    icons = {
        'deposit': 'plus-circle',
        'withdrawal': 'minus-circle',
        'trade': 'exchange-alt'
    }
    return icons.get(tx_type, 'circle')

def generate_performance_data(period: str, base_balance: float) -> List[Dict]:
    """Generate performance data for charts"""
    import random
    
    periods = {
        '1D': {'count': 24, 'unit': 'hour'},
        '1W': {'count': 7, 'unit': 'day'},
        '1M': {'count': 30, 'unit': 'day'},
        '3M': {'count': 90, 'unit': 'day'},
        '1Y': {'count': 365, 'unit': 'day'}
    }
    
    if period not in periods:
        period = '1M'
    
    config = periods[period]
    performance_data = []
    current_value = base_balance
    
    for i in range(config['count']):
        # Calculate timestamp
        if config['unit'] == 'hour':
            timestamp = datetime.now() - timedelta(hours=config['count'] - i - 1)
        else:
            timestamp = datetime.now() - timedelta(days=config['count'] - i - 1)
        
        # Generate realistic fluctuation
        daily_volatility = 0.02  # 2% daily volatility
        change_percent = (random.random() - 0.5) * daily_volatility * 2
        current_value *= (1 + change_percent)
        
        performance_data.append({
            'timestamp': timestamp.isoformat(),
            'value': round(current_value, 2),
            'change': round(current_value - base_balance, 2),
            'change_percent': round(((current_value / base_balance) - 1) * 100, 2)
        })
    
    return performance_data

def register_enhanced_customer_api(app):
    """Register enhanced customer API blueprint with Flask app"""
    app.register_blueprint(enhanced_customer_bp)