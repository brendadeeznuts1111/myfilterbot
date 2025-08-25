"""
Comprehensive Error Handling and Debugging System
Provides centralized error management, logging, and notification
"""

import logging
import traceback
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path
from functools import wraps
import asyncio
from telegram import Update
from telegram.ext import ContextTypes

class ErrorCategory:
    """Error categories for classification"""
    DATABASE = "DATABASE"
    TELEGRAM = "TELEGRAM"
    API = "API"
    VALIDATION = "VALIDATION"
    NETWORK = "NETWORK"
    PERMISSION = "PERMISSION"
    CONFIGURATION = "CONFIGURATION"
    TRANSACTION = "TRANSACTION"
    UNKNOWN = "UNKNOWN"

class ErrorSeverity:
    """Error severity levels"""
    CRITICAL = "CRITICAL"  # System failure, immediate attention needed
    HIGH = "HIGH"         # Major functionality affected
    MEDIUM = "MEDIUM"     # Degraded functionality
    LOW = "LOW"          # Minor issues
    INFO = "INFO"        # Informational only

class ErrorTracker:
    """Track and manage errors"""
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Error history
        self.error_history: List[Dict[str, Any]] = []
        self.max_history = 1000
        
        # Error statistics
        self.error_stats = {
            "total": 0,
            "by_category": {},
            "by_severity": {},
            "last_24h": 0,
            "resolved": 0
        }
        
        # Setup logging
        self._setup_logging()
        
        # Load previous errors if exists
        self._load_error_history()
    
    def _setup_logging(self):
        """Setup comprehensive logging"""
        # Main error log
        error_handler = logging.FileHandler(
            self.log_dir / f"errors_{datetime.now().strftime('%Y%m%d')}.log"
        )
        error_handler.setLevel(logging.ERROR)
        error_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        error_handler.setFormatter(error_formatter)
        
        # Debug log
        debug_handler = logging.FileHandler(
            self.log_dir / f"debug_{datetime.now().strftime('%Y%m%d')}.log"
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
        )
        debug_handler.setFormatter(debug_formatter)
        
        # Critical errors log
        critical_handler = logging.FileHandler(
            self.log_dir / "critical_errors.log"
        )
        critical_handler.setLevel(logging.CRITICAL)
        critical_handler.setFormatter(error_formatter)
        
        # Add handlers to root logger
        logger = logging.getLogger()
        logger.addHandler(error_handler)
        logger.addHandler(debug_handler)
        logger.addHandler(critical_handler)
    
    def _load_error_history(self):
        """Load error history from file"""
        history_file = self.log_dir / "error_history.json"
        if history_file.exists():
            try:
                with open(history_file, 'r') as f:
                    data = json.load(f)
                    self.error_history = data.get("errors", [])
                    self.error_stats = data.get("stats", self.error_stats)
            except Exception as e:
                logging.warning(f"Could not load error history: {e}")
    
    def _save_error_history(self):
        """Save error history to file"""
        history_file = self.log_dir / "error_history.json"
        try:
            with open(history_file, 'w') as f:
                json.dump({
                    "errors": self.error_history[-self.max_history:],
                    "stats": self.error_stats
                }, f, indent=2, default=str)
        except Exception as e:
            logging.error(f"Could not save error history: {e}")
    
    def log_error(self, 
                  error: Exception,
                  category: str = ErrorCategory.UNKNOWN,
                  severity: str = ErrorSeverity.MEDIUM,
                  context: Optional[Dict[str, Any]] = None,
                  user_id: Optional[int] = None,
                  recoverable: bool = True) -> str:
        """Log an error with full context"""
        
        error_id = f"ERR-{datetime.now().strftime('%Y%m%d%H%M%S')}-{self.error_stats['total'] + 1:04d}"
        
        error_record = {
            "id": error_id,
            "timestamp": datetime.now().isoformat(),
            "category": category,
            "severity": severity,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
            "context": context or {},
            "user_id": user_id,
            "recoverable": recoverable,
            "resolved": False
        }
        
        # Add to history
        self.error_history.append(error_record)
        
        # Update statistics
        self.error_stats["total"] += 1
        self.error_stats["by_category"][category] = self.error_stats["by_category"].get(category, 0) + 1
        self.error_stats["by_severity"][severity] = self.error_stats["by_severity"].get(severity, 0) + 1
        
        # Log based on severity
        log_message = f"[{error_id}] {category} - {error}"
        
        if severity == ErrorSeverity.CRITICAL:
            logging.critical(log_message)
            logging.critical(f"Context: {json.dumps(context, default=str)}")
            logging.critical(traceback.format_exc())
        elif severity == ErrorSeverity.HIGH:
            logging.error(log_message)
            logging.error(f"Context: {json.dumps(context, default=str)}")
        elif severity == ErrorSeverity.MEDIUM:
            logging.warning(log_message)
        else:
            logging.info(log_message)
        
        # Save history
        self._save_error_history()
        
        return error_id
    
    def resolve_error(self, error_id: str, resolution: str = None):
        """Mark an error as resolved"""
        for error in self.error_history:
            if error["id"] == error_id:
                error["resolved"] = True
                error["resolution"] = resolution
                error["resolved_at"] = datetime.now().isoformat()
                self.error_stats["resolved"] += 1
                self._save_error_history()
                logging.info(f"Error {error_id} resolved: {resolution}")
                return True
        return False
    
    def get_recent_errors(self, limit: int = 10, category: str = None, severity: str = None) -> List[Dict]:
        """Get recent errors with optional filtering"""
        errors = self.error_history.copy()
        errors.reverse()  # Most recent first
        
        if category:
            errors = [e for e in errors if e["category"] == category]
        
        if severity:
            errors = [e for e in errors if e["severity"] == severity]
        
        return errors[:limit]
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics"""
        # Calculate last 24h errors
        now = datetime.now()
        last_24h = [
            e for e in self.error_history
            if (now - datetime.fromisoformat(e["timestamp"])).total_seconds() < 86400
        ]
        
        self.error_stats["last_24h"] = len(last_24h)
        
        return self.error_stats
    
    def clear_old_errors(self, days: int = 30):
        """Clear errors older than specified days"""
        now = datetime.now()
        self.error_history = [
            e for e in self.error_history
            if (now - datetime.fromisoformat(e["timestamp"])).days < days
        ]
        self._save_error_history()
        logging.info(f"Cleared errors older than {days} days")

class ErrorHandler:
    """Main error handler for the bot"""
    
    def __init__(self, tracker: ErrorTracker = None):
        self.tracker = tracker or ErrorTracker()
        self.admin_chat_id = None
        self.notification_enabled = True
        self.debug_mode = False
    
    def set_admin_chat_id(self, chat_id: str):
        """Set admin chat ID for notifications"""
        self.admin_chat_id = chat_id
    
    def enable_debug_mode(self, enabled: bool = True):
        """Enable/disable debug mode"""
        self.debug_mode = enabled
        if enabled:
            logging.getLogger().setLevel(logging.DEBUG)
        else:
            logging.getLogger().setLevel(logging.INFO)
    
    async def handle_error(self, 
                          update: Optional[Update],
                          context: ContextTypes.DEFAULT_TYPE,
                          error: Exception) -> None:
        """Handle bot errors with comprehensive logging"""
        
        # Determine error category and severity
        category, severity = self._classify_error(error)
        
        # Extract context
        error_context = {
            "update_id": update.update_id if update else None,
            "chat_id": update.effective_chat.id if update and update.effective_chat else None,
            "user_id": update.effective_user.id if update and update.effective_user else None,
            "message": update.message.text if update and update.message else None,
            "callback_data": update.callback_query.data if update and update.callback_query else None
        }
        
        # Log error
        error_id = self.tracker.log_error(
            error=error,
            category=category,
            severity=severity,
            context=error_context,
            user_id=error_context.get("user_id")
        )
        
        # Send user notification
        if update and update.effective_message:
            await self._send_user_error(update, error_id, severity)
        
        # Send admin notification for high severity errors
        if self.admin_chat_id and severity in [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH]:
            await self._send_admin_notification(context, error_id, error, error_context, severity)
    
    def _classify_error(self, error: Exception) -> tuple:
        """Classify error into category and severity"""
        error_type = type(error).__name__
        error_msg = str(error).lower()
        
        # Database errors
        if "database" in error_msg or "json" in error_msg or "file" in error_msg:
            return ErrorCategory.DATABASE, ErrorSeverity.HIGH
        
        # Telegram API errors
        if "telegram" in error_type.lower() or "bad request" in error_msg:
            return ErrorCategory.TELEGRAM, ErrorSeverity.MEDIUM
        
        # Network errors
        if "connection" in error_msg or "timeout" in error_msg or "network" in error_msg:
            return ErrorCategory.NETWORK, ErrorSeverity.MEDIUM
        
        # Permission errors
        if "permission" in error_msg or "forbidden" in error_msg or "unauthorized" in error_msg:
            return ErrorCategory.PERMISSION, ErrorSeverity.HIGH
        
        # Validation errors
        if "invalid" in error_msg or "validation" in error_msg:
            return ErrorCategory.VALIDATION, ErrorSeverity.LOW
        
        # Configuration errors
        if "config" in error_msg or "token" in error_msg:
            return ErrorCategory.CONFIGURATION, ErrorSeverity.CRITICAL
        
        # Transaction errors
        if "transaction" in error_msg or "balance" in error_msg:
            return ErrorCategory.TRANSACTION, ErrorSeverity.HIGH
        
        # Default
        return ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM
    
    async def _send_user_error(self, update: Update, error_id: str, severity: str):
        """Send error message to user"""
        if severity == ErrorSeverity.CRITICAL:
            message = "⚠️ A critical error occurred. The admin has been notified."
        elif severity == ErrorSeverity.HIGH:
            message = "❌ An error occurred processing your request."
        else:
            message = "❗ Something went wrong. Please try again."
        
        if self.debug_mode:
            message += f"\n\nError ID: `{error_id}`"
        
        try:
            await update.effective_message.reply_text(message, parse_mode='Markdown')
        except:
            pass  # Fail silently if we can't send the message
    
    async def _send_admin_notification(self, context, error_id: str, error: Exception, 
                                      error_context: dict, severity: str):
        """Send error notification to admin"""
        if not self.notification_enabled:
            return
        
        severity_emoji = {
            ErrorSeverity.CRITICAL: "🚨",
            ErrorSeverity.HIGH: "⚠️",
            ErrorSeverity.MEDIUM: "❗",
            ErrorSeverity.LOW: "ℹ️"
        }
        
        message = f"""
{severity_emoji.get(severity, "❗")} **Error Alert**
━━━━━━━━━━━━━━━━

**Error ID:** `{error_id}`
**Severity:** {severity}
**Type:** {type(error).__name__}
**Message:** {str(error)[:200]}

**Context:**
• User ID: {error_context.get('user_id', 'N/A')}
• Chat ID: {error_context.get('chat_id', 'N/A')}
• Message: {error_context.get('message', 'N/A')[:100] if error_context.get('message') else 'N/A'}

**Stack Trace:**
```
{traceback.format_exc()[:500]}
```

Use /debug to view full error details.
"""
        
        try:
            await context.bot.send_message(
                chat_id=self.admin_chat_id,
                text=message,
                parse_mode='Markdown'
            )
        except:
            logging.error("Failed to send admin notification")

def error_handler_decorator(category: str = ErrorCategory.UNKNOWN, 
                           severity: str = ErrorSeverity.MEDIUM):
    """Decorator for automatic error handling"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # Find update and context in args
                update = None
                context = None
                for arg in args:
                    if isinstance(arg, Update):
                        update = arg
                    elif hasattr(arg, 'bot'):  # ContextTypes
                        context = arg
                
                # Log error
                error_tracker.log_error(
                    error=e,
                    category=category,
                    severity=severity,
                    context={"function": func.__name__}
                )
                
                # Re-raise for the main error handler
                raise
        
        return wrapper
    return decorator

# Global error tracker instance
error_tracker = ErrorTracker()
error_handler = ErrorHandler(error_tracker)