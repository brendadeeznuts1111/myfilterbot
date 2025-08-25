"""
Rate limiting middleware using slowapi
Implements T-2: Add slowapi rate-limiter on /auth/login
"""

from functools import wraps
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from flask import request, jsonify
    
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False
    logging.warning("slowapi not available. Rate limiting will be disabled.")

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiting middleware for Flask routes"""
    
    def __init__(self):
        self.limiter = None
        self.initialized = False
        
    def initialize(self, app=None):
        """Initialize the rate limiter"""
        if not SLOWAPI_AVAILABLE:
            logger.warning("slowapi not installed, rate limiting disabled")
            return False
            
        try:
            self.limiter = Limiter(
                key_func=get_remote_address,
                default_limits=["200 per day", "50 per hour"],
                storage_uri="memory://",
                strategy="fixed-window-elastic-expiry"
            )
            
            if app:
                self.limiter.init_app(app)
                
            self.initialized = True
            logger.info("Rate limiter initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize rate limiter: {e}")
            return False
    
    def get_limiter(self):
        """Get the limiter instance"""
        return self.limiter
    
    def limit(self, rate_limit: str, key_func=None, per_method=False, methods=None):
        """Decorator to apply rate limiting to routes"""
        if not self.initialized or not self.limiter:
            def no_limit_decorator(f):
                return f
            return no_limit_decorator
            
        return self.limiter.limit(
            rate_limit,
            key_func=key_func,
            per_method=per_method,
            methods=methods
        )
    
    def exempt(self, f):
        """Decorator to exempt routes from rate limiting"""
        if not self.initialized or not self.limiter:
            return f
            
        return self.limiter.exempt(f)
    
    def handle_rate_limit_exceeded(self, e):
        """Handle rate limit exceeded responses"""
        return jsonify({
            "error": "Rate limit exceeded",
            "message": str(e),
            "retry_after": str(e.retry_after) if hasattr(e, 'retry_after') else None
        }), 429


# Global rate limiter instance
rate_limiter = RateLimiter()


def init_rate_limiter(app):
    """Initialize rate limiter with Flask app"""
    return rate_limiter.initialize(app)


def get_rate_limiter():
    """Get the rate limiter instance"""
    return rate_limiter


# Predefined rate limits
LOGIN_RATE_LIMIT = "5 per minute"
PASSWORD_RESET_RATE_LIMIT = "3 per hour"
API_RATE_LIMIT = "100 per hour"
GENERAL_RATE_LIMIT = "200 per day, 50 per hour"


def login_rate_limit():
    """Rate limit for login endpoints"""
    return rate_limiter.limit(LOGIN_RATE_LIMIT)


def password_reset_rate_limit():
    """Rate limit for password reset endpoints"""
    return rate_limiter.limit(PASSWORD_RESET_RATE_LIMIT)


def api_rate_limit():
    """Rate limit for general API endpoints"""
    return rate_limiter.limit(API_RATE_LIMIT)


def strict_rate_limit():
    """Strict rate limit for sensitive operations"""
    return rate_limiter.limit("10 per minute")


def custom_rate_limit(rate_string: str, key_func=None):
    """Custom rate limit with string specification"""
    return rate_limiter.limit(rate_string, key_func=key_func)


# Key functions for different rate limiting strategies
def get_user_id_key():
    """Get rate limit key based on user ID from JWT"""
    from flask import request
    from src.portal.utils.auth_utils import decode_jwt_token
    
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = decode_jwt_token(token)
            return f"user:{payload.get('user_id', 'anonymous')}"
        except:
            pass
    
    return get_remote_address()


def get_ip_and_user_agent_key():
    """Get rate limit key based on IP and User-Agent"""
    from flask import request
    
    ip = get_remote_address()
    user_agent = request.headers.get('User-Agent', 'unknown')
    return f"{ip}:{hash(user_agent) % 10000}"


def get_api_key_key():
    """Get rate limit key based on API key"""
    from flask import request
    
    api_key = request.headers.get('X-API-Key')
    if api_key:
        return f"api_key:{api_key}"
    
    return get_remote_address()
