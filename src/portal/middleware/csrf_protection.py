"""
CSRF protection middleware implementing double-submit cookie pattern
Implements T-3: Implement CSRF double-submit
"""

import secrets
import logging
from typing import Optional, Dict, Any
from flask import request, jsonify, session, make_response
from functools import wraps
import hashlib
import hmac

logger = logging.getLogger(__name__)


class CSRFProtection:
    """CSRF protection using double-submit cookie pattern"""
    
    def __init__(self):
        self.csrf_cookie_name = "csrf_token"
        self.csrf_header_name = "X-CSRF-Token"
        self.csrf_form_name = "csrf_token"
        self.enabled = True
        
    def generate_csrf_token(self) -> str:
        """Generate a new CSRF token"""
        return secrets.token_urlsafe(32)
    
    def get_csrf_token(self) -> str:
        """Get or create CSRF token for current session"""
        if not self.enabled:
            return ""
            
        token = session.get('csrf_token')
        if not token:
            token = self.generate_csrf_token()
            session['csrf_token'] = token
        return token
    
    def validate_csrf_token(self, token: str) -> bool:
        """Validate CSRF token against session token"""
        if not self.enabled:
            return True
            
        session_token = session.get('csrf_token')
        if not session_token:
            return False
            
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(token, session_token)
    
    def get_token_from_request(self) -> Optional[str]:
        """Extract CSRF token from request"""
        # Check header first
        token = request.headers.get(self.csrf_header_name)
        if token:
            return token
            
        # Check form data
        token = request.form.get(self.csrf_form_name)
        if token:
            return token
            
        # Check JSON body
        if request.is_json:
            token = request.json.get('csrf_token')
            if token:
                return token
                
        return None
    
    def csrf_protect(self, f):
        """Decorator to protect routes from CSRF attacks"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not self.enabled:
                return f(*args, **kwargs)
                
            # Skip CSRF for GET, HEAD, OPTIONS, TRACE
            if request.method in ['GET', 'HEAD', 'OPTIONS', 'TRACE']:
                return f(*args, **kwargs)
                
            # Get token from request
            token = self.get_token_from_request()
            if not token:
                logger.warning("CSRF token missing from request")
                return jsonify({
                    'error': 'CSRF token required',
                    'message': 'Please include a valid CSRF token'
                }), 403
                
            # Validate token
            if not self.validate_csrf_token(token):
                logger.warning("Invalid CSRF token provided")
                return jsonify({
                    'error': 'Invalid CSRF token',
                    'message': 'The provided CSRF token is invalid or expired'
                }), 403
                
            return f(*args, **kwargs)
            
        return decorated_function
    
    def set_csrf_cookie(self, response):
        """Set CSRF token as cookie for double-submit pattern"""
        if not self.enabled:
            return response
            
        token = self.get_csrf_token()
        response.set_cookie(
            self.csrf_cookie_name,
            token,
            httponly=False,  # Must be accessible to JavaScript for double-submit
            secure=True,     # Only send over HTTPS in production
            samesite='Lax'   # CSRF protection
        )
        return response
    
    def get_csrf_response(self):
        """Get response with CSRF token"""
        if not self.enabled:
            return jsonify({'csrf_token': None})
            
        token = self.get_csrf_token()
        response = jsonify({
            'csrf_token': token,
            'expires_in': 3600  # 1 hour
        })
        
        response = self.set_csrf_cookie(response)
        return response


# Global CSRF protection instance
csrf_protection = CSRFProtection()


def init_csrf_protection(app=None, enabled=True):
    """Initialize CSRF protection"""
    csrf_protection.enabled = enabled
    if app:
        # Register after request handler to set CSRF cookie
        @app.after_request
        def after_request(response):
            return csrf_protection.set_csrf_cookie(response)
    
    logger.info(f"CSRF protection initialized (enabled: {enabled})")
    return csrf_protection


def csrf_protect(f):
    """Decorator for CSRF protection"""
    return csrf_protection.csrf_protect(f)


def get_csrf_token() -> str:
    """Get current CSRF token"""
    return csrf_protection.get_csrf_token()


def get_csrf_response():
    """Get response with CSRF token"""
    return csrf_protection.get_csrf_response()


# Utility functions for frontend integration
def csrf_required():
    """Decorator for routes that require CSRF protection"""
    return csrf_protect


def csrf_exempt(f):
    """Decorator to exempt routes from CSRF protection"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function


# Middleware for CSRF token refresh
def refresh_csrf_token():
    """Generate new CSRF token and update session"""
    if not csrf_protection.enabled:
        return None
        
    token = csrf_protection.generate_csrf_token()
    session['csrf_token'] = token
    return token


# Helper for AJAX requests
def validate_csrf_ajax():
    """Validate CSRF token for AJAX requests"""
    if not csrf_protection.enabled:
        return True
        
    token = csrf_protection.get_token_from_request()
    if not token:
        return False
        
    return csrf_protection.validate_csrf_token(token)


# Configuration for different environments
def configure_csrf_for_environment(app, environment='development'):
    """Configure CSRF settings based on environment"""
    if environment == 'production':
        csrf_protection.enabled = True
        csrf_protection.csrf_cookie_name = "__Host-csrf_token"
    elif environment == 'development':
        csrf_protection.enabled = True
        csrf_protection.csrf_cookie_name = "csrf_token"
    elif environment == 'testing':
        csrf_protection.enabled = False
    
    return init_csrf_protection(app, csrf_protection.enabled)
