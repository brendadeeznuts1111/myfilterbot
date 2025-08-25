"""
Flask Portal Integration Example
Demonstrates how to integrate the unified portal system with Flask
"""

from flask import Flask, render_template, request, session, g, jsonify, redirect, url_for
from utils.portal_config import PortalConfigManager, PortalType, register_portal_helpers
from utils.navigation_helper import NavigationHelper, register_navigation_helpers
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Register portal and navigation helpers
portal_manager = register_portal_helpers(app)
nav_helper = register_navigation_helpers(app)

# Mock user class for demonstration
class MockUser:
    def __init__(self, user_id, name, email, role='customer', **kwargs):
        self.id = user_id
        self.name = name
        self.email = email
        self.role = role
        self.balance = kwargs.get('balance', 0)
        self.formatted_balance = f"${self.balance:,.2f}"
        self.language = kwargs.get('language', 'en')
        self.timezone = kwargs.get('timezone', 'EST')
        self.theme = kwargs.get('theme', 'light')
        self.menu_style = kwargs.get('menu_style', 'sidebar')
        self.permissions = kwargs.get('permissions', [])
    
    def has_permission(self, permission):
        return permission in self.permissions or self.role == 'admin'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'balance': self.balance,
            'formatted_balance': self.formatted_balance,
            'language': self.language,
            'timezone': self.timezone,
            'theme': self.theme,
            'menu_style': self.menu_style,
            'permissions': self.permissions
        }

# Mock users for demonstration
MOCK_USERS = {
    'admin': MockUser(
        1, 'Admin User', 'admin@fantdev.com', 'admin',
        balance=50000, permissions=['system_admin', 'manage_users', 'view_analytics']
    ),
    'manager': MockUser(
        2, 'Manager User', 'manager@fantdev.com', 'manager',
        balance=25000, permissions=['manage_customers', 'view_reports', 'billing']
    ),
    'customer': MockUser(
        3, 'Customer User', 'customer@fantdev.com', 'customer',
        balance=1500, permissions=['view_account', 'make_trades']
    )
}

@app.before_request
def load_user():
    """Load user for each request (mock implementation)"""
    user_role = session.get('user_role', 'customer')
    g.current_user = MOCK_USERS.get(user_role)

@app.context_processor
def inject_template_vars():
    """Inject common template variables"""
    return {
        'current_user': g.current_user,
        'is_mobile_view': 'mobile' in request.user_agent.string.lower(),
        'is_mobile_only': request.user_agent.platform in ['iphone', 'android'],
        'site_name': 'Fantdev Trading Systems',
        'today_stats': {'total': 42},  # Mock stats
        'active_accounts_count': 156,
        'makeup_amount': '$2,450.00',
        'unread_messages_count': 3
    }

# Portal Routes
@app.route('/')
def index():
    """Main landing page with portal selection"""
    return render_template('portal_selector.html')

@app.route('/admin')
@app.route('/admin/dashboard')
def admin_portal():
    """Admin portal dashboard"""
    if not g.current_user or g.current_user.role != 'admin':
        return redirect(url_for('login', portal='admin'))
    
    portal_config = portal_manager.get_portal_config(PortalType.ADMIN)
    navigation_items = portal_manager.get_navigation_for_portal(PortalType.ADMIN)
    
    # Mock admin stats
    stats = {
        'total_users': 1247,
        'active_sessions': 89,
        'pending_transactions': 12,
        'system_alerts': 3
    }
    
    return render_template('portals/admin_portal.html',
                         portal_config=portal_config,
                         navigation_items=navigation_items,
                         active_section='dashboard',
                         stats=stats)

@app.route('/manager')
def manager_portal():
    """Manager portal dashboard"""
    if not g.current_user or g.current_user.role not in ['admin', 'manager']:
        return redirect(url_for('login', portal='manager'))
    
    portal_config = portal_manager.get_portal_config(PortalType.MANAGER)
    navigation_items = portal_manager.get_navigation_for_portal(PortalType.MANAGER)
    
    # Mock manager stats
    stats = {
        'active_customers': 89,
        'todays_volume': '$45,230'
    }
    
    return render_template('portals/manager_portal.html',
                         portal_config=portal_config,
                         navigation_items=navigation_items,
                         active_section='dashboard',
                         stats=stats)

@app.route('/portal')
@app.route('/customer')
def customer_portal():
    """Customer portal dashboard"""
    if not g.current_user:
        return redirect(url_for('login', portal='customer'))
    
    portal_config = portal_manager.get_portal_config(PortalType.CUSTOMER)
    navigation_items = portal_manager.get_navigation_for_portal(PortalType.CUSTOMER)
    
    return render_template('portals/customer_portal.html',
                         portal_config=portal_config,
                         navigation_items=navigation_items,
                         active_section='dashboard')

@app.route('/dashboard')
def filter_dashboard():
    """Filter bot dashboard"""
    portal_config = portal_manager.get_portal_config(PortalType.DASHBOARD)
    navigation_items = portal_manager.get_navigation_for_portal(PortalType.DASHBOARD)
    
    return render_template('portals/dashboard_portal.html',
                         portal_config=portal_config,
                         navigation_items=navigation_items,
                         active_section='overview')

# Authentication Routes
@app.route('/login')
def login():
    """Login page"""
    portal = request.args.get('portal', 'customer')
    return render_template('auth/login.html', portal=portal)

@app.route('/login', methods=['POST'])
def handle_login():
    """Handle login form submission"""
    username = request.form.get('username')
    password = request.form.get('password')
    portal = request.form.get('portal', 'customer')
    
    # Mock authentication
    if username in ['admin', 'manager', 'customer'] and password == 'password':
        session['user_role'] = username
        
        # Redirect to appropriate portal
        if username == 'admin':
            return redirect(url_for('admin_portal'))
        elif username == 'manager':
            return redirect(url_for('manager_portal'))
        else:
            return redirect(url_for('customer_portal'))
    
    return render_template('auth/login.html', 
                         portal=portal, 
                         error='Invalid credentials')

@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    return redirect(url_for('index'))

# API Routes for AJAX requests
@app.route('/api/admin/stats')
def api_admin_stats():
    """API endpoint for admin statistics"""
    if not g.current_user or g.current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify({
        'total_users': 1247,
        'active_sessions': 89,
        'pending_transactions': 12,
        'system_alerts': 3
    })

@app.route('/api/customer/balance')
def api_customer_balance():
    """API endpoint for customer balance"""
    if not g.current_user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    return jsonify({
        'balance': g.current_user.formatted_balance,
        'raw_balance': g.current_user.balance
    })

@app.route('/api/settings', methods=['POST'])
def api_save_settings():
    """API endpoint to save user settings"""
    if not g.current_user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    settings = request.get_json()
    
    # Mock settings save
    print(f"Saving settings for user {g.current_user.id}: {settings}")
    
    return jsonify({'success': True, 'message': 'Settings saved successfully'})

# WebSocket events (if using Socket.IO)
try:
    from flask_socketio import SocketIO, emit
    
    socketio = SocketIO(app, cors_allowed_origins="*")
    
    @socketio.on('connect')
    def handle_connect():
        """Handle WebSocket connection"""
        print(f"User connected: {g.current_user.id if g.current_user else 'Anonymous'}")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle WebSocket disconnection"""
        print(f"User disconnected: {g.current_user.id if g.current_user else 'Anonymous'}")
    
    @socketio.on('request_update')
    def handle_update_request(data):
        """Handle real-time update requests"""
        if g.current_user:
            # Send real-time updates based on user role
            if g.current_user.role == 'admin':
                emit('admin_stats_update', {
                    'total_users': 1248,  # Updated value
                    'active_sessions': 91,
                    'pending_transactions': 10,
                    'system_alerts': 2
                })
            elif g.current_user.role == 'customer':
                emit('balance_update', {
                    'balance': g.current_user.formatted_balance
                })

except ImportError:
    print("Flask-SocketIO not installed. WebSocket features disabled.")
    socketio = None

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return render_template('errors/500.html'), 500

# Development helpers
@app.route('/switch-user/<role>')
def switch_user(role):
    """Development helper to switch user roles"""
    if app.debug and role in MOCK_USERS:
        session['user_role'] = role
        return redirect(request.referrer or url_for('index'))
    return "Not allowed", 403

if __name__ == '__main__':
    # Development server
    if socketio:
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    else:
        app.run(debug=True, host='0.0.0.0', port=5000)
