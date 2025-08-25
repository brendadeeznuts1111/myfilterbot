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
from database import db
from config import config

logger = logging.getLogger(__name__)

class DebugHandler:
    """Debug and monitoring command handler"""
    
    def __init__(self):
        self.test_mode = False
        self.monitoring = False
        self.performance_metrics = {
            "command_times": [],
            "message_processing_times": [],
            "database_query_times": []
        }
    
    async def debug_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Main debug command - shows debug menu"""
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
    
    async def handle_debug_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle debug menu callbacks"""
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
    
    async def _show_system_status(self, query):
        """Show system status and health"""
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
    
    async def _show_recent_errors(self, query):
        """Show recent errors"""
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
    
    async def _show_error_details(self, query, error_id: str):
        """Show detailed error information"""
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
    
    async def _show_performance_metrics(self, query):
        """Show performance metrics"""
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
    
    async def _show_database_health(self, query):
        """Show database health status"""
        try:
            # Check database file
            db_file = "customer_database.json"
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
    
    async def _test_error_handling(self, query, context):
        """Test error handling system"""
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
    
    async def _show_recent_logs(self, query):
        """Show recent log entries"""
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
    
    async def _show_configuration(self, query):
        """Show current configuration"""
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
    
    async def _clear_errors(self, query):
        """Clear old errors"""
        error_tracker.clear_old_errors(days=7)
        
        stats = error_tracker.get_error_stats()
        
        await query.edit_message_text(
            f"✅ **Errors Cleared**\n\n"
            f"Removed errors older than 7 days.\n"
            f"Remaining errors: {stats['total']}",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def _toggle_debug_mode(self, query):
        """Toggle debug mode on/off"""
        current = error_handler.debug_mode
        error_handler.enable_debug_mode(not current)
        
        status = "🟢 Enabled" if not current else "🔴 Disabled"
        
        await query.edit_message_text(
            f"✅ **Debug Mode {status}**\n\n"
            f"Debug mode has been {'enabled' if not current else 'disabled'}.\n"
            f"{'Detailed error messages will be shown to users.' if not current else 'Error messages will be simplified.'}",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def _export_debug_info(self, query, context):
        """Export debug information to file"""
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
    
    async def _show_debug_menu(self, query):
        """Show the main debug menu"""
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
    
    async def _simulate_error(self, query, error_type):
        """Simulate different types of errors for testing"""
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
    
    async def _resolve_error(self, query, error_id: str):
        """Mark an error as resolved"""
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