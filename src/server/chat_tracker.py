"""
Chat Tracker - Monitors and stores ALL chats/groups the bot is in
Creates shortlinks and maintains durable storage of chat information
"""

import json
import hashlib
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import logging
import secrets
from urllib.parse import quote

logger = logging.getLogger(__name__)

@dataclass
class ChatInfo:
    """Information about a chat/group"""
    chat_id: int
    chat_type: str  # private, group, supergroup, channel
    title: Optional[str]
    username: Optional[str]
    shortlink: str
    telegram_url: Optional[str]
    first_seen: str
    last_activity: str
    member_count: Optional[int]
    is_active: bool
    is_admin: bool
    permissions: Dict
    metadata: Dict
    
    def to_dict(self) -> Dict:
        return asdict(self)

class ChatTracker:
    """
    Tracks ALL chats the bot is part of and creates shortlinks
    Uses SQLite for durable storage
    """
    
    def __init__(self, db_path: str = "chat_tracker.db"):
        self.db_path = db_path
        self.base_shortlink_url = "t.me/fantdev_bot"
        self._init_database()
        self._init_cache()
        
    def _init_database(self):
        """Initialize SQLite database for durable storage"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()
        
        # Create chats table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                chat_id INTEGER PRIMARY KEY,
                chat_type TEXT NOT NULL,
                title TEXT,
                username TEXT,
                shortlink TEXT UNIQUE NOT NULL,
                telegram_url TEXT,
                first_seen TIMESTAMP NOT NULL,
                last_activity TIMESTAMP NOT NULL,
                member_count INTEGER,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                permissions TEXT,
                metadata TEXT,
                UNIQUE(chat_id)
            )
        """)
        
        # Create messages table for activity tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL,
                message_id INTEGER,
                user_id INTEGER,
                username TEXT,
                message_text TEXT,
                timestamp TIMESTAMP NOT NULL,
                message_type TEXT,
                FOREIGN KEY (chat_id) REFERENCES chats (chat_id)
            )
        """)
        
        # Create shortlinks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shortlinks (
                shortlink TEXT PRIMARY KEY,
                chat_id INTEGER NOT NULL,
                created_at TIMESTAMP NOT NULL,
                click_count INTEGER DEFAULT 0,
                last_clicked TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES chats (chat_id)
            )
        """)
        
        # Create index for faster lookups
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_activity ON chats(last_activity)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_shortlinks ON shortlinks(shortlink)")
        
        self.conn.commit()
        logger.info(f"Chat tracker database initialized at {self.db_path}")
    
    def _init_cache(self):
        """Initialize in-memory cache for fast access"""
        self.chat_cache = {}
        self.shortlink_cache = {}
        self._load_cache_from_db()
    
    def _load_cache_from_db(self):
        """Load active chats into cache"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM chats WHERE is_active = 1")
        
        for row in cursor.fetchall():
            chat_info = self._row_to_chat_info(row)
            self.chat_cache[chat_info.chat_id] = chat_info
            self.shortlink_cache[chat_info.shortlink] = chat_info.chat_id
    
    def _row_to_chat_info(self, row) -> ChatInfo:
        """Convert database row to ChatInfo object"""
        return ChatInfo(
            chat_id=row['chat_id'],
            chat_type=row['chat_type'],
            title=row['title'],
            username=row['username'],
            shortlink=row['shortlink'],
            telegram_url=row['telegram_url'],
            first_seen=row['first_seen'],
            last_activity=row['last_activity'],
            member_count=row['member_count'],
            is_active=bool(row['is_active']),
            is_admin=bool(row['is_admin']),
            permissions=json.loads(row['permissions'] or '{}'),
            metadata=json.loads(row['metadata'] or '{}')
        )
    
    def register_chat(self, chat_id: int, chat_type: str, title: str = None,
                     username: str = None, member_count: int = None,
                     is_admin: bool = False) -> ChatInfo:
        """
        Register a new chat or update existing one
        Creates a unique shortlink for the chat
        """
        try:
            # Check if chat already exists
            existing = self.get_chat(chat_id)
            if existing:
                # Update existing chat
                return self.update_chat_activity(chat_id, title, member_count)
            
            # Generate unique shortlink
            shortlink = self._generate_shortlink(chat_id, title or str(chat_id))
            
            # Generate Telegram URL if username exists
            telegram_url = None
            if username:
                telegram_url = f"https://t.me/{username}"
            elif chat_type == 'private':
                telegram_url = f"tg://user?id={abs(chat_id)}"
            
            # Default permissions based on chat type
            permissions = self._get_default_permissions(chat_type, is_admin)
            
            # Create ChatInfo object
            chat_info = ChatInfo(
                chat_id=chat_id,
                chat_type=chat_type,
                title=title or f"{chat_type.title()} Chat",
                username=username,
                shortlink=shortlink,
                telegram_url=telegram_url,
                first_seen=datetime.now().isoformat(),
                last_activity=datetime.now().isoformat(),
                member_count=member_count,
                is_active=True,
                is_admin=is_admin,
                permissions=permissions,
                metadata={
                    'bot_added': datetime.now().isoformat(),
                    'source': 'auto_discovery'
                }
            )
            
            # Store in database
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT INTO chats (
                    chat_id, chat_type, title, username, shortlink, telegram_url,
                    first_seen, last_activity, member_count, is_active, is_admin,
                    permissions, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                chat_info.chat_id, chat_info.chat_type, chat_info.title,
                chat_info.username, chat_info.shortlink, chat_info.telegram_url,
                chat_info.first_seen, chat_info.last_activity, chat_info.member_count,
                chat_info.is_active, chat_info.is_admin,
                json.dumps(chat_info.permissions), json.dumps(chat_info.metadata)
            ))
            
            # Store shortlink
            cursor.execute("""
                INSERT INTO shortlinks (shortlink, chat_id, created_at)
                VALUES (?, ?, ?)
            """, (shortlink, chat_id, datetime.now().isoformat()))
            
            self.conn.commit()
            
            # Update cache
            self.chat_cache[chat_id] = chat_info
            self.shortlink_cache[shortlink] = chat_id
            
            logger.info(f"Registered new chat: {chat_id} ({chat_type}) with shortlink: {shortlink}")
            return chat_info
            
        except Exception as e:
            logger.error(f"Error registering chat {chat_id}: {e}")
            return None
    
    def update_chat_activity(self, chat_id: int, title: str = None,
                            member_count: int = None) -> ChatInfo:
        """Update chat activity and information"""
        try:
            cursor = self.conn.cursor()
            
            # Update last activity
            updates = ["last_activity = ?"]
            params = [datetime.now().isoformat()]
            
            if title:
                updates.append("title = ?")
                params.append(title)
            
            if member_count:
                updates.append("member_count = ?")
                params.append(member_count)
            
            params.append(chat_id)
            
            cursor.execute(f"""
                UPDATE chats
                SET {', '.join(updates)}
                WHERE chat_id = ?
            """, params)
            
            self.conn.commit()
            
            # Update cache
            if chat_id in self.chat_cache:
                self.chat_cache[chat_id].last_activity = datetime.now().isoformat()
                if title:
                    self.chat_cache[chat_id].title = title
                if member_count:
                    self.chat_cache[chat_id].member_count = member_count
            
            return self.chat_cache.get(chat_id)
            
        except Exception as e:
            logger.error(f"Error updating chat activity {chat_id}: {e}")
            return None
    
    def log_message(self, chat_id: int, message_id: int, user_id: int,
                   username: str = None, message_text: str = None,
                   message_type: str = "text"):
        """Log a message from a chat for activity tracking"""
        try:
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT INTO chat_messages (
                    chat_id, message_id, user_id, username, message_text,
                    timestamp, message_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                chat_id, message_id, user_id, username,
                message_text[:500] if message_text else None,  # Limit text length
                datetime.now().isoformat(), message_type
            ))
            self.conn.commit()
            
            # Update chat activity
            self.update_chat_activity(chat_id)
            
        except Exception as e:
            logger.error(f"Error logging message: {e}")
    
    def get_chat(self, chat_id: int) -> Optional[ChatInfo]:
        """Get chat information by ID"""
        # Check cache first
        if chat_id in self.chat_cache:
            return self.chat_cache[chat_id]
        
        # Query database
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM chats WHERE chat_id = ?", (chat_id,))
        row = cursor.fetchone()
        
        if row:
            chat_info = self._row_to_chat_info(row)
            self.chat_cache[chat_id] = chat_info
            return chat_info
        
        return None
    
    def get_chat_by_shortlink(self, shortlink: str) -> Optional[ChatInfo]:
        """Get chat information by shortlink"""
        # Check cache
        if shortlink in self.shortlink_cache:
            chat_id = self.shortlink_cache[shortlink]
            return self.get_chat(chat_id)
        
        # Query database
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT c.* FROM chats c
            JOIN shortlinks s ON c.chat_id = s.chat_id
            WHERE s.shortlink = ?
        """, (shortlink,))
        row = cursor.fetchone()
        
        if row:
            return self._row_to_chat_info(row)
        
        return None
    
    def get_all_chats(self, active_only: bool = True) -> List[ChatInfo]:
        """Get all registered chats"""
        cursor = self.conn.cursor()
        
        if active_only:
            cursor.execute("SELECT * FROM chats WHERE is_active = 1 ORDER BY last_activity DESC")
        else:
            cursor.execute("SELECT * FROM chats ORDER BY last_activity DESC")
        
        chats = []
        for row in cursor.fetchall():
            chats.append(self._row_to_chat_info(row))
        
        return chats
    
    def get_admin_chats(self) -> List[ChatInfo]:
        """Get all chats where bot is admin"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM chats 
            WHERE is_admin = 1 AND is_active = 1
            ORDER BY last_activity DESC
        """)
        
        chats = []
        for row in cursor.fetchall():
            chats.append(self._row_to_chat_info(row))
        
        return chats
    
    def get_chat_statistics(self) -> Dict[str, Any]:
        """Get statistics about all tracked chats"""
        cursor = self.conn.cursor()
        
        # Total chats
        cursor.execute("SELECT COUNT(*) as total FROM chats")
        total_chats = cursor.fetchone()['total']
        
        # Active chats
        cursor.execute("SELECT COUNT(*) as active FROM chats WHERE is_active = 1")
        active_chats = cursor.fetchone()['active']
        
        # Chats by type
        cursor.execute("""
            SELECT chat_type, COUNT(*) as count 
            FROM chats 
            WHERE is_active = 1 
            GROUP BY chat_type
        """)
        chats_by_type = {row['chat_type']: row['count'] for row in cursor.fetchall()}
        
        # Recent activity
        cursor.execute("""
            SELECT COUNT(*) as recent 
            FROM chats 
            WHERE datetime(last_activity) > datetime('now', '-24 hours')
        """)
        recent_activity = cursor.fetchone()['recent']
        
        # Message statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_messages,
                COUNT(DISTINCT chat_id) as chats_with_messages,
                COUNT(DISTINCT user_id) as unique_users
            FROM chat_messages
            WHERE datetime(timestamp) > datetime('now', '-7 days')
        """)
        msg_stats = cursor.fetchone()
        
        return {
            'total_chats': total_chats,
            'active_chats': active_chats,
            'chats_by_type': chats_by_type,
            'recent_activity_24h': recent_activity,
            'admin_chats': len(self.get_admin_chats()),
            'message_stats_7d': {
                'total_messages': msg_stats['total_messages'],
                'active_chats': msg_stats['chats_with_messages'],
                'unique_users': msg_stats['unique_users']
            },
            'shortlinks_created': len(self.shortlink_cache)
        }
    
    def mark_chat_inactive(self, chat_id: int):
        """Mark a chat as inactive (bot removed or blocked)"""
        try:
            cursor = self.conn.cursor()
            cursor.execute("""
                UPDATE chats
                SET is_active = 0, last_activity = ?
                WHERE chat_id = ?
            """, (datetime.now().isoformat(), chat_id))
            self.conn.commit()
            
            # Remove from cache
            if chat_id in self.chat_cache:
                del self.chat_cache[chat_id]
            
            logger.info(f"Marked chat {chat_id} as inactive")
            
        except Exception as e:
            logger.error(f"Error marking chat inactive: {e}")
    
    def _generate_shortlink(self, chat_id: int, title: str) -> str:
        """Generate a unique shortlink for a chat"""
        # Try readable shortlink first
        base = title.lower().replace(' ', '_')[:20]
        shortlink = f"{base}_{abs(chat_id) % 1000}"
        
        # Check if exists
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM shortlinks WHERE shortlink = ?", (shortlink,))
        
        if cursor.fetchone()['count'] > 0:
            # Generate random shortlink
            shortlink = f"chat_{secrets.token_urlsafe(8)}"
        
        return shortlink
    
    def _get_default_permissions(self, chat_type: str, is_admin: bool) -> Dict:
        """Get default permissions based on chat type"""
        base_permissions = {
            'can_send_messages': True,
            'can_read_messages': True,
            'can_send_alerts': False,
            'can_manage_members': False,
            'can_view_analytics': False
        }
        
        if chat_type == 'private':
            base_permissions['can_send_alerts'] = True
            base_permissions['can_view_analytics'] = True
        elif chat_type in ['group', 'supergroup']:
            if is_admin:
                base_permissions['can_send_alerts'] = True
                base_permissions['can_manage_members'] = True
        
        return base_permissions
    
    def generate_chat_report(self) -> str:
        """Generate a formatted report of all chats"""
        stats = self.get_chat_statistics()
        chats = self.get_all_chats()
        
        report = f"""
📊 CHAT TRACKING REPORT
{'=' * 40}

📈 STATISTICS:
• Total Chats: {stats['total_chats']}
• Active Chats: {stats['active_chats']}
• Admin Chats: {stats['admin_chats']}
• 24h Activity: {stats['recent_activity_24h']} chats
• Total Shortlinks: {stats['shortlinks_created']}

📱 CHAT TYPES:
"""
        for chat_type, count in stats['chats_by_type'].items():
            report += f"• {chat_type.title()}: {count}\n"
        
        report += f"""
💬 7-DAY MESSAGE STATS:
• Total Messages: {stats['message_stats_7d']['total_messages']}
• Active Chats: {stats['message_stats_7d']['active_chats']}
• Unique Users: {stats['message_stats_7d']['unique_users']}

📋 ACTIVE CHATS:
{'=' * 40}
"""
        
        for i, chat in enumerate(chats[:20], 1):  # Top 20 chats
            chat_line = f"{i}. "
            if chat.title:
                chat_line += f"{chat.title} "
            chat_line += f"({chat.chat_type})\n"
            chat_line += f"   ID: {chat.chat_id}\n"
            chat_line += f"   Shortlink: {self.base_shortlink_url}/{chat.shortlink}\n"
            if chat.username:
                chat_line += f"   Username: @{chat.username}\n"
            chat_line += f"   Last Active: {chat.last_activity[:19]}\n"
            if chat.is_admin:
                chat_line += f"   🛡️ Bot is Admin\n"
            report += chat_line + "\n"
        
        return report
    
    def export_to_json(self, filepath: str = "chat_export.json"):
        """Export all chat data to JSON"""
        chats = self.get_all_chats(active_only=False)
        stats = self.get_chat_statistics()
        
        export_data = {
            'export_time': datetime.now().isoformat(),
            'statistics': stats,
            'chats': [chat.to_dict() for chat in chats]
        }
        
        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"Exported {len(chats)} chats to {filepath}")
        return filepath


# Global instance
chat_tracker = ChatTracker()