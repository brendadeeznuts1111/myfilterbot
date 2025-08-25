"""
Proactive Security Actions Engine
Comprehensive automated threat detection and response system
"""

import json
import time
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import ipaddress
from collections import defaultdict, deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    """Threat severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ActionType(Enum):
    """Types of automated security actions"""
    ACCOUNT_FREEZE = "account_freeze"
    IP_BLOCK = "ip_block"
    RATE_LIMIT = "rate_limit"
    TRANSACTION_BLOCK = "transaction_block"
    REQUIRE_2FA = "require_2fa"
    ALERT_ADMIN = "alert_admin"
    LOG_EVENT = "log_event"

class EventType(Enum):
    """Types of security events to monitor"""
    FAILED_LOGIN = "failed_login"
    SUSPICIOUS_TRANSACTION = "suspicious_transaction"
    RAPID_TRANSACTIONS = "rapid_transactions"
    NEW_DEVICE_LOGIN = "new_device_login"
    UNUSUAL_IP = "unusual_ip"
    LARGE_TRANSACTION = "large_transaction"
    ACCOUNT_ACCESS = "account_access"
    PASSWORD_CHANGE = "password_change"
    MULTIPLE_ACCOUNTS = "multiple_accounts"

@dataclass
class SecurityEvent:
    """Represents a security event in the system"""
    event_id: str
    event_type: EventType
    customer_id: Optional[str]
    ip_address: str
    user_agent: str
    timestamp: datetime
    metadata: Dict[str, Any]
    severity: ThreatLevel = ThreatLevel.LOW
    processed: bool = False

@dataclass
class SecurityRule:
    """Represents a configurable security rule"""
    rule_id: str
    name: str
    description: str
    event_type: EventType
    conditions: Dict[str, Any]
    actions: List[ActionType]
    enabled: bool = True
    priority: int = 1
    cooldown_minutes: int = 5

@dataclass
class SecurityAction:
    """Represents an automated security action taken"""
    action_id: str
    action_type: ActionType
    target: str  # customer_id or ip_address
    reason: str
    rule_id: str
    timestamp: datetime
    duration: Optional[int] = None  # minutes
    metadata: Dict[str, Any] = None

class SecurityDataStore:
    """In-memory data store for security events and actions"""
    
    def __init__(self):
        self.events: Dict[str, SecurityEvent] = {}
        self.rules: Dict[str, SecurityRule] = {}
        self.actions: Dict[str, SecurityAction] = {}
        self.ip_tracking: Dict[str, List[datetime]] = defaultdict(list)
        self.customer_events: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.blocked_ips: Dict[str, datetime] = {}
        self.frozen_accounts: Dict[str, datetime] = {}
        self.rate_limits: Dict[str, Dict] = defaultdict(dict)
        
        self._load_default_rules()
    
    def _load_default_rules(self):
        """Load default security rules"""
        default_rules = [
            SecurityRule(
                rule_id="failed_login_burst",
                name="Failed Login Burst Detection",
                description="Detect multiple failed logins from same IP",
                event_type=EventType.FAILED_LOGIN,
                conditions={
                    "count": 5,
                    "time_window_minutes": 5,
                    "same_ip": True
                },
                actions=[ActionType.IP_BLOCK, ActionType.ALERT_ADMIN],
                priority=1
            ),
            SecurityRule(
                rule_id="suspicious_transaction_pattern",
                name="Suspicious Transaction Pattern",
                description="Detect unusual transaction patterns",
                event_type=EventType.SUSPICIOUS_TRANSACTION,
                conditions={
                    "amount_threshold": 10000,
                    "frequency_minutes": 10,
                    "count": 3
                },
                actions=[ActionType.ACCOUNT_FREEZE, ActionType.ALERT_ADMIN],
                priority=1
            ),
            SecurityRule(
                rule_id="rapid_transaction_sequence",
                name="Rapid Transaction Sequence",
                description="Detect rapid successive transactions",
                event_type=EventType.RAPID_TRANSACTIONS,
                conditions={
                    "count": 10,
                    "time_window_minutes": 2
                },
                actions=[ActionType.RATE_LIMIT, ActionType.REQUIRE_2FA],
                priority=2
            ),
            SecurityRule(
                rule_id="new_device_large_transaction",
                name="New Device Large Transaction",
                description="Large transaction from new device",
                event_type=EventType.NEW_DEVICE_LOGIN,
                conditions={
                    "transaction_amount": 5000,
                    "device_age_hours": 1
                },
                actions=[ActionType.REQUIRE_2FA, ActionType.ALERT_ADMIN],
                priority=1
            ),
            SecurityRule(
                rule_id="unusual_ip_access",
                name="Unusual IP Access Pattern",
                description="Access from unusual geographic location",
                event_type=EventType.UNUSUAL_IP,
                conditions={
                    "geographic_distance": 1000,  # miles
                    "time_since_last_login": 24  # hours
                },
                actions=[ActionType.ALERT_ADMIN, ActionType.REQUIRE_2FA],
                priority=2
            )
        ]
        
        for rule in default_rules:
            self.rules[rule.rule_id] = rule
    
    def add_event(self, event: SecurityEvent):
        """Add a security event to the data store"""
        self.events[event.event_id] = event
        
        # Track by customer
        if event.customer_id:
            self.customer_events[event.customer_id].append(event)
        
        # Track IP activity
        self.ip_tracking[event.ip_address].append(event.timestamp)
        
        # Clean old IP tracking data (keep last 24 hours)
        cutoff = datetime.now() - timedelta(hours=24)
        self.ip_tracking[event.ip_address] = [
            ts for ts in self.ip_tracking[event.ip_address] if ts > cutoff
        ]
    
    def get_recent_events(self, customer_id: str = None, ip_address: str = None, 
                         event_type: EventType = None, minutes: int = 60) -> List[SecurityEvent]:
        """Get recent events matching criteria"""
        cutoff = datetime.now() - timedelta(minutes=minutes)
        events = []
        
        for event in self.events.values():
            if event.timestamp < cutoff:
                continue
                
            if customer_id and event.customer_id != customer_id:
                continue
                
            if ip_address and event.ip_address != ip_address:
                continue
                
            if event_type and event.event_type != event_type:
                continue
                
            events.append(event)
        
        return sorted(events, key=lambda e: e.timestamp, reverse=True)

class SecurityEngine:
    """Main security engine for threat detection and automated response"""
    
    def __init__(self, notification_service=None):
        self.data_store = SecurityDataStore()
        self.notification_service = notification_service
        self.running = False
        self.audit_log = []
        
        logger.info("🛡️ Security Engine initialized with proactive threat detection")
    
    async def start(self):
        """Start the security engine"""
        self.running = True
        logger.info("🚀 Security Engine started - monitoring for threats")
        
        # Start background monitoring tasks
        asyncio.create_task(self._monitor_events())
        asyncio.create_task(self._cleanup_expired_actions())
    
    async def stop(self):
        """Stop the security engine"""
        self.running = False
        logger.info("🛑 Security Engine stopped")
    
    async def process_event(self, event_data: Dict[str, Any]) -> Optional[List[SecurityAction]]:
        """Process a security event and trigger automated responses"""
        try:
            # Create security event
            event = self._create_security_event(event_data)
            self.data_store.add_event(event)
            
            logger.info(f"📡 Processing security event: {event.event_type.value} from {event.ip_address}")
            
            # Evaluate rules
            triggered_actions = []
            for rule in self.data_store.rules.values():
                if not rule.enabled:
                    continue
                
                if await self._evaluate_rule(event, rule):
                    actions = await self._execute_rule_actions(event, rule)
                    triggered_actions.extend(actions)
            
            # Mark event as processed
            event.processed = True
            
            return triggered_actions
            
        except Exception as e:
            logger.error(f"❌ Error processing security event: {e}")
            return None
    
    def _create_security_event(self, event_data: Dict[str, Any]) -> SecurityEvent:
        """Create a SecurityEvent from raw event data"""
        event_id = hashlib.md5(
            f"{event_data.get('ip', '')}{event_data.get('customer_id', '')}{time.time()}".encode()
        ).hexdigest()
        
        return SecurityEvent(
            event_id=event_id,
            event_type=EventType(event_data.get('event_type', 'account_access')),
            customer_id=event_data.get('customer_id'),
            ip_address=event_data.get('ip', '127.0.0.1'),
            user_agent=event_data.get('user_agent', 'Unknown'),
            timestamp=datetime.now(),
            metadata=event_data.get('metadata', {}),
            severity=ThreatLevel(event_data.get('severity', 'low'))
        )
    
    async def _evaluate_rule(self, event: SecurityEvent, rule: SecurityRule) -> bool:
        """Evaluate if an event triggers a security rule"""
        if event.event_type != rule.event_type:
            return False
        
        conditions = rule.conditions
        
        # Check for failed login burst
        if rule.rule_id == "failed_login_burst":
            recent_events = self.data_store.get_recent_events(
                ip_address=event.ip_address,
                event_type=EventType.FAILED_LOGIN,
                minutes=conditions['time_window_minutes']
            )
            return len(recent_events) >= conditions['count']
        
        # Check for suspicious transaction pattern
        elif rule.rule_id == "suspicious_transaction_pattern":
            if not event.customer_id:
                return False
            
            recent_events = self.data_store.get_recent_events(
                customer_id=event.customer_id,
                event_type=EventType.SUSPICIOUS_TRANSACTION,
                minutes=conditions['frequency_minutes']
            )
            
            # Check if multiple large transactions
            large_transactions = [
                e for e in recent_events 
                if e.metadata.get('amount', 0) >= conditions['amount_threshold']
            ]
            return len(large_transactions) >= conditions['count']
        
        # Check for rapid transactions
        elif rule.rule_id == "rapid_transaction_sequence":
            if not event.customer_id:
                return False
            
            recent_events = self.data_store.get_recent_events(
                customer_id=event.customer_id,
                event_type=EventType.RAPID_TRANSACTIONS,
                minutes=conditions['time_window_minutes']
            )
            return len(recent_events) >= conditions['count']
        
        # Check for new device large transaction
        elif rule.rule_id == "new_device_large_transaction":
            device_age = event.metadata.get('device_age_hours', 999)
            transaction_amount = event.metadata.get('transaction_amount', 0)
            
            return (device_age <= conditions['device_age_hours'] and 
                    transaction_amount >= conditions['transaction_amount'])
        
        # Check for unusual IP access
        elif rule.rule_id == "unusual_ip_access":
            if not event.customer_id:
                return False
            
            # Get customer's recent login locations
            customer_events = self.data_store.customer_events[event.customer_id]
            recent_ips = [e.ip_address for e in customer_events if e.event_type == EventType.ACCOUNT_ACCESS]
            
            # Simple check - if this is a new IP for the customer
            return event.ip_address not in recent_ips[-10:]  # Check last 10 IPs
        
        return False
    
    async def _execute_rule_actions(self, event: SecurityEvent, rule: SecurityRule) -> List[SecurityAction]:
        """Execute the automated actions for a triggered rule"""
        actions_taken = []
        
        for action_type in rule.actions:
            action = await self._execute_action(action_type, event, rule)
            if action:
                actions_taken.append(action)
        
        return actions_taken
    
    async def _execute_action(self, action_type: ActionType, event: SecurityEvent, rule: SecurityRule) -> Optional[SecurityAction]:
        """Execute a specific security action"""
        action_id = hashlib.md5(f"{action_type.value}{event.event_id}{time.time()}".encode()).hexdigest()
        
        try:
            if action_type == ActionType.ACCOUNT_FREEZE:
                success = await self._freeze_account(event.customer_id, rule.rule_id)
                target = event.customer_id
                
            elif action_type == ActionType.IP_BLOCK:
                success = await self._block_ip(event.ip_address, rule.rule_id)
                target = event.ip_address
                
            elif action_type == ActionType.RATE_LIMIT:
                success = await self._apply_rate_limit(event.customer_id or event.ip_address, rule.rule_id)
                target = event.customer_id or event.ip_address
                
            elif action_type == ActionType.REQUIRE_2FA:
                success = await self._require_2fa(event.customer_id, rule.rule_id)
                target = event.customer_id
                
            elif action_type == ActionType.ALERT_ADMIN:
                success = await self._alert_admin(event, rule)
                target = "admin"
                
            else:
                success = await self._log_security_event(event, rule)
                target = "system"
            
            if success:
                action = SecurityAction(
                    action_id=action_id,
                    action_type=action_type,
                    target=target,
                    reason=f"Rule triggered: {rule.name}",
                    rule_id=rule.rule_id,
                    timestamp=datetime.now(),
                    metadata={
                        'event_id': event.event_id,
                        'ip_address': event.ip_address,
                        'customer_id': event.customer_id
                    }
                )
                
                self.data_store.actions[action_id] = action
                self._log_audit_event(action, event)
                
                logger.info(f"✅ Executed security action: {action_type.value} for {target}")
                return action
            
        except Exception as e:
            logger.error(f"❌ Failed to execute action {action_type.value}: {e}")
        
        return None
    
    async def _freeze_account(self, customer_id: str, rule_id: str) -> bool:
        """Freeze a customer account"""
        if not customer_id:
            return False
        
        self.data_store.frozen_accounts[customer_id] = datetime.now()
        
        # TODO: Integrate with actual customer database
        logger.warning(f"🧊 ACCOUNT FROZEN: {customer_id} (Rule: {rule_id})")
        return True
    
    async def _block_ip(self, ip_address: str, rule_id: str) -> bool:
        """Block an IP address"""
        try:
            # Validate IP address
            ipaddress.ip_address(ip_address)
            
            self.data_store.blocked_ips[ip_address] = datetime.now()
            
            # TODO: Integrate with firewall/proxy rules
            logger.warning(f"🚫 IP BLOCKED: {ip_address} (Rule: {rule_id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to block IP {ip_address}: {e}")
            return False
    
    async def _apply_rate_limit(self, target: str, rule_id: str) -> bool:
        """Apply rate limiting to a target"""
        self.data_store.rate_limits[target] = {
            'requests_per_minute': 10,
            'applied_at': datetime.now(),
            'rule_id': rule_id
        }
        
        logger.warning(f"⏱️ RATE LIMIT APPLIED: {target} (Rule: {rule_id})")
        return True
    
    async def _require_2fa(self, customer_id: str, rule_id: str) -> bool:
        """Require 2FA for next customer login"""
        if not customer_id:
            return False
        
        # TODO: Integrate with customer authentication system
        logger.warning(f"🔐 2FA REQUIRED: {customer_id} (Rule: {rule_id})")
        return True
    
    async def _alert_admin(self, event: SecurityEvent, rule: SecurityRule) -> bool:
        """Send alert to administrators"""
        try:
            if self.notification_service:
                await self.notification_service.create_notification(
                    user_id="admin",
                    user_type="admin",
                    notification_type="security_alert",
                    priority="high",
                    custom_title=f"🛡️ Security Alert: {rule.name}",
                    custom_message=f"Automated security rule triggered for {event.customer_id or event.ip_address}",
                    metadata={
                        'rule_id': rule.rule_id,
                        'event_id': event.event_id,
                        'event_type': event.event_type.value,
                        'ip_address': event.ip_address,
                        'customer_id': event.customer_id,
                        'severity': event.severity.value
                    }
                )
            
            logger.warning(f"🚨 ADMIN ALERT: {rule.name} triggered by {event.ip_address}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send admin alert: {e}")
            return False
    
    async def _log_security_event(self, event: SecurityEvent, rule: SecurityRule) -> bool:
        """Log security event for audit purposes"""
        self._log_audit_event(None, event, f"Security rule evaluated: {rule.name}")
        return True
    
    def _log_audit_event(self, action: Optional[SecurityAction], event: SecurityEvent, message: str = ""):
        """Log audit event"""
        audit_entry = {
            'timestamp': datetime.now().isoformat(),
            'event_id': event.event_id,
            'event_type': event.event_type.value,
            'ip_address': event.ip_address,
            'customer_id': event.customer_id,
            'action': action.action_type.value if action else None,
            'message': message or (f"Action executed: {action.action_type.value}" if action else "Event logged")
        }
        
        self.audit_log.append(audit_entry)
        
        # Keep only last 10000 audit entries
        if len(self.audit_log) > 10000:
            self.audit_log = self.audit_log[-10000:]
    
    async def _monitor_events(self):
        """Background task to monitor and cleanup events"""
        while self.running:
            try:
                # Clean up old events (keep last 7 days)
                cutoff = datetime.now() - timedelta(days=7)
                old_events = [
                    event_id for event_id, event in self.data_store.events.items()
                    if event.timestamp < cutoff
                ]
                
                for event_id in old_events:
                    del self.data_store.events[event_id]
                
                if old_events:
                    logger.info(f"🧹 Cleaned up {len(old_events)} old security events")
                
                await asyncio.sleep(3600)  # Run every hour
                
            except Exception as e:
                logger.error(f"Error in security monitoring: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_expired_actions(self):
        """Clean up expired security actions"""
        while self.running:
            try:
                now = datetime.now()
                
                # Cleanup expired IP blocks (default 1 hour)
                expired_ips = [
                    ip for ip, blocked_at in self.data_store.blocked_ips.items()
                    if now - blocked_at > timedelta(hours=1)
                ]
                
                for ip in expired_ips:
                    del self.data_store.blocked_ips[ip]
                    logger.info(f"🔓 IP block expired: {ip}")
                
                # Cleanup expired rate limits (default 30 minutes)
                expired_limits = [
                    target for target, limit_info in self.data_store.rate_limits.items()
                    if now - limit_info['applied_at'] > timedelta(minutes=30)
                ]
                
                for target in expired_limits:
                    del self.data_store.rate_limits[target]
                    logger.info(f"⏱️ Rate limit expired: {target}")
                
                await asyncio.sleep(300)  # Run every 5 minutes
                
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
                await asyncio.sleep(60)
    
    # Public API methods
    def get_security_status(self) -> Dict[str, Any]:
        """Get current security system status"""
        return {
            'active_rules': len([r for r in self.data_store.rules.values() if r.enabled]),
            'blocked_ips': list(self.data_store.blocked_ips.keys()),
            'frozen_accounts': list(self.data_store.frozen_accounts.keys()),
            'rate_limited': list(self.data_store.rate_limits.keys()),
            'recent_events': len(self.data_store.get_recent_events(minutes=60)),
            'audit_entries': len(self.audit_log)
        }
    
    def get_audit_log(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent audit log entries"""
        return self.audit_log[-limit:]
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if an IP is blocked"""
        return ip_address in self.data_store.blocked_ips
    
    def is_account_frozen(self, customer_id: str) -> bool:
        """Check if an account is frozen"""
        return customer_id in self.data_store.frozen_accounts
    
    def is_rate_limited(self, target: str) -> bool:
        """Check if a target is rate limited"""
        return target in self.data_store.rate_limits

# Global security engine instance
security_engine = None

def get_security_engine() -> SecurityEngine:
    """Get the global security engine instance"""
    global security_engine
    if security_engine is None:
        security_engine = SecurityEngine()
    return security_engine

async def initialize_security_engine(notification_service=None):
    """Initialize the global security engine"""
    global security_engine
    security_engine = SecurityEngine(notification_service)
    await security_engine.start()
    return security_engine