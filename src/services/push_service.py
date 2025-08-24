"""
Push Notification Service
Handles web push notifications and mobile push notifications
"""

import json
import requests
import os
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
import asyncio
import aiohttp
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class PushConfig:
    """Push notification configuration"""
    def __init__(self):
        # Web Push (Firebase/PWA)
        self.vapid_public_key = os.getenv('VAPID_PUBLIC_KEY', '')
        self.vapid_private_key = os.getenv('VAPID_PRIVATE_KEY', '')
        self.vapid_email = os.getenv('VAPID_EMAIL', 'admin@fantdev.trading')
        
        # Firebase Cloud Messaging
        self.fcm_server_key = os.getenv('FCM_SERVER_KEY', '')
        self.fcm_sender_id = os.getenv('FCM_SENDER_ID', '')
        
        # Apple Push Notification Service (APNS)
        self.apns_key_id = os.getenv('APNS_KEY_ID', '')
        self.apns_team_id = os.getenv('APNS_TEAM_ID', '')
        self.apns_bundle_id = os.getenv('APNS_BUNDLE_ID', 'com.fantdev.trading')
        self.apns_key_file = os.getenv('APNS_KEY_FILE', '')
        
        # General settings
        self.default_icon = '/static/icons/notification-icon.png'
        self.default_badge = '/static/icons/notification-badge.png'

class WebPushPayload:
    """Web push notification payload"""
    def __init__(self, 
                 title: str,
                 body: str,
                 icon: Optional[str] = None,
                 badge: Optional[str] = None,
                 image: Optional[str] = None,
                 tag: Optional[str] = None,
                 url: Optional[str] = None,
                 actions: Optional[List[Dict[str, str]]] = None,
                 data: Optional[Dict[str, Any]] = None,
                 ttl: int = 86400):  # 24 hours
        
        self.title = title
        self.body = body
        self.icon = icon or '/static/icons/notification-icon.png'
        self.badge = badge or '/static/icons/notification-badge.png'
        self.image = image
        self.tag = tag
        self.url = url
        self.actions = actions or []
        self.data = data or {}
        self.ttl = ttl
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        payload = {
            'notification': {
                'title': self.title,
                'body': self.body,
                'icon': self.icon,
                'badge': self.badge
            },
            'data': {
                'url': self.url or '/',
                'timestamp': datetime.now().isoformat(),
                **self.data
            }
        }
        
        if self.image:
            payload['notification']['image'] = self.image
        
        if self.tag:
            payload['notification']['tag'] = self.tag
        
        if self.actions:
            payload['notification']['actions'] = self.actions
        
        return payload

class FCMService:
    """Firebase Cloud Messaging service"""
    
    def __init__(self, server_key: str):
        self.server_key = server_key
        self.fcm_url = 'https://fcm.googleapis.com/fcm/send'
    
    async def send_to_token(self, token: str, payload: WebPushPayload) -> bool:
        """Send push notification to specific FCM token"""
        
        if not self.server_key:
            logger.error("FCM server key not configured")
            return False
        
        headers = {
            'Authorization': f'key={self.server_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'to': token,
            **payload.to_dict(),
            'time_to_live': payload.ttl
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.fcm_url, json=data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('success', 0) > 0:
                            logger.info(f"FCM notification sent successfully to token: {token[:10]}...")
                            return True
                        else:
                            logger.error(f"FCM notification failed: {result}")
                            return False
                    else:
                        logger.error(f"FCM API error: {response.status} - {await response.text()}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending FCM notification: {e}")
            return False
    
    async def send_to_topic(self, topic: str, payload: WebPushPayload) -> bool:
        """Send push notification to FCM topic"""
        
        if not self.server_key:
            logger.error("FCM server key not configured")
            return False
        
        headers = {
            'Authorization': f'key={self.server_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'to': f'/topics/{topic}',
            **payload.to_dict(),
            'time_to_live': payload.ttl
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.fcm_url, json=data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('success', 0) > 0:
                            logger.info(f"FCM notification sent successfully to topic: {topic}")
                            return True
                        else:
                            logger.error(f"FCM notification to topic failed: {result}")
                            return False
                    else:
                        logger.error(f"FCM API error: {response.status} - {await response.text()}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending FCM notification to topic: {e}")
            return False

class WebPushService:
    """Web Push service using VAPID"""
    
    def __init__(self, vapid_public_key: str, vapid_private_key: str, vapid_email: str):
        self.vapid_public_key = vapid_public_key
        self.vapid_private_key = vapid_private_key
        self.vapid_email = vapid_email
        
        # Try to import web push dependencies
        try:
            from pywebpush import webpush, WebPushException
            self.webpush = webpush
            self.WebPushException = WebPushException
            self.available = True
        except ImportError:
            logger.warning("pywebpush not installed. Web push notifications unavailable.")
            self.available = False
    
    async def send_notification(self, subscription_info: Dict[str, Any], payload: WebPushPayload) -> bool:
        """Send web push notification to subscription"""
        
        if not self.available:
            logger.error("Web push service not available - missing dependencies")
            return False
        
        if not all([self.vapid_public_key, self.vapid_private_key, self.vapid_email]):
            logger.error("VAPID configuration incomplete")
            return False
        
        try:
            vapid_claims = {
                "sub": f"mailto:{self.vapid_email}"
            }
            
            response = self.webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload.to_dict()),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=vapid_claims,
                ttl=payload.ttl
            )
            
            if response.status_code == 201:
                logger.info("Web push notification sent successfully")
                return True
            else:
                logger.error(f"Web push failed: {response.status_code} - {response.text}")
                return False
                
        except self.WebPushException as e:
            logger.error(f"Web push exception: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending web push notification: {e}")
            return False

class PushNotificationService:
    """Main push notification service"""
    
    def __init__(self, config: Optional[PushConfig] = None):
        self.config = config or PushConfig()
        
        # Initialize services
        self.fcm_service = FCMService(self.config.fcm_server_key) if self.config.fcm_server_key else None
        self.webpush_service = WebPushService(
            self.config.vapid_public_key,
            self.config.vapid_private_key,
            self.config.vapid_email
        ) if self.config.vapid_public_key else None
        
        # Subscription storage (in production, use database)
        self.subscriptions = {}
    
    def register_subscription(self, user_id: str, subscription_type: str, subscription_data: Dict[str, Any]):
        """Register push notification subscription"""
        
        if user_id not in self.subscriptions:
            self.subscriptions[user_id] = {}
        
        self.subscriptions[user_id][subscription_type] = {
            'data': subscription_data,
            'registered_at': datetime.now().isoformat(),
            'active': True
        }
        
        logger.info(f"Push subscription registered for user {user_id} via {subscription_type}")
    
    def unregister_subscription(self, user_id: str, subscription_type: Optional[str] = None):
        """Unregister push notification subscription"""
        
        if user_id not in self.subscriptions:
            return
        
        if subscription_type:
            if subscription_type in self.subscriptions[user_id]:
                del self.subscriptions[user_id][subscription_type]
        else:
            # Remove all subscriptions for user
            del self.subscriptions[user_id]
        
        logger.info(f"Push subscription unregistered for user {user_id}")
    
    async def send_to_user(self, user_id: str, payload: WebPushPayload) -> Dict[str, bool]:
        """Send push notification to all user's subscriptions"""
        
        results = {}
        
        if user_id not in self.subscriptions:
            logger.warning(f"No push subscriptions found for user {user_id}")
            return results
        
        user_subs = self.subscriptions[user_id]
        
        # Send to FCM tokens
        for sub_type, sub_info in user_subs.items():
            if not sub_info.get('active', True):
                continue
                
            try:
                if sub_type == 'fcm' and self.fcm_service:
                    token = sub_info['data'].get('token')
                    if token:
                        success = await self.fcm_service.send_to_token(token, payload)
                        results[f'fcm_{token[:10]}'] = success
                
                elif sub_type == 'webpush' and self.webpush_service:
                    subscription_info = sub_info['data']
                    success = await self.webpush_service.send_notification(subscription_info, payload)
                    results[f'webpush_{user_id}'] = success
                
            except Exception as e:
                logger.error(f"Error sending push notification via {sub_type}: {e}")
                results[f'{sub_type}_{user_id}'] = False
        
        return results
    
    async def send_to_topic(self, topic: str, payload: WebPushPayload) -> bool:
        """Send push notification to topic (FCM only)"""
        
        if not self.fcm_service:
            logger.error("FCM service not available for topic notifications")
            return False
        
        return await self.fcm_service.send_to_topic(topic, payload)
    
    async def send_notification_push(self, 
                                   user_id: str,
                                   notification_type: str,
                                   notification_data: Dict[str, Any]) -> Dict[str, bool]:
        """Send push notification with type-specific formatting"""
        
        # Create payload based on notification type
        payload = self._create_notification_payload(notification_type, notification_data)
        
        # Send to user's devices
        return await self.send_to_user(user_id, payload)
    
    def _create_notification_payload(self, notification_type: str, data: Dict[str, Any]) -> WebPushPayload:
        """Create push notification payload based on type"""
        
        # Notification type configurations
        type_configs = {
            'transaction': {
                'icon': '/static/icons/transaction-icon.png',
                'badge': '/static/icons/money-badge.png',
                'tag': 'transaction',
                'actions': [
                    {'action': 'view', 'title': 'View Transaction'},
                    {'action': 'dismiss', 'title': 'Dismiss'}
                ]
            },
            'balance_update': {
                'icon': '/static/icons/balance-icon.png',
                'badge': '/static/icons/wallet-badge.png',
                'tag': 'balance',
                'actions': [
                    {'action': 'view', 'title': 'View Balance'},
                    {'action': 'dismiss', 'title': 'Dismiss'}
                ]
            },
            'security_alert': {
                'icon': '/static/icons/security-icon.png',
                'badge': '/static/icons/warning-badge.png',
                'tag': 'security',
                'actions': [
                    {'action': 'secure', 'title': 'Secure Account'},
                    {'action': 'view', 'title': 'View Details'}
                ]
            },
            'trade_signal': {
                'icon': '/static/icons/signal-icon.png',
                'badge': '/static/icons/chart-badge.png',
                'tag': 'signal',
                'actions': [
                    {'action': 'trade', 'title': 'View Signal'},
                    {'action': 'dismiss', 'title': 'Dismiss'}
                ]
            },
            'member_request': {
                'icon': '/static/icons/member-icon.png',
                'badge': '/static/icons/group-badge.png',
                'tag': 'member',
                'actions': [
                    {'action': 'approve', 'title': 'Approve'},
                    {'action': 'deny', 'title': 'Deny'}
                ]
            },
            'system_update': {
                'icon': '/static/icons/system-icon.png',
                'badge': '/static/icons/update-badge.png',
                'tag': 'system'
            },
            'maintenance': {
                'icon': '/static/icons/maintenance-icon.png',
                'badge': '/static/icons/tools-badge.png',
                'tag': 'maintenance'
            },
            'promotion': {
                'icon': '/static/icons/promo-icon.png',
                'badge': '/static/icons/gift-badge.png',
                'tag': 'promotion',
                'actions': [
                    {'action': 'claim', 'title': 'Claim Offer'},
                    {'action': 'dismiss', 'title': 'Maybe Later'}
                ]
            }
        }
        
        config = type_configs.get(notification_type, {})
        
        # Create payload
        payload = WebPushPayload(
            title=data.get('title', 'Notification'),
            body=data.get('message', ''),
            icon=config.get('icon', self.config.default_icon),
            badge=config.get('badge', self.config.default_badge),
            tag=config.get('tag', notification_type),
            url=data.get('action_url', '/dashboard'),
            actions=config.get('actions', []),
            data={
                'notification_id': data.get('id', ''),
                'type': notification_type,
                'timestamp': data.get('created_at', datetime.now().isoformat()),
                'metadata': data.get('metadata', {})
            }
        )
        
        return payload
    
    def get_subscription_stats(self) -> Dict[str, Any]:
        """Get push subscription statistics"""
        
        total_users = len(self.subscriptions)
        total_subscriptions = sum(len(subs) for subs in self.subscriptions.values())
        
        type_counts = {}
        for user_subs in self.subscriptions.values():
            for sub_type in user_subs.keys():
                type_counts[sub_type] = type_counts.get(sub_type, 0) + 1
        
        return {
            'total_users': total_users,
            'total_subscriptions': total_subscriptions,
            'subscription_types': type_counts,
            'services_available': {
                'fcm': self.fcm_service is not None,
                'webpush': self.webpush_service is not None and self.webpush_service.available
            }
        }

# Service Worker JavaScript for Web Push
def generate_service_worker_js() -> str:
    """Generate service worker JavaScript for web push notifications"""
    return '''
    // Fantdev Trading - Push Notification Service Worker
    
    self.addEventListener('install', event => {
        console.log('Push SW installed');
        self.skipWaiting();
    });
    
    self.addEventListener('activate', event => {
        console.log('Push SW activated');
        event.waitUntil(clients.claim());
    });
    
    self.addEventListener('push', event => {
        const options = {
            body: 'You have a new notification',
            icon: '/static/icons/notification-icon.png',
            badge: '/static/icons/notification-badge.png',
            data: {
                url: '/dashboard'
            }
        };
        
        if (event.data) {
            const payload = event.data.json();
            Object.assign(options, payload.notification);
            if (payload.data) {
                options.data = payload.data;
            }
        }
        
        event.waitUntil(
            self.registration.showNotification('Fantdev Trading', options)
        );
    });
    
    self.addEventListener('notificationclick', event => {
        event.notification.close();
        
        const action = event.action;
        const data = event.notification.data;
        
        if (action === 'view' || !action) {
            // Open the app
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                    const url = data.url || '/dashboard';
                    
                    // Check if there's already a window/tab open
                    for (const client of clientList) {
                        if (client.url.includes(url) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Open new window/tab
                    if (clients.openWindow) {
                        return clients.openWindow(url);
                    }
                })
            );
        } else if (action === 'dismiss') {
            // Just close the notification
            return;
        } else {
            // Handle other actions
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                    for (const client of clientList) {
                        if ('postMessage' in client) {
                            client.postMessage({
                                type: 'notification-action',
                                action: action,
                                data: data
                            });
                            return client.focus();
                        }
                    }
                })
            );
        }
    });
    
    self.addEventListener('notificationclose', event => {
        console.log('Notification closed:', event.notification.tag);
    });
    '''

# Global push service instance
push_service = PushNotificationService()

# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test_push():
        # Register a test subscription
        test_subscription = {
            'token': 'test-fcm-token'
        }
        
        push_service.register_subscription('user123', 'fcm', test_subscription)
        
        # Create test payload
        test_data = {
            'id': 'test-123',
            'title': 'Test Transaction',
            'message': 'You received $1,000',
            'amount': 1000,
            'action': 'deposit',
            'created_at': datetime.now().isoformat()
        }
        
        # Send push notification
        results = await push_service.send_notification_push(
            user_id='user123',
            notification_type='transaction',
            notification_data=test_data
        )
        
        print(f"Push notification results: {results}")
        print(f"Subscription stats: {push_service.get_subscription_stats()}")
    
    # Run test (requires proper configuration)
    # asyncio.run(test_push())