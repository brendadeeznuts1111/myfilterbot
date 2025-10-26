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
    log_dir: Any
    max_history: Any
    error_stats: Any
    
    def __init__(self, log_dir: str = "logs") -> None:
        """
        Initialize the ErrorTracker.
        
        Creates the log directory (default "logs"), configures logging, and loads persisted error history. Initializes in-memory error history, retention limit, and aggregated error statistics.
        
        Parameters:
            log_dir (str): Path to the directory where log files and persistent error history are stored. Defaults to "logs".
        """
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
    
    def _setup_logging(self) -> None:
        """
        Configure file-based logging handlers and attach them to the root logger.
        
        Creates and attaches three FileHandler instances:
        - an ERROR-level daily error log file named "errors_YYYYMMDD.log" in self.log_dir,
        - a DEBUG-level daily debug log file named "debug_YYYYMMDD.log" in self.log_dir (includes source file and line info),
        - a CRITICAL-level rolling file "critical_errors.log" in self.log_dir.
        
        This method mutates the root logger by adding the handlers; it does not return a value.
        """
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
    
    def _load_error_history(self) -> None:
        """
        Load persisted error history and statistics from disk into the tracker.
        
        If a file named `error_history.json` exists under the tracker's `log_dir`, this method
        reads it and updates `self.error_history` (from the "errors" key) and `self.error_stats`
        (from the "stats" key). If the file is missing this method does nothing. Any JSON or I/O
        errors are caught and converted into a warning log; the method does not raise.
        """
        history_file = self.log_dir / "error_history.json"
        if history_file.exists():
            try:
                with open(history_file, 'r') as f:
                    data = json.load(f)
                    self.error_history = data.get("errors", [])
                    self.error_stats = data.get("stats", self.error_stats)
            except Exception as e:
                logging.warning(f"Could not load error history: {e}")
    
    def _save_error_history(self) -> None:
        """
        Persist the in-memory error history and statistics to a JSON file.
        
        Writes a JSON file named `error_history.json` in `self.log_dir` containing:
        - "errors": the most recent `self.max_history` entries from `self.error_history`
        - "stats": the current `self.error_stats`
        
        I/O errors are caught; failures are logged and do not raise.
        """
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
        """
                  Record an exception with metadata, update in-memory and on-disk error history, and log it.
                  
                  Creates a unique error ID, stores a full error record (timestamp, category, severity, error type/message, traceback, context, user_id, recoverable flag, resolved flag), updates aggregated statistics, writes the history to disk, and emits a log entry whose level reflects the provided severity.
                  
                  Parameters:
                      error (Exception): The caught exception to record.
                      category (str): High-level category for classification (uses ErrorCategory constants).
                      severity (str): Severity level (uses ErrorSeverity constants); influences logging level.
                      context (Optional[Dict[str, Any]]): Optional additional context (e.g., function, args, runtime state) to include with the record.
                      user_id (Optional[int]): Optional user identifier associated with the error (if applicable).
                      recoverable (bool): Whether the error is considered recoverable; stored on the record.
                  
                  Returns:
                      str: Generated error ID in the form "ERR-YYYYmmddHHMMSS-XXXX".
                  
                  Side effects:
                      - Appends to self.error_history and updates self.error_stats.
                      - Persists the trimmed history and stats to disk via self._save_error_history().
                      - Emits a log entry (level depends on `severity`) and includes the captured traceback and serialized context when available.
                  """
        
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
    
    def resolve_error(self, error_id: str, resolution: str = None) -> Any:
        """
        Mark a tracked error as resolved.
        
        If an error with the given error_id exists, set its `resolved` flag, store the optional
        resolution text and a `resolved_at` timestamp, increment the tracker's resolved counter,
        persist the updated history to disk, and return True. If no matching error is found,
        return False.
        
        Parameters:
            error_id (str): The unique identifier of the error to resolve.
            resolution (str, optional): Short description of the resolution or notes.
        
        Returns:
            bool: True if the error was found and marked resolved, False otherwise.
        """
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
        """
        Return the current error statistics, updating the count of errors from the last 24 hours.
        
        This method refreshes the `last_24h` field in the tracker's `error_stats` to reflect how many recorded errors have timestamps within the previous 24 hours, then returns the statistics dictionary.
        
        Returns:
            Dict[str, Any]: The tracker statistics object (including updated `last_24h`).
        """
        # Calculate last 24h errors
        now = datetime.now()
        last_24h = [
            e for e in self.error_history
            if (now - datetime.fromisoformat(e["timestamp"])).total_seconds() < 86400
        ]
        
        self.error_stats["last_24h"] = len(last_24h)
        
        return self.error_stats
    
    def clear_old_errors(self, days: int = 30) -> None:
        """
        Remove errors from the in-memory history that are older than the given number of days and persist the updated history to disk.
        
        Parameters:
            days (int): Maximum age in days for errors to keep (errors with age >= days are removed). Defaults to 30.
        
        Side effects:
            - Mutates self.error_history to only include recent errors.
            - Persists the trimmed history by calling self._save_error_history().
            - Emits an informational log entry about the cleanup.
        """
        now = datetime.now()
        self.error_history = [
            e for e in self.error_history
            if (now - datetime.fromisoformat(e["timestamp"])).days < days
        ]
        self._save_error_history()
        logging.info(f"Cleared errors older than {days} days")

class ErrorHandler:
    """Main error handler for the bot"""
    
    def __init__(self, tracker: ErrorTracker = None) -> None:
        """
        Initialize the ErrorHandler.
        
        If no ErrorTracker is provided, a new singleton ErrorTracker is created. Initializes admin notification state (no admin chat configured), notifications enabled by default, and debug mode disabled.
        """
        self.tracker = tracker or ErrorTracker()
        self.admin_chat_id = None
        self.notification_enabled = True
        self.debug_mode = False
    
    def set_admin_chat_id(self, chat_id: str) -> int:
        """
        Set the Telegram chat ID to receive admin notifications.
        
        Parameters:
            chat_id (str): Telegram chat identifier to use for admin alerts (chat ID as a string or username).
        """
        self.admin_chat_id = chat_id
    
    def enable_debug_mode(self, enabled: bool = True) -> None:
        """
        Enable or disable debug mode for the handler.
        
        When enabled, sets the instance's debug_mode flag to True and raises the root logger level to DEBUG;
        when disabled, sets debug_mode to False and lowers the root logger level to INFO.
        
        Parameters:
            enabled (bool): True to enable debug mode (DEBUG logging), False to disable (INFO logging).
        """
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
        """
        Map an exception to an (ErrorCategory, ErrorSeverity) pair.
        
        Performs a lightweight, heuristic classification using the exception type name and message
        content (case-insensitive substring checks). Returns a tuple (category, severity). The
        mapping is best-effort and intended for logging/notification prioritization, not for
        programmatic control flow.
        
        Returns:
            tuple: (ErrorCategory, ErrorSeverity)
        """
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
    
    async def _send_user_error(self, update: Update, error_id: str, severity: str) -> None:
        """
        Send a short, user-facing error message to the chat associated with `update`.
        
        The message text is chosen based on `severity` (critical, high, or other). If the handler is in debug mode, the message will include the `error_id`. Sending failures are suppressed (the method fails silently).
        
        Parameters:
            update (Update): The Telegram update whose chat will receive the message.
            error_id (str): Identifier for the logged error; appended in debug mode.
            severity (str): Error severity; used to select the message shown to the user.
        """
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