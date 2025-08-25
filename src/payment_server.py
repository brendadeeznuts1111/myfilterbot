#!/usr/bin/env python3
"""
Payment Server with API Endpoints
Integrates payment gateway and cashier management
"""

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import asyncio
import os
from decimal import Decimal
from datetime import datetime
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from payment_gateway import PaymentGateway, PaymentMethod, PaymentStatus, create_payment_gateway
from cashier_manager import CashierManager, create_cashier_manager, WithdrawalStatus
from database import db

app = Flask(__name__)
app.config['SECRET_KEY'] = 'payment-secret-key-change-in-production'
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize payment systems
payment_gateway = create_payment_gateway()
cashier_manager = create_cashier_manager()

# ============= Deposit Endpoints =============

@app.route('/api/payment/deposit/methods', methods=['GET'])
def get_deposit_methods():
    """Get available deposit methods"""
    methods = [
        {
            'id': 'stripe',
            'name': 'Credit/Debit Card',
            'icon': 'fa-credit-card',
            'min': 10,
            'max': 5000,
            'fee': '2.9% + $0.30',
            'processing_time': 'Instant',
            'supported_currencies': ['USD', 'EUR', 'GBP']
        },
        {
            'id': 'paypal',
            'name': 'PayPal',
            'icon': 'fa-paypal',
            'min': 10,
            'max': 5000,
            'fee': '2.9%',
            'processing_time': 'Instant',
            'supported_currencies': ['USD', 'EUR', 'GBP']
        },
        {
            'id': 'crypto_btc',
            'name': 'Bitcoin',
            'icon': 'fa-bitcoin',
            'min': 50,
            'max': 10000,
            'fee': 'Network fee only',
            'processing_time': '10-60 minutes',
            'supported_currencies': ['BTC']
        },
        {
            'id': 'crypto_eth',
            'name': 'Ethereum',
            'icon': 'fa-ethereum',
            'min': 50,
            'max': 10000,
            'fee': 'Gas fee only',
            'processing_time': '2-10 minutes',
            'supported_currencies': ['ETH']
        },
        {
            'id': 'crypto_usdt',
            'name': 'USDT (Tether)',
            'icon': 'fa-dollar-sign',
            'min': 10,
            'max': 10000,
            'fee': 'Network fee only',
            'processing_time': '5-20 minutes',
            'supported_currencies': ['USDT']
        },
        {
            'id': 'bank_transfer',
            'name': 'Bank Transfer',
            'icon': 'fa-university',
            'min': 100,
            'max': 20000,
            'fee': '$5',
            'processing_time': '1-3 business days',
            'supported_currencies': ['USD', 'EUR']
        }
    ]
    
    return jsonify({'methods': methods})

@app.route('/api/payment/deposit/request', methods=['POST'])
def request_deposit():
    """Request a deposit"""
    try:
        data = request.json
        customer_id = data.get('customer_id')
        amount = Decimal(str(data.get('amount', 0)))
        currency = data.get('currency', 'USD')
        payment_method = PaymentMethod(data.get('payment_method'))
        
        # Process through cashier manager
        result = cashier_manager.request_deposit(
            customer_id=customer_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            return_url=data.get('return_url'),
            callback_url=data.get('callback_url')
        )
        
        # Emit WebSocket event
        if result['success']:
            socketio.emit('deposit_initiated', {
                'customer_id': customer_id,
                'amount': float(amount),
                'currency': currency,
                'transaction_id': result.get('transaction_id')
            }, room=f"customer_{customer_id}")
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ============= Withdrawal Endpoints =============

@app.route('/api/payment/withdrawal/methods', methods=['GET'])
def get_withdrawal_methods():
    """Get available withdrawal methods"""
    methods = [
        {
            'id': 'paypal',
            'name': 'PayPal',
            'icon': 'fa-paypal',
            'min': 50,
            'max': 5000,
            'fee': '$2',
            'processing_time': '1-2 business days',
            'required_fields': ['email']
        },
        {
            'id': 'bank_transfer',
            'name': 'Bank Transfer',
            'icon': 'fa-university',
            'min': 100,
            'max': 10000,
            'fee': '$10',
            'processing_time': '2-5 business days',
            'required_fields': ['account_number', 'routing_number', 'account_name']
        },
        {
            'id': 'crypto_btc',
            'name': 'Bitcoin',
            'icon': 'fa-bitcoin',
            'min': 100,
            'max': 10000,
            'fee': 'Network fee only',
            'processing_time': '1-2 hours',
            'required_fields': ['wallet_address']
        },
        {
            'id': 'crypto_usdt',
            'name': 'USDT (Tether)',
            'icon': 'fa-dollar-sign',
            'min': 50,
            'max': 10000,
            'fee': 'Network fee only',
            'processing_time': '30-60 minutes',
            'required_fields': ['wallet_address', 'network']
        }
    ]
    
    return jsonify({'methods': methods})

@app.route('/api/payment/withdrawal/request', methods=['POST'])
def request_withdrawal():
    """Request a withdrawal"""
    try:
        data = request.json
        customer_id = data.get('customer_id')
        amount = Decimal(str(data.get('amount', 0)))
        currency = data.get('currency', 'USD')
        payment_method = PaymentMethod(data.get('payment_method'))
        destination = data.get('destination', {})
        
        # Process through cashier manager
        result = cashier_manager.request_withdrawal(
            customer_id=customer_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            destination=destination
        )
        
        # Emit WebSocket event
        if result['success']:
            socketio.emit('withdrawal_requested', {
                'customer_id': customer_id,
                'amount': float(amount),
                'currency': currency,
                'request_id': result.get('request_id'),
                'status': result.get('status')
            }, room=f"customer_{customer_id}")
            
            # Notify admin if approval required
            if result.get('requires_approval'):
                socketio.emit('withdrawal_pending_approval', {
                    'request_id': result.get('request_id'),
                    'customer_id': customer_id,
                    'amount': float(amount),
                    'currency': currency
                }, room='admin')
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/payment/withdrawal/<request_id>/approve', methods=['POST'])
def approve_withdrawal(request_id):
    """Approve a withdrawal request (admin only)"""
    try:
        data = request.json
        approved_by = data.get('approved_by', 'admin')
        override_checks = data.get('override_checks', False)
        
        result = cashier_manager.approve_withdrawal(
            request_id=request_id,
            approved_by=approved_by,
            override_checks=override_checks
        )
        
        # Get request details for notifications
        if result['success']:
            request_data = cashier_manager.withdrawal_requests.get(request_id)
            if request_data:
                # Notify customer
                socketio.emit('withdrawal_approved', {
                    'request_id': request_id,
                    'transaction_id': result.get('transaction_id'),
                    'status': 'processing'
                }, room=f"customer_{request_data.customer_id}")
                
                # Notify admin
                socketio.emit('withdrawal_status_update', {
                    'request_id': request_id,
                    'status': 'approved',
                    'approved_by': approved_by
                }, room='admin')
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/payment/withdrawal/<request_id>/reject', methods=['POST'])
def reject_withdrawal(request_id):
    """Reject a withdrawal request (admin only)"""
    try:
        data = request.json
        reason = data.get('reason', 'Request rejected by admin')
        rejected_by = data.get('rejected_by', 'admin')
        
        result = cashier_manager.reject_withdrawal(
            request_id=request_id,
            reason=reason,
            rejected_by=rejected_by
        )
        
        # Get request details for notifications
        if result['success']:
            request_data = cashier_manager.withdrawal_requests.get(request_id)
            if request_data:
                # Notify customer
                socketio.emit('withdrawal_rejected', {
                    'request_id': request_id,
                    'reason': reason
                }, room=f"customer_{request_data.customer_id}")
                
                # Notify admin
                socketio.emit('withdrawal_status_update', {
                    'request_id': request_id,
                    'status': 'rejected',
                    'rejected_by': rejected_by,
                    'reason': reason
                }, room='admin')
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ============= Transaction Endpoints =============

@app.route('/api/payment/transaction/<transaction_id>/verify', methods=['GET'])
def verify_transaction(transaction_id):
    """Verify transaction status"""
    try:
        result = payment_gateway.verify_transaction(transaction_id)
        
        return jsonify({
            'transaction_id': result.transaction_id,
            'status': result.status.value,
            'timestamp': result.timestamp.isoformat() if result.timestamp else None
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/payment/transactions/<customer_id>', methods=['GET'])
def get_customer_transactions(customer_id):
    """Get customer transaction history"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        transactions = payment_gateway.get_transaction_history(
            customer_id=customer_id,
            limit=limit,
            offset=offset
        )
        
        # Convert datetime objects to strings
        for tx in transactions:
            if 'created_at' in tx and hasattr(tx['created_at'], 'isoformat'):
                tx['created_at'] = tx['created_at'].isoformat()
        
        return jsonify({
            'transactions': transactions,
            'total': len(transactions),
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/payment/summary/<customer_id>', methods=['GET'])
def get_transaction_summary(customer_id):
    """Get customer transaction summary"""
    try:
        summary = cashier_manager.get_transaction_summary(customer_id)
        stats = payment_gateway.get_transaction_stats(customer_id)
        
        return jsonify({
            **summary,
            **stats
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ============= KYC/Verification Endpoints =============

@app.route('/api/payment/verify/<customer_id>', methods=['POST'])
def verify_customer(customer_id):
    """Verify customer KYC/AML"""
    try:
        data = request.json
        verification_data = data.get('verification_data', {})
        documents = data.get('documents', [])
        
        result = cashier_manager.verify_customer(
            customer_id=customer_id,
            verification_data=verification_data,
            documents=documents
        )
        
        # Emit WebSocket event
        if result['success']:
            socketio.emit('verification_updated', {
                'customer_id': customer_id,
                'verification_status': result['verification_status'],
                'risk_level': result['risk_level']
            }, room=f"customer_{customer_id}")
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/payment/limits/<customer_id>', methods=['GET'])
def get_customer_limits(customer_id):
    """Get customer transaction limits"""
    try:
        limits = cashier_manager.get_customer_limits(customer_id)
        
        return jsonify({
            'daily_deposit_limit': float(limits.daily_deposit_limit),
            'daily_withdrawal_limit': float(limits.daily_withdrawal_limit),
            'monthly_deposit_limit': float(limits.monthly_deposit_limit),
            'monthly_withdrawal_limit': float(limits.monthly_withdrawal_limit),
            'single_deposit_max': float(limits.single_deposit_max),
            'single_withdrawal_max': float(limits.single_withdrawal_max),
            'min_deposit': float(limits.min_deposit),
            'min_withdrawal': float(limits.min_withdrawal)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ============= Admin Endpoints =============

@app.route('/api/payment/admin/pending-withdrawals', methods=['GET'])
def get_pending_withdrawals():
    """Get pending withdrawal requests (admin only)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        pending = cashier_manager.get_pending_withdrawals(limit)
        
        # Convert datetime objects
        for req in pending:
            for key in ['created_at', 'approved_at', 'processed_at']:
                if key in req and req[key] and hasattr(req[key], 'isoformat'):
                    req[key] = req[key].isoformat()
        
        return jsonify({
            'pending_withdrawals': pending,
            'total': len(pending)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/payment/admin/statistics', methods=['GET'])
def get_payment_statistics():
    """Get payment system statistics (admin only)"""
    try:
        total_deposits = 0
        total_withdrawals = 0
        pending_withdrawals = 0
        
        # Calculate from all transactions
        for tx in payment_gateway.transactions.values():
            if tx.transaction_type.value == 'deposit':
                total_deposits += float(tx.amount)
            elif tx.transaction_type.value == 'withdrawal':
                total_withdrawals += float(tx.amount)
        
        # Count pending withdrawals
        for req in cashier_manager.withdrawal_requests.values():
            if req.status == WithdrawalStatus.PENDING_APPROVAL:
                pending_withdrawals += 1
        
        return jsonify({
            'total_deposits': total_deposits,
            'total_withdrawals': total_withdrawals,
            'net_flow': total_deposits - total_withdrawals,
            'pending_withdrawals': pending_withdrawals,
            'total_transactions': len(payment_gateway.transactions),
            'active_processors': list(payment_gateway.processors.keys())
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ============= Webhook Endpoints =============

@app.route('/api/payment/webhook/stripe', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks"""
    try:
        payload = request.get_data()
        signature = request.headers.get('Stripe-Signature')
        
        # Verify webhook signature
        processor = payment_gateway.processors.get('stripe')
        if processor and processor.verify_webhook(payload, signature):
            # Process webhook event
            event = json.loads(payload)
            
            # Handle different event types
            if event['type'] == 'checkout.session.completed':
                # Payment successful
                transaction_id = event['data']['object']['client_reference_id']
                
                # Update transaction status
                if transaction_id in payment_gateway.transactions:
                    # Emit success event
                    socketio.emit('payment_completed', {
                        'transaction_id': transaction_id,
                        'status': 'completed'
                    })
            
            return jsonify({'received': True})
        
        return jsonify({'error': 'Invalid signature'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/payment/webhook/paypal', methods=['POST'])
def paypal_webhook():
    """Handle PayPal webhooks"""
    try:
        # Similar implementation for PayPal
        return jsonify({'received': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ============= Health Check =============

@app.route('/api/payment/health', methods=['GET'])
def health_check():
    """Payment system health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'processors': list(payment_gateway.processors.keys()),
        'active_transactions': len(payment_gateway.transactions),
        'pending_withdrawals': len([
            r for r in cashier_manager.withdrawal_requests.values()
            if r.status == WithdrawalStatus.PENDING_APPROVAL
        ])
    })

# ============= WebSocket Events =============

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    print(f"Payment client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    print(f"Payment client disconnected: {request.sid}")

@socketio.on('subscribe_payment_updates')
def handle_subscribe(data):
    """Subscribe to payment updates"""
    customer_id = data.get('customer_id')
    if customer_id:
        # Join customer room for targeted updates
        socketio.join_room(f"customer_{customer_id}")
        emit('subscribed', {'message': f'Subscribed to payment updates for {customer_id}'})

# ============= Main =============

if __name__ == '__main__':
        print("=" * 50)
        print("PAYMENT SERVER")
        print("=" * 50)
        payment_url = os.getenv('PAYMENT_SERVER_URL', 'http://localhost:5001')
        print(f"Starting payment server on {payment_url}")
        print(f"Payment gateway initialized")
        print(f"Cashier manager initialized")
        print("-" * 50)
    
        # Run with WebSocket support
        socketio.run(app, host='0.0.0.0', port=5001, debug=False, allow_unsafe_werkzeug=True)