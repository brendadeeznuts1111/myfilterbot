"""
Real-time Telegram message streaming for dashboard integration
"""
import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
import threading
from queue import Queue, Empty

from telegram import Update, Message, Chat, User
from telegram.ext import Application, MessageHandler, filters

@dataclass
class StreamedMessage:
    """Structured message data for dashboard streaming"""
    message_id: int
    chat_id: int
    chat_title: str
    chat_type: str
    user_id: int
    username: str
    first_name: str
    text: str
    timestamp: str
    message_type: str
    is_forwarded: bool
    forward_from: Optional[str]
    is_reply: bool
    reply_to_message_id: Optional[int]
    has_media: bool
    media_type: Optional[str]
    detected_transaction: Optional[Dict[str, Any]]
    priority: str

class TelegramMessageStreamer:
    """Streams Telegram messages in real-time for dashboard monitoring"""
    
    def __init__(self, bot_token: str, admin_chat_id: str):
        self.bot_token = bot_token
        self.admin_chat_id = admin_chat_id
        self.message_queue = Queue()
        self.subscribers: List[Callable] = []
        self.is_streaming = False
        self.application = None
        self.logger = logging.getLogger(__name__)
        
        # Statistics
        self.stats = {
            'messages_processed': 0,
            'messages_streamed': 0,
            'start_time': None,
            'last_message_time': None,
            'active_chats': set(),
            'error_count': 0
        }
        
        # Message filtering and processing
        self.transaction_detector = None
        self.keyword_filters = []
        
    async def initialize(self):
        """Initialize the Telegram application"""
        try:
            self.application = Application.builder().token(self.bot_token).build()
            
            # Add message handlers
            self.application.add_handler(
                MessageHandler(filters.ALL, self._handle_message)
            )
            
            self.logger.info("Telegram message streamer initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize message streamer: {e}")
            return False
    
    async def start_streaming(self):
        """Start real-time message streaming"""
        if not self.application:
            if not await self.initialize():
                return False
                
        try:
            self.is_streaming = True
            self.stats['start_time'] = datetime.now().isoformat()
            
            # Start the background processor
            processor_thread = threading.Thread(target=self._process_message_queue)
            processor_thread.daemon = True
            processor_thread.start()
            
            # Start the Telegram bot
            await self.application.initialize()
            await self.application.start()
            await self.application.updater.start_polling()
            
            self.logger.info("Message streaming started")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start message streaming: {e}")
            self.stats['error_count'] += 1
            return False
    
    async def stop_streaming(self):
        """Stop message streaming"""
        try:
            self.is_streaming = False
            
            if self.application and self.application.updater:
                await self.application.updater.stop()
                await self.application.stop()
                await self.application.shutdown()
            
            self.logger.info("Message streaming stopped")
            return True
            
        except Exception as e:
            self.logger.error(f"Error stopping message streaming: {e}")
            return False
    
    async def _handle_message(self, update: Update, context):
        """Handle incoming Telegram messages"""
        try:
            message = update.message
            if not message:
                return
                
            # Process and structure message data
            streamed_msg = await self._process_message(message)
            
            # Add to queue for real-time streaming
            self.message_queue.put(streamed_msg)
            
            # Update statistics
            self.stats['messages_processed'] += 1
            self.stats['last_message_time'] = datetime.now().isoformat()
            self.stats['active_chats'].add(message.chat_id)
            
        except Exception as e:
            self.logger.error(f"Error handling message: {e}")
            self.stats['error_count'] += 1
    
    async def _process_message(self, message: Message) -> StreamedMessage:
        """Process a Telegram message into structured data"""
        try:
            # Extract basic message information
            chat = message.chat
            user = message.from_user
            
            # Determine message type and priority
            message_type = self._classify_message(message)
            priority = self._calculate_priority(message, message_type)
            
            # Detect transactions if available
            detected_transaction = None
            if self.transaction_detector and message.text:
                detected_transaction = self.transaction_detector.detect_transaction(message.text)
            
            # Handle media
            has_media = bool(message.photo or message.video or message.document or 
                           message.audio or message.voice or message.video_note)
            media_type = self._get_media_type(message)
            
            return StreamedMessage(
                message_id=message.message_id,
                chat_id=chat.id,
                chat_title=chat.title or chat.first_name or f"Chat_{chat.id}",
                chat_type=chat.type,
                user_id=user.id if user else 0,
                username=user.username if user else "Unknown",
                first_name=user.first_name if user else "Unknown",
                text=message.text or message.caption or "[Media]",
                timestamp=message.date.isoformat(),
                message_type=message_type,
                is_forwarded=bool(message.forward_from or message.forward_from_chat),
                forward_from=self._get_forward_info(message),
                is_reply=bool(message.reply_to_message),
                reply_to_message_id=message.reply_to_message.message_id if message.reply_to_message else None,
                has_media=has_media,
                media_type=media_type,
                detected_transaction=detected_transaction,
                priority=priority
            )
            
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")
            # Return minimal message data
            return StreamedMessage(
                message_id=message.message_id,
                chat_id=message.chat.id,
                chat_title="Error",
                chat_type="unknown",
                user_id=0,
                username="Error",
                first_name="Error",
                text="Error processing message",
                timestamp=datetime.now().isoformat(),
                message_type="error",
                is_forwarded=False,
                forward_from=None,
                is_reply=False,
                reply_to_message_id=None,
                has_media=False,
                media_type=None,
                detected_transaction=None,
                priority="low"
            )
    
    def _classify_message(self, message: Message) -> str:
        """Classify message type for dashboard categorization"""
        if message.text:
            text_lower = message.text.lower()
            
            # Transaction-related keywords
            if any(keyword in text_lower for keyword in ['credited', 'withdraw', 'deposit', 'denied']):
                return "transaction"
            elif any(keyword in text_lower for keyword in ['urgent', 'alert', 'important']):
                return "alert"
            elif message.text.startswith('/'):
                return "command"
            else:
                return "message"
        elif message.photo:
            return "photo"
        elif message.video:
            return "video"
        elif message.document:
            return "document"
        else:
            return "media"
    
    def _calculate_priority(self, message: Message, message_type: str) -> str:
        """Calculate message priority for dashboard display"""
        # High priority conditions
        if message_type == "alert":
            return "high"
        elif message_type == "transaction":
            return "high"
        elif message.chat.id == int(self.admin_chat_id):
            return "high"
        elif message_type == "command":
            return "medium"
        else:
            return "low"
    
    def _get_media_type(self, message: Message) -> Optional[str]:
        """Determine media type if present"""
        if message.photo:
            return "photo"
        elif message.video:
            return "video"
        elif message.document:
            return "document"
        elif message.audio:
            return "audio"
        elif message.voice:
            return "voice"
        elif message.video_note:
            return "video_note"
        return None
    
    def _get_forward_info(self, message: Message) -> Optional[str]:
        """Extract forward information"""
        if message.forward_from:
            return message.forward_from.username or message.forward_from.first_name
        elif message.forward_from_chat:
            return message.forward_from_chat.title or str(message.forward_from_chat.id)
        return None
    
    def _process_message_queue(self):
        """Background thread to process message queue and notify subscribers"""
        while self.is_streaming:
            try:
                # Get message from queue (with timeout)
                message = self.message_queue.get(timeout=1.0)
                
                # Notify all subscribers
                self._notify_subscribers(message)
                
                # Update stats
                self.stats['messages_streamed'] += 1
                
                # Mark task as done
                self.message_queue.task_done()
                
            except Empty:
                # No messages in queue, continue
                continue
            except Exception as e:
                self.logger.error(f"Error processing message queue: {e}")
                self.stats['error_count'] += 1
    
    def _notify_subscribers(self, message: StreamedMessage):
        """Notify all subscribers of new message"""
        for subscriber in self.subscribers[:]:  # Copy list to avoid modification during iteration
            try:
                subscriber(asdict(message))
            except Exception as e:
                self.logger.error(f"Error notifying subscriber: {e}")
                # Remove failed subscriber
                self.subscribers.remove(subscriber)
    
    def subscribe(self, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to message stream"""
        self.subscribers.append(callback)
        self.logger.info(f"New subscriber added. Total: {len(self.subscribers)}")
    
    def unsubscribe(self, callback: Callable):
        """Unsubscribe from message stream"""
        if callback in self.subscribers:
            self.subscribers.remove(callback)
            self.logger.info(f"Subscriber removed. Total: {len(self.subscribers)}")
    
    def get_recent_messages(self, limit: int = 50, chat_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get recent messages from queue (for dashboard initialization)"""
        messages = []
        temp_queue = Queue()
        
        # Extract messages from queue
        while not self.message_queue.empty() and len(messages) < limit:
            try:
                message = self.message_queue.get_nowait()
                message_dict = asdict(message)
                
                # Filter by chat_id if specified
                if chat_id is None or message.chat_id == chat_id:
                    messages.append(message_dict)
                
                # Put message back for other consumers
                temp_queue.put(message)
                
            except Empty:
                break
        
        # Put messages back into original queue
        while not temp_queue.empty():
            self.message_queue.put(temp_queue.get_nowait())
        
        return sorted(messages, key=lambda x: x['timestamp'], reverse=True)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get streaming statistics for dashboard monitoring"""
        uptime = None
        if self.stats['start_time']:
            start = datetime.fromisoformat(self.stats['start_time'])
            uptime = str(datetime.now() - start)
        
        return {
            **self.stats,
            'active_chats': list(self.stats['active_chats']),
            'uptime': uptime,
            'is_streaming': self.is_streaming,
            'subscriber_count': len(self.subscribers),
            'queue_size': self.message_queue.qsize()
        }
    
    def add_transaction_detector(self, detector):
        """Add transaction detection capability"""
        self.transaction_detector = detector
        self.logger.info("Transaction detector added to message streamer")
    
    def add_keyword_filter(self, keywords: List[str]):
        """Add keyword filtering"""
        self.keyword_filters.extend(keywords)
        self.logger.info(f"Added {len(keywords)} keyword filters")
    
    def clear_statistics(self):
        """Clear statistics (useful for dashboard reset)"""
        self.stats = {
            'messages_processed': 0,
            'messages_streamed': 0,
            'start_time': datetime.now().isoformat() if self.is_streaming else None,
            'last_message_time': None,
            'active_chats': set(),
            'error_count': 0
        }
        self.logger.info("Statistics cleared")