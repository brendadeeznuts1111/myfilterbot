"""
Debug and Monitoring Commands for Admin
Provides comprehensive debugging interface and system monitoring
"""

import os
import sys
import json
import asyncio
try:
    import psutil
except ImportError:
    psutil = None
from datetime import datetime, timedelta
from typing import Dict, Any, List
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler
from telegram.constants import ParseMode
import logging

from services.error_handler import error_tracker, error_handler, ErrorSeverity
from src.portal.db.repositories import db
from config import config

logger = logging.getLogger(__name__)

class DebugHandler:
    """Debug and monitoring command handler"""
    test_mode: Any
    monitoring: Any
    performance_metrics: Any
    
    def __init__(self) -> None:
        """
        Initialize DebugHandler state.
        
        Sets up runtime flags and an initial structure for collecting performance metrics.
        
        Attributes:
            test_mode (bool): If True, enables simulated/test behavior for error generation and related flows.
            monitoring (bool): If True, indicates active monitoring mode (used to gate ongoing background checks).
            performance_metrics (dict): Containers for collected timings:
                - "command_times" (list): Per-command execution durations.
                - "message_processing_times" (list): Per-message processing durations.
                - "database_query_times" (list): Database query durations.
        """
        self.test_mode = False
        self.monitoring = False
        self.performance_metrics = {
            "command_times": [],
            "message_processing_times": [],
            "database_query_times": []
        }
    
    async def debug_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """
        Display the administrative debug and monitoring menu as an inline keyboard.
        
        This handler is admin-only; if the invoking user is not the configured admin, the command replies with an "Admin access required" message and returns. When allowed, it sends a Markdown-formatted message summarizing current debug mode and basic error statistics (last 24h, total, resolved) and presents an inline keyboard for navigating system status, recent errors, performance, database health, test error generation, logs, configuration, error clearing, debug mode toggle, and export of debug information.
        """
        # Check if user is admin
        if str(update.message.chat_id) != config.admin_chat_id:
            await update.message.reply_text("⛔ Admin access required")
            return
        
        keyboard = [
            [
                InlineKeyboardButton("🔍 System Status", callback_data="debug_status"),
                InlineKeyboardButton("❌ Recent Errors", callback_data="debug_errors")
            ],
            [
                InlineKeyboardButton("📊 Performance", callback_data="debug_performance"),
                InlineKeyboardButton("💾 Database Health", callback_data="debug_database")
            ],
            [
                InlineKeyboardButton("🧪 Test Error", callback_data="debug_test_error"),
                InlineKeyboardButton("📝 Logs", callback_data="debug_logs")
            ],
            [
                InlineKeyboardButton("🔧 Configuration", callback_data="debug_config"),
                InlineKeyboardButton("🔄 Clear Errors", callback_data="debug_clear")
            ],
            [
                InlineKeyboardButton("🚦 Toggle Debug Mode", callback_data="debug_toggle"),
                InlineKeyboardButton("📤 Export Debug Info", callback_data="debug_export")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        debug_status = "🟢 Enabled" if error_handler.debug_mode else "🔴 Disabled"
        
        message = f"""
🔧 **Debug & Monitoring Center**
━━━━━━━━━━━━━━━━━━━━━━

**Debug Mode:** {debug_status}
**Error Count (24h):** {error_tracker.get_error_stats()['last_24h']}
**Total Errors:** {error_tracker.get_error_stats()['total']}
**Resolved:** {error_tracker.get_error_stats()['resolved']}

Select an option below:
"""
        
        await update.message.reply_text(
            message,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def handle_debug_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """
        Dispatch incoming debug callback queries to the appropriate debug handler.
        
        Acknowledges the callback query and routes based on query.data:
        - "debug_status", "debug_errors", "debug_performance", "debug_database",
          "debug_test_error", "debug_logs", "debug_config", "debug_clear",
          "debug_toggle", "debug_export", "debug_menu" → corresponding _show/_action methods.
        - Values starting with "test_" → _simulate_error.
        - "debug_error_<id>" → _show_error_details with the extracted id.
        - "debug_resolve_<id>" → _resolve_error with the extracted id.
        
        This function performs no return value; handlers it calls are responsible for editing or replying to the original message.
        """
        query = update.callback_query
        await query.answer()
        
        data = query.data
        
        if data == "debug_status":
            await self._show_system_status(query)
        elif data == "debug_errors":
            await self._show_recent_errors(query)
        elif data == "debug_performance":
            await self._show_performance_metrics(query)
        elif data == "debug_database":
            await self._show_database_health(query)
        elif data == "debug_test_error":
            await self._test_error_handling(query, context)
        elif data == "debug_logs":
            await self._show_recent_logs(query)
        elif data == "debug_config":
            await self._show_configuration(query)
        elif data == "debug_clear":
            await self._clear_errors(query)
        elif data == "debug_toggle":
            await self._toggle_debug_mode(query)
        elif data == "debug_export":
            await self._export_debug_info(query, context)
        elif data == "debug_menu":
            await self._show_debug_menu(query)
        elif data.startswith("test_"):
            await self._simulate_error(query, data)
        elif data.startswith("debug_error_"):
            error_id = data.replace("debug_error_", "")
            await self._show_error_details(query, error_id)
        elif data.startswith("debug_resolve_"):
            error_id = data.replace("debug_resolve_", "")
            await self._resolve_error(query, error_id)
    
    async def _show_system_status(self, query) -> None:
        """
        Update the callback message with a Markdown-formatted system and bot status report.
        
        Gathers system metrics (CPU, memory, disk, uptime, network) using psutil when available and falls back to safe placeholders if psutil is not installed. Retrieves database statistics from the repository and composes a summary that includes system resources, bot/database statistics, network I/O, and basic configuration flags. Replaces the existing message text with the generated report and a single "Refresh" inline button. On failure, edits the message with an error summary.
        
        Parameters:
            query: The Telegram callback query whose message will be edited with the status report.
        
        Returns:
            None
        """
        try:
            # Get system info (if psutil is available)
            if psutil:
                cpu_percent = psutil.cpu_percent(interval=0.1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                # Get bot uptime
                process = psutil.Process(os.getpid())
                create_time = datetime.fromtimestamp(process.create_time())
                uptime = datetime.now() - create_time
                
                # Network status
                net_io = psutil.net_io_counters()
            else:
                cpu_percent = 0
                memory = None
                disk = None
                uptime = timedelta(seconds=0)
                net_io = None
            
            # Get database stats
            db_stats = db.get_statistics()
            
            status_text = f"""
🔍 **System Status Report**
━━━━━━━━━━━━━━━━━━━━━━

**🖥️ System Resources:**
• CPU Usage: {cpu_percent}%
• Memory: {f"{memory.percent}% ({memory.used / (1024**3):.1f}GB / {memory.total / (1024**3):.1f}GB)" if memory else "N/A (psutil not installed)"}
• Disk: {f"{disk.percent}% used" if disk else "N/A"}
• Uptime: {str(uptime).split('.')[0]}

**📊 Bot Statistics:**
• Total Customers: {db_stats['total_customers']}
• Active Customers: {db_stats['active_customers']}
• Registered Users: {db_stats['registered_users']}
• Total Transactions: {db_stats['total_transactions']}

**🌐 Network:**
• Bytes Sent: {f"{net_io.bytes_sent / (1024**2):.1f} MB" if net_io else "N/A"}
• Bytes Received: {f"{net_io.bytes_recv / (1024**2):.1f} MB" if net_io else "N/A"}
• Packets Lost: {getattr(net_io, 'dropin', 0) + getattr(net_io, 'dropout', 0) if net_io else "N/A"}

**🔧 Configuration:**
• Debug Mode: {'Enabled' if error_handler.debug_mode else 'Disabled'}
• Bot Token: {'✅ Configured' if config.token else '❌ Missing'}
• Admin Chat: {'✅ Set' if config.admin_chat_id else '❌ Not Set'}

Last Updated: {datetime.now().strftime('%H:%M:%S')}
"""
            
            keyboard = [[InlineKeyboardButton("🔄 Refresh", callback_data="debug_status")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                status_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        except Exception as e:
            await query.edit_message_text(f"Error getting system status: {e}")
    
    async def _show_recent_errors(self, query) -> None:
        """
        Display a short list of recent errors by editing the callback message with a formatted summary and per-error "View" buttons.
        
        Fetches recent errors (up to 10) from the error tracker and, if any are found, builds a Markdown-formatted message showing up to 5 entries with:
        - resolved status and severity icons,
        - category, truncated error type/message, error id, and a human-readable relative time.
        
        Adds an inline keyboard with a "View" button for each shown error (callback `debug_error_<id>`) and a "Back" button (`debug_menu`). If no recent errors exist, edits the message to indicate that no errors are present.
        
        Side effects:
        - Edits the original callback message via the provided Telegram query object.
        """
        errors = error_tracker.get_recent_errors(limit=10)
        
        if not errors:
            await query.edit_message_text("✅ No recent errors!")
            return
        
        error_text = "❌ **Recent Errors**\n━━━━━━━━━━━━━━━━━\n\n"
        
        keyboard = []
        for error in errors[:5]:  # Show top 5 with buttons
            timestamp = datetime.fromisoformat(error['timestamp'])
            time_ago = self._format_time_ago(timestamp)
            
            status_emoji = "✅" if error['resolved'] else "❌"
            severity_emoji = {
                ErrorSeverity.CRITICAL: "🚨",
                ErrorSeverity.HIGH: "⚠️",
                ErrorSeverity.MEDIUM: "❗",
                ErrorSeverity.LOW: "ℹ️"
            }.get(error['severity'], "❗")
            
            error_text += f"{status_emoji} {severity_emoji} **{error['category']}**\n"
            error_text += f"   `{error['id']}`\n"
            error_text += f"   {error['error_type']}: {error['error_message'][:50]}...\n"
            error_text += f"   {time_ago}\n\n"
            
            keyboard.append([
                InlineKeyboardButton(
                    f"View {error['id'][-4:]}",
                    callback_data=f"debug_error_{error['id']}"
                )
            ])
        
        keyboard.append([InlineKeyboardButton("🔙 Back", callback_data="debug_menu")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            error_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _show_error_details(self, query, error_id: str) -> None:
        """
        Display a detailed view of a tracked error by editing the callback query message.
        
        Looks up the error by `error_id` in the global `error_tracker.error_history`. If the error is not found, the message is edited to "Error not found". If found, the function builds a Markdown-formatted details view including ID, timestamp, category, severity, resolved status, error type, message, JSON context (truncated to ~500 characters) and traceback (truncated to ~800 characters), and edits the callback message to show it. If the error is unresolved, a "Mark Resolved" inline button is added; a "Back" button is always provided.
        
        Parameters:
            error_id: The identifier of the error to display (used to locate the error in error_history).
        """
        error = None
        for e in error_tracker.error_history:
            if e['id'] == error_id:
                error = e
                break
        
        if not error:
            await query.edit_message_text("Error not found")
            return
        
        details = f"""
🔍 **Error Details**
━━━━━━━━━━━━━━━━━

**ID:** `{error['id']}`
**Time:** {error['timestamp']}
**Category:** {error['category']}
**Severity:** {error['severity']}
**Status:** {'✅ Resolved' if error['resolved'] else '❌ Unresolved'}

**Error Type:** {error['error_type']}
**Message:** {error['error_message']}

**Context:**
```json
{json.dumps(error['context'], indent=2, default=str)[:500]}
```

**Traceback:**
```
{error['traceback'][:800]}
```
"""
        
        keyboard = []
        if not error['resolved']:
            keyboard.append([
                InlineKeyboardButton("✅ Mark Resolved", callback_data=f"debug_resolve_{error_id}")
            ])
        keyboard.append([InlineKeyboardButton("🔙 Back", callback_data="debug_errors")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            details,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _show_performance_metrics(self, query) -> None:
        """
        Show aggregated performance and error metrics and update the callback-query message.
        
        Builds an overview from error_tracker (total errors, last 24h, resolved rate, distribution by category and severity).
        If psutil is available, appends basic system metrics (CPU, memory, process count). Safely handles absence or read errors from psutil.
        Edits the original callback query message in-place with a Markdown-formatted report and a single "Back" button.
        
        Notes:
        - Percentage values are reported as 0 when there are no recorded errors to avoid division-by-zero.
        - This function performs no return and edits the message via the provided callback `query`.
        """
        stats = error_tracker.get_error_stats()
        
        # Calculate error rate
        total_errors = stats['total']
        resolved_rate = (stats['resolved'] / total_errors * 100) if total_errors > 0 else 0
        
        # Error distribution
        category_dist = stats['by_category']
        severity_dist = stats['by_severity']
        
        perf_text = f"""
📊 **Performance Metrics**
━━━━━━━━━━━━━━━━━━━━━

**Error Statistics:**
• Total Errors: {total_errors}
• Last 24h: {stats['last_24h']}
• Resolved: {stats['resolved']} ({resolved_rate:.1f}%)

**Error Distribution by Category:**
"""
        for cat, count in category_dist.items():
            percentage = (count / total_errors * 100) if total_errors > 0 else 0
            perf_text += f"• {cat}: {count} ({percentage:.1f}%)\n"
        
        perf_text += "\n**Error Distribution by Severity:**\n"
        for sev, count in severity_dist.items():
            percentage = (count / total_errors * 100) if total_errors > 0 else 0
            perf_text += f"• {sev}: {count} ({percentage:.1f}%)\n"
        
        # Add system performance if available
        if psutil:
            try:
                cpu = psutil.cpu_percent(interval=0.1)
                mem = psutil.virtual_memory().percent
                
                perf_text += f"""

**System Performance:**
• CPU Usage: {cpu}%
• Memory Usage: {mem}%
• Process Count: {len(psutil.pids())}
"""
            except:
                pass
        
        keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="debug_menu")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            perf_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _show_database_health(self, query) -> None:
        """
        Show the database health report and edit the callback message with the results.
        
        Performs basic checks on the primary database file and its backup, queries database statistics, runs simple read and lookup tests, and presents a Markdown-formatted health summary with actions (backup, back). Any errors during the check are caught and reported by editing the same callback message.
        
        Parameters:
            query: Telegram CallbackQuery object used to edit the original message with the health report.
        """
        try:
            # Check database file
            db_file = "data/customer_database.json"
            db_exists = os.path.exists(db_file)
            db_size = os.path.getsize(db_file) / 1024 if db_exists else 0  # KB
            
            # Check backup
            backup_file = f"{db_file}.backup"
            backup_exists = os.path.exists(backup_file)
            backup_size = os.path.getsize(backup_file) / 1024 if backup_exists else 0
            
            # Get database stats
            stats = db.get_statistics()
            
            # Test database operations
            test_results = []
            
            # Test read
            try:
                db.get_all_customers()
                test_results.append("✅ Read: OK")
            except:
                test_results.append("❌ Read: Failed")
            
            # Test customer lookup
            try:
                customers = db.get_all_customers()
                if customers:
                    db.get_customer(customers[0].customer_id)
                    test_results.append("✅ Lookup: OK")
                else:
                    test_results.append("⚠️ Lookup: No data")
            except:
                test_results.append("❌ Lookup: Failed")
            
            health_text = f"""
💾 **Database Health Check**
━━━━━━━━━━━━━━━━━━━━━━

**File Status:**
• Main DB: {'✅ Exists' if db_exists else '❌ Missing'} ({db_size:.1f} KB)
• Backup: {'✅ Exists' if backup_exists else '❌ Missing'} ({backup_size:.1f} KB)

**Database Statistics:**
• Total Customers: {stats['total_customers']}
• Active Customers: {stats['active_customers']}
• Total Balance: ${stats['total_balance']:,.2f}
• Transactions: {stats['total_transactions']}

**Health Tests:**
{chr(10).join(test_results)}

**Data Integrity:**
• Last Modified: {datetime.fromtimestamp(os.path.getmtime(db_file)).strftime('%Y-%m-%d %H:%M:%S') if db_exists else 'N/A'}
• Backup Age: {self._format_time_ago(datetime.fromtimestamp(os.path.getmtime(backup_file))) if backup_exists else 'N/A'}
"""
            
            keyboard = [
                [
                    InlineKeyboardButton("🔄 Backup Now", callback_data="debug_backup"),
                    InlineKeyboardButton("🔙 Back", callback_data="debug_menu")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                health_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        except Exception as e:
            await query.edit_message_text(f"Error checking database health: {e}")
    
    async def _test_error_handling(self, query, context) -> None:
        """
        Show an interactive menu to trigger simulated test errors of varying severities.
        
        Edits the callback message to present buttons for Critical, High, Medium, and Low test errors (and a Cancel/back option). The selected button will emit a callback data value used by the handler to simulate the corresponding error.
        
        Parameters:
            query: The Telegram CallbackQuery whose message will be edited to display the test menu.
            context: The Telegram callback context (passed through from the handler).
        """
        keyboard = [
            [
                InlineKeyboardButton("💥 Critical Error", callback_data="test_critical"),
                InlineKeyboardButton("⚠️ High Error", callback_data="test_high")
            ],
            [
                InlineKeyboardButton("❗ Medium Error", callback_data="test_medium"),
                InlineKeyboardButton("ℹ️ Low Error", callback_data="test_low")
            ],
            [
                InlineKeyboardButton("🔙 Cancel", callback_data="debug_menu")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            "🧪 **Test Error Handling**\n\n"
            "Select an error severity to test:",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _show_recent_logs(self, query) -> None:
        """
        Show the most recent entries from today's debug log and display them in the current callback message.
        
        Reads the file named `debug_YYYYMMDD.log` from `error_tracker.log_dir`. If the file exists, the last 20 lines are extracted, each line is truncated to 100 characters, and the excerpt is sent as a Markdown code block with a "Back" button. If the log file does not exist, the message is replaced with "No logs found for today". Any file read errors result in the message being replaced with an error description.
        
        Parameters:
            query: The Telegram CallbackQuery whose message will be edited to contain the log excerpt or an error/no-file notice.
        """
        log_dir = error_tracker.log_dir
        today_log = log_dir / f"debug_{datetime.now().strftime('%Y%m%d')}.log"
        
        if not today_log.exists():
            await query.edit_message_text("No logs found for today")
            return
        
        try:
            with open(today_log, 'r') as f:
                lines = f.readlines()
                recent_lines = lines[-20:]  # Last 20 lines
            
            log_text = "📝 **Recent Log Entries**\n━━━━━━━━━━━━━━━━━\n\n```\n"
            for line in recent_lines:
                # Truncate long lines
                if len(line) > 100:
                    line = line[:97] + "...\n"
                log_text += line
            log_text += "```"
            
            keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="debug_menu")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                log_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        except Exception as e:
            await query.edit_message_text(f"Error reading logs: {e}")
    
    async def _show_configuration(self, query) -> None:
        """
        Show the bot's current runtime configuration in a Markdown-formatted message and replace the callback message with it.
        
        Displays bot settings (token presence is indicated and partially masked), admin chat ID, database path, threshold values, feature flags, and debug settings. Replaces the current message via the callback query and adds a single "Back" button to return to the debug menu.
        """
        config_text = f"""
🔧 **Current Configuration**
━━━━━━━━━━━━━━━━━━━━━━

**Bot Settings:**
• Token: {'✅ Set' if config.token else '❌ Not Set'} ({config.token[:10]}... if configured)
• Admin Chat ID: {config.admin_chat_id or 'Not Set'}
• Database Path: {config.database_path}

**Thresholds:**
• Low Balance Alert: ${config.low_balance_threshold}
• High Transaction: ${config.high_transaction_threshold}
• Inactive Days: {config.inactive_days}

**Feature Flags:**
• Auto Balance Update: {config.auto_balance_update}
• Rate Limiting: {config.rate_limiting_enabled}
• Max Requests/Min: {config.max_requests_per_minute}

**Debug Settings:**
• Debug Mode: {'Enabled' if error_handler.debug_mode else 'Disabled'}
• Error Notifications: {'Enabled' if error_handler.notification_enabled else 'Disabled'}
• Max Error History: {error_tracker.max_history}
"""
        
        keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="debug_menu")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            config_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _clear_errors(self, query) -> None:
        """
        Clear errors older than seven days and update the callback message with the result.
        
        Uses the module-level error_tracker to remove errors older than 7 days and then retrieves updated error statistics. Edits the supplied callback query's message to confirm the cleanup and show the remaining total.
        
        Parameters:
            query: The Telegram CallbackQuery whose message will be edited with a confirmation.
        """
        error_tracker.clear_old_errors(days=7)
        
        stats = error_tracker.get_error_stats()
        
        await query.edit_message_text(
            f"✅ **Errors Cleared**\n\n"
            f"Removed errors older than 7 days.\n"
            f"Remaining errors: {stats['total']}",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def _toggle_debug_mode(self, query) -> None:
        """
        Toggle the bot's debug mode and update the triggering message to reflect the new state.
        
        This flips the global debug mode flag (via error_handler.enable_debug_mode) and edits the provided
        CallbackQuery's message to show whether debug mode is now enabled or disabled and what that means
        for error message verbosity.
        
        Parameters:
            query: The CallbackQuery whose message will be edited to display the new debug mode status.
        """
        current = error_handler.debug_mode
        error_handler.enable_debug_mode(not current)
        
        status = "🟢 Enabled" if not current else "🔴 Disabled"
        
        await query.edit_message_text(
            f"✅ **Debug Mode {status}**\n\n"
            f"Debug mode has been {'enabled' if not current else 'disabled'}.\n"
            f"{'Detailed error messages will be shown to users.' if not current else 'Error messages will be simplified.'}",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def _export_debug_info(self, query, context) -> None:
        """
        Export current debug and system state to a temporary JSON file and send it to the admin chat.
        
        Gathers a snapshot consisting of a timestamp, system metrics (platform, Python version, CPU/memory/disk usage), bot/database statistics, recent errors, and selected configuration flags. The snapshot is written to a timestamped JSON file, sent as a document to the chat that triggered the request, then the temporary file is removed. On success the callback is answered with a confirmation; on failure the message is edited to show the error.
        """
        try:
            # Prepare debug info
            debug_info = {
                "timestamp": datetime.now().isoformat(),
                "system_info": {
                    "platform": sys.platform,
                    "python_version": sys.version,
                    "cpu_percent": psutil.cpu_percent(),
                    "memory_percent": psutil.virtual_memory().percent,
                    "disk_percent": psutil.disk_usage('/').percent
                },
                "bot_stats": db.get_statistics(),
                "error_stats": error_tracker.get_error_stats(),
                "recent_errors": error_tracker.get_recent_errors(limit=50),
                "configuration": {
                    "debug_mode": error_handler.debug_mode,
                    "admin_chat_id": config.admin_chat_id,
                    "database_path": config.database_path
                }
            }
            
            # Save to file
            filename = f"debug_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(filename, 'w') as f:
                json.dump(debug_info, f, indent=2, default=str)
            
            # Send file
            with open(filename, 'rb') as f:
                await context.bot.send_document(
                    chat_id=query.message.chat_id,
                    document=f,
                    filename=filename,
                    caption="📤 Debug information exported"
                )
            
            # Clean up
            os.remove(filename)
            
            await query.answer("Debug info exported!")
            
        except Exception as e:
            await query.edit_message_text(f"Error exporting debug info: {e}")
    
    async def _show_debug_menu(self, query) -> None:
        """
        Render and update the main debug & monitoring menu in the current callback query message.
        
        Displays current debug mode and basic error statistics (last 24h, total, resolved) and replaces the message text with an inline keyboard linking to the primary debug views (System Status, Recent Errors, Performance, Database Health).
        
        Parameters:
            query: Telegram CallbackQuery object whose message will be edited to show the debug menu.
        
        Returns:
            None
        """
        debug_status = "🟢 Enabled" if error_handler.debug_mode else "🔴 Disabled"
        
        message = f"""
🔧 **Debug & Monitoring Center**
━━━━━━━━━━━━━━━━━━━━━━

**Debug Mode:** {debug_status}
**Error Count (24h):** {error_tracker.get_error_stats()['last_24h']}
**Total Errors:** {error_tracker.get_error_stats()['total']}
**Resolved:** {error_tracker.get_error_stats()['resolved']}

Select an option:
"""
        
        keyboard = [
            [
                InlineKeyboardButton("🔍 System Status", callback_data="debug_status"),
                InlineKeyboardButton("❌ Recent Errors", callback_data="debug_errors")
            ],
            [
                InlineKeyboardButton("📊 Performance", callback_data="debug_performance"),
                InlineKeyboardButton("💾 Database Health", callback_data="debug_database")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            message,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _simulate_error(self, query, error_type) -> None:
        """
        Simulate a test error and record it in the error tracker, then update the callback message with the simulation result.
        
        Useful for exercising error handling paths from the debug UI. The function logs a synthetic error (via the global error_tracker) with a severity and category derived from `error_type`, and edits the originating callback query message to report the generated error ID.
        
        Parameters:
            query: The Telegram CallbackQuery that triggered the simulation; used to determine the initiating user (for the error context) and to edit the message shown to the user.
            error_type (str): One of:
                - "test_critical": create a CRITICAL configuration error
                - "test_high": create a HIGH database error
                - "test_medium": create a MEDIUM API error
                - "test_low": create a LOW validation error
        
        Returns:
            None
        """
        from .error_handler import ErrorCategory, ErrorSeverity
        
        try:
            if error_type == "test_critical":
                # Simulate critical error
                error_id = error_tracker.log_error(
                    error=Exception("Simulated critical system failure"),
                    category=ErrorCategory.CONFIGURATION,
                    severity=ErrorSeverity.CRITICAL,
                    context={"simulation": True, "user": query.from_user.id},
                    user_id=query.from_user.id
                )
            elif error_type == "test_high":
                # Simulate high severity error
                error_id = error_tracker.log_error(
                    error=Exception("Simulated database connection failure"),
                    category=ErrorCategory.DATABASE,
                    severity=ErrorSeverity.HIGH,
                    context={"simulation": True, "user": query.from_user.id},
                    user_id=query.from_user.id
                )
            elif error_type == "test_medium":
                # Simulate medium severity error
                error_id = error_tracker.log_error(
                    error=Exception("Simulated API timeout error"),
                    category=ErrorCategory.API,
                    severity=ErrorSeverity.MEDIUM,
                    context={"simulation": True, "user": query.from_user.id},
                    user_id=query.from_user.id
                )
            elif error_type == "test_low":
                # Simulate low severity error
                error_id = error_tracker.log_error(
                    error=Exception("Simulated validation warning"),
                    category=ErrorCategory.VALIDATION,
                    severity=ErrorSeverity.LOW,
                    context={"simulation": True, "user": query.from_user.id},
                    user_id=query.from_user.id
                )
            
            await query.edit_message_text(
                f"✅ **Error Simulated**\n\n"
                f"Error ID: `{error_id}`\n"
                f"Type: {error_type.replace('test_', '').title()}\n\n"
                f"Check the error log to see how it was handled.",
                parse_mode=ParseMode.MARKDOWN
            )
            
        except Exception as e:
            await query.edit_message_text(f"Error simulating error: {e}")
    
    async def _resolve_error(self, query, error_id: str) -> None:
        """
        Mark an error as resolved and update the interactive message with the result.
        
        Attempts to mark the error identified by `error_id` as resolved via the global error_tracker.
        Edits the originating callback message to confirm the resolution on success, or to indicate failure
        (e.g., if the ID does not exist).
        
        Parameters:
            error_id (str): The identifier of the error to resolve.
        
        Returns:
            None
        """
        success = error_tracker.resolve_error(error_id, "Manually resolved via debug interface")
        
        if success:
            await query.edit_message_text(
                f"✅ **Error Resolved**\n\n"
                f"Error `{error_id}` has been marked as resolved.",
                parse_mode=ParseMode.MARKDOWN
            )
        else:
            await query.edit_message_text(
                f"❌ **Resolution Failed**\n\n"
                f"Could not resolve error `{error_id}`. It may not exist.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    def _format_time_ago(self, timestamp: datetime) -> str:
        """Format timestamp as time ago"""
        delta = datetime.now() - timestamp
        
        if delta.days > 0:
            return f"{delta.days} day{'s' if delta.days > 1 else ''} ago"
        elif delta.seconds > 3600:
            hours = delta.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif delta.seconds > 60:
            minutes = delta.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"

# Create global debug handler instance
debug_handler = DebugHandler()
