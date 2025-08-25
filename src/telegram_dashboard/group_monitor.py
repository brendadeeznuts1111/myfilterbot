"""
Telegram group and channel monitoring for dashboard integration
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict
import sqlite3
import os

from telegram import Bot, Chat, ChatMember, Update
from telegram.ext import Application, ChatMemberHandler, MessageHandler, filters
from telegram.error import TelegramError

@dataclass
class GroupInfo:
    """Group/channel information structure"""
    chat_id: int
    title: str
    chat_type: str
    description: Optional[str]
    member_count: int
    administrators: List[Dict[str, Any]]
    is_monitored: bool
    monitoring_since: str
    last_activity: str
    message_count_24h: int
    status: str
    permissions: Dict[str, bool]

@dataclass
class MemberActivity:
    """Member activity tracking"""
    user_id: int
    username: str
    first_name: str
    chat_id: int
    messages_today: int
    last_message_time: str
    member_status: str
    joined_date: Optional[str]
    is_admin: bool

class TelegramGroupMonitor:
    """Monitor Telegram groups and channels for dashboard integration"""
    
    def __init__(self, bot_token: str, database_path: str = "group_monitor.db"):
        self.bot_token = bot_token
        self.database_path = database_path
        self.application = None
        self.bot = None
        self.logger = logging.getLogger(__name__)
        
        # Monitoring state
        self.monitored_groups: Dict[int, GroupInfo] = {}
        self.member_activities: Dict[int, Dict[int, MemberActivity]] = {}
        self.is_monitoring = False
        
        # Statistics
        self.stats = {
            'total_groups': 0,
            'active_groups': 0,
            'total_members': 0,
            'messages_processed': 0,
            'member_changes': 0,
            'start_time': None,
            'last_update': None
        }
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database for persistent storage"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Create groups table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS groups (
                    chat_id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    chat_type TEXT NOT NULL,
                    description TEXT,
                    member_count INTEGER DEFAULT 0,
                    administrators TEXT,
                    is_monitored BOOLEAN DEFAULT 1,
                    monitoring_since TEXT,
                    last_activity TEXT,
                    message_count_24h INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'active',
                    permissions TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create member activities table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS member_activities (
                    user_id INTEGER,
                    chat_id INTEGER,
                    username TEXT,
                    first_name TEXT,
                    messages_today INTEGER DEFAULT 0,
                    last_message_time TEXT,
                    member_status TEXT DEFAULT 'member',
                    joined_date TEXT,
                    is_admin BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, chat_id),
                    FOREIGN KEY (chat_id) REFERENCES groups (chat_id)
                )
            """)
            
            # Create message statistics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS message_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER,
                    user_id INTEGER,
                    message_count INTEGER DEFAULT 1,
                    date TEXT,
                    hour INTEGER,
                    FOREIGN KEY (chat_id) REFERENCES groups (chat_id)
                )
            """)
            
            conn.commit()
            conn.close()
            self.logger.info("Database initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Error initializing database: {e}")
    
    async def initialize(self):
        """Initialize the Telegram application and bot"""
        try:
            self.bot = Bot(token=self.bot_token)
            self.application = Application.builder().token(self.bot_token).build()
            
            # Add handlers
            self.application.add_handler(
                MessageHandler(filters.ALL, self._handle_message)
            )
            self.application.add_handler(
                ChatMemberHandler(self._handle_member_update, ChatMemberHandler.ANY_CHAT_MEMBER)
            )
            
            # Load existing groups from database
            await self._load_groups_from_database()
            
            self.logger.info("Group monitor initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize group monitor: {e}")
            return False
    
    async def start_monitoring(self):
        """Start group monitoring"""
        if not self.application:
            if not await self.initialize():
                return False
        
        try:
            self.is_monitoring = True
            self.stats['start_time'] = datetime.now().isoformat()
            
            # Start the application
            await self.application.initialize()
            await self.application.start()
            await self.application.updater.start_polling()
            
            # Update group information periodically
            asyncio.create_task(self._periodic_group_update())
            
            self.logger.info("Group monitoring started")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start group monitoring: {e}")
            return False
    
    async def stop_monitoring(self):
        """Stop group monitoring"""
        try:
            self.is_monitoring = False
            
            if self.application and self.application.updater:
                await self.application.updater.stop()
                await self.application.stop()
                await self.application.shutdown()
            
            self.logger.info("Group monitoring stopped")
            return True
            
        except Exception as e:
            self.logger.error(f"Error stopping group monitoring: {e}")
            return False
    
    async def add_group_to_monitor(self, chat_id: int) -> bool:
        """Add a group to monitoring list"""
        try:
            chat = await self.bot.get_chat(chat_id)
            
            # Get group information
            group_info = await self._get_group_info(chat)
            
            # Add to monitored groups
            self.monitored_groups[chat_id] = group_info
            
            # Save to database
            await self._save_group_to_database(group_info)
            
            # Initialize member tracking
            await self._initialize_member_tracking(chat_id)
            
            self.stats['total_groups'] = len(self.monitored_groups)
            self.logger.info(f"Added group to monitoring: {chat.title} ({chat_id})")
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding group to monitor: {e}")
            return False
    
    async def remove_group_from_monitor(self, chat_id: int) -> bool:
        """Remove a group from monitoring"""
        try:
            if chat_id in self.monitored_groups:
                # Update database
                conn = sqlite3.connect(self.database_path)
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE groups SET is_monitored = 0 WHERE chat_id = ?",
                    (chat_id,)
                )
                conn.commit()
                conn.close()
                
                # Remove from memory
                del self.monitored_groups[chat_id]
                if chat_id in self.member_activities:
                    del self.member_activities[chat_id]
                
                self.stats['total_groups'] = len(self.monitored_groups)
                self.logger.info(f"Removed group from monitoring: {chat_id}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error removing group from monitor: {e}")
            return False
    
    async def _handle_message(self, update: Update, context):
        """Handle incoming messages for activity tracking"""
        try:
            message = update.message
            if not message or message.chat.id not in self.monitored_groups:
                return
            
            chat_id = message.chat.id
            user = message.from_user
            
            if not user:
                return
            
            # Update message statistics
            await self._update_message_stats(chat_id, user.id)
            
            # Update member activity
            await self._update_member_activity(chat_id, user)
            
            # Update group activity
            self.monitored_groups[chat_id].last_activity = datetime.now().isoformat()
            self.monitored_groups[chat_id].message_count_24h += 1
            
            self.stats['messages_processed'] += 1
            self.stats['last_update'] = datetime.now().isoformat()
            
        except Exception as e:
            self.logger.error(f"Error handling message: {e}")
    
    async def _handle_member_update(self, update: Update, context):
        """Handle member join/leave events"""
        try:
            chat_member_update = update.chat_member
            if not chat_member_update or chat_member_update.chat.id not in self.monitored_groups:
                return
            
            chat_id = chat_member_update.chat.id
            user = chat_member_update.new_chat_member.user
            new_status = chat_member_update.new_chat_member.status
            old_status = chat_member_update.old_chat_member.status if chat_member_update.old_chat_member else "unknown"
            
            # Update member activity tracking
            if chat_id not in self.member_activities:
                self.member_activities[chat_id] = {}
            
            if new_status in ["member", "administrator", "creator"]:
                # Member joined or status changed
                activity = MemberActivity(
                    user_id=user.id,
                    username=user.username or "",
                    first_name=user.first_name,
                    chat_id=chat_id,
                    messages_today=0,
                    last_message_time="",
                    member_status=new_status,
                    joined_date=datetime.now().isoformat(),
                    is_admin=new_status in ["administrator", "creator"]
                )
                
                self.member_activities[chat_id][user.id] = activity
                await self._save_member_activity(activity)
                
            elif new_status in ["left", "kicked", "banned"]:
                # Member left or was removed
                if user.id in self.member_activities.get(chat_id, {}):
                    del self.member_activities[chat_id][user.id]
                    await self._remove_member_activity(chat_id, user.id)
            
            # Update group member count
            try:
                member_count = await self.bot.get_chat_member_count(chat_id)
                self.monitored_groups[chat_id].member_count = member_count
            except:
                pass
            
            self.stats['member_changes'] += 1
            self.logger.info(f"Member update in {chat_id}: {user.first_name} ({old_status} -> {new_status})")
            
        except Exception as e:
            self.logger.error(f"Error handling member update: {e}")
    
    async def _get_group_info(self, chat: Chat) -> GroupInfo:
        """Get comprehensive group information"""
        try:
            # Get member count
            member_count = await self.bot.get_chat_member_count(chat.id)
            
            # Get administrators
            administrators = []
            try:
                admins = await self.bot.get_chat_administrators(chat.id)
                for admin in admins:
                    admin_info = {
                        'user_id': admin.user.id,
                        'username': admin.user.username or "",
                        'first_name': admin.user.first_name,
                        'status': admin.status,
                        'can_delete_messages': getattr(admin, 'can_delete_messages', False),
                        'can_manage_chat': getattr(admin, 'can_manage_chat', False)
                    }
                    administrators.append(admin_info)
            except:
                administrators = []
            
            # Get chat permissions
            permissions = {}
            if hasattr(chat, 'permissions') and chat.permissions:
                permissions = {
                    'can_send_messages': chat.permissions.can_send_messages,
                    'can_send_media_messages': chat.permissions.can_send_media_messages,
                    'can_send_polls': chat.permissions.can_send_polls,
                    'can_send_other_messages': chat.permissions.can_send_other_messages,
                    'can_add_web_page_previews': chat.permissions.can_add_web_page_previews,
                    'can_change_info': chat.permissions.can_change_info,
                    'can_invite_users': chat.permissions.can_invite_users,
                    'can_pin_messages': chat.permissions.can_pin_messages
                }
            
            return GroupInfo(
                chat_id=chat.id,
                title=chat.title or f"Chat_{chat.id}",
                chat_type=chat.type,
                description=chat.description or "",
                member_count=member_count,
                administrators=administrators,
                is_monitored=True,
                monitoring_since=datetime.now().isoformat(),
                last_activity=datetime.now().isoformat(),
                message_count_24h=0,
                status="active",
                permissions=permissions
            )
            
        except Exception as e:
            self.logger.error(f"Error getting group info: {e}")
            return GroupInfo(
                chat_id=chat.id,
                title="Error",
                chat_type="unknown",
                description="",
                member_count=0,
                administrators=[],
                is_monitored=True,
                monitoring_since=datetime.now().isoformat(),
                last_activity=datetime.now().isoformat(),
                message_count_24h=0,
                status="error",
                permissions={}
            )
    
    async def _initialize_member_tracking(self, chat_id: int):
        """Initialize member tracking for a group"""
        try:
            self.member_activities[chat_id] = {}
            
            # Get current members (for small groups only)
            if self.monitored_groups[chat_id].member_count < 100:
                # This is expensive for large groups, so we skip it
                pass
            
        except Exception as e:
            self.logger.error(f"Error initializing member tracking: {e}")
    
    async def _update_message_stats(self, chat_id: int, user_id: int):
        """Update message statistics in database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            now = datetime.now()
            date_str = now.strftime("%Y-%m-%d")
            hour = now.hour
            
            # Insert or update message statistics
            cursor.execute("""
                INSERT OR IGNORE INTO message_stats (chat_id, user_id, message_count, date, hour)
                VALUES (?, ?, 0, ?, ?)
            """, (chat_id, user_id, date_str, hour))
            
            cursor.execute("""
                UPDATE message_stats
                SET message_count = message_count + 1
                WHERE chat_id = ? AND user_id = ? AND date = ? AND hour = ?
            """, (chat_id, user_id, date_str, hour))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error updating message stats: {e}")
    
    async def _update_member_activity(self, chat_id: int, user):
        """Update member activity tracking"""
        try:
            if chat_id not in self.member_activities:
                self.member_activities[chat_id] = {}
            
            user_id = user.id
            now = datetime.now().isoformat()
            
            if user_id in self.member_activities[chat_id]:
                # Update existing activity
                activity = self.member_activities[chat_id][user_id]
                activity.messages_today += 1
                activity.last_message_time = now
            else:
                # Create new activity record
                activity = MemberActivity(
                    user_id=user_id,
                    username=user.username or "",
                    first_name=user.first_name,
                    chat_id=chat_id,
                    messages_today=1,
                    last_message_time=now,
                    member_status="member",
                    joined_date=now,
                    is_admin=False
                )
                self.member_activities[chat_id][user_id] = activity
            
            # Save to database
            await self._save_member_activity(activity)
            
        except Exception as e:
            self.logger.error(f"Error updating member activity: {e}")
    
    async def _save_group_to_database(self, group_info: GroupInfo):
        """Save group information to database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO groups 
                (chat_id, title, chat_type, description, member_count, administrators,
                 is_monitored, monitoring_since, last_activity, message_count_24h, 
                 status, permissions, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                group_info.chat_id,
                group_info.title,
                group_info.chat_type,
                group_info.description,
                group_info.member_count,
                json.dumps(group_info.administrators),
                group_info.is_monitored,
                group_info.monitoring_since,
                group_info.last_activity,
                group_info.message_count_24h,
                group_info.status,
                json.dumps(group_info.permissions)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error saving group to database: {e}")
    
    async def _save_member_activity(self, activity: MemberActivity):
        """Save member activity to database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO member_activities
                (user_id, chat_id, username, first_name, messages_today, 
                 last_message_time, member_status, joined_date, is_admin, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                activity.user_id,
                activity.chat_id,
                activity.username,
                activity.first_name,
                activity.messages_today,
                activity.last_message_time,
                activity.member_status,
                activity.joined_date,
                activity.is_admin
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error saving member activity: {e}")
    
    async def _remove_member_activity(self, chat_id: int, user_id: int):
        """Remove member activity from database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute(
                "DELETE FROM member_activities WHERE chat_id = ? AND user_id = ?",
                (chat_id, user_id)
            )
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error removing member activity: {e}")
    
    async def _load_groups_from_database(self):
        """Load monitored groups from database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM groups WHERE is_monitored = 1")
            rows = cursor.fetchall()
            
            for row in rows:
                group_info = GroupInfo(
                    chat_id=row[0],
                    title=row[1],
                    chat_type=row[2],
                    description=row[3] or "",
                    member_count=row[4],
                    administrators=json.loads(row[5] or "[]"),
                    is_monitored=bool(row[6]),
                    monitoring_since=row[7],
                    last_activity=row[8],
                    message_count_24h=row[9],
                    status=row[10],
                    permissions=json.loads(row[11] or "{}")
                )
                self.monitored_groups[row[0]] = group_info
            
            conn.close()
            self.stats['total_groups'] = len(self.monitored_groups)
            self.logger.info(f"Loaded {len(self.monitored_groups)} groups from database")
            
        except Exception as e:
            self.logger.error(f"Error loading groups from database: {e}")
    
    async def _periodic_group_update(self):
        """Periodically update group information"""
        while self.is_monitoring:
            try:
                for chat_id in list(self.monitored_groups.keys()):
                    try:
                        chat = await self.bot.get_chat(chat_id)
                        updated_info = await self._get_group_info(chat)
                        self.monitored_groups[chat_id] = updated_info
                        await self._save_group_to_database(updated_info)
                        
                    except TelegramError as e:
                        if "chat not found" in str(e).lower():
                            # Group no longer exists or bot was removed
                            self.monitored_groups[chat_id].status = "inactive"
                            self.logger.warning(f"Group {chat_id} no longer accessible")
                        else:
                            self.logger.error(f"Error updating group {chat_id}: {e}")
                    
                    # Small delay between updates
                    await asyncio.sleep(1)
                
                # Update statistics
                active_groups = sum(1 for g in self.monitored_groups.values() if g.status == "active")
                total_members = sum(g.member_count for g in self.monitored_groups.values())
                
                self.stats.update({
                    'active_groups': active_groups,
                    'total_members': total_members,
                    'last_update': datetime.now().isoformat()
                })
                
                # Wait 5 minutes before next update
                await asyncio.sleep(300)
                
            except Exception as e:
                self.logger.error(f"Error in periodic group update: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error
    
    def get_monitored_groups(self) -> List[Dict[str, Any]]:
        """Get list of all monitored groups"""
        return [asdict(group) for group in self.monitored_groups.values()]
    
    def get_group_info(self, chat_id: int) -> Optional[Dict[str, Any]]:
        """Get information for a specific group"""
        if chat_id in self.monitored_groups:
            return asdict(self.monitored_groups[chat_id])
        return None
    
    def get_member_activities(self, chat_id: Optional[int] = None) -> Dict[str, Any]:
        """Get member activities for dashboard"""
        if chat_id:
            return {
                str(user_id): asdict(activity)
                for user_id, activity in self.member_activities.get(chat_id, {}).items()
            }
        else:
            result = {}
            for cid, activities in self.member_activities.items():
                result[str(cid)] = {
                    str(user_id): asdict(activity)
                    for user_id, activity in activities.items()
                }
            return result
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get monitoring statistics"""
        uptime = None
        if self.stats['start_time']:
            start = datetime.fromisoformat(self.stats['start_time'])
            uptime = str(datetime.now() - start)
        
        return {
            **self.stats,
            'uptime': uptime,
            'is_monitoring': self.is_monitoring
        }