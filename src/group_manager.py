#!/usr/bin/env python3
"""
Multi-Group Chat Management System
Handles multiple Telegram groups with different configurations and permissions
"""

import asyncio
import json
import logging
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import re
from concurrent.futures import ThreadPoolExecutor

from telegram import Update, Bot
from telegram.ext import ContextTypes

from .database_manager import enhanced_db, GroupChat
from .cache_manager import group_cache
from .config import patterns, keywords
from .utils import detect_transaction, rate_limiter

logger = logging.getLogger(__name__)

class GroupRole(Enum):
    """Group member roles"""
    MEMBER = "member"
    MODERATOR = "moderator"
    ADMIN = "admin"
    OWNER = "owner"
    RESTRICTED = "restricted"

class MessagePriority(Enum):
    """Message processing priority"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class GroupPermissions:
    """Group-specific permissions"""
    can_monitor_transactions: bool = True
    can_send_alerts: bool = True
    can_auto_forward: bool = True
    daily_message_limit: int = 100
    rate_limit_window: int = 60  # seconds
    keyword_sensitivity: float = 0.8
    min_transaction_amount: float = 10.0
    max_transaction_amount: float = 50000.0
    allowed_transaction_types: Set[str] = None
    blocked_users: Set[int] = None
    vip_users: Set[int] = None
    
    def __post_init__(self):
        if self.allowed_transaction_types is None:
            self.allowed_transaction_types = {"deposit", "withdrawal", "denied", "pending"}
        if self.blocked_users is None:
            self.blocked_users = set()
        if self.vip_users is None:
            self.vip_users = set()

@dataclass
class ProcessedMessage:
    """Processed message with metadata"""
    message_id: int
    chat_id: str
    user_id: int
    username: str
    text: str
    timestamp: datetime
    transaction_info: Optional[Dict] = None
    matched_customers: List[str] = None
    keywords_found: List[str] = None
    priority: MessagePriority = MessagePriority.NORMAL
    processed_at: datetime = None
    forwarded: bool = False
    
    def __post_init__(self):
        if self.processed_at is None:
            self.processed_at = datetime.now()
        if self.matched_customers is None:
            self.matched_customers = []
        if self.keywords_found is None:
            self.keywords_found = []

class GroupMessageProcessor:
    """Processes messages for a specific group"""
    
    def __init__(self, group_chat: GroupChat, permissions: GroupPermissions):
        self.group_chat = group_chat
        self.permissions = permissions
        self.message_count = 0
        self.last_reset = time.time()
        self.rate_limiter = {}
        
    def should_process_message(self, message: ProcessedMessage) -> bool:
        """Determine if message should be processed"""
        
        # Check if user is blocked
        if message.user_id in self.permissions.blocked_users:
            return False
        
        # Check rate limiting
        if not self._check_rate_limit(message.user_id):
            return False
        
        # Check daily message limit
        if not self._check_daily_limit():
            return False
        
        # VIP users bypass some checks
        if message.user_id in self.permissions.vip_users:
            return True
        
        return True
    
    def _check_rate_limit(self, user_id: int) -> bool:
        """Check user rate limiting"""
        current_time = time.time()
        
        if user_id not in self.rate_limiter:
            self.rate_limiter[user_id] = []
        
        # Clean old entries
        cutoff = current_time - self.permissions.rate_limit_window
        self.rate_limiter[user_id] = [
            t for t in self.rate_limiter[user_id] if t > cutoff
        ]
        
        # Check if under limit (default 5 messages per minute)
        if len(self.rate_limiter[user_id]) >= 5:
            return False
        
        self.rate_limiter[user_id].append(current_time)
        return True
    
    def _check_daily_limit(self) -> bool:
        """Check daily message processing limit"""
        current_time = time.time()
        
        # Reset counter if it's a new day
        if current_time - self.last_reset > 86400:  # 24 hours
            self.message_count = 0
            self.last_reset = current_time
        
        return self.message_count < self.permissions.daily_message_limit
    
    def process_message(self, message: ProcessedMessage) -> ProcessedMessage:
        """Process message for this group"""
        if not self.should_process_message(message):
            return message
        
        # Detect transactions
        if self.permissions.can_monitor_transactions:
            tx_info = detect_transaction(message.text)
            if tx_info['type']:
                # Validate transaction amount
                if tx_info['amount']:
                    if (tx_info['amount'] < self.permissions.min_transaction_amount or
                        tx_info['amount'] > self.permissions.max_transaction_amount):
                        tx_info = {'type': None, 'amount': None, 'confidence': 0.0, 'matched_patterns': []}
                
                # Check if transaction type is allowed
                if (tx_info['type'] and 
                    tx_info['type'] not in self.permissions.allowed_transaction_types):
                    tx_info = {'type': None, 'amount': None, 'confidence': 0.0, 'matched_patterns': []}
                
                message.transaction_info = tx_info
                if tx_info['amount'] and tx_info['amount'] > 5000:
                    message.priority = MessagePriority.HIGH
        
        # Find customer mentions
        message.matched_customers = self._find_customers_in_message(message.text)
        
        # Find keywords
        message.keywords_found = self._find_keywords_in_message(message.text)
        
        # Set priority
        if message.matched_customers and message.transaction_info:
            message.priority = MessagePriority.HIGH
        elif message.user_id in self.permissions.vip_users:
            message.priority = MessagePriority.HIGH
        elif any(kw in ["urgent", "important", "alert"] for kw in message.keywords_found):
            message.priority = MessagePriority.CRITICAL
        
        self.message_count += 1
        return message
    
    def _find_customers_in_message(self, text: str) -> List[str]:
        """Find customer IDs mentioned in message"""
        customers = enhanced_db.get_all_customers()
        matched = []
        text_lower = text.lower()
        
        for customer in customers:
            if (customer.customer_id.lower() in text_lower or 
                customer.password.lower() in text_lower):
                matched.append(customer.customer_id)
        
        return list(set(matched))
    
    def _find_keywords_in_message(self, text: str) -> List[str]:
        """Find keywords in message"""
        found_keywords = []
        text_lower = text.lower()
        
        # Global keywords
        for keyword in keywords.get_all():
            if keyword.lower() in text_lower:
                found_keywords.append(keyword)
        
        # Group-specific keywords
        for keyword in self.group_chat.keywords:
            if keyword.lower() in text_lower:
                found_keywords.append(keyword)
        
        return found_keywords

class MultiGroupManager:
    """Manages multiple group chats and message processing"""
    
    def __init__(self, max_workers: int = 10):
        self.groups: Dict[str, GroupChat] = {}
        self.processors: Dict[str, GroupMessageProcessor] = {}
        self.permissions: Dict[str, GroupPermissions] = {}
        self.message_queue: List[ProcessedMessage] = []
        self.queue_lock = threading.Lock()
        
        # Thread pool for concurrent processing
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="group-processor")
        
        # Statistics
        self.stats = {
            'total_messages_processed': 0,
            'messages_by_group': {},
            'messages_by_priority': {p.name: 0 for p in MessagePriority},
            'customers_mentioned': 0,
            'transactions_detected': 0,
            'keywords_found': 0,
            'rate_limited_messages': 0,
            'blocked_user_messages': 0
        }
        
        # Load existing groups
        self._load_groups()
        
        logger.info(f"Multi-group manager initialized with {len(self.groups)} groups")
    
    def _load_groups(self):
        """Load groups from database"""
        try:
            groups = enhanced_db.get_group_chats()
            for group in groups:
                self.add_group(group)
            logger.info(f"Loaded {len(groups)} groups from database")
        except Exception as e:
            logger.error(f"Error loading groups: {e}")
    
    def add_group(self, group_chat: GroupChat, permissions: GroupPermissions = None) -> bool:
        """Add new group to management"""
        try:
            if permissions is None:
                permissions = GroupPermissions()
            
            self.groups[group_chat.chat_id] = group_chat
            self.permissions[group_chat.chat_id] = permissions
            self.processors[group_chat.chat_id] = GroupMessageProcessor(group_chat, permissions)
            
            # Initialize stats
            self.stats['messages_by_group'][group_chat.chat_id] = 0
            
            # Save to database
            enhanced_db.add_group_chat(group_chat)
            
            logger.info(f"Added group: {group_chat.name} ({group_chat.chat_id})")
            return True
        except Exception as e:
            logger.error(f"Error adding group: {e}")
            return False
    
    def update_group_permissions(self, chat_id: str, permissions: GroupPermissions) -> bool:
        """Update group permissions"""
        if chat_id not in self.groups:
            return False
        
        try:
            self.permissions[chat_id] = permissions
            self.processors[chat_id] = GroupMessageProcessor(
                self.groups[chat_id], permissions
            )
            logger.info(f"Updated permissions for group: {chat_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating group permissions: {e}")
            return False
    
    def remove_group(self, chat_id: str) -> bool:
        """Remove group from management"""
        try:
            if chat_id in self.groups:
                del self.groups[chat_id]
                del self.processors[chat_id]
                del self.permissions[chat_id]
                self.stats['messages_by_group'].pop(chat_id, None)
                
                logger.info(f"Removed group: {chat_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing group: {e}")
            return False
    
    async def process_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> Optional[ProcessedMessage]:
        """Process message from any group"""
        if not update.message or not update.message.text:
            return None
        
        message = update.message
        chat_id = str(message.chat_id)
        
        # Check if we manage this group
        if chat_id not in self.groups:
            return None
        
        # Create processed message
        processed_msg = ProcessedMessage(
            message_id=message.message_id,
            chat_id=chat_id,
            user_id=message.from_user.id,
            username=message.from_user.username or f"user_{message.from_user.id}",
            text=message.text,
            timestamp=message.date
        )
        
        try:
            # Process with group-specific processor
            processor = self.processors[chat_id]
            processed_msg = processor.process_message(processed_msg)
            
            # Update statistics
            self._update_stats(processed_msg)
            
            # Add to queue for further processing
            with self.queue_lock:
                self.message_queue.append(processed_msg)
                # Keep queue size manageable
                if len(self.message_queue) > 1000:
                    self.message_queue = self.message_queue[-500:]
            
            return processed_msg
            
        except Exception as e:
            logger.error(f"Error processing message in group {chat_id}: {e}")
            return None
    
    def _update_stats(self, message: ProcessedMessage):
        """Update processing statistics"""
        self.stats['total_messages_processed'] += 1
        self.stats['messages_by_group'][message.chat_id] += 1
        self.stats['messages_by_priority'][message.priority.name] += 1
        
        if message.matched_customers:
            self.stats['customers_mentioned'] += len(message.matched_customers)
        
        if message.transaction_info and message.transaction_info.get('type'):
            self.stats['transactions_detected'] += 1
        
        if message.keywords_found:
            self.stats['keywords_found'] += len(message.keywords_found)
    
    def get_priority_messages(self, priority: MessagePriority = MessagePriority.HIGH, 
                            limit: int = 50) -> List[ProcessedMessage]:
        """Get messages by priority"""
        with self.queue_lock:
            priority_messages = [
                msg for msg in self.message_queue 
                if msg.priority.value >= priority.value
            ]
            return sorted(priority_messages, 
                         key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def get_group_stats(self, chat_id: str = None) -> Dict[str, Any]:
        """Get statistics for specific group or all groups"""
        if chat_id:
            return {
                'group_id': chat_id,
                'group_name': self.groups.get(chat_id, {}).name if chat_id in self.groups else 'Unknown',
                'messages_processed': self.stats['messages_by_group'].get(chat_id, 0),
                'active': chat_id in self.groups
            }
        
        return {
            'total_groups': len(self.groups),
            'active_groups': sum(1 for g in self.groups.values() if g.active),
            'total_stats': self.stats,
            'groups': {
                chat_id: {
                    'name': group.name,
                    'active': group.active,
                    'messages_processed': self.stats['messages_by_group'].get(chat_id, 0)
                }
                for chat_id, group in self.groups.items()
            }
        }
    
    def cleanup_old_messages(self, days: int = 7):
        """Clean up old messages from queue"""
        cutoff = datetime.now() - timedelta(days=days)
        
        with self.queue_lock:
            old_count = len(self.message_queue)
            self.message_queue = [
                msg for msg in self.message_queue 
                if msg.timestamp > cutoff
            ]
            new_count = len(self.message_queue)
            
            if old_count > new_count:
                logger.info(f"Cleaned up {old_count - new_count} old messages")
    
    def shutdown(self):
        """Shutdown manager"""
        self.executor.shutdown(wait=True)
        logger.info("Multi-group manager shutdown complete")

# Global multi-group manager instance
multi_group_manager = MultiGroupManager()
