from flask import Blueprint, send_file, jsonify, request, make_response
import os
import logging

from src.portal.utils.response_utils import add_ngrok_headers # Import the utility function

static_pages_bp = Blueprint('static_pages', __name__)
logger = logging.getLogger(__name__)

@static_pages_bp.route('/')
def serve_portal():
    """Serve the customer portal HTML"""
    try:
        # Use the API-enabled portal
        response = make_response(send_file('customer_portal_api.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@static_pages_bp.route('/manager.html')
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

@static_pages_bp.route('/customer_database_2500.json')
def serve_large_database():
    """Serve the 2500 customer database for manager dashboard"""
    try:
        response = make_response(send_file('customer_database_2500.json'))
        response.headers['Content-Type'] = 'application/json'
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@static_pages_bp.route('/static/<path:filename>')
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

@static_pages_bp.route('/admin')
def serve_admin_portal():
    """Serve the admin portal for group management"""
    try:
        response = make_response(send_file('admin_portal.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@static_pages_bp.route('/cashier')
def serve_cashier_dashboard():
    """Serve the enhanced cashier dashboard"""
    try:
        response = make_response(send_file('admin_cashier_dashboard_enhanced.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@static_pages_bp.route('/admin-chat')
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

@static_pages_bp.route('/admin-security')
def serve_admin_security():
    """Serve the complete admin security center"""
    try:
        response = make_response(send_file('admin_security_center.html'))
        return add_ngrok_headers(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 404
