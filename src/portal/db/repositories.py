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
from pathlib import Path

from .connection import DBConnection
from .models import Customer, Transaction, GroupMember, GroupChat

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

class CustomerRepository:
    def __init__(self, db_connection: DBConnection, cache: DatabaseCache, json_fallback: str):
        self.db_connection = db_connection
        self.cache = cache
        self.json_fallback = json_fallback

    def _migrate_from_json(self):
        """Migrate existing JSON data to SQLite"""
        if not os.path.exists(self.json_fallback):
            return

        try:
            with open(self.json_fallback, 'r') as f:
                json_data = json.load(f)

            conn = self.db_connection._get_connection()

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
        conn = self.db_connection._get_connection()
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
        conn = self.db_connection._get_connection()
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

    def get_customer(self, customer_id: str) -> Optional[Customer]:
        """Get customer with caching"""
        cache_key = f"customer:{customer_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        conn = self.db_connection._get_connection()
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

        conn = self.db_connection._get_connection()
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

        conn = self.db_connection._get_connection()
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
            conn = self.db_connection._get_connection()
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
            conn = self.db_connection._get_connection()
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

class GroupRepository:
    def __init__(self, db_connection: DBConnection, cache: DatabaseCache):
        self.db_connection = db_connection
        self.cache = cache

    def add_group_chat(self, group_chat: GroupChat) -> bool:
        """Add new group chat"""
        try:
            conn = self.db_connection._get_connection()
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

        conn = self.db_connection._get_connection()
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

        conn = self.db_connection._get_connection()
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

class StatisticsRepository:
    def __init__(self, db_connection: DBConnection, cache: DatabaseCache):
        self.db_connection = db_connection
        self.cache = cache

    def get_statistics(self) -> Dict[str, Any]:
        """Get system statistics with caching"""
        cache_key = "stats:system"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        conn = self.db_connection._get_connection()

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

class TransactionRepository:
    def __init__(self, db_connection: DBConnection, cache: DatabaseCache):
        self.db_connection = db_connection
        self.cache = cache

    def get_customer_transactions(self, customer_id: str, limit: int = None) -> List[Transaction]:
        """Get detailed transaction history for a customer"""
        cache_key = f"transactions:{customer_id}:{limit}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        conn = self.db_connection._get_connection()
        sql = "SELECT * FROM transactions WHERE customer_id = ? ORDER BY timestamp DESC"
        params = [customer_id.upper()]

        if limit:
            sql += " LIMIT ?"
            params.append(limit)

        cursor = conn.execute(sql, params)
        transactions = []
        for row in cursor.fetchall():
            transactions.append(Transaction(
                transaction_id=row['transaction_id'],
                timestamp=row['timestamp'],
                customer_id=row['customer_id'],
                type=row['type'],
                amount=row['amount'],
                message=row['message'],
                from_user=row['from_user'],
                chat_id=row['chat_id'],
                status=row['status'],
                payment_method=row['payment_method'],
                reference_id=row['reference_id'],
                fees=row['fees'],
                created_at=row['created_at']
            ))
        self.cache.set(cache_key, transactions)
        return transactions

class GroupMemberRepository:
    def __init__(self, db_connection: DBConnection, cache: DatabaseCache):
        self.db_connection = db_connection
        self.cache = cache

    def get_group_members(self) -> List[GroupMember]:
        """Get all group members with their permissions"""
        cache_key = "group_members:all"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        conn = self.db_connection._get_connection()
        cursor = conn.execute("SELECT * FROM group_members ORDER BY join_date DESC")
        members = []
        for row in cursor.fetchall():
            members.append(GroupMember(
                member_id=row['member_id'],
                telegram_id=row['telegram_id'],
                username=row['username'],
                chat_id=row['chat_id'],
                join_date=row['join_date'],
                status=row['status'],
                permissions=json.loads(row['permissions'] or '{}'),
                customer_id=row['customer_id']
            ))
        self.cache.set(cache_key, members)
        return members

    def get_member_stats(self) -> Dict[str, Any]:
        """Get statistics about group members"""
        cache_key = "group_members:stats"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        conn = self.db_connection._get_connection()
        cursor = conn.execute("""
            SELECT
                COUNT(*) as total_members,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_members,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_members,
                COUNT(DISTINCT chat_id) as total_groups
            FROM group_members
        """)
        stats = cursor.fetchone()
        result = {
            'total_members': stats['total_members'],
            'pending_members': stats['pending_members'],
            'approved_members': stats['approved_members'],
            'total_groups': stats['total_groups']
        }
        self.cache.set(cache_key, result)
        return result

    def get_pending_members(self) -> List[GroupMember]:
        """Get pending members awaiting approval"""
        cache_key = "group_members:pending"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        conn = self.db_connection._get_connection()
        cursor = conn.execute("SELECT * FROM group_members WHERE status = 'pending' ORDER BY join_date ASC")
        pending = []
        for row in cursor.fetchall():
            pending.append(GroupMember(
                member_id=row['member_id'],
                telegram_id=row['telegram_id'],
                username=row['username'],
                chat_id=row['chat_id'],
                join_date=row['join_date'],
                status=row['status'],
                permissions=json.loads(row['permissions'] or '{}'),
                customer_id=row['customer_id']
            ))
        self.cache.set(cache_key, pending)
        return pending

    def approve_member(self, group_id: str, telegram_id: int, permissions: Dict[str, Any]) -> bool:
        """Approve a member with permissions"""
        try:
            conn = self.db_connection._get_connection()
            conn.execute("""
                UPDATE group_members SET
                status = 'approved', permissions = ?
                WHERE chat_id = ? AND telegram_id = ?
            """, (json.dumps(permissions), group_id, telegram_id))
            conn.commit()
            self.cache.invalidate_pattern("group_members")
            return conn.total_changes > 0
        except Exception as e:
            logger.error(f"Error approving member: {e}")
            return False

    def deny_member(self, group_id: str, telegram_id: int, reason: str) -> bool:
        """Deny a member"""
        try:
            conn = self.db_connection._get_connection()
            conn.execute("""
                UPDATE group_members SET
                status = 'denied', permissions = ?, message = ?
                WHERE chat_id = ? AND telegram_id = ?
            """, (json.dumps({}), reason, group_id, telegram_id)) # Clear permissions on denial
            conn.commit()
            self.cache.invalidate_pattern("group_members")
            return conn.total_changes > 0
        except Exception as e:
            logger.error(f"Error denying member: {e}")
            return False

    def update_member_permissions(self, group_id: str, telegram_id: int, permissions: Dict[str, Any]) -> bool:
        """Update member permissions"""
        try:
            conn = self.db_connection._get_connection()
            conn.execute("""
                UPDATE group_members SET
                permissions = ?
                WHERE chat_id = ? AND telegram_id = ?
            """, (json.dumps(permissions), group_id, telegram_id))
            conn.commit()
            self.cache.invalidate_pattern("group_members")
            return conn.total_changes > 0
        except Exception as e:
            logger.error(f"Error updating member permissions: {e}")
            return False

    def add_member(self, member: GroupMember) -> bool:
        """Add a new member (simulated for testing)"""
        try:
            conn = self.db_connection._get_connection()
            conn.execute("""
                INSERT INTO group_members
                (member_id, telegram_id, username, chat_id, join_date, status, permissions, customer_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                member.member_id, member.telegram_id, member.username, member.chat_id,
                member.join_date, member.status, json.dumps(member.permissions), member.customer_id
            ))
            conn.commit()
            self.cache.invalidate_pattern("group_members")
            return True
        except Exception as e:
            logger.error(f"Error adding member: {e}")
            return False

class EnhancedDatabaseFacade:
    """
    Facade for the enhanced database, providing a unified interface
    to various repositories.
    """
    def __init__(self, db_path: str = "enhanced_database.db", json_fallback: str = "customer_database.json"):
        self.db_connection = DBConnection(db_path)
        self.cache = DatabaseCache()
        self.executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="db-worker")

        self.customers = CustomerRepository(self.db_connection, self.cache, json_fallback)
        self.groups = GroupRepository(self.db_connection, self.cache)
        self.stats = StatisticsRepository(self.db_connection, self.cache)
        self.transactions = TransactionRepository(self.db_connection, self.cache)
        self.group_members = GroupMemberRepository(self.db_connection, self.cache)

        # Perform migration after all repositories are initialized
        self.customers._migrate_from_json()
        logger.info(f"Enhanced database initialized at {db_path}")

    def close(self):
        """Close database connections and shutdown executor"""
        self.db_connection.close_all_connections()
        self.executor.shutdown(wait=True)
        logger.info("Database connections closed and executor shut down.")

# Global enhanced database instance
db = EnhancedDatabaseFacade()
