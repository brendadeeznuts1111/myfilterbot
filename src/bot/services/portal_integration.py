"""
Portal Integration Module
Bridges the main bot with the customer portal for real-time updates
"""

import os
import requests
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import asyncio
from threading import Thread
import time

from config import config
from src.portal.db.repositories import db

logger = logging.getLogger(__name__)

class PortalIntegration:
    """Handles communication between bot and customer portal"""
    portal_base_url: Any
    enabled: Any
    retry_count: int
    timeout: Any
    
    def __init__(self, portal_base_url: str = None) -> None:
        """
        Initialize PortalIntegration.
        
        If portal_base_url is not provided, reads PORTAL_SERVER_URL from the environment and defaults to "http://localhost:5000". Sets up instance state used by other methods: `portal_base_url` (str), `enabled` (bool, defaults to True), `retry_count` (int, defaults to 3) and `timeout` (int, seconds, defaults to 5).
        
        Parameters:
            portal_base_url (str, optional): Base URL of the portal server. When omitted, the value of the `PORTAL_SERVER_URL` environment variable is used, falling back to "http://localhost:5000".
        """
        if portal_base_url is None:
            portal_base_url = os.getenv('PORTAL_SERVER_URL', 'http://localhost:5000')
        self.portal_base_url = portal_base_url
        self.enabled = True
        self.retry_count = 3
        self.timeout = 5
        
    def is_portal_available(self) -> bool:
        """Check if portal server is available"""
        try:
            response = requests.get(
                f"{self.portal_base_url}/health",
                timeout=self.timeout
            )
            return response.status_code == 200
        except:
            return False
    
    def send_transaction_update(self, customer_id: str, transaction_data: Dict) -> bool:
        """Send transaction update to portal"""
        if not self.enabled:
            return False
            
        try:
            # Format transaction for portal
            portal_transaction = {
                'id': transaction_data.get('id', f'TX{int(time.time())}'),
                'type': transaction_data.get('type'),
                'amount': transaction_data.get('amount', 0),
                'status': transaction_data.get('status', 'completed'),
                'timestamp': transaction_data.get('timestamp', datetime.now().isoformat()),
                'time': datetime.now().strftime('%b %d %I:%M %p'),
                'description': transaction_data.get('description', f"{transaction_data.get('type', 'Unknown').title()} transaction"),
                'from_user': transaction_data.get('from_user', ''),
                'message': transaction_data.get('message', ''),
                'customer_id': customer_id
            }
            
            payload = {
                'customer_id': customer_id,
                'transaction_data': portal_transaction
            }
            
            response = requests.post(
                f"{self.portal_base_url}/api/realtime/transaction",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                logger.info(f"Transaction update sent to portal for {customer_id}")
                return True
            else:
                logger.warning(f"Portal transaction update failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending transaction to portal: {e}")
            return False
    
    def send_balance_update(self, customer_id: str, old_balance: float, new_balance: float) -> bool:
        """Send balance update to portal"""
        if not self.enabled:
            return False
            
        try:
            payload = {
                'customer_id': customer_id,
                'old_balance': old_balance,
                'new_balance': new_balance
            }
            
            response = requests.post(
                f"{self.portal_base_url}/api/realtime/balance",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                logger.info(f"Balance update sent to portal for {customer_id}")
                return True
            else:
                logger.warning(f"Portal balance update failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending balance update to portal: {e}")
            return False
    
    def notify_customer_login(self, customer_id: str, telegram_id: int = None) -> bool:
        """Notify portal of customer login/registration"""
        if not self.enabled:
            return False
            
        try:
            # Update customer's last activity
            customer = db.get_customer(customer_id)
            if customer:
                customer.last_activity = datetime.now().isoformat()
                if telegram_id:
                    customer.telegram_id = telegram_id
                db.save_customer(customer)
            
            logger.info(f"Customer {customer_id} activity updated")
            return True
            
        except Exception as e:
            logger.error(f"Error updating customer activity: {e}")
            return False
    
    def process_telegram_message(self, message_text: str, from_user: str, chat_id: str) -> Optional[Dict]:
        """Process Telegram message for transaction detection"""
        from .utils import detect_transaction
        
        # Detect transaction
        transaction = detect_transaction(message_text)
        
        if transaction['type']:
            # Find relevant customer(s)
            customers = self.find_customers_for_message(message_text, from_user)
            
            for customer_id in customers:
                # Create transaction record
                transaction_data = {
                    'id': f'TX{int(time.time())}{hash(message_text)}'[:10],
                    'type': transaction['type'],
                    'amount': transaction['amount'],
                    'status': 'completed' if transaction['type'] != 'denied' else 'denied',
                    'timestamp': datetime.now().isoformat(),
                    'message': message_text,
                    'from_user': from_user,
                    'chat_id': chat_id,
                    'confidence': transaction['confidence'],
                    'matched_patterns': transaction['matched_patterns']
                }
                
                # Update customer balance if auto-update enabled
                if config.auto_balance_update and transaction['amount']:
                    customer = db.get_customer(customer_id)
                    if customer:
                        old_balance = customer.balance
                        
                        if transaction['type'] == 'deposit':
                            customer.balance += transaction['amount']
                        elif transaction['type'] == 'withdrawal':
                            customer.balance -= transaction['amount']
                        
                        db.save_customer(customer)
                        
                        # Send balance update to portal
                        self.send_balance_update(customer_id, old_balance, customer.balance)
                
                # Send transaction to portal
                self.send_transaction_update(customer_id, transaction_data)
                
                # Store in database
                db.add_transaction(customer_id, transaction_data)
            
            return transaction_data
        
        return None
    
    def find_customers_for_message(self, message_text: str, from_user: str) -> List[str]:
        """
        Return a list of customer IDs whose configured keywords or telegram_username match the given message or sender.
        
        Detailed behavior:
        - Loads customer_config.json from the package root (two levels up from this file) and iterates its "customers" mapping.
        - A customer is matched if any configured keyword appears (case-insensitive) in message_text or from_user, or if the configured telegram_username (normalized, without "@") is contained in from_user.
        - Duplicate IDs are removed before returning.
        - On error (file missing, parse error, etc.) the function logs the exception and returns an empty list.
        
        Parameters:
            message_text (str): The incoming message text to check for keywords.
            from_user (str): The sender identifier (e.g., username) to check for keywords or telegram_username matches.
        
        Returns:
            List[str]: Unique customer IDs that match the message or sender.
        """
        relevant_customers = []
        
        try:
            # Load customer config for keyword matching
            import json
            from pathlib import Path
            
            config_path = Path(__file__).parent.parent / 'customer_config.json'
            if config_path.exists():
                with open(config_path, 'r') as f:
                    customer_config = json.load(f)
                
                message_lower = message_text.lower()
                from_user_lower = from_user.lower()
                
                for customer_id, config in customer_config.get('customers', {}).items():
                    # Check if customer keywords match
                    keywords = config.get('keywords', [])
                    for keyword in keywords:
                        if keyword.lower() in message_lower or keyword.lower() in from_user_lower:
                            relevant_customers.append(customer_id)
                            break
                    
                    # Check telegram username match
                    if config.get('telegram_username'):
                        if config['telegram_username'].lower().replace('@', '') in from_user_lower:
                            relevant_customers.append(customer_id)
        
        except Exception as e:
            logger.error(f"Error finding customers for message: {e}")
        
        # Remove duplicates
        return list(set(relevant_customers))
    
    def enable(self) -> None:
        """Enable portal integration"""
        self.enabled = True
        logger.info("Portal integration enabled")
    
    def disable(self) -> None:
        """
        Disable portal integration.
        
        Sets the instance's `enabled` flag to False so subsequent operations that check
        integration state will no longer attempt portal communication.
        """
        self.enabled = False
        logger.info("Portal integration disabled")

# Global portal integration instance
portal_integration = PortalIntegration()

def get_portal_integration() -> PortalIntegration:
    """Get the global portal integration instance"""
    return portal_integration

def setup_portal_integration(portal_url: str = None) -> Any:
    """
    Configure and initialize the global PortalIntegration instance.
    
    If a portal_url is provided, it overrides the instance's base URL. The function checks the portal's health endpoint and enables the integration if reachable; otherwise it disables the integration.
    
    Parameters:
        portal_url (str, optional): If provided, sets the PortalIntegration.base_url to this value before performing the availability check.
    
    Returns:
        PortalIntegration: The global portal_integration instance (possibly enabled or disabled based on availability).
    """
    global portal_integration
    
    if portal_url:
        portal_integration.portal_base_url = portal_url
    
    # Check if portal is available
    if portal_integration.is_portal_available():
        logger.info(f"Portal integration setup complete - Portal available at {portal_integration.portal_base_url}")
        portal_integration.enable()
    else:
        logger.warning(f"Portal server not available at {portal_integration.portal_base_url} - Integration disabled")
        portal_integration.disable()
    
    return portal_integration

# Convenience functions for bot handlers
def notify_transaction(customer_id: str, transaction_data: Dict) -> bool:
    """Notify portal of new transaction"""
    return portal_integration.send_transaction_update(customer_id, transaction_data)

def notify_balance_change(customer_id: str, old_balance: float, new_balance: float) -> bool:
    """Notify portal of balance change"""
    return portal_integration.send_balance_update(customer_id, old_balance, new_balance)

def notify_customer_activity(customer_id: str, telegram_id: int = None) -> bool:
    """Notify portal of customer activity"""
    return portal_integration.notify_customer_login(customer_id, telegram_id)

def process_group_message(message_text: str, from_user: str, chat_id: str) -> Optional[Dict]:
    """Process group message for transactions"""
    return portal_integration.process_telegram_message(message_text, from_user, chat_id)

def is_portal_enabled() -> bool:
    """
    Return True if portal integration is enabled and the portal health endpoint is reachable.
    
    Checks both the local enabled flag and the portal's /health endpoint; returns False otherwise.
    
    Returns:
        bool: True when integration is enabled and the portal responds with a healthy status, False otherwise.
    """
    return portal_integration.enabled and portal_integration.is_portal_available()
