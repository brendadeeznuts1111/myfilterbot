#!/usr/bin/env python3
"""
Telegram Batch Notification Delivery
High-performance batch processing for multiple notifications
"""

import sys
import json
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any

from telegram_notification_delivery import TelegramNotificationDelivery

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramBatchDelivery:
    """Optimized batch delivery for Telegram notifications"""
    
    def __init__(self):
        self.delivery_service = TelegramNotificationDelivery()
        
    async def process_batch(self, notifications_json: str) -> Dict[str, Any]:
        """Process a batch of notifications with performance optimization"""
        start_time = datetime.now()
        
        try:
            # Parse notification batch
            notifications = json.loads(notifications_json)
            
            if not isinstance(notifications, list):
                return {
                    "success": False,
                    "error": "Notifications must be a list",
                    "delivered": 0,
                    "total": 0
                }
            
            total_notifications = len(notifications)
            if total_notifications == 0:
                return {
                    "success": True,
                    "delivered": 0,
                    "total": 0,
                    "duration": 0
                }
            
            # Group notifications by user for efficiency
            user_groups = {}
            for notification in notifications:
                user_id = notification.get('userId')
                if user_id:
                    if user_id not in user_groups:
                        user_groups[user_id] = []
                    user_groups[user_id].append(notification)
            
            # Process groups concurrently with controlled concurrency
            max_concurrent = min(10, len(user_groups))  # Limit concurrent deliveries
            semaphore = asyncio.Semaphore(max_concurrent)
            
            async def process_user_group(user_id: str, user_notifications: List[Dict]):
                async with semaphore:
                    return await self.process_user_notifications(user_id, user_notifications)
            
            # Execute batch processing
            tasks = [
                process_user_group(user_id, notifications)
                for user_id, notifications in user_groups.items()
            ]
            
            group_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Aggregate results
            total_delivered = 0
            successful_groups = 0
            errors = []
            
            for i, result in enumerate(group_results):
                if isinstance(result, Exception):
                    errors.append(str(result))
                elif isinstance(result, dict) and result.get('success'):
                    total_delivered += result.get('delivered', 0)
                    successful_groups += 1
                else:
                    errors.append(result.get('error', 'Unknown error'))
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            
            logger.info(f"📨 Batch delivery completed: {total_delivered}/{total_notifications} delivered ({duration:.2f}ms)")
            
            return {
                "success": True,
                "delivered": total_delivered,
                "total": total_notifications,
                "successful_groups": successful_groups,
                "total_groups": len(user_groups),
                "duration": duration,
                "average_latency": duration / total_notifications if total_notifications > 0 else 0,
                "errors": errors[:5],  # Limit error list
                "performance": {
                    "notifications_per_second": (total_notifications / (duration / 1000)) if duration > 0 else 0,
                    "concurrent_groups": len(user_groups),
                    "max_concurrent": max_concurrent
                }
            }
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"❌ Batch processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "duration": duration,
                "delivered": 0,
                "total": 0
            }
    
    async def process_user_notifications(self, user_id: str, notifications: List[Dict]) -> Dict[str, Any]:
        """Process all notifications for a specific user"""
        try:
            # For Telegram, we might want to combine multiple notifications into a single message
            # to avoid rate limiting and improve user experience
            
            if len(notifications) == 1:
                # Single notification
                notification = notifications[0]
                return await self.delivery_service.deliver_single_notification(
                    user_id,
                    notification.get('title', 'Notification'),
                    notification.get('message', ''),
                    notification.get('type', 'info')
                )
            else:
                # Multiple notifications - combine them
                return await self.deliver_combined_notifications(user_id, notifications)
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "delivered": 0,
                "user_id": user_id
            }
    
    async def deliver_combined_notifications(self, user_id: str, notifications: List[Dict]) -> Dict[str, Any]:
        """Combine multiple notifications for a user into a single optimized message"""
        try:
            # Group by type for better organization
            type_groups = {}
            for notification in notifications:
                notif_type = notification.get('type', 'info')
                if notif_type not in type_groups:
                    type_groups[notif_type] = []
                type_groups[notif_type].append(notification)
            
            # Create combined message
            combined_title = f"📬 {len(notifications)} New Notifications"
            combined_message_parts = []
            
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
                'error': '❌'
            }
            
            for notif_type, type_notifications in type_groups.items():
                emoji = type_emojis.get(notif_type, 'ℹ️')
                
                if len(type_notifications) == 1:
                    # Single notification of this type
                    notification = type_notifications[0]
                    combined_message_parts.append(
                        f"{emoji} **{notification.get('title', 'Notification')}**\n"
                        f"{notification.get('message', '')}"
                    )
                else:
                    # Multiple notifications of the same type
                    combined_message_parts.append(
                        f"{emoji} **{len(type_notifications)} {notif_type.replace('_', ' ').title()} Updates**"
                    )
                    for i, notification in enumerate(type_notifications[:3]):  # Limit to first 3
                        combined_message_parts.append(f"  {i+1}. {notification.get('message', '')[:100]}{'...' if len(notification.get('message', '')) > 100 else ''}")
                    
                    if len(type_notifications) > 3:
                        combined_message_parts.append(f"  ... and {len(type_notifications) - 3} more")
            
            combined_message = "\n\n".join(combined_message_parts)
            
            # Deliver combined notification
            result = await self.delivery_service.deliver_single_notification(
                user_id,
                combined_title,
                combined_message,
                'combined'
            )
            
            if result['success']:
                result['delivered'] = len(notifications)  # Count all original notifications as delivered
                result['combined'] = True
                
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "delivered": 0,
                "user_id": user_id
            }

async def main():
    """Main function for batch processing"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python telegram_batch_delivery.py '<notifications_json>'"
        }))
        return
    
    notifications_json = sys.argv[1]
    
    batch_delivery = TelegramBatchDelivery()
    result = await batch_delivery.process_batch(notifications_json)
    
    # Output JSON result for stream consumption
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())