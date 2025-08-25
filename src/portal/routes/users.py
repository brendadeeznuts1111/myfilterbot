from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import logging

from src.portal.db.repositories import db
from src.portal.utils.config_utils import load_customer_config # Import the utility function

users_bp = Blueprint('users', __name__)
logger = logging.getLogger(__name__)

@users_bp.route('/api/customer/<customer_id>')
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

@users_bp.route('/api/stats')
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

@users_bp.route('/api/transactions/<customer_id>')
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
