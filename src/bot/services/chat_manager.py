"""
Chat Manager - Tracks all chats where the bot is present
Integrates with Cloudflare Worker for persistent storage
"""
import json
import logging
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict
import os

logger = logging.getLogger(__name__)

@dataclass
class ChatInfo:
    """Chat information model"""
    chat_id: str
    chat_type: str  # 'private', 'group', 'supergroup', 'channel'
    title: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    member_count: Optional[int] = None
    description: Optional[str] = None
    invite_link: Optional[str] = None
    date_added: str = None
    last_activity: str = None
    bot_status: str = 'member'  # 'member', 'administrator', 'left', 'kicked'
    permissions: Optional[Dict] = None
    statistics: Optional[Dict] = None
    
    def __post_init__(self):
        if not self.date_added:
            self.date_added = datetime.now().isoformat()
        if not self.last_activity:
            self.last_activity = datetime.now().isoformat()
        if not self.statistics:
            self.statistics = {
                'messages_received': 0,
                'commands_processed': 0,
                'transactions_detected': 0,
                'customers_tracked': []
            }
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return asdict(self)

class ChatManager:
    """Manages chat tracking and synchronization with Cloudflare Worker"""
    
    def __init__(self, worker_url: str = None, api_key: str = None):
        """
        Initialize ChatManager
        
        Args:
            worker_url: Cloudflare Worker URL
            api_key: Optional API key for authentication
        """
        self.worker_url = worker_url or os.getenv('CLOUDFLARE_WORKER_URL', 'https://telegram-bot-worker.workers.dev')
        self.api_key = api_key or os.getenv('CLOUDFLARE_API_KEY')
        self.local_chats = {}  # Local cache of chats
        self.headers = {
            'Content-Type': 'application/json'
        }
        if self.api_key:
            self.headers['Authorization'] = f'Bearer {self.api_key}'
    
    async def track_chat(self, chat_data: Dict) -> bool:
        """
        Track a new chat or update existing chat
        
        Args:
            chat_data: Telegram chat data
            
        Returns:
            Success status
        """
        try:
            # Create ChatInfo object
            chat_info = ChatInfo(
                chat_id=str(chat_data.get('id')),
                chat_type=chat_data.get('type', 'private'),
                title=chat_data.get('title'),
                username=chat_data.get('username'),
                first_name=chat_data.get('first_name'),
                last_name=chat_data.get('last_name'),
                description=chat_data.get('description'),
                invite_link=chat_data.get('invite_link')
            )
            
            # Store locally
            self.local_chats[chat_info.chat_id] = chat_info
            
            # Sync with Cloudflare Worker
            if self.worker_url:
                await self._sync_chat_to_worker(chat_info)
            
            logger.info(f"Tracked chat: {chat_info.chat_id} ({chat_info.chat_type})")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking chat: {e}")
            return False
    
    async def handle_my_chat_member(self, update) -> None:
        """
        Handle bot being added/removed from chats
        
        Args:
            update: Telegram update object
        """
        try:
            chat_member = update.my_chat_member
            chat = chat_member.chat
            new_status = chat_member.new_chat_member.status
            old_status = chat_member.old_chat_member.status if chat_member.old_chat_member else None
            
            # Bot was added to a chat
            if old_status not in ['member', 'administrator'] and new_status in ['member', 'administrator']:
                chat_info = ChatInfo(
                    chat_id=str(chat.id),
                    chat_type=chat.type,
                    title=chat.title,
                    username=chat.username,
                    first_name=chat.first_name,
                    last_name=chat.last_name,
                    bot_status=new_status,
                    permissions=self._extract_permissions(chat_member.new_chat_member)
                )
                
                await self.track_chat(chat_info.to_dict())
                logger.info(f"Bot added to chat: {chat.title or chat.id} as {new_status}")
                
            # Bot was removed from a chat
            elif old_status in ['member', 'administrator'] and new_status in ['left', 'kicked']:
                await self.remove_chat(str(chat.id), new_status)
                logger.info(f"Bot removed from chat: {chat.title or chat.id} ({new_status})")
                
            # Bot permissions changed
            elif old_status == new_status and new_status == 'administrator':
                await self.update_chat_permissions(str(chat.id), chat_member.new_chat_member)
                logger.info(f"Bot permissions updated in chat: {chat.title or chat.id}")
                
        except Exception as e:
            logger.error(f"Error handling my_chat_member: {e}")
    
    async def update_chat_activity(self, chat_id: str, activity: Dict) -> None:
        """
        Update chat activity statistics
        
        Args:
            chat_id: Chat ID
            activity: Activity data (messages_received, commands_processed, etc.)
        """
        try:
            if chat_id in self.local_chats:
                chat = self.local_chats[chat_id]
                
                # Update statistics
                if 'messages_received' in activity:
                    chat.statistics['messages_received'] += activity['messages_received']
                if 'commands_processed' in activity:
                    chat.statistics['commands_processed'] += activity['commands_processed']
                if 'transactions_detected' in activity:
                    chat.statistics['transactions_detected'] += activity['transactions_detected']
                if 'customer_mentioned' in activity:
                    customer = activity['customer_mentioned']
                    if customer not in chat.statistics['customers_tracked']:
                        chat.statistics['customers_tracked'].append(customer)
                
                chat.last_activity = datetime.now().isoformat()
                
                # Sync with worker
                await self._sync_chat_to_worker(chat)
                
        except Exception as e:
            logger.error(f"Error updating chat activity: {e}")
    
    async def remove_chat(self, chat_id: str, status: str = 'left') -> None:
        """
        Mark chat as removed
        
        Args:
            chat_id: Chat ID
            status: Removal status ('left' or 'kicked')
        """
        try:
            if chat_id in self.local_chats:
                chat = self.local_chats[chat_id]
                chat.bot_status = status
                chat.last_activity = datetime.now().isoformat()
                
                # Sync with worker
                await self._sync_chat_to_worker(chat)
                
                # Remove from local cache
                del self.local_chats[chat_id]
                
        except Exception as e:
            logger.error(f"Error removing chat: {e}")
    
    async def get_all_chats(self) -> List[ChatInfo]:
        """
        Get all tracked chats
        
        Returns:
            List of ChatInfo objects
        """
        try:
            # Try to fetch from worker first
            if self.worker_url:
                response = requests.get(
                    f"{self.worker_url}/api/chats",
                    headers=self.headers,
                    timeout=5
                )
                if response.ok:
                    data = response.json()
                    if data.get('success'):
                        chats = data.get('chats', [])
                        # Update local cache
                        for chat_data in chats:
                            chat_id = chat_data.get('chatId')
                            if chat_id:
                                self.local_chats[chat_id] = ChatInfo(**chat_data)
            
            return list(self.local_chats.values())
            
        except Exception as e:
            logger.error(f"Error getting all chats: {e}")
            return list(self.local_chats.values())
    
    async def get_chat_statistics(self) -> Dict[str, Any]:
        """
        Get aggregated chat statistics
        
        Returns:
            Statistics dictionary
        """
        try:
            chats = await self.get_all_chats()
            active_chats = [c for c in chats if c.bot_status == 'member']
            
            stats = {
                'total_chats': len(chats),
                'active_chats': len(active_chats),
                'by_type': {
                    'private': 0,
                    'group': 0,
                    'supergroup': 0,
                    'channel': 0
                },
                'total_messages': 0,
                'total_commands': 0,
                'total_transactions': 0
            }
            
            for chat in chats:
                stats['by_type'][chat.chat_type] += 1
                if chat.statistics:
                    stats['total_messages'] += chat.statistics.get('messages_received', 0)
                    stats['total_commands'] += chat.statistics.get('commands_processed', 0)
                    stats['total_transactions'] += chat.statistics.get('transactions_detected', 0)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting chat statistics: {e}")
            return {}
    
    async def _sync_chat_to_worker(self, chat: ChatInfo) -> bool:
        """
        Sync chat data to Cloudflare Worker
        
        Args:
            chat: ChatInfo object
            
        Returns:
            Success status
        """
        try:
            if not self.worker_url:
                return False
            
            # For now, we'll store this locally
            # In production, this would POST to the worker API
            logger.debug(f"Would sync chat {chat.chat_id} to worker")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing chat to worker: {e}")
            return False
    
    def _extract_permissions(self, chat_member) -> Optional[Dict]:
        """
        Extract permissions from chat member object
        
        Args:
            chat_member: Telegram ChatMember object
            
        Returns:
            Permissions dictionary
        """
        try:
            if hasattr(chat_member, 'can_be_edited') and chat_member.can_be_edited:
                return {
                    'can_send_messages': getattr(chat_member, 'can_send_messages', False),
                    'can_send_media_messages': getattr(chat_member, 'can_send_media_messages', False),
                    'can_send_polls': getattr(chat_member, 'can_send_polls', False),
                    'can_send_other_messages': getattr(chat_member, 'can_send_other_messages', False),
                    'can_add_web_page_previews': getattr(chat_member, 'can_add_web_page_previews', False),
                    'can_change_info': getattr(chat_member, 'can_change_info', False),
                    'can_invite_users': getattr(chat_member, 'can_invite_users', False),
                    'can_pin_messages': getattr(chat_member, 'can_pin_messages', False)
                }
            return None
        except Exception as e:
            logger.error(f"Error extracting permissions: {e}")
            return None
    
    async def update_chat_permissions(self, chat_id: str, chat_member) -> None:
        """
        Update chat permissions
        
        Args:
            chat_id: Chat ID
            chat_member: Telegram ChatMember object
        """
        try:
            if chat_id in self.local_chats:
                chat = self.local_chats[chat_id]
                chat.permissions = self._extract_permissions(chat_member)
                chat.last_activity = datetime.now().isoformat()
                
                # Sync with worker
                await self._sync_chat_to_worker(chat)
                
        except Exception as e:
            logger.error(f"Error updating chat permissions: {e}")

# Global chat manager instance
chat_manager = ChatManager()