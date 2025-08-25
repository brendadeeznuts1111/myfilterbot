import sqlite3
import threading
import json
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class DBConnection:
    """Manages SQLite database connections and schema initialization."""

    def __init__(self, db_path: str = "enhanced_database.db"):
        self.db_path = db_path
        self._connection_pool = {}
        self._pool_lock = threading.Lock()
        self._init_database()

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

    def close_all_connections(self):
        """Close all database connections in the pool"""
        with self._pool_lock:
            for conn in self._connection_pool.values():
                conn.close()
            self._connection_pool.clear()
        logger.info("All database connections closed.")
