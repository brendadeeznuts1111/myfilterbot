"""
Fantdev Trading Bot - Source Package
"""

__version__ = "2.0.0"
__author__ = "Fantdev"

from .config import config, patterns, keywords, messages
from .database import db, Customer, Transaction
from .handlers import handlers
from .utils import (
    detect_transaction,
    format_currency,
    calculate_percentage,
    rate_limiter
)

__all__ = [
    'config',
    'patterns',
    'keywords',
    'messages',
    'db',
    'Customer',
    'Transaction',
    'handlers',
    'detect_transaction',
    'format_currency',
    'calculate_percentage',
    'rate_limiter'
]