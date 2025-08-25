"""
API caching middleware for performance optimization
Implements P-2: Add API caching to /health & static assets
"""

import time
import hashlib
import json
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps
from flask import request, jsonify, make_response
import threading

logger = logging.getLogger(__name__)


class APICache:
    """Simple in-memory cache for API responses"""
    
    def __init__(self, default_ttl: int = 300):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
        self.lock = threading.Lock()
        self._cleanup_thread = None
        self._start_cleanup_thread()
    
    def _start_cleanup_thread(self):
        """Start background thread for cache cleanup"""
        def cleanup_expired():
            while True:
                time.sleep(60)  # Check every minute
                self._cleanup_expired()
        
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            self._cleanup_thread = threading.Thread(target=cleanup_expired, daemon=True)
            self._cleanup_thread.start()
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        with self.lock:
            current_time = time.time()
            expired_keys = [
                key for key, value in self.cache.items()
                if value['expires_at'] < current_time
            ]
            for key in expired_keys:
                del self.cache[key]
    
    def _generate_cache_key(self, endpoint: str, **kwargs) -> str:
        """Generate cache key based on endpoint and parameters"""
        key_data = {
            'endpoint': endpoint,
            'method': request.method,
            'args': dict(request.args),
            'json': request.get_json() if request.is_json else None,
            **kwargs
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                if entry['expires_at'] > time.time():
                    return entry['value']
                else:
                    # Remove expired entry
                    del self.cache[key]
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        ttl = ttl or self.default_ttl
        with self.lock:
            self.cache[key] = {
                'value': value,
                'expires_at': time.time() + ttl,
                'created_at': time.time()
            }
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        with self.lock:
            self.cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.lock:
            current_time = time.time()
            active_entries = [
                entry for entry in self.cache.values()
                if entry['expires_at'] > current_time
            ]
            return {
                'total_entries': len(active_entries),
                'total_keys': len(self.cache),
                'hit_rate': 0,  # Would need tracking for actual hit rate
                'memory_usage': len(json.dumps(self.cache))
            }


# Global cache instance
api_cache = APICache()


def cache_response(ttl: int = 300, key_func: Optional[Callable] = None):
    """
    Decorator to cache API responses
    
    Args:
        ttl: Time to live in seconds
        key_func: Optional function to generate custom cache key
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = api_cache._generate_cache_key(
                    f.__name__,
                    args=args,
                    kwargs=kwargs
                )
            
            # Check cache
            cached_response = api_cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_response
            
            # Execute function and cache response
            response = f(*args, **kwargs)
            
            # Cache the response
            if hasattr(response, 'status_code') and response.status_code == 200:
                api_cache.set(cache_key, response, ttl)
                logger.debug(f"Cached response for {cache_key}")
            
            return response
        
        # Add cache invalidation method
        decorated_function.invalidate_cache = lambda: api_cache.clear()
        return decorated_function
    
    return decorator


def cache_health_check(ttl: int = 60):
    """Specialized cache for health check endpoints"""
    return cache_response(ttl=ttl, key_func=lambda: "health_check")


def cache_static_assets(ttl: int = 3600):
    """Cache for static assets and API responses"""
    return cache_response(ttl=ttl)


def invalidate_cache(pattern: str = None):
    """Invalidate cache entries matching pattern"""
    if pattern:
        # Simple pattern matching - could be enhanced
        keys_to_delete = [
            key for key in api_cache.cache.keys()
            if pattern in key
        ]
        for key in keys_to_delete:
            api_cache.delete(key)
    else:
        api_cache.clear()


# Cache key generators for specific endpoints
def health_check_key():
    """Generate cache key for health check"""
    return f"health_check_{int(time.time() / 60)}"  # Cache for 1 minute buckets


def static_asset_key(path: str):
    """Generate cache key for static assets"""
    return f"static_{path}_{int(time.time() / 3600)}"  # Cache for 1 hour buckets


# Cache middleware for Flask
class CacheMiddleware:
    """Flask middleware for caching"""
    
    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize cache middleware with Flask app"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
    
    def before_request(self):
        """Before request hook"""
        pass
    
    def after_request(self, response):
        """After request hook to add cache headers"""
        # Add cache headers for static assets
        if request.endpoint and 'static' in str(request.endpoint):
            response.headers['Cache-Control'] = 'public, max-age=3600'
        elif request.endpoint and 'health' in str(request.endpoint):
            response.headers['Cache-Control'] = 'public, max-age=60'
        
        return response


# Cache utilities
def get_cache_stats():
    """Get cache statistics"""
    return api_cache.get_stats()


def clear_cache():
    """Clear all cache"""
    api_cache.clear()
    logger.info("Cache cleared")


# Predefined cache decorators
cache_1min = cache_response(ttl=60)
cache_5min = cache_response(ttl=300)
cache_15min = cache_response(ttl=900)
cache_1hour = cache_response(ttl=3600)
cache_1day = cache_response(ttl=86400)


# Cache for specific endpoints
@cache_response(ttl=60)
def cached_health_check():
    """Cached health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}


@cache_response(ttl=3600)
def cached_statistics():
    """Cached statistics endpoint"""
    return {"stats": "cached_data", "timestamp": time.time()}
