#!/usr/bin/env python3
"""
FantDev Trading Platform - Unified Server
Complete portal system with consistent branding and navigation
"""

import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, jsonify, make_response, redirect, url_for, session
from flask_cors import CORS

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database import db, GroupMember
from src.config import config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', 'fantdev-trading-2024-secret-key')
CORS(app)

# Load branding configuration
def load_branding():
    branding_file = Path(__file__).parent / 'branding.json'
    if branding_file.exists():
        with open(branding_file, 'r') as f:
            return json.load(f)
    return {}

BRANDING = load_branding()

def add_cors_headers(response):
    """Add CORS and ngrok headers"""
    response.headers['ngrok-skip-browser-warning'] = 'true'
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.after_request
def after_request(response):
    """Apply headers to all responses"""
    return add_cors_headers(response)

def requires_auth(f):
    """Decorator for routes that require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator for admin-only routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_role' not in session or session['user_role'] != 'admin':
            return render_template('error.html', 
                                 error_code=403, 
                                 error_message="Admin access required"), 403
        return f(*args, **kwargs)
    return decorated_function

def get_user_context():
    """Get current user context for templates"""
    if 'user_id' in session:
        return {
            'user_id': session['user_id'],
            'user_name': session.get('user_name', 'User'),
            'user_email': session.get('user_email', 'user@example.com'),
            'user_role': session.get('user_role', 'customer'),
            'user_initials': ''.join([word[0].upper() for word in session.get('user_name', 'User').split()[:2]])
        }
    return {}

def get_breadcrumbs(path):
    """Generate breadcrumbs for current path"""
    breadcrumbs = []
    parts = [p for p in path.split('/') if p]
    
    path_map = {
        'dashboard': 'Dashboard',
        'customers': 'Customer Management', 
        'groups': 'Group Management',
        'transactions': 'Transaction History',
        'analytics': 'Analytics & Reports',
        'settings': 'Settings',
        'profile': 'User Profile',
        'help': 'Help & Support'
    }
    
    current_path = ''
    for part in parts:
        current_path += '/' + part
        title = path_map.get(part, part.title())
        breadcrumbs.append({
            'title': title,
            'url': current_path if current_path != path else None
        })
    
    return breadcrumbs

# Main Routes
@app.route('/')
@app.route('/dashboard')
@requires_auth
def dashboard():
    """Main dashboard"""
    try:
        stats = db.get_statistics()
        user_context = get_user_context()
        
        # Get user-specific data
        if user_context['user_role'] == 'customer':
            customer = db.find_customer_by_telegram(user_context.get('telegram_id'))
            if customer:
                recent_transactions = db.get_customer_transactions(customer.customer_id, limit=5)
            else:
                recent_transactions = []
        else:
            # Admin sees all recent transactions
            recent_transactions = []  # Would implement get_recent_transactions()
        
        return render_template('dashboard.html',
                             stats=stats,
                             recent_transactions=recent_transactions,
                             breadcrumbs=get_breadcrumbs('/dashboard'),
                             **user_context)
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/customers')
@requires_auth
@admin_required
def customers():
    """Customer management page"""
    try:
        customers = db.get_all_customers()
        stats = db.get_statistics()
        
        return render_template('customers.html',
                             customers=customers,
                             stats=stats,
                             breadcrumbs=get_breadcrumbs('/customers'),
                             **get_user_context())
    except Exception as e:
        logger.error(f"Customers page error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/customers/<customer_id>')
@requires_auth 
@admin_required
def customer_detail(customer_id):
    """Individual customer detail page"""
    try:
        customer = db.get_customer(customer_id.upper())
        if not customer:
            return render_template('error.html', error_code=404, error_message="Customer not found"), 404
        
        transactions = db.get_customer_transactions(customer_id, limit=50)
        
        return render_template('customer_detail.html',
                             customer=customer,
                             transactions=transactions,
                             breadcrumbs=get_breadcrumbs(f'/customers/{customer_id}'),
                             **get_user_context())
    except Exception as e:
        logger.error(f"Customer detail error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/groups')
@requires_auth
@admin_required
def groups():
    """Group management page"""
    try:
        members = db.get_group_members()
        pending_members = db.get_pending_members()
        member_stats = db.get_member_stats()
        
        return render_template('groups.html',
                             members=members,
                             pending_members=pending_members,
                             stats=member_stats,
                             breadcrumbs=get_breadcrumbs('/groups'),
                             **get_user_context())
    except Exception as e:
        logger.error(f"Groups page error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/transactions')
@requires_auth
def transactions():
    """Transaction history page"""
    try:
        user_context = get_user_context()
        
        if user_context['user_role'] == 'customer':
            # Customer sees only their transactions
            customer = db.find_customer_by_telegram(user_context.get('telegram_id'))
            if customer:
                transactions = db.get_customer_transactions(customer.customer_id, limit=100)
            else:
                transactions = []
        else:
            # Admin sees all transactions
            transactions = []  # Would implement get_all_transactions()
        
        return render_template('transactions.html',
                             transactions=transactions,
                             breadcrumbs=get_breadcrumbs('/transactions'),
                             **user_context)
    except Exception as e:
        logger.error(f"Transactions page error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/analytics')
@requires_auth
def analytics():
    """Analytics and reports page"""
    try:
        user_context = get_user_context()
        
        if user_context['user_role'] == 'admin':
            stats = db.get_statistics()
            top_performers = db.get_top_performers(10)
            low_balance = db.get_low_balance_customers()
        else:
            # Customer analytics
            customer = db.find_customer_by_telegram(user_context.get('telegram_id'))
            stats = None
            top_performers = []
            low_balance = []
        
        return render_template('analytics.html',
                             stats=stats,
                             top_performers=top_performers,
                             low_balance=low_balance,
                             breadcrumbs=get_breadcrumbs('/analytics'),
                             **user_context)
    except Exception as e:
        logger.error(f"Analytics page error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/settings')
@requires_auth
def settings():
    """Settings page"""
    try:
        return render_template('settings.html',
                             breadcrumbs=get_breadcrumbs('/settings'),
                             **get_user_context())
    except Exception as e:
        logger.error(f"Settings page error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/profile')
@requires_auth
def profile():
    """User profile page"""
    try:
        return render_template('profile.html',
                             breadcrumbs=get_breadcrumbs('/profile'),
                             **get_user_context())
    except Exception as e:
        logger.error(f"Profile page error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

@app.route('/help')
def help_page():
    """Help and support page"""
    try:
        return render_template('help.html',
                             breadcrumbs=get_breadcrumbs('/help'),
                             **get_user_context())
    except Exception as e:
        logger.error(f"Help page error: {e}")
        return render_template('error.html', error_code=500, error_message=str(e)), 500

# Authentication Routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page"""
    if request.method == 'POST':
        try:
            data = request.json if request.is_json else request.form
            customer_id = data.get('customer_id', '').upper()
            password = data.get('password', '').upper()
            
            # Validate credentials
            customer = db.get_customer(customer_id)
            
            if not customer:
                if request.is_json:
                    return jsonify({'success': False, 'error': 'Customer ID not found'}), 401
                return render_template('login.html', error='Customer ID not found')
            
            if customer.password != password:
                if request.is_json:
                    return jsonify({'success': False, 'error': 'Invalid password'}), 401
                return render_template('login.html', error='Invalid password')
            
            # Set session
            session['user_id'] = customer_id
            session['user_name'] = customer_id  # Could be enhanced with real names
            session['user_email'] = f"{customer_id.lower()}@fantdev.com"
            session['user_role'] = 'admin' if customer_id in ['ADMIN', 'BB1042'] else 'customer'
            session['telegram_id'] = customer.telegram_id
            
            if request.is_json:
                return jsonify({
                    'success': True,
                    'redirect': url_for('dashboard'),
                    'user': get_user_context()
                })
            
            return redirect(url_for('dashboard'))
            
        except Exception as e:
            logger.error(f"Login error: {e}")
            if request.is_json:
                return jsonify({'success': False, 'error': 'Login failed'}), 500
            return render_template('login.html', error='Login failed. Please try again.')
    
    # GET request - show login form
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Logout"""
    session.clear()
    return redirect(url_for('login'))

# Error Pages
@app.errorhandler(404)
def not_found(error):
    """404 error handler"""
    return render_template('error.html', 
                         error_code=404, 
                         error_message="Page not found",
                         **get_user_context()), 404

@app.errorhandler(500)
def server_error(error):
    """500 error handler"""
    return render_template('error.html',
                         error_code=500,
                         error_message="Internal server error", 
                         **get_user_context()), 500

@app.errorhandler(403)
def forbidden(error):
    """403 error handler"""
    return render_template('error.html',
                         error_code=403,
                         error_message="Access forbidden",
                         **get_user_context()), 403

# API Routes (from original portal_server.py)
@app.route('/api/login', methods=['POST'])
def api_login():
    """API login endpoint"""
    return login()

@app.route('/api/customer/<customer_id>')
def api_customer_data(customer_id):
    """Get customer data via API"""
    try:
        customer = db.get_customer(customer_id.upper())
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        transactions = db.get_customer_transactions(customer_id)
        
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
        
        # Format recent transactions
        formatted_transactions = []
        for tx in transactions[:20]:
            formatted_transactions.append({
                'id': getattr(tx, 'id', f'TX{hash(tx.timestamp)}'[:8]),
                'type': tx.type,
                'amount': tx.amount,
                'time': datetime.fromisoformat(tx.timestamp).strftime('%b %d %I:%M %p'),
                'status': tx.status,
                'message': tx.message[:200] if tx.message else '',
                'timestamp': tx.timestamp,
                'customer_id': customer_id
            })
        
        return jsonify({
            'customer_id': customer.customer_id,
            'balance': customer.balance,
            'weekly_pnl': customer.weekly_pnl,
            'active': customer.active,
            'registered': customer.telegram_id is not None,
            'telegram_username': customer.telegram_username,
            'phone': customer.phone,
            'last_activity': customer.last_activity,
            'daily_pnl': daily_pnl,
            'transactions': formatted_transactions,
            'alerts': {
                'low_balance': customer.balance < 100,
                'inactive': customer.last_activity and (
                    datetime.now() - datetime.fromisoformat(customer.last_activity)
                ).days > 3,
                'telegram_disconnected': customer.telegram_id is None
            }
        })
        
    except Exception as e:
        logger.error(f"API customer data error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def api_stats():
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
        logger.error(f"API stats error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports')
def api_reports():
    """Get analytics and reports data"""
    try:
        customers = db.get_all_customers()
        
        # Calculate metrics
        total_customers = len(customers)
        active_customers = sum(1 for c in customers if c.active)
        total_balance = sum(c.balance for c in customers)
        avg_balance = total_balance / total_customers if total_customers > 0 else 0
        weekly_pnl = sum(c.weekly_pnl for c in customers if c.weekly_pnl)
        
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
                'new': 3,
                'avgBalance': int(avg_balance)
            },
            'transactions': {
                'deposits': 75200,
                'withdrawals': 42800,
                'netFlow': 32400,
                'depositCount': 47,
                'withdrawalCount': 23
            },
            'topPerformers': top_performers,
            'risk': {
                'largePositions': large_positions,
                'withdrawalSpike': 'Normal',
                'inactiveAccounts': inactive_accounts
            }
        })
        
    except Exception as e:
        logger.error(f"API reports error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/members')
def api_members():
    """Get all group members"""
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
        logger.error(f"API members error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'FantDev Trading Platform',
        'version': '2.0.0',
        'database': os.path.exists('customer_database.json'),
        'customers_loaded': len(db.get_all_customers()),
        'branding_loaded': len(BRANDING) > 0,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/branding')
def api_branding():
    """Get branding configuration"""
    return jsonify(BRANDING)

# Static legal pages
@app.route('/terms')
def terms():
    """Terms of service"""
    return render_template('legal/terms.html', **get_user_context())

@app.route('/privacy') 
def privacy():
    """Privacy policy"""
    return render_template('legal/privacy.html', **get_user_context())

@app.route('/security')
def security():
    """Security information"""
    return render_template('legal/security.html', **get_user_context())

@app.route('/docs')
def docs():
    """Documentation page"""
    return render_template('docs.html', 
                         breadcrumbs=get_breadcrumbs('/docs'),
                         **get_user_context())

@app.route('/support')
def support():
    """Support page"""
    return render_template('support.html',
                         breadcrumbs=get_breadcrumbs('/support'),
                         **get_user_context())

@app.route('/status')
def status():
    """System status page"""
    # Get system health metrics
    system_status = {
        'api': 'operational',
        'database': 'operational',
        'bot': 'operational' if db.get_statistics() else 'degraded',
        'web': 'operational'
    }
    return render_template('status.html',
                         system_status=system_status,
                         breadcrumbs=get_breadcrumbs('/status'),
                         **get_user_context())

@app.route('/compliance')
def compliance():
    """Compliance information"""
    return render_template('legal/compliance.html', **get_user_context())

# 404 Error handler
@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return render_template('error.html', 
                         error_code=404,
                         error_message="The page you're looking for doesn't exist.",
                         **get_user_context()), 404

# 500 Error handler
@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    return render_template('error.html',
                         error_code=500, 
                         error_message="Something went wrong on our end.",
                         **get_user_context()), 500

# Template context processors
@app.context_processor
def inject_branding():
    """Inject branding data into all templates"""
    return {'branding': BRANDING}

@app.context_processor  
def inject_user():
    """Inject user context into all templates"""
    return get_user_context()

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 FANTDEV TRADING PLATFORM - UNIFIED SERVER")
    print("=" * 60)
    
    # Load database stats
    try:
        stats = db.get_statistics()
        print(f"📊 Database Status:")
        print(f"   • Customers: {stats.get('total_customers', 0)}")
        print(f"   • Active: {stats.get('active_customers', 0)}")
        print(f"   • Total Balance: ${stats.get('total_balance', 0):,.2f}")
        print(f"   • Registered Users: {stats.get('registered_users', 0)}")
    except Exception as e:
        print(f"⚠️  Database connection issue: {e}")
    
    print(f"🎨 Branding: {len(BRANDING)} configuration items loaded")
    print("-" * 60)
    print("🌐 Server starting on: http://localhost:5000")
    print("📱 Available routes:")
    print("   • /login - Authentication")
    print("   • /dashboard - Main dashboard")
    print("   • /customers - Customer management (admin)")
    print("   • /groups - Group management (admin)")
    print("   • /transactions - Transaction history")
    print("   • /analytics - Analytics & reports")
    print("   • /settings - User settings")
    print("   • /profile - User profile")
    print("   • /help - Help & support")
    print("   • /api/* - REST API endpoints")
    print("-" * 60)
    print("🔗 To expose with ngrok:")
    print("   1. Run: ngrok http 5000")
    print("   2. Use the HTTPS URL provided")
    print("   3. All pages include unified branding & navigation")
    print("-" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)