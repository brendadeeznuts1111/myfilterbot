"""
Utility functions for Fantdev Trading Bot
"""
import re
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import logging

from config import patterns

logger = logging.getLogger(__name__)

def detect_transaction(text: str) -> Dict[str, Any]:
    """
    Detect transaction type and amount from text
    
    Returns:
        Dict with keys: type, amount, confidence, matched_patterns
    """
    text_lower = text.lower()
    result = {
        'type': None,
        'amount': None,
        'confidence': 0.0,
        'matched_patterns': []
    }
    
    # Extract amount
    amount_patterns = [
        r'\$([0-9,]+(?:\.[0-9]{2})?)',  # $1,234.56
        r'([0-9,]+(?:\.[0-9]{2})?)\s*(?:usd|dollars?)',  # 1234.56 USD
        r'amount:?\s*([0-9,]+(?:\.[0-9]{2})?)',  # amount: 1234.56
    ]
    
    for pattern in amount_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                amount_str = match.group(1).replace(',', '')
                result['amount'] = float(amount_str)
                break
            except ValueError:
                logger.warning(f"Could not parse amount: {match.group(1)}")
    
    # Detect transaction type
    best_match = None
    best_confidence = 0
    
    for tx_type, type_data in patterns.PATTERNS.items():
        matches = []
        for pattern in type_data['patterns']:
            if re.search(pattern, text_lower):
                matches.append(pattern)
        
        if matches:
            # Calculate confidence based on number of matches
            confidence = min(1.0, len(matches) * 0.3 + type_data['confidence'] * 0.4)
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = tx_type
                result['matched_patterns'] = matches
    
    if best_match:
        result['type'] = best_match
        result['confidence'] = best_confidence
    
    return result

def format_currency(amount: float, show_sign: bool = False) -> str:
    """
    Format amount as currency
    
    Args:
        amount: The amount to format
        show_sign: Whether to show + for positive amounts
    
    Returns:
        Formatted currency string
    """
    try:
        if show_sign and amount > 0:
            return f"+${amount:,.2f}"
        elif amount < 0:
            return f"-${abs(amount):,.2f}"
        else:
            return f"${amount:,.2f}"
    except (TypeError, ValueError):
        return "$0.00"

def calculate_percentage(value: float, total: float) -> float:
    """
    Calculate percentage safely
    
    Args:
        value: The value to calculate percentage for
        total: The total value
    
    Returns:
        Percentage as float
    """
    try:
        if total == 0:
            return 0.0
        return (value / total) * 100
    except (TypeError, ValueError, ZeroDivisionError):
        return 0.0

def format_timespan(start: datetime, end: datetime = None) -> str:
    """
    Format a timespan in human-readable format
    
    Args:
        start: Start datetime
        end: End datetime (defaults to now)
    
    Returns:
        Human-readable timespan
    """
    if end is None:
        end = datetime.now()
    
    delta = end - start
    
    if delta.days > 365:
        years = delta.days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif delta.days > 30:
        months = delta.days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    elif delta.days > 0:
        return f"{delta.days} day{'s' if delta.days > 1 else ''} ago"
    elif delta.seconds > 3600:
        hours = delta.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif delta.seconds > 60:
        minutes = delta.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "just now"

def validate_customer_id(customer_id: str) -> bool:
    """
    Validate customer ID format
    
    Args:
        customer_id: Customer ID to validate
    
    Returns:
        True if valid, False otherwise
    """
    # Pattern: 2-3 letters followed by numbers
    pattern = r'^[A-Z]{2,3}\d+$'
    return bool(re.match(pattern, customer_id.upper()))

def sanitize_message(text: str, max_length: int = 200) -> str:
    """
    Sanitize message for storage/display
    
    Args:
        text: Text to sanitize
        max_length: Maximum length
    
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    # Truncate if needed
    if len(text) > max_length:
        text = text[:max_length-3] + "..."
    
    return text

def generate_transaction_id() -> str:
    """
    Generate unique transaction ID
    
    Returns:
        Transaction ID string
    """
    from uuid import uuid4
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    return f"TX{timestamp}{str(uuid4())[:8].upper()}"

def parse_command_args(text: str) -> List[str]:
    """
    Parse command arguments from text
    
    Args:
        text: Command text
    
    Returns:
        List of arguments
    """
    # Remove the command itself
    parts = text.split()
    if parts and parts[0].startswith('/'):
        return parts[1:]
    return parts

def is_business_hours() -> bool:
    """
    Check if current time is within business hours
    
    Returns:
        True if within business hours (9 AM - 9 PM)
    """
    now = datetime.now()
    return 9 <= now.hour < 21

def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    Split list into chunks
    
    Args:
        lst: List to chunk
        chunk_size: Size of each chunk
    
    Returns:
        List of chunks
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

def escape_markdown(text: str) -> str:
    """
    Escape special characters for Telegram Markdown
    
    Args:
        text: Text to escape
    
    Returns:
        Escaped text
    """
    special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
    for char in special_chars:
        text = text.replace(char, f'\\{char}')
    return text

def calculate_daily_stats(transactions: List[Any]) -> Dict[str, Any]:
    """
    Calculate daily statistics from transactions
    
    Args:
        transactions: List of transactions
    
    Returns:
        Dictionary with daily stats
    """
    today = datetime.now().date()
    today_txs = []
    
    for tx in transactions:
        try:
            tx_date = datetime.fromisoformat(tx.timestamp).date()
            if tx_date == today:
                today_txs.append(tx)
        except:
            continue
    
    deposits = sum(tx.amount for tx in today_txs 
                  if tx.type == 'deposit' and tx.amount)
    withdrawals = sum(tx.amount for tx in today_txs 
                     if tx.type == 'withdrawal' and tx.amount)
    
    return {
        'count': len(today_txs),
        'deposits': deposits,
        'withdrawals': withdrawals,
        'net': deposits - withdrawals,
        'transactions': today_txs
    }

def generate_report_filename(report_type: str = "report") -> str:
    """
    Generate filename for reports
    
    Args:
        report_type: Type of report
    
    Returns:
        Filename string
    """
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f"{report_type}_{timestamp}.csv"

class RateLimiter:
    """Simple rate limiter for preventing spam"""
    
    def __init__(self, max_calls: int = 10, period: int = 60):
        self.max_calls = max_calls
        self.period = period  # seconds
        self.calls = {}
    
    def is_allowed(self, user_id: int) -> bool:
        """Check if user is allowed to make a call"""
        now = datetime.now()
        
        # Clean old entries
        cutoff = now - timedelta(seconds=self.period)
        self.calls = {
            uid: times for uid, times in self.calls.items()
            if any(t > cutoff for t in times)
        }
        
        # Check user's calls
        if user_id not in self.calls:
            self.calls[user_id] = [now]
            return True
        
        # Filter calls within period
        recent_calls = [t for t in self.calls[user_id] if t > cutoff]
        
        if len(recent_calls) < self.max_calls:
            recent_calls.append(now)
            self.calls[user_id] = recent_calls
            return True
        
        return False

# Global rate limiter instance
rate_limiter = RateLimiter()