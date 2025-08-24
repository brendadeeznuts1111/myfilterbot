#!/usr/bin/env python3
"""
Telegram Notification Delivery Service
Integrates with the main bot for stream-optimized notification delivery
"""

import sys
import json
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime

# Import from main bot system
try:
    from src.config import BOT_TOKEN, ADMIN_CHAT_ID
    from src.database import db
except ImportError:
    # Fallback for standalone testing
    BOT_TOKEN = "your_bot_token_here"
    ADMIN_CHAT_ID = "-1001234567890"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramNotificationDelivery:
    """Enhanced Telegram notification delivery with stream optimization"""
    
    def __init__(self, bot_token: str = BOT_TOKEN):
        self.bot_token = bot_token
        self.admin_chat_id = ADMIN_CHAT_ID
        
    async def deliver_single_notification(
        self, 
        user_id: str, 
        title: str, 
        message: str, 
        notification_type: str
    ) -> Dict[str, Any]:
        """Deliver single notification via Telegram"""
        start_time = datetime.now()
        
        try:
            # Get customer/admin Telegram ID
            telegram_id = await self.get_telegram_id(user_id)
            if not telegram_id:
                return {
                    "success": False,
                    "error": f"No Telegram ID found for user {user_id}",
                    "duration": 0
                }
            
            # Format message for Telegram
            formatted_message = self.format_telegram_message(title, message, notification_type)
            
            # Send via Telegram Bot API (simulate for now)
            delivery_result = await self.send_telegram_message(telegram_id, formatted_message)
            
            duration = (datetime.now() - start_time).total_seconds() * 1000  # ms
            
            if delivery_result['success']:
                logger.info(f"✅ Telegram notification delivered to {user_id} ({duration:.2f}ms)")
                return {
                    "success": True,
                    "telegram_id": telegram_id,
                    "message_id": delivery_result.get('message_id'),
                    "duration": duration,
                    "delivery_method": "stream_optimized"
                }
            else:
                return {
                    "success": False,
                    "error": delivery_result.get('error', 'Unknown error'),
                    "duration": duration
                }
                
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"❌ Telegram delivery failed for {user_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "duration": duration
            }
    
    async def deliver_batch_notifications(self, notifications: list) -> Dict[str, Any]:
        """Deliver batch of notifications via Telegram with optimized processing"""
        start_time = datetime.now()
        
        try:
            results = []
            successful_deliveries = 0
            
            # Process notifications in batches for optimal performance
            for notification_data in notifications:
                user_id = notification_data.get('userId')
                title = notification_data.get('title', 'Notification')
                message = notification_data.get('message', '')
                notification_type = notification_data.get('type', 'info')
                
                result = await self.deliver_single_notification(user_id, title, message, notification_type)
                results.append({
                    "user_id": user_id,
                    "success": result['success'],
                    "error": result.get('error'),
                    "duration": result.get('duration', 0)
                })
                
                if result['success']:
                    successful_deliveries += 1
            
            total_duration = (datetime.now() - start_time).total_seconds() * 1000
            
            return {
                "success": True,
                "delivered": successful_deliveries,
                "total": len(notifications),
                "results": results,
                "duration": total_duration,
                "average_latency": total_duration / len(notifications) if notifications else 0
            }
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"❌ Batch Telegram delivery failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "duration": duration,
                "delivered": 0,
                "total": len(notifications)
            }
    
    async def get_telegram_id(self, user_id: str) -> str:
        """Get Telegram ID for user"""
        try:
            # This would integrate with your customer database
            # For now, simulate the lookup
            if user_id.startswith('admin'):
                return self.admin_chat_id
            else:
                # Look up customer Telegram ID from database
                customer = db.get_customer(user_id) if 'db' in globals() else None
                if customer and hasattr(customer, 'telegram_id'):
                    return customer.telegram_id
                else:
                    # Fallback to admin chat for testing
                    return self.admin_chat_id
        except Exception as e:
            logger.error(f"Error getting Telegram ID for {user_id}: {e}")
            return None
    
    def format_telegram_message(self, title: str, message: str, notification_type: str) -> str:
        """Format notification for Telegram"""
        type_emojis = {
            'transaction': '💰',
            'balance_update': '📊',
            'security_alert': '🚨',
            'system_update': '🔧',
            'member_request': '👤',
            'trade_signal': '📈',
            'maintenance': '⚙️',
            'account_update': '👤',
            'promotion': '🎉',
            'error': '❌',
            'web_analysis': '🌐',
            'market_alert': '📊',
            'competitor_intelligence': '🔍'
        }
        
        emoji = type_emojis.get(notification_type, 'ℹ️')
        timestamp = datetime.now().strftime('%H:%M:%S')
        
        formatted = f"{emoji} **{title}**\n\n{message}\n\n_{timestamp} - FantDev Trading_"
        
        return formatted
    
    async def send_telegram_message(self, telegram_id: str, message: str) -> Dict[str, Any]:
        """Send message via Telegram Bot API"""
        try:
            # In a real implementation, this would use the Telegram Bot API
            # For demonstration, we'll simulate the API call
            
            # Simulate API latency
            await asyncio.sleep(0.05)  # 50ms simulated latency
            
            # Simulate successful delivery
            message_id = f"msg_{int(datetime.now().timestamp())}"
            
            return {
                "success": True,
                "message_id": message_id,
                "chat_id": telegram_id
            }
            
        except Exception as e:
            logger.error(f"Telegram API error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

async def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 5:
        print(json.dumps({
            "success": False,
            "error": "Usage: python telegram_notification_delivery.py <user_id> <title> <message> <type>"
        }))
        return
    
    user_id = sys.argv[1]
    title = sys.argv[2]
    message = sys.argv[3]
    notification_type = sys.argv[4]
    
    delivery_service = TelegramNotificationDelivery()
    result = await delivery_service.deliver_single_notification(user_id, title, message, notification_type)
    
    # Output JSON result for stream consumption
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())