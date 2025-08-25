"""
Security Event Processor
Integrates security monitoring with the existing bot and portal systems
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import ipaddress
import re

from .security_engine import get_security_engine, EventType, ThreatLevel

logger = logging.getLogger(__name__)

class SecurityEventProcessor:
    """Processes various system events for security analysis"""
    
    def __init__(self, security_engine=None):
        self.security_engine = security_engine or get_security_engine()
        self.ip_geolocation_cache = {}
        self.suspicious_patterns = self._load_suspicious_patterns()
        
    def _load_suspicious_patterns(self) -> Dict[str, List[str]]:
        """Load patterns that indicate suspicious activity"""
        return {
            'transaction_descriptions': [
                r'test.*transaction',
                r'dummy.*payment',
                r'fraud.*check',
                r'money.*laundering',
                r'wash.*trade'
            ],
            'suspicious_amounts': [
                r'9999\.99',  # Just under $10k reporting threshold
                r'4999\.99',  # Just under $5k threshold  
                r'2999\.99',  # Just under $3k threshold
            ],
            'user_agents': [
                r'bot',
                r'crawler',
                r'automated',
                r'script',
                r'python-requests'
            ],
            'ip_patterns': [
                r'^10\.',      # Private IP ranges (potentially VPN)
                r'^192\.168\.',
                r'^172\.(1[6-9]|2[0-9]|3[01])\.'
            ]
        }
    
    async def process_login_attempt(self, customer_id: str, ip_address: str, 
                                  user_agent: str, success: bool, 
                                  metadata: Dict[str, Any] = None) -> Optional[List]:
        """Process a login attempt for security analysis"""
        try:
            if not success:
                # Failed login - high priority security event
                event_data = {
                    'event_type': 'failed_login',
                    'customer_id': customer_id,
                    'ip': ip_address,
                    'user_agent': user_agent,
                    'metadata': {
                        'attempt_timestamp': datetime.now().isoformat(),
                        'failure_reason': metadata.get('failure_reason', 'invalid_credentials'),
                        **(metadata or {})
                    },
                    'severity': 'medium'
                }
                
                # Check for suspicious patterns
                if self._is_suspicious_user_agent(user_agent):
                    event_data['severity'] = 'high'
                    event_data['metadata']['suspicious_user_agent'] = True
                
                if self._is_suspicious_ip(ip_address):
                    event_data['severity'] = 'high'
                    event_data['metadata']['suspicious_ip'] = True
                
                logger.warning(f"🚨 Failed login attempt: {customer_id} from {ip_address}")
                return await self.security_engine.process_event(event_data)
            
            else:
                # Successful login - check for unusual patterns
                event_data = {
                    'event_type': 'account_access',
                    'customer_id': customer_id,
                    'ip': ip_address,
                    'user_agent': user_agent,
                    'metadata': {
                        'login_timestamp': datetime.now().isoformat(),
                        'device_info': metadata.get('device_info', {}),
                        **(metadata or {})
                    },
                    'severity': 'low'
                }
                
                # Check if this is a new device/location
                if await self._is_new_device_location(customer_id, ip_address, user_agent):
                    event_data['event_type'] = 'new_device_login'
                    event_data['severity'] = 'medium'
                    event_data['metadata']['new_device'] = True
                    
                    logger.info(f"🔍 New device login detected: {customer_id} from {ip_address}")
                    return await self.security_engine.process_event(event_data)
                
                # Check for unusual IP location
                if await self._is_unusual_ip_location(customer_id, ip_address):
                    event_data['event_type'] = 'unusual_ip'
                    event_data['severity'] = 'medium'
                    event_data['metadata']['unusual_location'] = True
                    
                    logger.info(f"🌍 Unusual IP location: {customer_id} from {ip_address}")
                    return await self.security_engine.process_event(event_data)
        
        except Exception as e:
            logger.error(f"Error processing login attempt: {e}")
            return None
    
    async def process_transaction(self, customer_id: str, transaction_data: Dict[str, Any], 
                                ip_address: str = None, user_agent: str = None) -> Optional[List]:
        """Process a transaction for security analysis"""
        try:
            amount = float(transaction_data.get('amount', 0))
            transaction_type = transaction_data.get('type', 'unknown')
            description = transaction_data.get('description', '')
            timestamp = transaction_data.get('timestamp', datetime.now().isoformat())
            
            # Analyze transaction for suspicious patterns
            is_suspicious = False
            suspicion_reasons = []
            
            # Check amount patterns
            if self._is_suspicious_amount(amount):
                is_suspicious = True
                suspicion_reasons.append('suspicious_amount_pattern')
            
            # Check description patterns
            if self._is_suspicious_description(description):
                is_suspicious = True
                suspicion_reasons.append('suspicious_description')
            
            # Check for rapid transactions
            if await self._is_rapid_transaction_sequence(customer_id, timestamp):
                is_suspicious = True
                suspicion_reasons.append('rapid_sequence')
            
            # Check for large transaction amounts
            if amount > 10000:  # $10k+ transactions
                is_suspicious = True
                suspicion_reasons.append('large_amount')
            
            if is_suspicious:
                event_data = {
                    'event_type': 'suspicious_transaction',
                    'customer_id': customer_id,
                    'ip': ip_address or '127.0.0.1',
                    'user_agent': user_agent or 'Unknown',
                    'metadata': {
                        'amount': amount,
                        'transaction_type': transaction_type,
                        'description': description,
                        'timestamp': timestamp,
                        'suspicion_reasons': suspicion_reasons,
                        'transaction_id': transaction_data.get('id', 'unknown')
                    },
                    'severity': 'high' if amount > 50000 or len(suspicion_reasons) > 2 else 'medium'
                }
                
                logger.warning(f"🚨 Suspicious transaction: {customer_id} - ${amount:.2f} ({', '.join(suspicion_reasons)})")
                return await self.security_engine.process_event(event_data)
            
            # Check for rapid transaction pattern (even if not suspicious individually)
            if await self._check_rapid_transactions(customer_id, timestamp):
                event_data = {
                    'event_type': 'rapid_transactions',
                    'customer_id': customer_id,
                    'ip': ip_address or '127.0.0.1',
                    'user_agent': user_agent or 'Unknown',
                    'metadata': {
                        'recent_transaction_count': await self._get_recent_transaction_count(customer_id),
                        'time_window': '5_minutes',
                        'current_amount': amount,
                        'transaction_type': transaction_type
                    },
                    'severity': 'medium'
                }
                
                logger.info(f"⚡ Rapid transactions detected: {customer_id}")
                return await self.security_engine.process_event(event_data)
        
        except Exception as e:
            logger.error(f"Error processing transaction: {e}")
            return None
    
    async def process_message_event(self, message_data: Dict[str, Any]) -> Optional[List]:
        """Process bot messages for security patterns"""
        try:
            message_text = message_data.get('text', '').lower()
            customer_id = message_data.get('customer_id')
            chat_id = message_data.get('chat_id')
            
            # Check for potential social engineering attempts
            social_engineering_patterns = [
                r'password.*reset',
                r'account.*locked',
                r'verify.*identity',
                r'urgent.*action',
                r'suspicious.*activity',
                r'security.*alert'
            ]
            
            for pattern in social_engineering_patterns:
                if re.search(pattern, message_text):
                    event_data = {
                        'event_type': 'suspicious_message',
                        'customer_id': customer_id,
                        'ip': '127.0.0.1',  # Internal bot message
                        'user_agent': 'TelegramBot',
                        'metadata': {
                            'message_text': message_text[:200],  # Truncate for privacy
                            'chat_id': chat_id,
                            'pattern_matched': pattern,
                            'timestamp': datetime.now().isoformat()
                        },
                        'severity': 'medium'
                    }
                    
                    logger.warning(f"🤖 Suspicious message pattern detected: {pattern}")
                    return await self.security_engine.process_event(event_data)
        
        except Exception as e:
            logger.error(f"Error processing message event: {e}")
            return None
    
    async def process_admin_action(self, admin_id: str, action: str, target: str, 
                                 ip_address: str = None, metadata: Dict[str, Any] = None) -> Optional[List]:
        """Process admin actions for audit and security"""
        try:
            # Log all admin actions for audit
            event_data = {
                'event_type': 'admin_action',
                'customer_id': None,  # Admin actions don't have customer_id
                'ip': ip_address or '127.0.0.1',
                'user_agent': 'AdminPortal',
                'metadata': {
                    'admin_id': admin_id,
                    'action': action,
                    'target': target,
                    'timestamp': datetime.now().isoformat(),
                    **(metadata or {})
                },
                'severity': 'low'
            }
            
            # Escalate certain admin actions
            high_privilege_actions = [
                'delete_customer',
                'bulk_update',
                'system_config_change',
                'security_rule_disable'
            ]
            
            if action in high_privilege_actions:
                event_data['severity'] = 'medium'
                logger.warning(f"🔒 High-privilege admin action: {admin_id} performed {action} on {target}")
            
            return await self.security_engine.process_event(event_data)
            
        except Exception as e:
            logger.error(f"Error processing admin action: {e}")
            return None
    
    # Helper methods for pattern analysis
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent matches suspicious patterns"""
        user_agent_lower = user_agent.lower()
        return any(re.search(pattern, user_agent_lower) for pattern in self.suspicious_patterns['user_agents'])
    
    def _is_suspicious_ip(self, ip_address: str) -> bool:
        """Check if IP address matches suspicious patterns"""
        try:
            ip = ipaddress.ip_address(ip_address)
            # Check if it's a private IP (could indicate VPN or proxy)
            if ip.is_private:
                return True
            
            # Check against known suspicious patterns
            return any(re.match(pattern, ip_address) for pattern in self.suspicious_patterns['ip_patterns'])
        except Exception:
            return True  # Invalid IP is suspicious
    
    def _is_suspicious_amount(self, amount: float) -> bool:
        """Check if transaction amount matches suspicious patterns"""
        amount_str = f"{amount:.2f}"
        return any(re.search(pattern, amount_str) for pattern in self.suspicious_patterns['suspicious_amounts'])
    
    def _is_suspicious_description(self, description: str) -> bool:
        """Check if transaction description matches suspicious patterns"""
        description_lower = description.lower()
        return any(re.search(pattern, description_lower) for pattern in self.suspicious_patterns['transaction_descriptions'])
    
    async def _is_new_device_location(self, customer_id: str, ip_address: str, user_agent: str) -> bool:
        """Check if this is a new device/location for the customer"""
        # In a real implementation, this would check against customer's login history
        # For now, we'll use a simple heuristic
        
        # Get recent login events for this customer
        recent_events = self.security_engine.data_store.get_recent_events(
            customer_id=customer_id, 
            event_type=EventType.ACCOUNT_ACCESS, 
            minutes=7*24*60  # Last week
        )
        
        # Check if we've seen this IP/User-Agent combination before
        for event in recent_events:
            if (event.ip_address == ip_address and 
                event.user_agent == user_agent):
                return False
        
        return len(recent_events) > 0  # Only flag as new if user has prior login history
    
    async def _is_unusual_ip_location(self, customer_id: str, ip_address: str) -> bool:
        """Check if IP location is unusual for this customer"""
        # Simplified implementation - in production would use real geolocation
        recent_events = self.security_engine.data_store.get_recent_events(
            customer_id=customer_id,
            event_type=EventType.ACCOUNT_ACCESS,
            minutes=30*24*60  # Last 30 days
        )
        
        # Get customer's usual IP ranges
        usual_ips = {event.ip_address for event in recent_events}
        
        # Simple check - if this IP hasn't been seen before
        return ip_address not in usual_ips and len(usual_ips) > 0
    
    async def _is_rapid_transaction_sequence(self, customer_id: str, timestamp: str) -> bool:
        """Check if this transaction is part of a rapid sequence"""
        try:
            # Get transactions in the last 5 minutes
            recent_events = self.security_engine.data_store.get_recent_events(
                customer_id=customer_id,
                minutes=5
            )
            
            # Count transaction-related events
            transaction_events = [
                event for event in recent_events 
                if 'transaction' in event.event_type.value.lower()
            ]
            
            return len(transaction_events) >= 5  # 5+ transactions in 5 minutes
            
        except Exception:
            return False
    
    async def _check_rapid_transactions(self, customer_id: str, timestamp: str) -> bool:
        """Check for rapid transaction pattern"""
        return await self._is_rapid_transaction_sequence(customer_id, timestamp)
    
    async def _get_recent_transaction_count(self, customer_id: str) -> int:
        """Get count of recent transactions for a customer"""
        recent_events = self.security_engine.data_store.get_recent_events(
            customer_id=customer_id,
            minutes=5
        )
        
        return len([
            event for event in recent_events 
            if 'transaction' in event.event_type.value.lower()
        ])

# Integration decorators for easy use with existing code

def monitor_login(func):
    """Decorator to monitor login attempts"""
    async def wrapper(*args, **kwargs):
        processor = SecurityEventProcessor()
        
        try:
            result = await func(*args, **kwargs)
            
            # Extract login details from function arguments or result
            # This would need to be customized based on actual function signatures
            customer_id = kwargs.get('customer_id') or args[0] if args else 'unknown'
            ip_address = kwargs.get('ip_address', '127.0.0.1')
            user_agent = kwargs.get('user_agent', 'Unknown')
            success = result.get('success', False) if isinstance(result, dict) else bool(result)
            
            await processor.process_login_attempt(customer_id, ip_address, user_agent, success)
            
            return result
            
        except Exception as e:
            # Log failed login due to exception
            customer_id = kwargs.get('customer_id') or args[0] if args else 'unknown'
            ip_address = kwargs.get('ip_address', '127.0.0.1')
            user_agent = kwargs.get('user_agent', 'Unknown')
            
            await processor.process_login_attempt(
                customer_id, ip_address, user_agent, False,
                {'failure_reason': 'exception', 'error': str(e)}
            )
            
            raise
    
    return wrapper

def monitor_transaction(func):
    """Decorator to monitor transactions"""
    async def wrapper(*args, **kwargs):
        processor = SecurityEventProcessor()
        
        try:
            result = await func(*args, **kwargs)
            
            # Extract transaction details
            customer_id = kwargs.get('customer_id') or args[0] if args else 'unknown'
            transaction_data = kwargs.get('transaction_data') or result
            ip_address = kwargs.get('ip_address', '127.0.0.1')
            user_agent = kwargs.get('user_agent', 'Unknown')
            
            if isinstance(transaction_data, dict):
                await processor.process_transaction(
                    customer_id, transaction_data, ip_address, user_agent
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in monitored transaction: {e}")
            raise
    
    return wrapper

# Global processor instance
_security_processor = None

def get_security_processor() -> SecurityEventProcessor:
    """Get global security processor instance"""
    global _security_processor
    if _security_processor is None:
        _security_processor = SecurityEventProcessor()
    return _security_processor