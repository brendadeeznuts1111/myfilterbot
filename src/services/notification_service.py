"""
Comprehensive Notification Service
Handles notifications for admins and customers with persistent storage and preferences
"""

import json
import sqlite3
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import logging
import asyncio
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationType(Enum):
    """Types of notifications"""
    TRANSACTION = "transaction"
    BALANCE_UPDATE = "balance_update"
    SECURITY_ALERT = "security_alert"
    SYSTEM_UPDATE = "system_update"
    MEMBER_REQUEST = "member_request"
    TRADE_SIGNAL = "trade_signal"
    MAINTENANCE = "maintenance"
    ACCOUNT_UPDATE = "account_update"
    PROMOTION = "promotion"
    ERROR = "error"

class NotificationPriority(Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class NotificationChannel(Enum):
    """Delivery channels for notifications"""
    WEB = "web"
    EMAIL = "email"
    TELEGRAM = "telegram"
    PUSH = "push"
    SMS = "sms"

@dataclass
class NotificationPreferences:
    """User notification preferences"""
    user_id: str
    user_type: str  # 'admin' or 'customer'
    channels: Dict[NotificationType, List[NotificationChannel]]
    quiet_hours: Dict[str, str]  # {'start': '22:00', 'end': '08:00'}
    frequency_limits: Dict[NotificationType, int]  # max notifications per hour
    enabled: bool = True
    created_at: str = ""
    updated_at: str = ""

@dataclass
class Notification:
    """Notification data structure"""
    id: str
    user_id: str
    user_type: str
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority
    channels: List[NotificationChannel]
    metadata: Dict[str, Any]
    read: bool = False
    delivered: bool = False
    delivery_attempts: int = 0
    created_at: str = ""
    read_at: Optional[str] = None
    expires_at: Optional[str] = None

class NotificationDatabase:
    """Database handler for notifications"""
    
    def __init__(self, db_path: str = "notifications.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    user_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    type TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    channels TEXT NOT NULL,
                    metadata TEXT,
                    read BOOLEAN DEFAULT FALSE,
                    delivered BOOLEAN DEFAULT FALSE,
                    delivery_attempts INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    read_at TEXT,
                    expires_at TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notification_preferences (
                    user_id TEXT PRIMARY KEY,
                    user_type TEXT NOT NULL,
                    channels TEXT NOT NULL,
                    quiet_hours TEXT,
                    frequency_limits TEXT,
                    enabled BOOLEAN DEFAULT TRUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notification_history (
                    id TEXT PRIMARY KEY,
                    notification_id TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    delivered_at TEXT,
                    FOREIGN KEY(notification_id) REFERENCES notifications(id)
                )
            """)
            
            conn.commit()
    
    def create_notification(self, notification: Notification) -> bool:
        """Store notification in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO notifications (
                        id, user_id, user_type, title, message, type, priority,
                        channels, metadata, created_at, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    notification.id,
                    notification.user_id,
                    notification.user_type,
                    notification.title,
                    notification.message,
                    notification.type.value,
                    notification.priority.value,
                    json.dumps([ch.value for ch in notification.channels]),
                    json.dumps(notification.metadata),
                    notification.created_at,
                    notification.expires_at
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return False
    
    def get_notifications(self, user_id: str, user_type: str, 
                         limit: int = 50, unread_only: bool = False) -> List[Notification]:
        """Get notifications for a user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                query = """
                    SELECT * FROM notifications 
                    WHERE user_id = ? AND user_type = ?
                """
                params = [user_id, user_type]
                
                if unread_only:
                    query += " AND read = FALSE"
                
                query += " ORDER BY created_at DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(query, params)
                rows = cursor.fetchall()
                
                notifications = []
                for row in rows:
                    notification = Notification(
                        id=row[0],
                        user_id=row[1],
                        user_type=row[2],
                        title=row[3],
                        message=row[4],
                        type=NotificationType(row[5]),
                        priority=NotificationPriority(row[6]),
                        channels=[NotificationChannel(ch) for ch in json.loads(row[7])],
                        metadata=json.loads(row[8]) if row[8] else {},
                        read=bool(row[9]),
                        delivered=bool(row[10]),
                        delivery_attempts=row[11],
                        created_at=row[12],
                        read_at=row[13],
                        expires_at=row[14]
                    )
                    notifications.append(notification)
                
                return notifications
        except Exception as e:
            logger.error(f"Failed to get notifications: {e}")
            return []
    
    def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE notifications 
                    SET read = TRUE, read_at = ? 
                    WHERE id = ? AND user_id = ?
                """, (datetime.now().isoformat(), notification_id, user_id))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    def save_preferences(self, preferences: NotificationPreferences) -> bool:
        """Save user notification preferences"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO notification_preferences (
                        user_id, user_type, channels, quiet_hours, frequency_limits,
                        enabled, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    preferences.user_id,
                    preferences.user_type,
                    json.dumps({k.value: [ch.value for ch in v] 
                              for k, v in preferences.channels.items()}),
                    json.dumps(preferences.quiet_hours),
                    json.dumps({k.value: v for k, v in preferences.frequency_limits.items()}),
                    preferences.enabled,
                    preferences.created_at or datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to save preferences: {e}")
            return False
    
    def get_preferences(self, user_id: str, user_type: str) -> Optional[NotificationPreferences]:
        """Get user notification preferences"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT * FROM notification_preferences 
                    WHERE user_id = ? AND user_type = ?
                """, (user_id, user_type))
                row = cursor.fetchone()
                
                if not row:
                    return None
                
                channels_data = json.loads(row[2])
                channels = {
                    NotificationType(k): [NotificationChannel(ch) for ch in v]
                    for k, v in channels_data.items()
                }
                
                frequency_limits_data = json.loads(row[4])
                frequency_limits = {
                    NotificationType(k): v for k, v in frequency_limits_data.items()
                }
                
                return NotificationPreferences(
                    user_id=row[0],
                    user_type=row[1],
                    channels=channels,
                    quiet_hours=json.loads(row[3]) if row[3] else {},
                    frequency_limits=frequency_limits,
                    enabled=bool(row[5]),
                    created_at=row[6],
                    updated_at=row[7]
                )
        except Exception as e:
            logger.error(f"Failed to get preferences: {e}")
            return None

class NotificationService:
    """Main notification service"""
    
    def __init__(self):
        self.db = NotificationDatabase()
        self.templates = self._load_templates()
        self.delivery_handlers = {}
        self._setup_delivery_handlers()
    
    def _load_templates(self) -> Dict[NotificationType, Dict[str, str]]:
        """Load notification templates"""
        return {
            NotificationType.TRANSACTION: {
                'title': 'Transaction Alert',
                'template': 'Transaction {action} of ${amount} for account {customer_id}'
            },
            NotificationType.BALANCE_UPDATE: {
                'title': 'Balance Update',
                'template': 'Your balance has been updated to ${balance}'
            },
            NotificationType.SECURITY_ALERT: {
                'title': 'Security Alert',
                'template': 'Security event detected: {event_type}'
            },
            NotificationType.SYSTEM_UPDATE: {
                'title': 'System Update',
                'template': 'System update: {update_message}'
            },
            NotificationType.MEMBER_REQUEST: {
                'title': 'New Member Request',
                'template': '{username} has requested to join {group_name}'
            },
            NotificationType.TRADE_SIGNAL: {
                'title': 'Trade Signal',
                'template': 'New {signal_type} signal for {symbol}: {action}'
            },
            NotificationType.MAINTENANCE: {
                'title': 'Maintenance Notice',
                'template': 'Scheduled maintenance: {maintenance_message}'
            },
            NotificationType.ACCOUNT_UPDATE: {
                'title': 'Account Update',
                'template': 'Your account has been updated: {update_type}'
            },
            NotificationType.PROMOTION: {
                'title': 'Special Offer',
                'template': 'New promotion available: {promotion_message}'
            },
            NotificationType.ERROR: {
                'title': 'System Error',
                'template': 'Error occurred: {error_message}'
            }
        }
    
    def _setup_delivery_handlers(self):
        """Setup delivery handlers for different channels"""
        self.delivery_handlers = {
            NotificationChannel.WEB: self._deliver_web,
            NotificationChannel.EMAIL: self._deliver_email,
            NotificationChannel.TELEGRAM: self._deliver_telegram,
            NotificationChannel.PUSH: self._deliver_push,
            NotificationChannel.SMS: self._deliver_sms
        }
    
    async def create_notification(self, 
                                user_id: str,
                                user_type: str,
                                notification_type: NotificationType,
                                priority: NotificationPriority = NotificationPriority.MEDIUM,
                                metadata: Optional[Dict[str, Any]] = None,
                                custom_title: Optional[str] = None,
                                custom_message: Optional[str] = None,
                                expires_in_hours: Optional[int] = 24) -> Optional[Notification]:
        """Create and queue notification"""
        
        # Get user preferences
        preferences = self.db.get_preferences(user_id, user_type)
        if not preferences or not preferences.enabled:
            return None
        
        # Check if user wants this type of notification
        if notification_type not in preferences.channels:
            return None
        
        # Generate notification content
        template = self.templates.get(notification_type, {})
        title = custom_title or template.get('title', 'Notification')
        
        if custom_message:
            message = custom_message
        else:
            message_template = template.get('template', 'You have a new notification')
            message = message_template.format(**(metadata or {}))
        
        # Create notification
        notification_id = f"notif_{datetime.now().strftime('%Y%m%d%H%M%S')}_{user_id}"
        expires_at = None
        if expires_in_hours:
            expires_at = (datetime.now() + timedelta(hours=expires_in_hours)).isoformat()
        
        notification = Notification(
            id=notification_id,
            user_id=user_id,
            user_type=user_type,
            title=title,
            message=message,
            type=notification_type,
            priority=priority,
            channels=preferences.channels[notification_type],
            metadata=metadata or {},
            created_at=datetime.now().isoformat(),
            expires_at=expires_at
        )
        
        # Save to database
        if self.db.create_notification(notification):
            # Queue for delivery
            await self._queue_delivery(notification)
            return notification
        
        return None
    
    async def _queue_delivery(self, notification: Notification):
        """Queue notification for delivery across channels"""
        for channel in notification.channels:
            if channel in self.delivery_handlers:
                try:
                    await self.delivery_handlers[channel](notification)
                except Exception as e:
                    logger.error(f"Failed to deliver notification via {channel}: {e}")
    
    async def _deliver_web(self, notification: Notification):
        """Deliver web notification via WebSocket"""
        # This would integrate with your WebSocket server
        web_payload = {
            'type': 'notification',
            'data': {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'type': notification.type.value,
                'priority': notification.priority.value,
                'created_at': notification.created_at
            }
        }
        logger.info(f"Web notification queued: {notification.id}")
        # TODO: Send via WebSocket to user_id
    
    async def _deliver_email(self, notification: Notification):
        """Deliver email notification"""
        logger.info(f"Email notification queued: {notification.id}")
        # TODO: Implement email delivery
    
    async def _deliver_telegram(self, notification: Notification):
        """Deliver Telegram notification"""
        logger.info(f"Telegram notification queued: {notification.id}")
        # TODO: Integrate with Telegram bot
    
    async def _deliver_push(self, notification: Notification):
        """Deliver push notification"""
        logger.info(f"Push notification queued: {notification.id}")
        # TODO: Implement push notification
    
    async def _deliver_sms(self, notification: Notification):
        """Deliver SMS notification"""
        logger.info(f"SMS notification queued: {notification.id}")
        # TODO: Implement SMS delivery
    
    def get_notifications(self, user_id: str, user_type: str, 
                         limit: int = 50, unread_only: bool = False) -> List[Dict]:
        """Get notifications for user"""
        notifications = self.db.get_notifications(user_id, user_type, limit, unread_only)
        return [asdict(notif) for notif in notifications]
    
    def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read"""
        return self.db.mark_as_read(notification_id, user_id)
    
    def save_preferences(self, preferences: NotificationPreferences) -> bool:
        """Save user preferences"""
        return self.db.save_preferences(preferences)
    
    def get_preferences(self, user_id: str, user_type: str) -> Optional[Dict]:
        """Get user preferences"""
        prefs = self.db.get_preferences(user_id, user_type)
        return asdict(prefs) if prefs else None
    
    def create_default_preferences(self, user_id: str, user_type: str) -> NotificationPreferences:
        """Create default notification preferences for new users"""
        if user_type == 'admin':
            channels = {
                NotificationType.TRANSACTION: [NotificationChannel.WEB, NotificationChannel.TELEGRAM],
                NotificationType.SECURITY_ALERT: [NotificationChannel.WEB, NotificationChannel.EMAIL, NotificationChannel.TELEGRAM],
                NotificationType.SYSTEM_UPDATE: [NotificationChannel.WEB, NotificationChannel.EMAIL],
                NotificationType.MEMBER_REQUEST: [NotificationChannel.WEB, NotificationChannel.TELEGRAM],
                NotificationType.ERROR: [NotificationChannel.WEB, NotificationChannel.TELEGRAM],
                NotificationType.MAINTENANCE: [NotificationChannel.WEB, NotificationChannel.EMAIL]
            }
        else:  # customer
            channels = {
                NotificationType.TRANSACTION: [NotificationChannel.WEB, NotificationChannel.TELEGRAM],
                NotificationType.BALANCE_UPDATE: [NotificationChannel.WEB, NotificationChannel.TELEGRAM],
                NotificationType.ACCOUNT_UPDATE: [NotificationChannel.WEB, NotificationChannel.EMAIL],
                NotificationType.TRADE_SIGNAL: [NotificationChannel.WEB, NotificationChannel.TELEGRAM],
                NotificationType.PROMOTION: [NotificationChannel.WEB],
                NotificationType.MAINTENANCE: [NotificationChannel.WEB, NotificationChannel.EMAIL]
            }
        
        preferences = NotificationPreferences(
            user_id=user_id,
            user_type=user_type,
            channels=channels,
            quiet_hours={'start': '22:00', 'end': '08:00'},
            frequency_limits={
                NotificationType.TRANSACTION: 10,
                NotificationType.TRADE_SIGNAL: 5,
                NotificationType.PROMOTION: 2
            },
            created_at=datetime.now().isoformat()
        )
        
        self.save_preferences(preferences)
        return preferences

# Global service instance
notification_service = NotificationService()

if __name__ == "__main__":
    # Test the notification service
    import asyncio
    
    async def test_service():
        # Create test notification
        await notification_service.create_notification(
            user_id="admin_001",
            user_type="admin",
            notification_type=NotificationType.TRANSACTION,
            priority=NotificationPriority.HIGH,
            metadata={'amount': 5000, 'customer_id': 'UV9587', 'action': 'deposit'}
        )
        
        print("Test notification created successfully!")
    
    asyncio.run(test_service())