from flask import Blueprint, jsonify, request
from flask import Blueprint, jsonify, request
import logging

from src.portal.db.repositories import db
from src.portal.utils.auth_utils import generate_jwt_token # Import the utility function

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth_bp.route('/api/login', methods=['POST'])
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

        # Generate JWT token using the utility function
        token = generate_jwt_token(customer_id)

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
