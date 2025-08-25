"""
Configuration management for Fantdev Trading Bot
"""
import os
import json
from typing import Dict, List, Any
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

@dataclass
class BotConfig:
    """Bot configuration settings"""
    token: str = os.getenv("BOT_TOKEN", "")
    admin_chat_id: str = os.getenv("ADMIN_CHAT_ID", "-2714719687")
    database_path: str = os.getenv("DATABASE_PATH", "data/customer_database.json")
    
    # Message settings
    max_message_length: int = 4096
    forward_delay: float = 0.5  # Delay between forwards to prevent spam
    
    # Alert thresholds
    low_balance_threshold: int = int(os.getenv("LOW_BALANCE_THRESHOLD", "100"))
    large_deposit_threshold: int = int(os.getenv("LARGE_DEPOSIT_THRESHOLD", "1000"))
    large_withdrawal_threshold: int = int(os.getenv("LARGE_WITHDRAWAL_THRESHOLD", "500"))
    inactive_days_threshold: int = int(os.getenv("INACTIVE_DAYS_THRESHOLD", "3"))
    
    # Feature flags
    auto_balance_update: bool = os.getenv("ENABLE_AUTO_BALANCE_UPDATE", "true").lower() == "true"
    send_customer_alerts: bool = os.getenv("ENABLE_CUSTOMER_ALERTS", "true").lower() == "true"
    enable_analytics: bool = os.getenv("ENABLE_ANALYTICS", "true").lower() == "true"
    
    @classmethod
    def from_env(cls) -> Any:
        """Load configuration from environment variables"""
        return cls(
            token=os.getenv("BOT_TOKEN", cls.token),
            admin_chat_id=os.getenv("ADMIN_CHAT_ID", cls.admin_chat_id),
            database_path=os.getenv("DATABASE_PATH", cls.database_path)
        )

class TransactionPatterns:
    """Transaction detection patterns"""
    PATTERNS = {
        'deposit': {
            'patterns': [
                r'\[credited!\]',
                r'\bcredited\b',
                r'deposit.*success',
                r'received.*\$?\d+',
                r'added.*account',
                r'payment.*received'
            ],
            'confidence': 0.9,
            'emoji': '✅'
        },
        'withdrawal': {
            'patterns': [
                r'\bwithdraw',
                r'\bwithdrawn\b',
                r'sent.*\$?\d+',
                r'withdrawal.*success',
                r'deducted.*account'
            ],
            'confidence': 0.9,
            'emoji': '💸'
        },
        'denied': {
            'patterns': [
                r'\bdenied\b',
                r'\brejected\b',
                r'\bfailed\b',
                r'insufficient.*funds',
                r'transaction.*failed',
                r'not.*approved'
            ],
            'confidence': 0.95,
            'emoji': '❌'
        },
        'pending': {
            'patterns': [
                r'\bpending\b',
                r'\bprocessing\b',
                r'confirming',
                r'awaiting.*confirmation',
                r'under.*review'
            ],
            'confidence': 0.85,
            'emoji': '⏳'
        },
        'expired': {
            'patterns': [
                r'\bexpired\b',
                r'timeout',
                r'10 minutes.*expired',
                r'session.*ended',
                r'time.*limit'
            ],
            'confidence': 0.9,
            'emoji': '⏰'
        }
    }
    
    @classmethod
    def get_all_patterns(cls) -> Dict[str, List[str]]:
        """Get all patterns organized by type"""
        return {
            tx_type: data['patterns'] 
            for tx_type, data in cls.PATTERNS.items()
        }
    
    @classmethod
    def get_emoji(cls, transaction_type: str) -> str:
        """Get emoji for transaction type"""
        return cls.PATTERNS.get(transaction_type, {}).get('emoji', '📝')

class Keywords:
    """Keyword management"""
    GLOBAL_KEYWORDS = [
        "[credited!]",
        "⏰",
        "deposit was denied",
        "Your 10 minutes have expired",
        "removed the address",
        "/start to begin",
        "urgent",
        "important",
        "attention",
        "alert"
    ]
    
    IMPORTANT_USERS = [
        "@blissfulborat"
    ]
    
    @classmethod
    def get_all(cls) -> List[str]:
        """Get all keywords"""
        return cls.GLOBAL_KEYWORDS
    
    @classmethod
    def is_important_user(cls, username: str) -> bool:
        """Check if user is in important list"""
        return username.lower() in [u.lower() for u in cls.IMPORTANT_USERS]

class Messages:
    """Message templates"""
    
    WELCOME = """
🤖 **Fantdev Trading Bot**
━━━━━━━━━━━━━━━━━━

Welcome to your automated trading assistant!

**Available Commands:**
• `/account` - Manage your account
• `/balance` - Quick balance check  
• `/help` - Get help
• `/admin` - Admin dashboard

**Features:**
✅ Real-time transaction monitoring
📊 Balance tracking & P&L analysis
🔔 Instant alerts for important events
📈 Weekly performance reports

Add me to your group to start monitoring!
"""
    
    REGISTRATION_SUCCESS = """
✅ **Registration Successful!**

**Account:** {customer_id}
**Balance:** ${balance:,.2f}
**Weekly P&L:** ${weekly_pnl:+,.2f}
**Status:** Active

You'll now receive:
• Transaction confirmations
• Balance updates  
• Important alerts
• Weekly reports

Type `/help` for available commands.
"""
    
    DASHBOARD_HEADER = """
📊 **TRADING DASHBOARD**
{timestamp}
━━━━━━━━━━━━━━━━━━
"""
    
    BALANCE_REPORT = """
💰 **Account Balance**
━━━━━━━━━━━━━━━━

**Customer:** {customer_id}
**Balance:** ${balance:,.2f}
**Weekly P&L:** ${weekly_pnl:+,.2f} ({pnl_percentage:+.1f}%)
**Status:** {status}

**Today's Activity:**
• Transactions: {today_count}
• Net Change: ${today_change:+,.2f}
"""
    
    ERROR_NOT_REGISTERED = """
❌ **Not Registered**

Please register first:
`/register <customer_id> <password>`

Example: `/register BB1042 N9H9`
"""
    
    TRANSACTION_ALERT = """
🔔 **Transaction Alert**
━━━━━━━━━━━━━━━━

**Customer:** {customer_id}
**Type:** {transaction_type}
**Amount:** ${amount:,.2f}
**Balance:** ${new_balance:,.2f}

**Details:**
{message}

**Time:** {timestamp}
"""

# Initialize global config
config = BotConfig.from_env()
patterns = TransactionPatterns()
keywords = Keywords()
messages = Messages()