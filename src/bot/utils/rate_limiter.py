"""
Rate limiter utility for bot commands
"""
from typing import Dict
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple rate limiter for bot commands"""
    
    def __init__(self):
        self.user_timestamps: Dict[int, datetime] = {}
        self.cooldown_seconds = 1  # 1 second between commands
    
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
    
    def reset_user(self, user_id: int):
        """Reset rate limit for a specific user"""
        if user_id in self.user_timestamps:
            del self.user_timestamps[user_id]

# Global rate limiter instance
rate_limiter = RateLimiter()