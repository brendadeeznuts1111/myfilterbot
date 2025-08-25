"""
Rate limiter utility for bot commands
"""
from typing import Dict
from datetime import datetime, timedelta
import logging
import sys
import os

# Add config path to import constants
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'config'))
try:
    from app_constants import TIMEOUT_CONFIG
except ImportError:
    # Fallback if constants not available
    class FallbackConfig:
        RATE_LIMIT_WINDOW = 1
    TIMEOUT_CONFIG = FallbackConfig()

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple rate limiter for bot commands"""
    cooldown_seconds: Any
    
    def __init__(self) -> None:
        self.user_timestamps: Dict[int, datetime] = {}
        self.cooldown_seconds = TIMEOUT_CONFIG.RATE_LIMIT_WINDOW  # Use configurable cooldown
    
    def check_rate_limit(self, user_id: int) -> bool:
        """
        Check if user is rate limited
        Returns True if user can proceed, False if rate limited
        """
        now = datetime.now()
        
        if user_id in self.user_timestamps:
            last_time = self.user_timestamps[user_id]
            if now - last_time < timedelta(seconds=self.cooldown_seconds):
                return False
        
        self.user_timestamps[user_id] = now
        return True
    
    def reset_user(self, user_id: int) -> None:
        """Reset rate limit for a specific user"""
        if user_id in self.user_timestamps:
            del self.user_timestamps[user_id]

# Global rate limiter instance
rate_limiter = RateLimiter()