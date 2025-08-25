"""
Session Manager for Persistent Authentication and Dashboard Integration
Handles user sessions, fraud detection, and history tracking
"""

import json
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Any
import logging
from dataclasses import dataclass, asdict
import jwt

# Try to import Redis (optional)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class UserSession:
    """User session data model"""
    session_id: str
    telegram_id: int
    customer_id: str
    username: str
    login_time: str
    last_activity: str
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    is_active: bool = True
    permissions: Dict = None
    
    def to_dict(self) -> Dict:
        return asdict(self)

class SessionManager:
    """Manages persistent user sessions and authentication"""
    
    def __init__(self, redis_host='localhost', redis_port=6379, jwt_secret=None):
        """Initialize session manager with Redis for persistence"""
        self.jwt_secret = jwt_secret or secrets.token_hex(32)
        self.sessions = {}  # In-memory cache
        
        # Try to connect to Redis for persistence
        try:
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                decode_responses=True,
                db=0
            )
            self.redis_client.ping()
            self.use_redis = True
            logger.info("Redis connected for session persistence")
        except:
            self.redis_client = None
            self.use_redis = False
            logger.warning("Redis not available, using in-memory sessions only")
        
        # Session configuration
        self.session_timeout = 86400  # 24 hours in seconds
        self.remember_me_timeout = 2592000  # 30 days in seconds
        
    def create_session(self, telegram_id: int, customer_id: str, 
                      username: str, remember_me: bool = False) -> Dict[str, Any]:
        """
        Create a new persistent session
        
        Returns:
            Dict with session_token, dashboard_token, and session details
        """
        try:
            # Generate unique session ID
            session_id = secrets.token_urlsafe(32)
            
            # Create session object
            session = UserSession(
                session_id=session_id,
                telegram_id=telegram_id,
                customer_id=customer_id,
                username=username,
                login_time=datetime.now().isoformat(),
                last_activity=datetime.now().isoformat(),
                is_active=True,
                permissions=self._get_user_permissions(customer_id)
            )
            
            # Set timeout based on remember_me
            timeout = self.remember_me_timeout if remember_me else self.session_timeout
            
            # Store session
            if self.use_redis:
                # Store in Redis with expiration
                self.redis_client.setex(
                    f"session:{session_id}",
                    timeout,
                    json.dumps(session.to_dict())
                )
                # Also store user->session mapping
                self.redis_client.setex(
                    f"user_session:{telegram_id}",
                    timeout,
                    session_id
                )
            else:
                # Store in memory
                self.sessions[session_id] = session
            
            # Generate JWT token for dashboard access
            dashboard_token = self._generate_dashboard_token(session)
            
            # Generate deep link for web dashboard
            dashboard_url = self._generate_dashboard_url(dashboard_token)
            
            return {
                'success': True,
                'session_id': session_id,
                'session_token': session_id,
                'dashboard_token': dashboard_token,
                'dashboard_url': dashboard_url,
                'expires_in': timeout,
                'customer_id': customer_id,
                'message': 'Session created successfully'
            }
            
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_session(self, session_id: str = None, telegram_id: int = None) -> Optional[UserSession]:
        """Get active session by session_id or telegram_id"""
        try:
            if session_id:
                if self.use_redis:
                    # Get from Redis
                    session_data = self.redis_client.get(f"session:{session_id}")
                    if session_data:
                        data = json.loads(session_data)
                        return UserSession(**data)
                else:
                    # Get from memory
                    return self.sessions.get(session_id)
            
            elif telegram_id:
                if self.use_redis:
                    # Get session ID for user
                    session_id = self.redis_client.get(f"user_session:{telegram_id}")
                    if session_id:
                        return self.get_session(session_id)
                else:
                    # Search in memory
                    for sid, session in self.sessions.items():
                        if session.telegram_id == telegram_id:
                            return session
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None
    
    def update_activity(self, session_id: str) -> bool:
        """Update last activity time for session"""
        try:
            session = self.get_session(session_id)
            if session:
                session.last_activity = datetime.now().isoformat()
                
                if self.use_redis:
                    # Update in Redis and refresh TTL
                    self.redis_client.setex(
                        f"session:{session_id}",
                        self.session_timeout,
                        json.dumps(session.to_dict())
                    )
                else:
                    self.sessions[session_id] = session
                
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating activity: {e}")
            return False
    
    def destroy_session(self, session_id: str = None, telegram_id: int = None) -> bool:
        """Destroy user session (logout)"""
        try:
            if telegram_id and not session_id:
                session = self.get_session(telegram_id=telegram_id)
                if session:
                    session_id = session.session_id
            
            if session_id:
                if self.use_redis:
                    # Get session to find telegram_id
                    session = self.get_session(session_id)
                    if session:
                        # Delete from Redis
                        self.redis_client.delete(f"session:{session_id}")
                        self.redis_client.delete(f"user_session:{session.telegram_id}")
                else:
                    # Delete from memory
                    if session_id in self.sessions:
                        del self.sessions[session_id]
                
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error destroying session: {e}")
            return False
    
    def _generate_dashboard_token(self, session: UserSession) -> str:
        """Generate JWT token for dashboard authentication"""
        payload = {
            'session_id': session.session_id,
            'customer_id': session.customer_id,
            'telegram_id': session.telegram_id,
            'username': session.username,
            'permissions': session.permissions,
            'exp': datetime.utcnow() + timedelta(seconds=self.session_timeout),
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')
    
    def verify_dashboard_token(self, token: str) -> Optional[Dict]:
        """Verify and decode dashboard JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            
            # Check if session still exists
            session = self.get_session(payload['session_id'])
            if session and session.is_active:
                return payload
            
            return None
            
        except jwt.ExpiredSignatureError:
            logger.warning("Dashboard token expired")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None
    
    def _generate_dashboard_url(self, token: str) -> str:
        """Generate dashboard URL with authentication token"""
        base_url = "https://fantasy402.com/manager/dashboard"
        return f"{base_url}?auth={token}"
    
    def _get_user_permissions(self, customer_id: str) -> Dict:
        """Get user permissions from database"""
        # This would connect to your database
        # For now, returning default permissions
        return {
            'can_view_balance': True,
            'can_trade': True,
            'can_withdraw': False,
            'can_view_history': True,
            'is_admin': False
        }


class FraudDetector:
    """Detect and track fraudulent activity"""
    
    def __init__(self, session_manager: SessionManager):
        self.session_manager = session_manager
        self.fraud_patterns = {}
        self.risk_scores = {}
        
    def check_login_pattern(self, telegram_id: int, ip_address: str = None) -> Dict[str, Any]:
        """Check for suspicious login patterns"""
        risk_score = 0
        alerts = []
        
        # Check for multiple login attempts
        if telegram_id in self.fraud_patterns:
            pattern = self.fraud_patterns[telegram_id]
            
            # Rapid login attempts
            if pattern.get('last_attempt'):
                time_diff = time.time() - pattern['last_attempt']
                if time_diff < 60:  # Less than 1 minute
                    risk_score += 30
                    alerts.append("Rapid login attempts detected")
            
            # Multiple IP addresses
            if ip_address and 'ip_addresses' in pattern:
                if ip_address not in pattern['ip_addresses']:
                    pattern['ip_addresses'].append(ip_address)
                    if len(pattern['ip_addresses']) > 3:
                        risk_score += 20
                        alerts.append("Multiple IP addresses detected")
            
            # Failed attempts
            if pattern.get('failed_attempts', 0) > 5:
                risk_score += 40
                alerts.append("Multiple failed login attempts")
        else:
            self.fraud_patterns[telegram_id] = {
                'first_seen': time.time(),
                'ip_addresses': [ip_address] if ip_address else [],
                'failed_attempts': 0
            }
        
        # Update last attempt
        self.fraud_patterns[telegram_id]['last_attempt'] = time.time()
        
        return {
            'risk_score': risk_score,
            'risk_level': self._get_risk_level(risk_score),
            'alerts': alerts,
            'require_verification': risk_score > 50
        }
    
    def track_transaction_pattern(self, customer_id: str, transaction_type: str, 
                                 amount: float) -> Dict[str, Any]:
        """Track transaction patterns for fraud detection"""
        if customer_id not in self.risk_scores:
            self.risk_scores[customer_id] = {
                'transactions': [],
                'total_volume': 0,
                'unusual_patterns': []
            }
        
        profile = self.risk_scores[customer_id]
        profile['transactions'].append({
            'type': transaction_type,
            'amount': amount,
            'timestamp': time.time()
        })
        profile['total_volume'] += amount
        
        # Check for unusual patterns
        alerts = []
        risk_score = 0
        
        # Large transaction
        if amount > 10000:
            risk_score += 20
            alerts.append(f"Large transaction: ${amount:,.2f}")
        
        # Rapid transactions
        recent_txs = [t for t in profile['transactions'] 
                     if time.time() - t['timestamp'] < 3600]  # Last hour
        if len(recent_txs) > 10:
            risk_score += 30
            alerts.append("High transaction frequency")
        
        # Unusual time
        hour = datetime.now().hour
        if hour < 6 or hour > 23:
            risk_score += 10
            alerts.append("Transaction at unusual hour")
        
        return {
            'risk_score': risk_score,
            'risk_level': self._get_risk_level(risk_score),
            'alerts': alerts,
            'total_transactions': len(profile['transactions']),
            'total_volume': profile['total_volume']
        }
    
    def _get_risk_level(self, score: int) -> str:
        """Convert risk score to level"""
        if score < 20:
            return "LOW"
        elif score < 50:
            return "MEDIUM"
        elif score < 80:
            return "HIGH"
        else:
            return "CRITICAL"


class PlayerHistory:
    """Track and retrieve player history"""
    
    def __init__(self, db_path: str = "data/customer_database.json"):
        self.db_path = db_path
        
    def get_player_history(self, customer_id: str, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive player history"""
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
            
            customer = data.get('customers', {}).get(customer_id)
            if not customer:
                return {'error': 'Customer not found'}
            
            # Get transactions
            all_transactions = data.get('transactions', [])
            customer_transactions = [
                tx for tx in all_transactions 
                if tx.get('customer_id') == customer_id
            ]
            
            # Filter by date range
            cutoff = datetime.now() - timedelta(days=days)
            recent_transactions = [
                tx for tx in customer_transactions
                if datetime.fromisoformat(tx['timestamp']) > cutoff
            ]
            
            # Calculate statistics
            deposits = sum(tx['amount'] for tx in recent_transactions 
                         if tx['type'] == 'deposit' and tx.get('amount'))
            withdrawals = sum(tx['amount'] for tx in recent_transactions 
                            if tx['type'] == 'withdrawal' and tx.get('amount'))
            
            return {
                'customer_id': customer_id,
                'current_balance': customer.get('balance', 0),
                'weekly_pnl': customer.get('weekly_pnl', 0),
                'registration_date': customer.get('registration_date'),
                'last_activity': customer.get('last_activity'),
                'transaction_count': len(recent_transactions),
                'total_deposits': deposits,
                'total_withdrawals': withdrawals,
                'net_flow': deposits - withdrawals,
                'transactions': recent_transactions[-50:],  # Last 50
                'status': 'active' if customer.get('active') else 'inactive'
            }
            
        except Exception as e:
            logger.error(f"Error getting player history: {e}")
            return {'error': str(e)}


# Global instances
session_manager = SessionManager()
fraud_detector = FraudDetector(session_manager)
player_history = PlayerHistory()
