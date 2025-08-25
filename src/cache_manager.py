#!/usr/bin/env python3
"""
Cache Manager for High-Performance Customer and Transaction Data
Supports Redis-like operations with local fallback
"""

import json
import threading
import time
from typing import Any, Dict, List, Optional, Union, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import logging
import hashlib
from concurrent.futures import ThreadPoolExecutor
import asyncio

logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    value: Any
    created_at: float
    expires_at: Optional[float] = None
    access_count: int = 0
    last_accessed: float = None
    
    def is_expired(self) -> bool:
        """Check if entry is expired"""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at
    
    def touch(self):
        """Update access information"""
        self.access_count += 1
        self.last_accessed = time.time()

class DistributedCache:
    """High-performance distributed cache with local fallback"""
    
    def __init__(self, 
                 max_size: int = 10000,
                 default_ttl: int = 300,
                 cleanup_interval: int = 60,
                 redis_url: str = None):
        """
        Initialize cache manager
        
        Args:
            max_size: Maximum number of cached items
            default_ttl: Default TTL in seconds
            cleanup_interval: Cleanup interval in seconds
            redis_url: Redis URL for distributed caching (optional)
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cleanup_interval = cleanup_interval
        
        # Local cache storage
        self.cache: Dict[str, CacheEntry] = {}
        self.cache_lock = threading.RLock()
        
        # Redis connection (optional)
        self.redis_client = None
        if redis_url:
            try:
                import redis
                self.redis_client = redis.from_url(redis_url)
                self.redis_client.ping()
                logger.info("Redis cache connected")
            except Exception as e:
                logger.warning(f"Redis connection failed, using local cache: {e}")
        
        # Background cleanup
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()
        
        # Statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'evictions': 0,
            'cleanups': 0
        }
        
        logger.info(f"Cache initialized: max_size={max_size}, ttl={default_ttl}s")
    
    def _generate_key(self, namespace: str, identifier: Union[str, int, tuple]) -> str:
        """Generate consistent cache key"""
        if isinstance(identifier, (list, tuple, dict)):
            identifier = hashlib.sha256(str(identifier).encode()).hexdigest()[:16]
        return f"{namespace}:{identifier}"
    
    def get(self, key: str, namespace: str = "default") -> Optional[Any]:
        """Get value from cache"""
        cache_key = self._generate_key(namespace, key)
        
        # Try Redis first
        if self.redis_client:
            try:
                value = self.redis_client.get(cache_key)
                if value:
                    self.stats['hits'] += 1
                    return json.loads(value)
            except Exception as e:
                logger.warning(f"Redis get error: {e}")
        
        # Try local cache
        with self.cache_lock:
            entry = self.cache.get(cache_key)
            if entry and not entry.is_expired():
                entry.touch()
                self.stats['hits'] += 1
                return entry.value
            elif entry and entry.is_expired():
                del self.cache[cache_key]
        
        self.stats['misses'] += 1
        return None
    
    def set(self, key: str, value: Any, ttl: int = None, namespace: str = "default") -> bool:
        """Set value in cache"""
        cache_key = self._generate_key(namespace, key)
        ttl = ttl or self.default_ttl
        expires_at = time.time() + ttl if ttl > 0 else None
        
        # Set in Redis first
        if self.redis_client:
            try:
                serialized = json.dumps(value, default=str)
                if ttl > 0:
                    self.redis_client.setex(cache_key, ttl, serialized)
                else:
                    self.redis_client.set(cache_key, serialized)
            except Exception as e:
                logger.warning(f"Redis set error: {e}")
        
        # Set in local cache
        with self.cache_lock:
            # Evict if at capacity
            if len(self.cache) >= self.max_size:
                self._evict_lru()
            
            entry = CacheEntry(
                key=cache_key,
                value=value,
                created_at=time.time(),
                expires_at=expires_at
            )
            self.cache[cache_key] = entry
        
        self.stats['sets'] += 1
        return True
    
    def delete(self, key: str, namespace: str = "default") -> bool:
        """Delete value from cache"""
        cache_key = self._generate_key(namespace, key)
        
        # Delete from Redis
        if self.redis_client:
            try:
                self.redis_client.delete(cache_key)
            except Exception as e:
                logger.warning(f"Redis delete error: {e}")
        
        # Delete from local cache
        with self.cache_lock:
            return bool(self.cache.pop(cache_key, None))
    
    def invalidate_pattern(self, pattern: str, namespace: str = "default") -> int:
        """Invalidate all keys matching pattern"""
        full_pattern = f"{namespace}:{pattern}"
        count = 0
        
        # Redis pattern deletion
        if self.redis_client:
            try:
                keys = self.redis_client.keys(full_pattern)
                if keys:
                    self.redis_client.delete(*keys)
                    count += len(keys)
            except Exception as e:
                logger.warning(f"Redis pattern delete error: {e}")
        
        # Local cache pattern deletion
        with self.cache_lock:
            keys_to_delete = [k for k in self.cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self.cache[key]
                count += 1
        
        logger.debug(f"Invalidated {count} keys matching pattern: {pattern}")
        return count
    
    def _evict_lru(self):
        """Evict least recently used item"""
        if not self.cache:
            return
        
        # Find LRU item
        lru_key = min(
            self.cache.keys(),
            key=lambda k: self.cache[k].last_accessed or self.cache[k].created_at
        )
        
        del self.cache[lru_key]
        self.stats['evictions'] += 1
    
    def _cleanup_worker(self):
        """Background cleanup worker"""
        while True:
            try:
                time.sleep(self.cleanup_interval)
                self._cleanup_expired()
            except Exception as e:
                logger.error(f"Cleanup worker error: {e}")
    
    def _cleanup_expired(self):
        """Clean up expired entries"""
        with self.cache_lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if entry.is_expired()
            ]
            
            for key in expired_keys:
                del self.cache[key]
            
            if expired_keys:
                self.stats['cleanups'] += len(expired_keys)
                logger.debug(f"Cleaned up {len(expired_keys)} expired entries")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.cache_lock:
            local_size = len(self.cache)
        
        hit_rate = 0
        if self.stats['hits'] + self.stats['misses'] > 0:
            hit_rate = self.stats['hits'] / (self.stats['hits'] + self.stats['misses'])
        
        return {
            'local_size': local_size,
            'max_size': self.max_size,
            'hit_rate': hit_rate,
            'redis_connected': self.redis_client is not None,
            **self.stats
        }
    
    def clear(self):
        """Clear all cache"""
        if self.redis_client:
            try:
                self.redis_client.flushall()
            except Exception as e:
                logger.warning(f"Redis clear error: {e}")
        
        with self.cache_lock:
            self.cache.clear()

class CustomerCache:
    """Specialized cache for customer operations"""
    
    def __init__(self, cache_manager: DistributedCache):
        self.cache = cache_manager
        self.namespace = "customer"
    
    def get_customer(self, customer_id: str) -> Optional[Dict]:
        """Get customer from cache"""
        return self.cache.get(customer_id, self.namespace)
    
    def set_customer(self, customer_id: str, customer_data: Dict, ttl: int = 300):
        """Set customer in cache"""
        self.cache.set(customer_id, customer_data, ttl, self.namespace)
    
    def get_customer_by_telegram(self, telegram_id: int) -> Optional[Dict]:
        """Get customer by Telegram ID"""
        return self.cache.get(f"telegram:{telegram_id}", self.namespace)
    
    def set_customer_by_telegram(self, telegram_id: int, customer_data: Dict, ttl: int = 300):
        """Set customer by Telegram ID"""
        self.cache.set(f"telegram:{telegram_id}", customer_data, ttl, self.namespace)
    
    def invalidate_customer(self, customer_id: str, telegram_id: int = None):
        """Invalidate customer cache entries"""
        self.cache.delete(customer_id, self.namespace)
        if telegram_id:
            self.cache.delete(f"telegram:{telegram_id}", self.namespace)

class TransactionCache:
    """Specialized cache for transaction operations"""
    
    def __init__(self, cache_manager: DistributedCache):
        self.cache = cache_manager
        self.namespace = "transaction"
    
    def get_customer_transactions(self, customer_id: str, limit: int = None) -> Optional[List]:
        """Get customer transactions from cache"""
        key = f"{customer_id}:list:{limit or 'all'}"
        return self.cache.get(key, self.namespace)
    
    def set_customer_transactions(self, customer_id: str, transactions: List, limit: int = None, ttl: int = 180):
        """Set customer transactions in cache"""
        key = f"{customer_id}:list:{limit or 'all'}"
        self.cache.set(key, transactions, ttl, self.namespace)
    
    def invalidate_customer_transactions(self, customer_id: str):
        """Invalidate customer transaction cache"""
        self.cache.invalidate_pattern(f"{customer_id}:*", self.namespace)

class GroupCache:
    """Specialized cache for group operations"""
    
    def __init__(self, cache_manager: DistributedCache):
        self.cache = cache_manager
        self.namespace = "group"
    
    def get_group_chats(self, active_only: bool = True) -> Optional[List]:
        """Get group chats from cache"""
        key = f"all:active:{active_only}"
        return self.cache.get(key, self.namespace)
    
    def set_group_chats(self, group_chats: List, active_only: bool = True, ttl: int = 300):
        """Set group chats in cache"""
        key = f"all:active:{active_only}"
        self.cache.set(key, group_chats, ttl, self.namespace)
    
    def get_group_members(self, chat_id: str) -> Optional[List]:
        """Get group members from cache"""
        return self.cache.get(f"{chat_id}:members", self.namespace)
    
    def set_group_members(self, chat_id: str, members: List, ttl: int = 300):
        """Set group members in cache"""
        self.cache.set(f"{chat_id}:members", members, ttl, self.namespace)

# Connection Pool Manager
class ConnectionPoolManager:
    """Manages database and API connection pools"""
    
    def __init__(self, 
                 max_db_connections: int = 10,
                 max_api_connections: int = 20,
                 max_telegram_connections: int = 5):
        self.max_db_connections = max_db_connections
        self.max_api_connections = max_api_connections
        self.max_telegram_connections = max_telegram_connections
        
        # Connection pools
        self.db_pool = []
        self.api_pool = []
        self.telegram_pool = []
        
        # Pool locks
        self.db_lock = threading.Lock()
        self.api_lock = threading.Lock()
        self.telegram_lock = threading.Lock()
        
        # Pool statistics
        self.stats = {
            'db_active': 0,
            'api_active': 0,
            'telegram_active': 0,
            'db_total_requests': 0,
            'api_total_requests': 0,
            'telegram_total_requests': 0
        }
        
        logger.info("Connection pool manager initialized")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        return {
            'db_pool_size': len(self.db_pool),
            'api_pool_size': len(self.api_pool),
            'telegram_pool_size': len(self.telegram_pool),
            'max_db_connections': self.max_db_connections,
            'max_api_connections': self.max_api_connections,
            'max_telegram_connections': self.max_telegram_connections,
            **self.stats
        }
    
    def cleanup_idle_connections(self):
        """Cleanup idle connections"""
        # This would implement actual connection cleanup
        pass

# Global cache instances
cache_manager = DistributedCache()
customer_cache = CustomerCache(cache_manager)
transaction_cache = TransactionCache(cache_manager)
group_cache = GroupCache(cache_manager)
connection_pool = ConnectionPoolManager()