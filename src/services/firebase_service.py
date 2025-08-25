"""
Firebase Admin SDK integration for push notifications
Implements T-1: Integrate Firebase Admin SDK for push notifications
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    from firebase_admin.exceptions import FirebaseError
    
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logging.warning("Firebase Admin SDK not available. Push notifications will be disabled.")

logger = logging.getLogger(__name__)


class FirebaseService:
    """Service for handling Firebase Cloud Messaging push notifications"""
    
    def __init__(self):
        self.initialized = False
        self.app = None
        
    def initialize(self) -> bool:
        """Initialize Firebase Admin SDK"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase Admin SDK not installed")
            return False
            
        if self.initialized:
            return True
            
        try:
            # Check for service account file
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'config/firebase-service-account.json')
            
            if not os.path.exists(service_account_path):
                logger.warning(f"Firebase service account file not found at {service_account_path}")
                return False
                
            # Initialize Firebase
            cred = credentials.Certificate(service_account_path)
            self.app = firebase_admin.initialize_app(cred)
            self.initialized = True
            
            logger.info("Firebase Admin SDK initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            return False
    
    def send_push_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        priority: str = "high"
    ) -> bool:
        """Send a push notification to a specific device token"""
        if not self.initialized:
            logger.warning("Firebase not initialized")
            return False
            
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                android=messaging.AndroidConfig(
                    priority=priority,
                    notification=messaging.AndroidNotification(
                        channel_id="trading_alerts",
                        sound="default"
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            badge=1
                        )
                    )
                ),
                token=token
            )
            
            response = messaging.send(message)
            logger.info(f"Push notification sent successfully: {response}")
            return True
            
        except FirebaseError as e:
            logger.error(f"Failed to send push notification: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending push notification: {e}")
            return False
    
    def send_multicast_notification(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Send push notifications to multiple device tokens"""
        if not self.initialized:
            return {"success": 0, "failure": len(tokens), "errors": ["Firebase not initialized"]}
            
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                tokens=tokens
            )
            
            response = messaging.send_multicast(message)
            
            result = {
                "success": response.success_count,
                "failure": response.failure_count,
                "responses": []
            }
            
            for idx, resp in enumerate(response.responses):
                if resp.exception:
                    result["responses"].append({
                        "token": tokens[idx],
                        "success": False,
                        "error": str(resp.exception)
                    })
                else:
                    result["responses"].append({
                        "token": tokens[idx],
                        "success": True,
                        "message_id": resp.message_id
                    })
            
            logger.info(f"Multicast notification sent: {response.success_count} success, {response.failure_count} failure")
            return result
            
        except Exception as e:
            logger.error(f"Failed to send multicast notification: {e}")
            return {"success": 0, "failure": len(tokens), "errors": [str(e)]}
    
    def subscribe_to_topic(self, tokens: List[str], topic: str) -> bool:
        """Subscribe device tokens to a topic"""
        if not self.initialized:
            return False
            
        try:
            messaging.subscribe_to_topic(tokens, topic)
            logger.info(f"Subscribed {len(tokens)} tokens to topic: {topic}")
            return True
        except Exception as e:
            logger.error(f"Failed to subscribe to topic: {e}")
            return False
    
    def unsubscribe_from_topic(self, tokens: List[str], topic: str) -> bool:
        """Unsubscribe device tokens from a topic"""
        if not self.initialized:
            return False
            
        try:
            messaging.unsubscribe_from_topic(tokens, topic)
            logger.info(f"Unsubscribed {len(tokens)} tokens from topic: {topic}")
            return True
        except Exception as e:
            logger.error(f"Failed to unsubscribe from topic: {e}")
            return False
    
    def send_topic_notification(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> bool:
        """Send notification to all devices subscribed to a topic"""
        if not self.initialized:
            return False
            
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                topic=topic
            )
            
            response = messaging.send(message)
            logger.info(f"Topic notification sent to {topic}: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send topic notification: {e}")
            return False
    
    def validate_token(self, token: str) -> bool:
        """Validate if a device token is valid"""
        if not self.initialized:
            return False
            
        try:
            # Send a dry-run message to validate token
            message = messaging.Message(
                notification=messaging.Notification(
                    title="Validation",
                    body="Token validation"
                ),
                token=token
            )
            
            messaging.send(message, dry_run=True)
            return True
            
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return False


# Global Firebase service instance
firebase_service = FirebaseService()


def initialize_firebase():
    """Initialize Firebase service"""
    return firebase_service.initialize()


def send_trading_alert(token: str, alert_data: Dict[str, Any]) -> bool:
    """Send trading alert notification"""
    return firebase_service.send_push_notification(
        token=token,
        title=f"Trading Alert: {alert_data.get('type', 'General')}",
        body=alert_data.get('message', 'New trading activity detected'),
        data={
            "type": "trading_alert",
            "timestamp": str(int(datetime.now().timestamp())),
            **{k: str(v) for k, v in alert_data.items() if k not in ['type', 'message']}
        }
    )


def send_balance_update(token: str, balance_data: Dict[str, Any]) -> bool:
    """Send balance update notification"""
    return firebase_service.send_push_notification(
        token=token,
        title="Balance Update",
        body=f"Your balance has been updated: ${balance_data.get('new_balance', 0)}",
        data={
            "type": "balance_update",
            "previous_balance": str(balance_data.get('previous_balance', 0)),
            "new_balance": str(balance_data.get('new_balance', 0)),
            "change": str(balance_data.get('change', 0)),
            "timestamp": str(int(datetime.now().timestamp()))
        }
    )


def send_transaction_notification(token: str, transaction_data: Dict[str, Any]) -> bool:
    """Send transaction notification"""
    return firebase_service.send_push_notification(
        token=token,
        title=f"Transaction: {transaction_data.get('type', 'General')}",
        body=f"Amount: ${transaction_data.get('amount', 0)} - {transaction_data.get('description', '')}",
        data={
            "type": "transaction",
            "transaction_id": str(transaction_data.get('id', '')),
            "amount": str(transaction_data.get('amount', 0)),
            "description": str(transaction_data.get('description', '')),
            "timestamp": str(int(datetime.now().timestamp()))
        }
    )
