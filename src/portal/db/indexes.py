"""
Database indexes for performance optimization
Implements P-1: Add composite indexes to DB
"""

import sqlite3
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class DatabaseIndexes:
    """Manages database indexes for performance optimization"""
    
    INDEXES = [
        # Customer indexes
        {
            'name': 'idx_customers_username',
            'table': 'customers',
            'columns': ['username'],
            'unique': True
        },
        {
            'name': 'idx_customers_email',
            'table': 'customers',
            'columns': ['email'],
            'unique': True
        },
        {
            'name': 'idx_customers_active',
            'table': 'customers',
            'columns': ['active']
        },
        {
            'name': 'idx_customers_balance',
            'table': 'customers',
            'columns': ['balance']
        },
        {
            'name': 'idx_customers_created_at',
            'table': 'customers',
            'columns': ['created_at']
        },
        
        # Transaction indexes
        {
            'name': 'idx_transactions_customer_id',
            'table': 'transactions',
            'columns': ['customer_id']
        },
        {
            'name': 'idx_transactions_type',
            'table': 'transactions',
            'columns': ['type']
        },
        {
            'name': 'idx_transactions_created_at',
            'table': 'transactions',
            'columns': ['created_at']
        },
        {
            'name': 'idx_transactions_customer_type',
            'table': 'transactions',
            'columns': ['customer_id', 'type']
        },
        {
            'name': 'idx_transactions_customer_date',
            'table': 'transactions',
            'columns': ['customer_id', 'created_at']
        },
        
        # Group member indexes
        {
            'name': 'idx_group_members_customer_id',
            'table': 'group_members',
            'columns': ['customer_id']
        },
        {
            'name': 'idx_group_members_group_id',
            'table': 'group_members',
            'columns': ['group_id']
        },
        {
            'name': 'idx_group_members_role',
            'table': 'group_members',
            'columns': ['role']
        },
        {
            'name': 'idx_group_members_customer_group',
            'table': 'group_members',
            'columns': ['customer_id', 'group_id'],
            'unique': True
        },
        
        # Group chat indexes
        {
            'name': 'idx_group_chats_group_id',
            'table': 'group_chats',
            'columns': ['group_id']
        },
        {
            'name': 'idx_group_chats_customer_id',
            'table': 'group_chats',
            'columns': ['customer_id']
        },
        {
            'name': 'idx_group_chats_created_at',
            'table': 'group_chats',
            'columns': ['created_at']
        },
        {
            'name': 'idx_group_chats_group_date',
            'table': 'group_chats',
            'columns': ['group_id', 'created_at']
        }
    ]
    
    @classmethod
    def create_indexes(cls, conn: sqlite3.Connection) -> None:
        """Create all performance indexes"""
        cursor = conn.cursor()
        
        for index in cls.INDEXES:
            try:
                # Check if index already exists
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='index' AND name=?
                """, (index['name'],))
                
                if cursor.fetchone():
                    logger.info(f"Index {index['name']} already exists")
                    continue
                
                # Build index creation SQL
                columns = ', '.join(index['columns'])
                unique = 'UNIQUE' if index.get('unique', False) else ''
                
                sql = f"""
                    CREATE {unique} INDEX IF NOT EXISTS {index['name']}
                    ON {index['table']} ({columns})
                """
                
                cursor.execute(sql)
                logger.info(f"Created index: {index['name']}")
                
            except sqlite3.Error as e:
                logger.error(f"Failed to create index {index['name']}: {e}")
        
        conn.commit()
    
    @classmethod
    def drop_indexes(cls, conn: sqlite3.Connection) -> None:
        """Drop all custom indexes (for testing/rebuild)"""
        cursor = conn.cursor()
        
        for index in cls.INDEXES:
            try:
                cursor.execute(f"DROP INDEX IF EXISTS {index['name']}")
                logger.info(f"Dropped index: {index['name']}")
            except sqlite3.Error as e:
                logger.error(f"Failed to drop index {index['name']}: {e}")
        
        conn.commit()
    
    @classmethod
    def get_index_stats(cls, conn: sqlite3.Connection) -> List[Dict[str, Any]]:
        """Get statistics about existing indexes"""
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                name,
                tbl_name as table_name,
                sql,
                CASE 
                    WHEN sql LIKE '%UNIQUE%' THEN 1 
                    ELSE 0 
                END as is_unique
            FROM sqlite_master 
            WHERE type='index' AND name LIKE 'idx_%'
        """)
        
        indexes = []
        for row in cursor.fetchall():
            indexes.append({
                'name': row[0],
                'table': row[1],
                'sql': row[2],
                'unique': bool(row[3])
            })
        
        return indexes
    
    @classmethod
    def analyze_performance(cls, conn: sqlite3.Connection) -> Dict[str, Any]:
        """Analyze query performance and suggest optimizations"""
        cursor = conn.cursor()
        
        # Get table statistics
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        stats = {
            'tables': {},
            'indexes': cls.get_index_stats(conn),
            'recommendations': []
        }
        
        for table in tables:
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            row_count = cursor.fetchone()[0]
            
            # Get column info
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]
            
            stats['tables'][table] = {
                'row_count': row_count,
                'columns': columns
            }
            
            # Performance recommendations
            if row_count > 1000:
                # Suggest indexes for frequently queried columns
                if 'customer_id' in columns and not any(
                    idx['table'] == table and 'customer_id' in idx['sql']
                    for idx in stats['indexes']
                ):
                    stats['recommendations'].append(
                        f"Consider adding index on {table}.customer_id for better query performance"
                    )
                
                if 'created_at' in columns and not any(
                    idx['table'] == table and 'created_at' in idx['sql']
                    for idx in stats['indexes']
                ):
                    stats['recommendations'].append(
                        f"Consider adding index on {table}.created_at for date-based queries"
                    )
        
        return stats


def create_performance_indexes(conn: sqlite3.Connection) -> None:
    """Convenience function to create all performance indexes"""
    DatabaseIndexes.create_indexes(conn)


def get_performance_stats(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Get performance statistics"""
    return DatabaseIndexes.analyze_performance(conn)
