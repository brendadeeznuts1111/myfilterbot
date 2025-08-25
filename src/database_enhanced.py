#!/usr/bin/env python3
"""
Enhanced Database Layer for Scaling to 200+ Customers
Includes connection pooling, caching, indexing, and multi-group support
"""

import json
import os
import sqlite3
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import hashlib
import time

from .database import Customer, Transaction, GroupMember

logger = logging.getLogger(__name__)

class DatabaseCache:
    """In-memory cache for frequently accessed data"""
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 300):
        self.cache = {}
        self.timestamps = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache"""
        with self._lock:
            if key not in self.cache:
                return None
            
            # Check TTL
            if time.time() - self.timestamps[key] > self.ttl_seconds:
                self._remove(key)
                return None
            
            return self.cache[key]
    
    def set(self, key: str, value: Any):
        """Set item in cache"""
        with self._lock:
            # Remove oldest if at capacity
            if len(self.cache) >= self.max_size:
                oldest_key = min(self.timestamps.keys(), key=self.timestamps.get)
                self._remove(oldest_key)
            
            self.cache[key] = value
            self.timestamps[key] = time.time()
    
    def _remove(self, key: str):
        """Remove item from cache"""
        self.cache.pop(key, None)
        self.timestamps.pop(key, None)
    
    def clear(self):
        """Clear all cache"""
        with self._lock:
            self.cache.clear()
            self.timestamps.clear()
    
    def invalidate_pattern(self, pattern: str):
        """Invalidate cache keys matching pattern"""
        with self._lock:
            keys_to_remove = [k for k in self.cache.keys() if pattern in k]
            for key in keys_to_remove:
                self._remove(key)

@dataclass
class GroupChat:
    """Enhanced group chat data model"""
    chat_id: str
    name: str
    description: str = ""
    active: bool = True
    created_at: str = None
    settings: Dict[str, Any] = None
    member_count: int = 0
    keywords: List[str] = None
    admin_ids: List[int] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.settings is None:
            self.settings = {
                "monitor_transactions": True,
                "auto_forward": True,
                "alert_threshold": 1000,
                "rate_limit": 10
            }
        if self.keywords is None:
            self.keywords = []
        if self.admin_ids is None:
            self.admin_ids = []
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'GroupChat':
        return cls(**data)

class EnhancedDatabase:
    """Enhanced database with SQLite backend, caching, and indexing"""
    
    def __init__(self, db_path: str = "enhanced_database.db", json_fallback: str = "customer_database.json"):
        self.db_path = db_path
        self.json_fallback = json_fallback
        self.cache = DatabaseCache()
        self.executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="db-worker")
        self._connection_pool = {}
        self._pool_lock = threading.Lock()
        
        # Initialize database
        self._init_database()
        self._migrate_from_json()
        
        logger.info(f"Enhanced database initialized at {db_path}")
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection from pool"""
        thread_id = threading.current_thread().ident
        
        with self._pool_lock:
            if thread_id not in self._connection_pool:
                conn = sqlite3.connect(self.db_path, check_same_thread=False)
                conn.row_factory = sqlite3.Row
                conn.execute("PRAGMA foreign_keys = ON")
                conn.execute("PRAGMA journal_mode = WAL")
                conn.execute("PRAGMA synchronous = NORMAL")
                self._connection_pool[thread_id] = conn
            
            return self._connection_pool[thread_id]
    
    def _init_database(self):
        """Initialize SQLite database with proper schema"""
        conn = self._get_connection()
        
        # Customers table with indexes
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                balance REAL DEFAULT 0,
                weekly_pnl REAL DEFAULT 0,
                phone TEXT DEFAULT '',
                telegram_id INTEGER UNIQUE,
                telegram_username TEXT,
                active BOOLEAN DEFAULT 1,
                last_activity TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                risk_level TEXT DEFAULT 'low',
                kyc_status TEXT DEFAULT 'not_started',
                daily_limit REAL DEFAULT 10000,
                withdrawal_limit REAL DEFAULT 5000
            )
        """)
        
        # Transactions table with indexes
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT UNIQUE NOT NULL,
                timestamp TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL,
                message TEXT,
                from_user TEXT,
                chat_id INTEGER,
                status TEXT DEFAULT 'completed',
                payment_method TEXT,
                reference_id TEXT,
                fees REAL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
            )
        """)
        
        # Group chats table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS group_chats (
                chat_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                active BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                settings TEXT DEFAULT '{}',
                member_count INTEGER DEFAULT 0,
                keywords TEXT DEFAULT '[]',
                admin_ids TEXT DEFAULT '[]'
            )
        """)
        
        # Group members table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS group_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id TEXT NOT NULL,
                telegram_id INTEGER NOT NULL,
                username TEXT,
                chat_id TEXT NOT NULL,
                customer_id TEXT,
                join_date TEXT DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending',
                permissions TEXT DEFAULT '{}',
                FOREIGN KEY (chat_id) REFERENCES group_chats (chat_id),
                FOREIGN KEY (customer_id) REFERENCES customers (customer_id),
                UNIQUE(telegram_id, chat_id)
            )
        """)
        
        # Payment gateways configuration
        conn.execute("""
            CREATE TABLE IF NOT EXISTS payment_gateways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                config TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                priority INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_customers_telegram_id ON customers (telegram_id)",
            "CREATE INDEX IF NOT EXISTS idx_customers_active ON customers (active)",
            "CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers (updated_at)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions (customer_id)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions (timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status)",
            "CREATE INDEX IF NOT EXISTS idx_group_members_telegram_id ON group_members (telegram_id)",
            "CREATE INDEX IF NOT EXISTS idx_group_members_chat_id ON group_members (chat_id)",
            "CREATE INDEX IF NOT EXISTS idx_group_members_customer_id ON group_members (customer_id)",
        ]
        
        for index_sql in indexes:
            conn.execute(index_sql)
        
        conn.commit()
        logger.info("Database schema initialized with indexes")
    
    def _migrate_from_json(self):
        """Migrate existing JSON data to SQLite"""
        if not os.path.exists(self.json_fallback):
            return
        
        try:
            with open(self.json_fallback, 'r') as f:
                json_data = json.load(f)
            
            conn = self._get_connection()
            
            # Check if migration already done
            cursor = conn.execute("SELECT COUNT(*) FROM customers")
            if cursor.fetchone()[0] > 0:
                return
            
            # Migrate customers
            customers = json_data.get('customers', {})
            for customer_id, customer_data in customers.items():
                customer = Customer.from_dict({
                    'customer_id': customer_id,
                    **customer_data
                })
                self._insert_customer_raw(customer)
            
            # Migrate transactions if they exist
            transactions = json_data.get('transactions', [])
            for tx_data in transactions:
                if isinstance(tx_data, dict):
                    tx = Transaction.from_dict(tx_data)
                    self._insert_transaction_raw(tx)
            
            conn.commit()
            logger.info(f"Migrated {len(customers)} customers from JSON")
            
        except Exception as e:
            logger.error(f"Migration error: {e}")
    
    def _insert_customer_raw(self, customer: Customer):
        """Insert customer without cache invalidation (for migration)"""
        conn = self._get_connection()
        conn.execute("""
            INSERT OR REPLACE INTO customers 
            (customer_id, password, balance, weekly_pnl, phone, telegram_id, 
             telegram_username, active, last_activity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            customer.customer_id, customer.password, customer.balance, 
            customer.weekly_pnl, customer.phone, customer.telegram_id,
            customer.telegram_username, customer.active, customer.last_activity
        ))
    
    def _insert_transaction_raw(self, transaction: Transaction):
        """Insert transaction without cache invalidation (for migration)"""
        conn = self._get_connection()
        transaction_id = f"TX_{int(time.time())}_{hash(transaction.customer_id) % 10000}"
        
        conn.execute("""
            INSERT INTO transactions 
            (transaction_id, timestamp, customer_id, type, amount, message, 
             from_user, chat_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            transaction_id, transaction.timestamp, transaction.customer_id,
            transaction.type, transaction.amount, transaction.message,
            transaction.from_user, transaction.chat_id, transaction.status
        ))
    
    # Customer operations with caching
    def get_customer(self, customer_id: str) -> Optional[Customer]:
        """Get customer with caching"""
        cache_key = f"customer:{customer_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM customers WHERE customer_id = ?", 
            (customer_id.upper(),)
        )
        row = cursor.fetchone()
        
        if row:
            customer = Customer(
                customer_id=row['customer_id'],
                password=row['password'],
                balance=row['balance'],
                weekly_pnl=row['weekly_pnl'],
                phone=row['phone'] or "",
                telegram_id=row['telegram_id'],
                telegram_username=row['telegram_username'],
                active=bool(row['active']),
                last_activity=row['last_activity']
            )
            self.cache.set(cache_key, customer)
            return customer
        
        return None
    
    def get_all_customers(self, active_only: bool = False, limit: int = None, offset: int = 0) -> List[Customer]:
        """Get customers with pagination support"""
        cache_key = f"customers:all:{active_only}:{limit}:{offset}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        conn = self._get_connection()
        sql = "SELECT * FROM customers"
        params = []
        
        if active_only:
            sql += " WHERE active = 1"
        
        sql += " ORDER BY customer_id"
        
        if limit:
            sql += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        
        cursor = conn.execute(sql, params)
        customers = []
        
        for row in cursor.fetchall():
            customer = Customer(
                customer_id=row['customer_id'],
                password=row['password'],
                balance=row['balance'],
                weekly_pnl=row['weekly_pnl'],
                phone=row['phone'] or "",
                telegram_id=row['telegram_id'],
                telegram_username=row['telegram_username'],
                active=bool(row['active']),
                last_activity=row['last_activity']
            )
            customers.append(customer)
        
        # Cache for shorter time for lists
        self.cache.set(cache_key, customers)
        return customers
    
    def find_customer_by_telegram(self, telegram_id: int) -> Optional[Customer]:
        """Find customer by Telegram ID with caching"""
        cache_key = f"customer:telegram:{telegram_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM customers WHERE telegram_id = ?", 
            (telegram_id,)
        )
        row = cursor.fetchone()
        
        if row:
            customer = Customer(
                customer_id=row['customer_id'],
                password=row['password'],
                balance=row['balance'],
                weekly_pnl=row['weekly_pnl'],
                phone=row['phone'] or "",
                telegram_id=row['telegram_id'],
                telegram_username=row['telegram_username'],
                active=bool(row['active']),
                last_activity=row['last_activity']
            )
            self.cache.set(cache_key, customer)
            return customer
        
        return None
    
    def update_customer(self, customer: Customer) -> bool:
        """Update customer and invalidate cache"""
        try:
            conn = self._get_connection()
            conn.execute("""
                UPDATE customers SET
                password = ?, balance = ?, weekly_pnl = ?, phone = ?,
                telegram_id = ?, telegram_username = ?, active = ?,
                last_activity = ?, updated_at = CURRENT_TIMESTAMP
                WHERE customer_id = ?
            """, (
                customer.password, customer.balance, customer.weekly_pnl,
                customer.phone, customer.telegram_id, customer.telegram_username,
                customer.active, customer.last_activity, customer.customer_id
            ))
            conn.commit()
            
            # Invalidate cache
            self.cache.invalidate_pattern(f"customer:{customer.customer_id}")
            if customer.telegram_id:
                self.cache.invalidate_pattern(f"customer:telegram:{customer.telegram_id}")
            self.cache.invalidate_pattern("customers:all")
            
            return True
        except Exception as e:
            logger.error(f"Error updating customer: {e}")
            return False
    
    def register_customer(self, customer_id: str, telegram_id: int, username: str = None) -> bool:
        """Register customer with Telegram account"""
        try:
            conn = self._get_connection()
            conn.execute("""
                UPDATE customers SET
                telegram_id = ?, telegram_username = ?, 
                last_activity = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
                WHERE customer_id = ?
            """, (telegram_id, username, customer_id.upper()))
            conn.commit()
            
            # Invalidate cache
            self.cache.invalidate_pattern(f"customer:{customer_id}")
            self.cache.invalidate_pattern("customers:all")
            
            return conn.total_changes > 0
        except Exception as e:
            logger.error(f"Error registering customer: {e}")
            return False
    
    # Group chat operations
    def add_group_chat(self, group_chat: GroupChat) -> bool:
        """Add new group chat"""
        try:
            conn = self._get_connection()
            conn.execute("""
                INSERT OR REPLACE INTO group_chats
                (chat_id, name, description, active, settings, keywords, admin_ids)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                group_chat.chat_id, group_chat.name, group_chat.description,
                group_chat.active, json.dumps(group_chat.settings),
                json.dumps(group_chat.keywords), json.dumps(group_chat.admin_ids)
            ))
            conn.commit()
            
            self.cache.invalidate_pattern("group_chats")
            return True
        except Exception as e:
            logger.error(f"Error adding group chat: {e}")
            return False
    
    def get_group_chats(self, active_only: bool = True) -> List[GroupChat]:
        """Get all group chats"""
        cache_key = f"group_chats:all:{active_only}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        conn = self._get_connection()
        sql = "SELECT * FROM group_chats"
        if active_only:
            sql += " WHERE active = 1"
        sql += " ORDER BY name"
        
        cursor = conn.execute(sql)
        group_chats = []
        
        for row in cursor.fetchall():
            group_chat = GroupChat(
                chat_id=row['chat_id'],
                name=row['name'],
                description=row['description'] or "",
                active=bool(row['active']),
                created_at=row['created_at'],
                settings=json.loads(row['settings'] or '{}'),
                member_count=row['member_count'],
                keywords=json.loads(row['keywords'] or '[]'),
                admin_ids=json.loads(row['admin_ids'] or '[]')
            )
            group_chats.append(group_chat)
        
        self.cache.set(cache_key, group_chats)
        return group_chats
    
    def get_group_chat(self, chat_id: str) -> Optional[GroupChat]:
        """Get specific group chat"""
        cache_key = f"group_chat:{chat_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        conn = self._get_connection()
        cursor = conn.execute("SELECT * FROM group_chats WHERE chat_id = ?", (chat_id,))
        row = cursor.fetchone()
        
        if row:
            group_chat = GroupChat(
                chat_id=row['chat_id'],
                name=row['name'],
                description=row['description'] or "",
                active=bool(row['active']),
                created_at=row['created_at'],
                settings=json.loads(row['settings'] or '{}'),
                member_count=row['member_count'],
                keywords=json.loads(row['keywords'] or '[]'),
                admin_ids=json.loads(row['admin_ids'] or '[]')
            )
            self.cache.set(cache_key, group_chat)
            return group_chat
        
        return None
    
    # Statistics with caching
    def get_statistics(self) -> Dict[str, Any]:
        """Get system statistics with caching"""
        cache_key = "stats:system"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        conn = self._get_connection()
        
        # Customer stats
        customers_cursor = conn.execute("""
            SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_customers,
                COUNT(CASE WHEN telegram_id IS NOT NULL THEN 1 END) as registered_users,
                SUM(balance) as total_balance,
                SUM(weekly_pnl) as total_weekly_pnl
            FROM customers
        """)
        customer_stats = customers_cursor.fetchone()
        
        # Transaction stats
        tx_cursor = conn.execute("""
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN DATE(timestamp) = DATE('now') THEN 1 END) as today_transactions,
                SUM(CASE WHEN type = 'deposit' AND amount > 0 THEN amount ELSE 0 END) as total_deposits,
                SUM(CASE WHEN type = 'withdrawal' AND amount > 0 THEN amount ELSE 0 END) as total_withdrawals
            FROM transactions
        """)
        tx_stats = tx_cursor.fetchone()
        
        # Group stats
        group_cursor = conn.execute("""
            SELECT 
                COUNT(*) as total_groups,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_groups,
                SUM(member_count) as total_members
            FROM group_chats
        """)
        group_stats = group_cursor.fetchone()
        
        stats = {
            'total_customers': customer_stats['total_customers'],
            'active_customers': customer_stats['active_customers'],
            'registered_users': customer_stats['registered_users'],
            'total_balance': customer_stats['total_balance'] or 0,
            'total_weekly_pnl': customer_stats['total_weekly_pnl'] or 0,
            'total_transactions': tx_stats['total_transactions'],
            'today_transactions': tx_stats['today_transactions'],
            'total_deposits': tx_stats['total_deposits'] or 0,
            'total_withdrawals': tx_stats['total_withdrawals'] or 0,
            'total_groups': group_stats['total_groups'],
            'active_groups': group_stats['active_groups'],
            'total_members': group_stats['total_members'] or 0
        }
        
        self.cache.set(cache_key, stats)
        return stats
    
    def close(self):
        """Close database connections"""
        with self._pool_lock:
            for conn in self._connection_pool.values():
                conn.close()
            self._connection_pool.clear()
        
        self.executor.shutdown(wait=True)
        logger.info("Database connections closed")

# Global enhanced database instance
enhanced_db = EnhancedDatabase()