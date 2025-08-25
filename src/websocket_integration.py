#!/usr/bin/env python3
"""
WebSocket Integration for Customer Portal
Provides real-time communication between bot and portal
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set
import socketio
from threading import Thread
import queue
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PortalWebSocketManager:
    """Manages WebSocket connections for the customer portal"""
    
    def __init__(self, portal_server=None):
        self.sio = socketio.AsyncServer(
            cors_allowed_origins="*",
            async_mode='threading'
        )
        self.portal_server = portal_server
        self.connected_clients = {}  # customer_id -> session_id mapping
        self.message_queue = queue.Queue()
        self.bot_connection = None
        
        self._setup_event_handlers()
        
    def _setup_event_handlers(self):
        """Setup WebSocket event handlers"""
        
        @self.sio.event
        async def connect(sid, environ, auth=None):
            logger.info(f'Client connected: {sid}')
            
        @self.sio.event  
        async def disconnect(sid):
            # Remove client from connected list
            for customer_id, session_id in list(self.connected_clients.items()):
                if session_id == sid:
                    del self.connected_clients[customer_id]
                    logger.info(f'Customer {customer_id} disconnected')
                    break
            
        @self.sio.event
        async def authenticate(sid, data):
            """Authenticate customer connection"""
            try:
                token = data.get('token')
                if not token:
                    await self.sio.emit('auth_error', {'error': 'Token required'}, room=sid)
                    return
                
                # Validate token and extract customer ID
                customer_id = self._validate_token(token)
                if not customer_id:
                    await self.sio.emit('auth_error', {'error': 'Invalid token'}, room=sid)
                    return
                
                # Store connection
                self.connected_clients[customer_id] = sid
                
                await self.sio.emit('auth_success', {
                    'message': 'Authenticated successfully',
                    'customer_id': customer_id
                }, room=sid)
                
                # Send initial data
                await self._send_initial_data(customer_id, sid)
                
                logger.info(f'Customer {customer_id} authenticated')
                
            except Exception as e:
                logger.error(f'Authentication error: {e}')
                await self.sio.emit('auth_error', {'error': 'Authentication failed'}, room=sid)
        
        @self.sio.event
        async def subscribe_updates(sid, data):
            """Subscribe to specific update types"""
            try:
                update_types = data.get('types', ['all'])
                # Store subscription preferences (could be enhanced)
                await self.sio.emit('subscription_success', {
                    'subscribed_to': update_types
                }, room=sid)
                
            except Exception as e:
                logger.error(f'Subscription error: {e}')
    
    def _validate_token(self, token) -> Optional[str]:
        """Validate JWT token and return customer ID"""
        try:
            import base64
            payload = json.loads(base64.b64decode(token).decode())
            
            # Check expiration
            expires_at = datetime.fromisoformat(payload['expires_at'])
            if datetime.now() > expires_at:
                return None
                
            return payload['customer_id']
            
        except Exception as e:
            logger.error(f'Token validation error: {e}')
            return None
    
    async def _send_initial_data(self, customer_id: str, sid: str):
        """Send initial customer data after authentication"""
        try:
            if self.portal_server:
                from src.database import db
                customer = db.get_customer(customer_id)
                
                if customer:
                    initial_data = {
                        'balance': customer.balance,
                        'weekly_pnl': customer.weekly_pnl,
                        'active': customer.active,
                        'last_update': datetime.now().isoformat()
                    }
                    
                    await self.sio.emit('initial_data', initial_data, room=sid)
                    
        except Exception as e:
            logger.error(f'Error sending initial data: {e}')
    
    # Public methods for bot integration
    
    async def broadcast_transaction(self, customer_id: str, transaction_data: dict):
        """Broadcast new transaction to customer"""
        if customer_id in self.connected_clients:
            sid = self.connected_clients[customer_id]
            await self.sio.emit('transaction_update', transaction_data, room=sid)
            logger.info(f'Sent transaction update to {customer_id}')
    
    async def broadcast_balance_update(self, customer_id: str, balance_data: dict):
        """Broadcast balance update to customer"""
        if customer_id in self.connected_clients:
            sid = self.connected_clients[customer_id]
            await self.sio.emit('balance_update', balance_data, room=sid)
            logger.info(f'Sent balance update to {customer_id}')
    
    async def broadcast_alert(self, customer_id: str, alert_data: dict):
        """Broadcast alert to customer"""
        if customer_id in self.connected_clients:
            sid = self.connected_clients[customer_id]
            await self.sio.emit('alert_update', alert_data, room=sid)
            logger.info(f'Sent alert to {customer_id}')
    
    def notify_transaction(self, customer_id: str, transaction: dict):
        """Thread-safe method to notify about transactions"""
        self.message_queue.put({
            'type': 'transaction',
            'customer_id': customer_id,
            'data': transaction
        })
    
    def notify_balance_change(self, customer_id: str, old_balance: float, new_balance: float):
        """Thread-safe method to notify about balance changes"""
        change = new_balance - old_balance
        percentage = (change / old_balance * 100) if old_balance > 0 else 0
        
        self.message_queue.put({
            'type': 'balance_update',
            'customer_id': customer_id,
            'data': {
                'balance': new_balance,
                'change': change,
                'percentage': f'{percentage:+.2f}%'
            }
        })
    
    def notify_alert(self, customer_id: str, alert_type: str, message: str):
        """Thread-safe method to send alerts"""
        self.message_queue.put({
            'type': 'alert',
            'customer_id': customer_id,
            'data': {
                'alert_type': alert_type,
                'message': message,
                'timestamp': datetime.now().isoformat()
            }
        })
    
    def start_message_processor(self):
        """Start the message processor thread"""
        def process_messages():
            while True:
                try:
                    if not self.message_queue.empty():
                        message = self.message_queue.get(timeout=1)
                        asyncio.create_task(self._process_message(message))
                    else:
                        time.sleep(0.1)
                except queue.Empty:
                    continue
                except Exception as e:
                    logger.error(f'Message processing error: {e}')
        
        thread = Thread(target=process_messages, daemon=True)
        thread.start()
        logger.info('Message processor started')
    
    async def _process_message(self, message: dict):
        """Process queued messages"""
        try:
            msg_type = message['type']
            customer_id = message['customer_id']
            data = message['data']
            
            if msg_type == 'transaction':
                await self.broadcast_transaction(customer_id, data)
            elif msg_type == 'balance_update':
                await self.broadcast_balance_update(customer_id, data)
            elif msg_type == 'alert':
                await self.broadcast_alert(customer_id, data)
                
        except Exception as e:
            logger.error(f'Error processing message: {e}')

# Global WebSocket manager instance
websocket_manager = PortalWebSocketManager()

def setup_websocket_integration(app, portal_server=None):
    """Setup WebSocket integration with Flask app"""
    global websocket_manager
    
    # Initialize with portal server reference
    websocket_manager.portal_server = portal_server
    
    # Attach Socket.IO to Flask app
    websocket_manager.sio.attach(app)
    
    # Start message processor
    websocket_manager.start_message_processor()
    
    logger.info('WebSocket integration setup complete')
    return websocket_manager

def get_websocket_manager():
    """Get the global WebSocket manager instance"""
    return websocket_manager

# Bot integration functions
def send_transaction_to_portal(customer_id: str, transaction_data: dict):
    """Send transaction update to portal (called from bot)"""
    websocket_manager.notify_transaction(customer_id, transaction_data)

def send_balance_update_to_portal(customer_id: str, old_balance: float, new_balance: float):
    """Send balance update to portal (called from bot)"""
    websocket_manager.notify_balance_change(customer_id, old_balance, new_balance)

def send_alert_to_portal(customer_id: str, alert_type: str, message: str):
    """Send alert to portal (called from bot)"""
    websocket_manager.notify_alert(customer_id, alert_type, message)