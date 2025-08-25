#!/usr/bin/env python3
"""
Enhanced Message Handlers for 200+ Customers and Multiple Groups
Supports concurrent processing, advanced filtering, and scalable architecture
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, Bot
from telegram.ext import ContextTypes
from telegram.constants import ParseMode

from .database_enhanced import enhanced_db, Customer, Transaction
from .group_manager import multi_group_manager, ProcessedMessage, MessagePriority
from .cache_manager import customer_cache, transaction_cache, group_cache
from .config import config, messages, patterns, keywords
from .utils import detect_transaction, format_currency, calculate_percentage
from .error_handler import error_handler_decorator, ErrorCategory, ErrorSeverity

logger = logging.getLogger(__name__)

class EnhancedHandlers:
    """Enhanced handlers for scalable operations"""
    
    def __init__(self):
        self.pending_registrations = {}
        self.message_processor_pool = ThreadPoolExecutor(
            max_workers=20, thread_name_prefix="msg-processor"
        )
        self.admin_processor_pool = ThreadPoolExecutor(
            max_workers=5, thread_name_prefix="admin-processor"
        )
        
        # Performance metrics
        self.metrics = {
            'total_messages_processed': 0,
            'processing_times': [],
            'cache_hits': 0,
            'cache_misses': 0,
            'database_queries': 0,
            'concurrent_operations': 0,
            'error_count': 0
        }
        
        # Rate limiting per user
        self.user_rate_limits = {}
        self.rate_limit_lock = threading.Lock()
        
        logger.info("Enhanced handlers initialized")
    
    # Cached customer operations
    def _get_customer_cached(self, customer_id: str) -> Optional[Customer]:
        """Get customer with caching"""
        # Try cache first
        cached_data = customer_cache.get_customer(customer_id)
        if cached_data:
            self.metrics['cache_hits'] += 1
            return Customer.from_dict(cached_data)
        
        # Fallback to database
        self.metrics['cache_misses'] += 1
        self.metrics['database_queries'] += 1
        customer = enhanced_db.get_customer(customer_id)
        
        if customer:
            # Cache for future use
            customer_cache.set_customer(customer_id, customer.to_dict())
        
        return customer
    
    def _find_customer_by_telegram_cached(self, telegram_id: int) -> Optional[Customer]:
        """Find customer by Telegram ID with caching"""
        cached_data = customer_cache.get_customer_by_telegram(telegram_id)
        if cached_data:
            self.metrics['cache_hits'] += 1
            return Customer.from_dict(cached_data)
        
        self.metrics['cache_misses'] += 1
        self.metrics['database_queries'] += 1
        customer = enhanced_db.find_customer_by_telegram(telegram_id)
        
        if customer:
            customer_cache.set_customer_by_telegram(telegram_id, customer.to_dict())
            customer_cache.set_customer(customer.customer_id, customer.to_dict())
        
        return customer
    
    def _check_user_rate_limit(self, user_id: int, limit: int = 10, window: int = 60) -> bool:
        """Check if user is within rate limits"""
        current_time = time.time()
        
        with self.rate_limit_lock:
            if user_id not in self.user_rate_limits:
                self.user_rate_limits[user_id] = []
            
            # Clean old entries
            cutoff = current_time - window
            self.user_rate_limits[user_id] = [
                t for t in self.user_rate_limits[user_id] if t > cutoff
            ]
            
            # Check limit
            if len(self.user_rate_limits[user_id]) >= limit:
                return False
            
            self.user_rate_limits[user_id].append(current_time)
            return True
    
    # Enhanced command handlers
    @error_handler_decorator(ErrorCategory.TELEGRAM, ErrorSeverity.LOW)
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced start command with user tracking"""
        try:
            user_id = update.effective_user.id
            
            # Check rate limiting
            if not self._check_user_rate_limit(user_id, limit=5):
                await update.message.reply_text(
                    "⚠️ Too many requests. Please wait a moment.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Check if user is already registered
            customer = self._find_customer_by_telegram_cached(user_id)
            
            if customer:
                keyboard = [
                    [
                        InlineKeyboardButton("💰 Balance", callback_data="menu_balance"),
                        InlineKeyboardButton("📊 Account", callback_data="menu_account")
                    ],
                    [
                        InlineKeyboardButton("📈 Analytics", callback_data="menu_analytics"),
                        InlineKeyboardButton("❓ Help", callback_data="menu_help")
                    ]
                ]
                welcome_text = f"""
🎉 **Welcome back, {customer.customer_id}!**
━━━━━━━━━━━━━━━━━━

**Current Balance:** {format_currency(customer.balance)}
**Weekly P&L:** {format_currency(customer.weekly_pnl, show_sign=True)}
**Status:** {'✅ Active' if customer.active else '❌ Inactive'}

What would you like to do today?
"""
            else:
                keyboard = [
                    [
                        InlineKeyboardButton("📝 Register", callback_data="menu_register"),
                        InlineKeyboardButton("❓ Help", callback_data="menu_help")
                    ],
                    [
                        InlineKeyboardButton("📊 About", callback_data="menu_about")
                    ]
                ]
                welcome_text = messages.WELCOME
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                welcome_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in enhanced start command: {e}")
            self.metrics['error_count'] += 1
            await self._send_error(update)
    
    @error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
    async def balance_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced balance command with analytics"""
        try:
            user_id = update.effective_user.id
            
            # Rate limiting
            if not self._check_user_rate_limit(user_id, limit=10):
                await update.message.reply_text("⚠️ Too many balance requests. Please wait.")
                return
            
            customer = self._find_customer_by_telegram_cached(user_id)
            
            if not customer:
                await update.message.reply_text(
                    messages.ERROR_NOT_REGISTERED,
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Get transactions with caching
            cached_txs = transaction_cache.get_customer_transactions(customer.customer_id, limit=10)
            if cached_txs:
                recent_txs = [Transaction.from_dict(tx) for tx in cached_txs]
            else:
                # Fallback to database
                all_txs = enhanced_db.get_customer_transactions(customer.customer_id)
                recent_txs = sorted(all_txs, key=lambda x: x.timestamp, reverse=True)[:10]
                # Cache the results
                transaction_cache.set_customer_transactions(
                    customer.customer_id, 
                    [tx.to_dict() for tx in recent_txs], 
                    limit=10
                )
            
            # Calculate analytics
            today = datetime.now().date()
            today_txs = [
                tx for tx in recent_txs 
                if datetime.fromisoformat(tx.timestamp).date() == today
            ]
            
            today_deposits = sum(
                tx.amount for tx in today_txs 
                if tx.type == 'deposit' and tx.amount
            )
            today_withdrawals = sum(
                tx.amount for tx in today_txs 
                if tx.type == 'withdrawal' and tx.amount
            )
            
            pnl_percentage = calculate_percentage(customer.weekly_pnl, customer.balance)
            
            # Enhanced balance report
            balance_text = f"""
💰 **Account Balance Report**
━━━━━━━━━━━━━━━━━━━━━━

**Customer ID:** `{customer.customer_id}`
**Current Balance:** {format_currency(customer.balance)}
**Weekly P&L:** {format_currency(customer.weekly_pnl, show_sign=True)} ({pnl_percentage:+.1f}%)

📊 **Today's Activity:**
• Transactions: {len(today_txs)}
• Deposits: {format_currency(today_deposits)}
• Withdrawals: {format_currency(today_withdrawals)}
• Net Change: {format_currency(today_deposits - today_withdrawals, show_sign=True)}

📈 **Account Status:** {'✅ Active' if customer.active else '❌ Inactive'}
🕐 **Last Activity:** {customer.last_activity or 'Never'}

Use /account for detailed analytics and history.
"""
            
            # Add quick action buttons
            keyboard = [
                [
                    InlineKeyboardButton("📜 History", callback_data=f"history_{customer.customer_id}"),
                    InlineKeyboardButton("📊 Analytics", callback_data=f"analytics_{customer.customer_id}")
                ],
                [
                    InlineKeyboardButton("🔄 Refresh", callback_data=f"balance_{customer.customer_id}")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                balance_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in enhanced balance command: {e}")
            self.metrics['error_count'] += 1
            await self._send_error(update)
    
    @error_handler_decorator(ErrorCategory.VALIDATION, ErrorSeverity.HIGH)
    async def register_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced registration with validation and analytics"""
        try:
            user_id = update.effective_user.id
            
            # Check if already registered
            existing_customer = self._find_customer_by_telegram_cached(user_id)
            if existing_customer:
                await update.message.reply_text(
                    f"✅ You're already registered as **{existing_customer.customer_id}**\n"
                    f"Current balance: {format_currency(existing_customer.balance)}\n\n"
                    f"Use /balance to check your account status.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Validate arguments
            if len(context.args) != 2:
                keyboard = [[
                    InlineKeyboardButton("📖 Registration Guide", callback_data="help_register_detailed")
                ]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    "📝 **Registration Required**\n\n"
                    "**Usage:** `/register <customer_id> <password>`\n"
                    "**Example:** `/register BB1042 N9H9`\n\n"
                    "Click the button below for detailed instructions.",
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=reply_markup
                )
                return
            
            customer_id = context.args[0].upper()
            password = context.args[1].upper()
            
            # Validate customer
            customer = self._get_customer_cached(customer_id)
            if not customer:
                await update.message.reply_text(
                    f"❌ **Customer ID not found:** `{customer_id}`\n\n"
                    f"Please check your customer ID and try again.\n"
                    f"Contact support if you believe this is an error.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            if customer.password != password:
                await update.message.reply_text(
                    "❌ **Invalid password**\n\n"
                    "Please check your credentials and try again.\n"
                    "Contact support if you've forgotten your password.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Check if customer is already linked to another account
            if customer.telegram_id and customer.telegram_id != user_id:
                await update.message.reply_text(
                    f"⚠️ **Account Already Linked**\n\n"
                    f"Customer ID `{customer_id}` is already linked to another Telegram account.\n"
                    f"Contact support if you need assistance.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Register user
            user = update.effective_user
            success = enhanced_db.register_customer(
                customer_id,
                user.id,
                f"@{user.username}" if user.username else None
            )
            
            if success:
                # Invalidate cache
                customer_cache.invalidate_customer(customer_id, user.id)
                
                # Send success message
                keyboard = [
                    [
                        InlineKeyboardButton("💰 Check Balance", callback_data="menu_balance"),
                        InlineKeyboardButton("📊 Account Dashboard", callback_data="menu_account")
                    ]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                success_text = f"""
✅ **Registration Successful!**
━━━━━━━━━━━━━━━━━━━━━

**Account:** `{customer_id}`
**Balance:** {format_currency(customer.balance)}
**Weekly P&L:** {format_currency(customer.weekly_pnl, show_sign=True)}
**Status:** ✅ Active

🎉 **You're all set!**
You'll now receive:
• Transaction confirmations
• Balance updates
• Important alerts
• Weekly performance reports

Start exploring with the buttons below!
"""
                
                await update.message.reply_text(
                    success_text,
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=reply_markup
                )
            else:
                await self._send_error(update)
                
        except Exception as e:
            logger.error(f"Error in enhanced register command: {e}")
            self.metrics['error_count'] += 1
            await self._send_error(update)
    
    @error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
    async def admin_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced admin command with real-time analytics"""
        try:
            # Get cached statistics
            cached_stats = group_cache.cache.get("admin_stats")
            if cached_stats:
                stats = cached_stats
            else:
                stats = enhanced_db.get_statistics()
                group_cache.cache.set("admin_stats", stats, ttl=30)  # Cache for 30 seconds
            
            # Get multi-group statistics
            group_stats = multi_group_manager.get_group_stats()
            
            # Get top performers with caching
            top_performers = enhanced_db.get_top_performers(10)
            at_risk = enhanced_db.get_low_balance_customers()[:10]
            
            # Format dashboard
            dashboard = f"""
📊 **ENHANCED ADMIN DASHBOARD**
{datetime.now().strftime('%B %d, %Y %I:%M %p')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**💰 Financial Overview**
• Total Balance: {format_currency(stats['total_balance'])}
• Weekly P&L: {format_currency(stats['total_weekly_pnl'], show_sign=True)}
• Total Deposits: {format_currency(stats.get('total_deposits', 0))}
• Total Withdrawals: {format_currency(stats.get('total_withdrawals', 0))}

**👥 Customer Statistics**
• Total Customers: {stats['total_customers']}
• Active: {stats['active_customers']} ({stats['active_customers']/stats['total_customers']*100:.1f}%)
• Registered Users: {stats['registered_users']}

**📱 Group Management**
• Total Groups: {group_stats['total_groups']}
• Active Groups: {group_stats['active_groups']}
• Messages Processed: {group_stats['total_stats']['total_messages_processed']}

**📊 Transactions**
• Total: {stats['total_transactions']}
• Today: {stats.get('today_transactions', 0)}
• High Priority: {group_stats['total_stats']['messages_by_priority'].get('HIGH', 0)}

**⚡ Performance Metrics**
• Cache Hit Rate: {(self.metrics['cache_hits']/(self.metrics['cache_hits']+self.metrics['cache_misses'])*100) if (self.metrics['cache_hits']+self.metrics['cache_misses']) > 0 else 0:.1f}%
• Database Queries: {self.metrics['database_queries']}
• Active Connections: {len(enhanced_db._connection_pool)}
"""
            
            # Add top performers
            if top_performers:
                dashboard += "\n**🏆 Top Performers (Weekly P&L)**\n"
                for i, customer in enumerate(top_performers[:5], 1):
                    dashboard += f"{i}. `{customer.customer_id}`: {format_currency(customer.weekly_pnl, show_sign=True)}\n"
            
            # Add at-risk customers
            if at_risk:
                dashboard += "\n**⚠️ Low Balance Alerts**\n"
                for customer in at_risk[:5]:
                    dashboard += f"• `{customer.customer_id}`: {format_currency(customer.balance)}\n"
            
            # Enhanced admin buttons
            keyboard = [
                [
                    InlineKeyboardButton("📊 Detailed Report", callback_data="admin_detailed_report"),
                    InlineKeyboardButton("👥 All Customers", callback_data="admin_all_customers")
                ],
                [
                    InlineKeyboardButton("🔧 System Health", callback_data="admin_system_health"),
                    InlineKeyboardButton("📈 Performance", callback_data="admin_performance")
                ],
                [
                    InlineKeyboardButton("👑 Groups", callback_data="admin_groups"),
                    InlineKeyboardButton("💳 Payments", callback_data="admin_payments")
                ],
                [
                    InlineKeyboardButton("🔄 Refresh", callback_data="admin_refresh")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                dashboard,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in enhanced admin command: {e}")
            self.metrics['error_count'] += 1
            await self._send_error(update)
    
    # Enhanced message processing
    @error_handler_decorator(ErrorCategory.TRANSACTION, ErrorSeverity.HIGH)
    async def process_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced message processing with concurrent group handling"""
        start_time = time.time()
        
        try:
            self.metrics['total_messages_processed'] += 1
            self.metrics['concurrent_operations'] += 1
            
            # Process through multi-group manager
            processed_message = await multi_group_manager.process_message(update, context)
            
            if not processed_message:
                return
            
            # Handle high-priority messages immediately
            if processed_message.priority.value >= MessagePriority.HIGH.value:
                await self._handle_priority_message(processed_message, context)
            
            # Log transaction if detected
            if (processed_message.transaction_info and 
                processed_message.transaction_info.get('type')):
                await self._log_transaction(processed_message)
            
            # Forward to admin if needed
            if (processed_message.matched_customers or 
                processed_message.keywords_found or
                processed_message.transaction_info):
                await self._forward_to_admin(processed_message, context)
            
        except Exception as e:
            logger.error(f"Error in enhanced message processing: {e}")
            self.metrics['error_count'] += 1
        finally:
            self.metrics['concurrent_operations'] -= 1
            processing_time = time.time() - start_time
            self.metrics['processing_times'].append(processing_time)
            
            # Keep only recent processing times
            if len(self.metrics['processing_times']) > 1000:
                self.metrics['processing_times'] = self.metrics['processing_times'][-500:]
    
    async def _handle_priority_message(self, message: ProcessedMessage, context: ContextTypes.DEFAULT_TYPE):
        """Handle high-priority messages"""
        try:
            if message.priority == MessagePriority.CRITICAL:
                # Send immediate admin alert
                alert_text = f"""
🚨 **CRITICAL ALERT**
━━━━━━━━━━━━━━

**Group:** {message.chat_id}
**User:** @{message.username}
**Time:** {message.timestamp.strftime('%I:%M %p')}

**Message:**
{message.text[:300]}...

**Priority:** {message.priority.name}
**Customers:** {', '.join(message.matched_customers)}
**Keywords:** {', '.join(message.keywords_found)}
"""
                
                await context.bot.send_message(
                    chat_id=config.admin_chat_id,
                    text=alert_text,
                    parse_mode=ParseMode.MARKDOWN
                )
                
        except Exception as e:
            logger.error(f"Error handling priority message: {e}")
    
    async def _log_transaction(self, message: ProcessedMessage):
        """Log detected transaction"""
        try:
            if not message.matched_customers:
                return
            
            for customer_id in message.matched_customers:
                transaction = Transaction(
                    timestamp=message.timestamp.isoformat(),
                    customer_id=customer_id,
                    type=message.transaction_info['type'],
                    amount=message.transaction_info.get('amount'),
                    message=message.text[:200],
                    from_user=f"@{message.username}",
                    chat_id=int(message.chat_id) if message.chat_id.lstrip('-').isdigit() else 0
                )
                
                # Add transaction to database
                enhanced_db.add_transaction(transaction)
                
                # Update balance if auto-update enabled
                if (config.auto_balance_update and 
                    message.transaction_info.get('amount')):
                    enhanced_db.update_balance(
                        customer_id,
                        message.transaction_info['amount'],
                        message.transaction_info['type']
                    )
                
                # Invalidate transaction cache
                transaction_cache.invalidate_customer_transactions(customer_id)
                
        except Exception as e:
            logger.error(f"Error logging transaction: {e}")
    
    async def _forward_to_admin(self, message: ProcessedMessage, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced admin forwarding"""
        try:
            priority_emoji = {
                MessagePriority.LOW: "🔵",
                MessagePriority.NORMAL: "🟢", 
                MessagePriority.HIGH: "🟡",
                MessagePriority.CRITICAL: "🔴"
            }
            
            forward_text = f"{priority_emoji.get(message.priority, '⚪')} **Activity Detected**\n"
            forward_text += f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
            
            # Group information
            group_info = multi_group_manager.groups.get(message.chat_id)
            if group_info:
                forward_text += f"**Group:** {group_info.name} (`{message.chat_id}`)\n"
            else:
                forward_text += f"**Group:** {message.chat_id}\n"
            
            # Customer information
            if message.matched_customers:
                forward_text += "**Customers Mentioned:**\n"
                for customer_id in message.matched_customers:
                    customer = self._get_customer_cached(customer_id)
                    if customer:
                        forward_text += f"• `{customer_id}` - {format_currency(customer.balance)}\n"
                forward_text += "\n"
            
            # Transaction information
            if message.transaction_info and message.transaction_info.get('type'):
                tx_info = message.transaction_info
                emoji = patterns.get_emoji(tx_info['type'])
                forward_text += f"**Transaction:** {emoji} {tx_info['type'].title()}\n"
                if tx_info.get('amount'):
                    forward_text += f"**Amount:** {format_currency(tx_info['amount'])}\n"
                forward_text += f"**Confidence:** {tx_info['confidence']:.0%}\n\n"
            
            # Keywords found
            if message.keywords_found:
                forward_text += f"**Keywords:** {', '.join(message.keywords_found)}\n\n"
            
            # Message content
            forward_text += f"**Message:**\n{message.text[:400]}\n\n"
            
            # Metadata
            forward_text += f"**From:** @{message.username}\n"
            forward_text += f"**Time:** {message.timestamp.strftime('%I:%M %p')}\n"
            forward_text += f"**Priority:** {message.priority.name}"
            
            # Action buttons
            keyboard = []
            if message.matched_customers:
                keyboard.append([
                    InlineKeyboardButton(
                        f"👤 View {message.matched_customers[0]}", 
                        callback_data=f"view_customer_{message.matched_customers[0]}"
                    )
                ])
                if len(message.matched_customers) > 1:
                    keyboard.append([
                        InlineKeyboardButton(
                            f"👥 View All ({len(message.matched_customers)})",
                            callback_data=f"view_customers_{','.join(message.matched_customers[:5])}"
                        )
                    ])
            
            if group_info:
                keyboard.append([
                    InlineKeyboardButton(
                        "🔧 Group Settings",
                        callback_data=f"group_settings_{message.chat_id}"
                    )
                ])
            
            reply_markup = InlineKeyboardMarkup(keyboard) if keyboard else None
            
            await context.bot.send_message(
                chat_id=config.admin_chat_id,
                text=forward_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error forwarding to admin: {e}")
    
    async def _send_error(self, update: Update):
        """Send enhanced error message"""
        await update.message.reply_text(
            "❌ **System Temporarily Unavailable**\n\n"
            "We're experiencing high traffic. Please try again in a moment.\n"
            "If the issue persists, contact our support team.\n\n"
            f"Error ID: `{int(time.time())}`",
            parse_mode=ParseMode.MARKDOWN
        )
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance metrics"""
        avg_processing_time = 0
        if self.metrics['processing_times']:
            avg_processing_time = sum(self.metrics['processing_times']) / len(self.metrics['processing_times'])
        
        return {
            'total_messages_processed': self.metrics['total_messages_processed'],
            'average_processing_time': avg_processing_time,
            'cache_hit_rate': (self.metrics['cache_hits'] / 
                              (self.metrics['cache_hits'] + self.metrics['cache_misses']) 
                              if (self.metrics['cache_hits'] + self.metrics['cache_misses']) > 0 else 0),
            'database_queries': self.metrics['database_queries'],
            'concurrent_operations': self.metrics['concurrent_operations'],
            'error_count': self.metrics['error_count'],
            'active_rate_limits': len(self.user_rate_limits)
        }
    
    def shutdown(self):
        """Shutdown handlers"""
        self.message_processor_pool.shutdown(wait=True)
        self.admin_processor_pool.shutdown(wait=True)
        logger.info("Enhanced handlers shutdown complete")

# Global enhanced handlers instance
enhanced_handlers = EnhancedHandlers()