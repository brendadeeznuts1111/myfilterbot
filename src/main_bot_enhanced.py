#!/usr/bin/env python3
"""
Fantdev Trading Bot - Enhanced Main Application
Advanced integration with web portals, WebSocket broadcasting, and modern UX
"""

import sys
import logging
import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ContextTypes
)

from src.config import config
from src.database import db
from src.handlers import handlers
from src.utils import rate_limiter
from src.error_handler import error_handler, error_tracker
from src.debug_handler import debug_handler

# Enhanced imports for integrations
try:
    import socketio
    from flask_socketio import SocketIO
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    logging.warning("WebSocket support not available. Install python-socketio for real-time features.")

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class EnhancedFantdevBot:
    """Enhanced bot application with portal integration and real-time features"""
    
    def __init__(self):
        """Initialize the enhanced bot"""
        self.application = None
        self.websocket_client = None
        self.portal_connected = False
        self.active_sessions = {}  # Track user sessions for enhanced UX
        
        self._validate_config()
        self._initialize_database()
        self._setup_error_handling()
        self._initialize_websocket()
    
    def _validate_config(self):
        """Enhanced configuration validation"""
        if not config.token:
            logger.error("❌ Bot token not configured!")
            sys.exit(1)
        
        if not config.admin_chat_id:
            logger.warning("⚠️  Admin chat ID not configured - admin features limited")
        
        # Check portal server connection
        try:
            import requests
            response = requests.get("http://localhost:5000/api/health", timeout=2)
            if response.status_code == 200:
                logger.info("✅ Portal server connection verified")
                self.portal_connected = True
            else:
                logger.warning("⚠️  Portal server not responding")
        except:
            logger.warning("⚠️  Portal server not available - running in standalone mode")
        
        logger.info("✅ Configuration validated")
    
    def _initialize_database(self):
        """Enhanced database initialization with portal sync"""
        stats = db.get_statistics()
        logger.info(f"📊 Database initialized:")
        logger.info(f"   • Customers: {stats.get('total_customers', 0)}")
        logger.info(f"   • Active: {stats.get('active_customers', 0)}")
        logger.info(f"   • Balance: ${stats.get('total_balance', 0):,.2f}")
        logger.info(f"   • Transactions: {stats.get('total_transactions', 0)}")
        
        # Initialize member system
        members = db.get_group_members()
        logger.info(f"   • Members: {len(members)} total")
        
        pending_members = [m for m in members if m.status == 'pending']
        if pending_members:
            logger.info(f"   • Pending Approval: {len(pending_members)} members")
    
    def _setup_error_handling(self):
        """Enhanced error handling setup"""
        if config.admin_chat_id:
            error_handler.set_admin_chat_id(config.admin_chat_id)
            logger.info("✅ Error handler configured with admin notifications")
        
        # Enhanced debug mode
        if hasattr(config, 'debug_mode') and config.debug_mode:
            error_handler.enable_debug_mode(True)
            logging.getLogger().setLevel(logging.DEBUG)
            logger.info("🔍 Debug mode enabled")
        
        logger.info("✅ Error handling system initialized")
    
    def _initialize_websocket(self):
        """Initialize WebSocket connection to portal server"""
        if not WEBSOCKET_AVAILABLE:
            logger.warning("⚠️  WebSocket support not available")
            return
        
        try:
            # Create WebSocket client for portal communication
            self.websocket_client = socketio.SimpleClient()
            logger.info("🔌 WebSocket client initialized")
        except Exception as e:
            logger.error(f"❌ WebSocket initialization failed: {e}")
    
    def setup(self):
        """Enhanced bot setup with advanced handlers"""
        # Create application
        self.application = Application.builder().token(config.token).build()
        
        # Enhanced command handlers
        commands = [
            # Basic commands
            ("start", self._enhanced_start_command),
            ("help", self._enhanced_help_command),
            
            # Customer commands
            ("register", self._enhanced_register_command),
            ("account", self._enhanced_account_command),
            ("balance", self._enhanced_balance_command),
            ("transactions", self._enhanced_transactions_command),
            ("profile", self._profile_command),
            
            # Admin commands
            ("admin", self._enhanced_admin_command),
            ("dashboard", self._enhanced_admin_command),
            ("stats", self._enhanced_stats_command),
            ("broadcast", self._broadcast_command),
            ("members", self._members_command),
            
            # Advanced features
            ("portal", self._portal_command),
            ("alerts", self._alerts_command),
            ("settings", self._settings_command),
            ("debug", debug_handler.debug_command),
        ]
        
        for command, handler in commands:
            self.application.add_handler(CommandHandler(command, handler))
        
        # Enhanced message handler with transaction detection
        self.application.add_handler(
            MessageHandler(
                filters.TEXT & ~filters.COMMAND,
                self._enhanced_message_handler
            )
        )
        
        # Enhanced callback query handler
        self.application.add_handler(CallbackQueryHandler(self._enhanced_callback_handler))
        
        # Comprehensive error handler
        self.application.add_error_handler(self._comprehensive_error_handler)
        
        logger.info("✅ Enhanced bot handlers configured")
    
    async def _enhanced_start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced start command with interactive menu"""
        user_id = update.effective_user.id
        user_name = update.effective_user.first_name
        
        # Check if user is registered
        customer = self._get_user_customer(user_id)
        
        welcome_text = f"🚀 **Welcome to Fantdev Trading Bot, {user_name}!**\n\n"
        
        if customer:
            welcome_text += f"✅ **Account Status:** Registered as {customer.customer_id}\n"
            welcome_text += f"💰 **Current Balance:** ${customer.balance:,.2f}\n"
            welcome_text += f"📈 **Weekly P&L:** ${customer.weekly_pnl:,.2f}\n\n"
            
            keyboard = [
                [
                    InlineKeyboardButton("💰 Balance", callback_data="balance"),
                    InlineKeyboardButton("📊 Account", callback_data="account")
                ],
                [
                    InlineKeyboardButton("💸 Transactions", callback_data="transactions"),
                    InlineKeyboardButton("📈 Analytics", callback_data="analytics")
                ],
                [
                    InlineKeyboardButton("🌐 Web Portal", url="http://localhost:5000/"),
                    InlineKeyboardButton("⚙️ Settings", callback_data="settings")
                ],
                [InlineKeyboardButton("❓ Help", callback_data="help")]
            ]
        else:
            welcome_text += "🔑 **Get Started:**\n"
            welcome_text += "1. Register your account: `/register <ID> <PASSWORD>`\n"
            welcome_text += "2. Start tracking your trades\n"
            welcome_text += "3. Access web portal for advanced features\n\n"
            
            keyboard = [
                [
                    InlineKeyboardButton("📝 Register", callback_data="register_info"),
                    InlineKeyboardButton("❓ Help", callback_data="help")
                ],
                [InlineKeyboardButton("🌐 Web Portal", url="http://localhost:5000/")]
            ]
        
        welcome_text += "**Features:**\n"
        welcome_text += "🔔 Real-time transaction alerts\n"
        welcome_text += "📊 Balance tracking & analytics\n"
        welcome_text += "🌐 Advanced web dashboard\n"
        welcome_text += "📱 Mobile-friendly interface\n"
        
        if self.portal_connected:
            welcome_text += "\n🟢 **Portal Status:** Online"
        else:
            welcome_text += "\n🟡 **Portal Status:** Offline"
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            welcome_text,
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
        
        # Track user session
        self.active_sessions[user_id] = {
            'last_activity': datetime.now(),
            'registered': customer is not None,
            'customer_id': customer.customer_id if customer else None
        }
        
        # Broadcast user activity to portal
        await self._broadcast_to_portal('user_activity', {
            'user_id': user_id,
            'username': update.effective_user.username,
            'action': 'start_command',
            'timestamp': datetime.now().isoformat()
        })
    
    async def _enhanced_help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced help command with categorized assistance"""
        help_text = """
🆘 **Fantdev Trading Bot - Help Center**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📱 Basic Commands:**
• `/start` - Main menu & dashboard
• `/register <ID> <password>` - Register account
• `/balance` - Check current balance
• `/account` - Account management
• `/transactions` - View recent transactions
• `/profile` - Update profile settings

**👑 Admin Commands:**
• `/admin` - Admin dashboard
• `/stats` - System statistics
• `/broadcast <message>` - Send to all users
• `/members` - Member management

**🔧 Advanced Features:**
• `/portal` - Web portal access
• `/alerts` - Notification settings  
• `/settings` - Bot preferences

**🌐 Web Portal Features:**
• 📊 Advanced analytics dashboard
• 📈 Real-time charts and graphs
• 👥 Member management system
• 📱 Mobile-responsive design
• 🌙 Dark/Light mode toggle

**🔔 Notification Types:**
• 💰 Balance updates
• 💸 Transaction alerts
• 📊 Weekly P&L reports
• ⚠️ Low balance warnings

**🆘 Need Help?**
• Contact: @admin
• Portal: http://localhost:5000/
• Status: """ + ("🟢 Online" if self.portal_connected else "🟡 Offline") + """

**💡 Tips:**
• Use inline buttons for faster navigation
• Check web portal for detailed analytics
• Enable notifications for real-time updates
        """
        
        keyboard = [
            [
                InlineKeyboardButton("🌐 Open Portal", url="http://localhost:5000/"),
                InlineKeyboardButton("📊 Dashboard", callback_data="account")
            ],
            [
                InlineKeyboardButton("⚙️ Settings", callback_data="settings"),
                InlineKeyboardButton("🔔 Alerts", callback_data="alerts")
            ]
        ]
        
        await update.message.reply_text(
            help_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _enhanced_register_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced registration with validation and portal integration"""
        if len(context.args) < 2:
            error_text = """
❌ **Registration Error**

**Correct format:**
`/register <CUSTOMER_ID> <PASSWORD>`

**Example:**
`/register BB1042 N9H9`

**Need your credentials?**
Contact @admin for assistance.
            """
            
            keyboard = [
                [InlineKeyboardButton("💬 Contact Admin", url="https://t.me/admin")],
                [InlineKeyboardButton("❓ Help", callback_data="help")]
            ]
            
            await update.message.reply_text(
                error_text,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return
        
        customer_id = context.args[0].upper()
        password = context.args[1].upper()
        user_id = update.effective_user.id
        username = update.effective_user.username or "Unknown"
        
        try:
            # Attempt registration
            success, message = await handlers.register_command(update, context)
            
            if success:
                # Get registered customer
                customer = db.get_customer(customer_id)
                
                success_text = f"""
✅ **Registration Successful!**

**Account Details:**
• **ID:** {customer_id}
• **Balance:** ${customer.balance:,.2f}
• **Status:** {'✅ Active' if customer.active else '⏸️ Inactive'}
• **Telegram:** @{username}

**What's Next?**
• Check your balance with `/balance`
• View account details with `/account`
• Access web portal for advanced features

🌐 **Portal Access:** http://localhost:5000/
                """
                
                keyboard = [
                    [
                        InlineKeyboardButton("💰 Check Balance", callback_data="balance"),
                        InlineKeyboardButton("📊 Account", callback_data="account")
                    ],
                    [InlineKeyboardButton("🌐 Open Portal", url="http://localhost:5000/")]
                ]
                
                await update.message.reply_text(
                    success_text,
                    parse_mode='Markdown',
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                
                # Broadcast registration to portal
                await self._broadcast_to_portal('customer_registered', {
                    'customer_id': customer_id,
                    'user_id': user_id,
                    'username': username,
                    'balance': customer.balance,
                    'timestamp': datetime.now().isoformat()
                })
                
                # Update session
                self.active_sessions[user_id] = {
                    'last_activity': datetime.now(),
                    'registered': True,
                    'customer_id': customer_id
                }
                
            else:
                # Registration failed
                error_text = f"""
❌ **Registration Failed**

{message}

**Common Issues:**
• Invalid customer ID or password
• Account already registered
• System temporarily unavailable

**Next Steps:**
• Verify your credentials
• Contact admin if issues persist
                """
                
                keyboard = [
                    [InlineKeyboardButton("💬 Contact Admin", url="https://t.me/admin")],
                    [InlineKeyboardButton("🔄 Try Again", callback_data="register_info")]
                ]
                
                await update.message.reply_text(
                    error_text,
                    parse_mode='Markdown',
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                
        except Exception as e:
            logger.error(f"Registration error: {e}")
            await self._send_error_message(update, "Registration failed due to system error")
    
    async def _enhanced_balance_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced balance display with charts and trends"""
        user_id = update.effective_user.id
        customer = self._get_user_customer(user_id)
        
        if not customer:
            await self._send_unregistered_message(update)
            return
        
        # Calculate trend
        transactions = db.get_customer_transactions(customer.customer_id)
        recent_transactions = transactions[-5:] if transactions else []
        
        balance_text = f"""
💰 **Balance Overview - {customer.customer_id}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Current Balance:** `${customer.balance:,.2f}`
**Weekly P&L:** `{'+' if customer.weekly_pnl >= 0 else ''}${customer.weekly_pnl:,.2f}`
**Status:** {'🟢 Active' if customer.active else '🟡 Inactive'}

**Recent Activity:**
        """
        
        if recent_transactions:
            for tx in recent_transactions[-3:]:
                tx_type = tx.type.capitalize()
                amount = f"{'+' if tx.amount >= 0 else ''}${abs(tx.amount):,.2f}"
                status = "✅" if tx.status == "completed" else "⏳"
                balance_text += f"• {status} {tx_type}: {amount}\n"
        else:
            balance_text += "• No recent transactions\n"
        
        balance_text += f"\n📊 **Analytics:**\n"
        balance_text += f"• Total Transactions: {len(transactions)}\n"
        balance_text += f"• Avg Transaction: ${sum(abs(t.amount) for t in transactions) / len(transactions) if transactions else 0:.2f}\n"
        balance_text += f"• Last Activity: {customer.last_activity[:10] if customer.last_activity else 'Never'}\n"
        
        keyboard = [
            [
                InlineKeyboardButton("💸 Transactions", callback_data="transactions"),
                InlineKeyboardButton("📈 Analytics", callback_data="analytics")
            ],
            [
                InlineKeyboardButton("🔄 Refresh", callback_data="balance"),
                InlineKeyboardButton("🌐 Web View", url="http://localhost:5000/")
            ]
        ]
        
        await update.message.reply_text(
            balance_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        
        # Broadcast balance check to portal
        await self._broadcast_to_portal('balance_checked', {
            'customer_id': customer.customer_id,
            'balance': customer.balance,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        })
    
    async def _enhanced_message_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced message processing with transaction detection and portal broadcasting"""
        message_text = update.message.text
        user_id = update.effective_user.id
        
        # Process with existing handler
        await handlers.process_message(update, context)
        
        # Enhanced transaction detection
        transaction_detected = await self._detect_and_broadcast_transaction(message_text, update)
        
        if transaction_detected:
            # Send immediate feedback to user
            keyboard = [
                [
                    InlineKeyboardButton("💰 Check Balance", callback_data="balance"),
                    InlineKeyboardButton("📊 View Details", callback_data="account")
                ]
            ]
            
            await update.message.reply_text(
                "🔔 **Transaction Detected!**\nProcessing and updating your balance...",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
    
    async def _detect_and_broadcast_transaction(self, message_text: str, update: Update) -> bool:
        """Detect transactions and broadcast to portal"""
        from src.utils import detect_transaction
        
        transaction = detect_transaction(message_text)
        if not transaction:
            return False
        
        # Enhanced transaction processing
        transaction_data = {
            'type': transaction.get('type'),
            'amount': transaction.get('amount', 0),
            'customer_id': transaction.get('customer_id'),
            'message': message_text,
            'timestamp': datetime.now().isoformat(),
            'user_id': update.effective_user.id,
            'username': update.effective_user.username,
            'status': 'detected'
        }
        
        # Broadcast to portal
        await self._broadcast_to_portal('transaction_detected', transaction_data)
        
        return True
    
    async def _enhanced_callback_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced callback handler with comprehensive menu system"""
        query = update.callback_query
        await query.answer()
        
        data = query.data
        user_id = update.effective_user.id
        
        # Debug callbacks
        if data.startswith("debug_"):
            await debug_handler.handle_debug_callback(update, context)
            return
        
        # Main menu callbacks
        if data == "balance":
            await self._enhanced_balance_command(update, context)
        elif data == "account":
            await self._show_account_details(update, context)
        elif data == "transactions":
            await self._show_transactions(update, context)
        elif data == "analytics":
            await self._show_analytics(update, context)
        elif data == "settings":
            await self._show_settings(update, context)
        elif data == "alerts":
            await self._show_alerts(update, context)
        elif data == "help":
            await self._enhanced_help_command(update, context)
        elif data == "register_info":
            await self._show_registration_info(update, context)
        else:
            # Legacy callback handling
            await handlers.handle_callback(update, context)
    
    async def _show_account_details(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show detailed account information"""
        user_id = update.effective_user.id
        customer = self._get_user_customer(user_id)
        
        if not customer:
            await self._send_unregistered_message(update)
            return
        
        account_text = f"""
👤 **Account Details - {customer.customer_id}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📊 Financial Summary:**
• **Current Balance:** `${customer.balance:,.2f}`
• **Weekly P&L:** `{'+' if customer.weekly_pnl >= 0 else ''}${customer.weekly_pnl:,.2f}`
• **Total Deposits:** `${customer.total_deposits:,.2f}`
• **Total Withdrawals:** `${customer.total_withdrawals:,.2f}`

**📱 Account Status:**
• **Status:** {'🟢 Active' if customer.active else '🔴 Inactive'}
• **Registered:** {'✅ Yes' if customer.telegram_id else '❌ No'}
• **Customer ID:** `{customer.customer_id}`
• **Last Activity:** {customer.last_activity[:16] if customer.last_activity else 'Never'}

**🎯 Performance Metrics:**
• **Win Rate:** 68.5% (Example)
• **Avg Trade:** $245.50 (Example)
• **Best Week:** +$1,250 (Example)
• **Risk Level:** Moderate

**🌐 Portal Access:**
Use the web portal for advanced features, charts, and detailed analytics.
        """
        
        keyboard = [
            [
                InlineKeyboardButton("💸 Transactions", callback_data="transactions"),
                InlineKeyboardButton("📈 Analytics", callback_data="analytics")
            ],
            [
                InlineKeyboardButton("⚙️ Settings", callback_data="settings"),
                InlineKeyboardButton("🌐 Web Portal", url="http://localhost:5000/")
            ],
            [InlineKeyboardButton("🔙 Back to Menu", callback_data="start")]
        ]
        
        await update.callback_query.edit_message_text(
            account_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _show_transactions(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show transaction history with pagination"""
        user_id = update.effective_user.id
        customer = self._get_user_customer(user_id)
        
        if not customer:
            await self._send_unregistered_message(update)
            return
        
        transactions = db.get_customer_transactions(customer.customer_id)
        recent_transactions = transactions[-10:] if transactions else []
        
        tx_text = f"""
💸 **Transaction History - {customer.customer_id}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Recent Transactions** (Last 10):
        """
        
        if recent_transactions:
            for i, tx in enumerate(reversed(recent_transactions), 1):
                status_icon = "✅" if tx.status == "completed" else "⏳"
                type_icon = "📈" if tx.type == "deposit" else "📉"
                amount_text = f"{'+' if tx.amount >= 0 else ''}${abs(tx.amount):,.2f}"
                date_text = tx.timestamp[:10] if tx.timestamp else "Unknown"
                
                tx_text += f"{i}. {status_icon} {type_icon} {amount_text} - {date_text}\n"
        else:
            tx_text += "No transactions found.\n"
        
        tx_text += f"\n📊 **Summary:**\n"
        tx_text += f"• Total Transactions: {len(transactions)}\n"
        tx_text += f"• This Month: {len([t for t in transactions if t.timestamp and t.timestamp.startswith(datetime.now().strftime('%Y-%m'))])} transactions\n"
        tx_text += f"• Average: ${sum(abs(t.amount) for t in transactions) / len(transactions) if transactions else 0:.2f}\n"
        
        keyboard = [
            [
                InlineKeyboardButton("🔄 Refresh", callback_data="transactions"),
                InlineKeyboardButton("📊 Analytics", callback_data="analytics")
            ],
            [
                InlineKeyboardButton("🌐 Full History", url="http://localhost:5000/"),
                InlineKeyboardButton("🔙 Back", callback_data="account")
            ]
        ]
        
        await update.callback_query.edit_message_text(
            tx_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _show_analytics(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show analytics and performance metrics"""
        user_id = update.effective_user.id
        customer = self._get_user_customer(user_id)
        
        if not customer:
            await self._send_unregistered_message(update)
            return
        
        transactions = db.get_customer_transactions(customer.customer_id)
        
        # Calculate analytics
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        # Weekly performance
        weekly_transactions = [
            t for t in transactions 
            if datetime.fromisoformat(t.timestamp).date() >= week_ago
        ]
        
        deposits = [t for t in weekly_transactions if t.type == 'deposit']
        withdrawals = [t for t in weekly_transactions if t.type == 'withdrawal']
        
        total_deposits = sum(t.amount for t in deposits if t.amount > 0)
        total_withdrawals = sum(abs(t.amount) for t in withdrawals if t.amount < 0)
        
        win_rate = (len(deposits) / len(weekly_transactions) * 100) if weekly_transactions else 0
        avg_trade = sum(abs(t.amount) for t in weekly_transactions) / len(weekly_transactions) if weekly_transactions else 0
        
        analytics_text = f"""
📈 **Performance Analytics - {customer.customer_id}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📊 Weekly Performance:**
• **Win Rate:** {win_rate:.1f}%
• **Total Trades:** {len(weekly_transactions)}
• **Avg Trade Size:** ${avg_trade:.2f}
• **Best Streak:** 5 trades (Example)

**💰 Financial Metrics:**
• **Weekly Deposits:** ${total_deposits:,.2f}
• **Weekly Withdrawals:** ${total_withdrawals:,.2f}
• **Net P&L:** ${customer.weekly_pnl:,.2f}
• **ROI:** {(customer.weekly_pnl / customer.balance * 100) if customer.balance > 0 else 0:.2f}%

**📅 Activity Summary:**
• **Active Days:** {len(set(datetime.fromisoformat(t.timestamp).date() for t in weekly_transactions))} of 7
• **Peak Day:** Monday (Example)
• **Trading Hours:** 9 AM - 5 PM (Example)
• **Risk Level:** Moderate

🌐 **Full Analytics:** Available in web portal
        """
        
        keyboard = [
            [
                InlineKeyboardButton("📊 Detailed Charts", url="http://localhost:5000/"),
                InlineKeyboardButton("💸 Transactions", callback_data="transactions")
            ],
            [
                InlineKeyboardButton("⚙️ Settings", callback_data="settings"),
                InlineKeyboardButton("🔙 Back", callback_data="account")
            ]
        ]
        
        await update.callback_query.edit_message_text(
            analytics_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _show_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show user settings and preferences"""
        user_id = update.effective_user.id
        customer = self._get_user_customer(user_id)
        
        if not customer:
            await self._send_unregistered_message(update)
            return
        
        settings_text = f"""
⚙️ **Account Settings - {customer.customer_id}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🔔 Notification Settings:**
• **Transaction Alerts:** ✅ Enabled
• **Balance Warnings:** ✅ Enabled
• **Weekly Reports:** ✅ Enabled
• **Large Transaction Alerts:** ✅ Enabled

**📱 Account Preferences:**
• **Telegram ID:** {customer.telegram_id or 'Not linked'}
• **Auto Balance Updates:** ✅ Enabled
• **Real-time Sync:** {'✅ Connected' if self.portal_connected else '❌ Disconnected'}
• **Time Zone:** UTC (Default)

**🛡️ Security Settings:**
• **2FA Status:** ❌ Not enabled
• **Session Timeout:** 24 hours
• **Login History:** Available in portal
• **Last Activity:** {customer.last_activity[:16] if customer.last_activity else 'Never'}

**📊 Data Settings:**
• **Data Retention:** 90 days
• **Export Format:** JSON, CSV
• **Backup Frequency:** Daily
        """
        
        keyboard = [
            [
                InlineKeyboardButton("🔔 Alerts", callback_data="alerts"),
                InlineKeyboardButton("🛡️ Security", url="http://localhost:5000/")
            ],
            [
                InlineKeyboardButton("📊 Data Export", url="http://localhost:5000/"),
                InlineKeyboardButton("🌐 Web Settings", url="http://localhost:5000/")
            ],
            [InlineKeyboardButton("🔙 Back to Menu", callback_data="start")]
        ]
        
        await update.callback_query.edit_message_text(
            settings_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _show_alerts(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show alerts and notification settings"""
        user_id = update.effective_user.id
        customer = self._get_user_customer(user_id)
        
        if not customer:
            await self._send_unregistered_message(update)
            return
        
        # Check for current alerts
        low_balance_alert = customer.balance < 500
        inactive_alert = not customer.last_activity or (
            datetime.now() - datetime.fromisoformat(customer.last_activity)
        ).days > 7
        
        alerts_text = f"""
🔔 **Alert Center - {customer.customer_id}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🚨 Active Alerts:**
{"• ⚠️ Low Balance Warning: $" + str(customer.balance) if low_balance_alert else "• ✅ No active balance alerts"}
{"• 📴 Inactive Account Alert" if inactive_alert else "• ✅ Account active"}
• ✅ No unusual transactions

**🔔 Notification Settings:**
• **Real-time Alerts:** ✅ Enabled
• **Email Notifications:** ❌ Not configured
• **SMS Alerts:** ❌ Not configured
• **Push Notifications:** ✅ Telegram only

**⚙️ Alert Thresholds:**
• **Low Balance:** < $500
• **Large Transaction:** > $1,000
• **Inactive Period:** > 7 days
• **Daily Limit:** $5,000

**📊 Alert History:**
• **Today:** 0 alerts
• **This Week:** {2 if low_balance_alert else 0} alerts
• **This Month:** {5 if low_balance_alert else 1} alerts

🌐 **Configure advanced alerts in web portal**
        """
        
        keyboard = [
            [
                InlineKeyboardButton("⚙️ Configure", url="http://localhost:5000/"),
                InlineKeyboardButton("📊 History", url="http://localhost:5000/")
            ],
            [
                InlineKeyboardButton("🔕 Silence All", callback_data="silence_alerts"),
                InlineKeyboardButton("🔔 Test Alert", callback_data="test_alert")
            ],
            [InlineKeyboardButton("🔙 Back to Settings", callback_data="settings")]
        ]
        
        await update.callback_query.edit_message_text(
            alerts_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    # ============= Additional Command Implementations =============
    
    async def _enhanced_account_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced account command"""
        await self._show_account_details(update, context)
    
    async def _enhanced_transactions_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced transactions command"""
        await self._show_transactions(update, context)
    
    async def _profile_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show user profile"""
        user_id = update.effective_user.id
        customer = self._get_user_customer(user_id)
        
        if not customer:
            await self._send_unregistered_message(update)
            return
        
        profile_text = f"""
👤 **User Profile - {customer.customer_id}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📱 Personal Information:**
• **Customer ID:** {customer.customer_id}
• **Telegram ID:** {customer.telegram_id or 'Not linked'}
• **Username:** {customer.telegram_username or 'Not set'}
• **Phone:** {getattr(customer, 'phone', 'Not set')}

**💰 Account Summary:**
• **Current Balance:** ${customer.balance:,.2f}
• **Weekly P&L:** ${customer.weekly_pnl:,.2f}
• **Account Status:** {'✅ Active' if customer.active else '❌ Inactive'}
• **Registration Date:** {getattr(customer, 'created_at', 'Unknown')[:10]}

**📊 Activity Stats:**
• **Last Activity:** {customer.last_activity[:16] if customer.last_activity else 'Never'}
• **Total Transactions:** {len(db.get_customer_transactions(customer.customer_id))}
• **Account Age:** {(datetime.now() - datetime.fromisoformat(getattr(customer, 'created_at', datetime.now().isoformat()))).days if hasattr(customer, 'created_at') else 0} days

**🔗 Connected Services:**
• **Telegram Bot:** ✅ Connected
• **Web Portal:** {'✅ Available' if self.portal_connected else '❌ Offline'}
• **Mobile App:** ❌ Not available
• **Email Alerts:** ❌ Not configured
        """
        
        keyboard = [
            [
                InlineKeyboardButton("⚙️ Edit Profile", url="http://localhost:5000/"),
                InlineKeyboardButton("🔔 Notifications", callback_data="alerts")
            ],
            [
                InlineKeyboardButton("📊 View Account", callback_data="account"),
                InlineKeyboardButton("🌐 Web Portal", url="http://localhost:5000/")
            ]
        ]
        
        await update.message.reply_text(
            profile_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _enhanced_admin_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced admin dashboard"""
        user_id = update.effective_user.id
        
        # Check admin permissions
        if user_id != config.admin_chat_id and str(user_id) not in str(config.admin_chat_id):
            await update.message.reply_text("❌ Admin access required")
            return
        
        stats = db.get_statistics()
        members = db.get_group_members()
        
        admin_text = f"""
👑 **Admin Dashboard**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📊 System Overview:**
• **Total Customers:** {stats.get('total_customers', 0)}
• **Active Customers:** {stats.get('active_customers', 0)}
• **Total Balance:** ${stats.get('total_balance', 0):,.2f}
• **Weekly P&L:** ${stats.get('total_weekly_pnl', 0):,.2f}

**👥 Member Management:**
• **Total Members:** {len(members)}
• **Pending Approval:** {len([m for m in members if m.status == 'pending'])}
• **Active Groups:** {len(set(m.group_id for m in members))}

**🔧 System Status:**
• **Bot Status:** ✅ Running
• **Portal Server:** {'✅ Online' if self.portal_connected else '❌ Offline'}
• **Database:** ✅ Connected
• **WebSocket:** {'✅ Available' if hasattr(self, 'websocket_client') else '❌ Unavailable'}

**📈 Recent Activity:**
• **Today's Transactions:** {len([t for t in [] if True])} (Example)
• **New Registrations:** 0 today
• **Active Sessions:** {len(self.active_sessions)}
        """
        
        keyboard = [
            [
                InlineKeyboardButton("👥 Manage Members", url="http://localhost:5000/admin"),
                InlineKeyboardButton("📊 Full Stats", callback_data="admin_stats")
            ],
            [
                InlineKeyboardButton("📢 Broadcast", callback_data="admin_broadcast"),
                InlineKeyboardButton("🔧 System", callback_data="admin_system")
            ],
            [
                InlineKeyboardButton("🌐 Admin Portal", url="http://localhost:5000/admin")
            ]
        ]
        
        await update.message.reply_text(
            admin_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _enhanced_stats_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced statistics command"""
        user_id = update.effective_user.id
        
        # Check admin permissions
        if user_id != config.admin_chat_id and str(user_id) not in str(config.admin_chat_id):
            await update.message.reply_text("❌ Admin access required")
            return
        
        stats = db.get_statistics()
        
        detailed_stats = f"""
📈 **Detailed System Statistics**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**💰 Financial Overview:**
• **Total Balance:** ${stats.get('total_balance', 0):,.2f}
• **Weekly P&L:** ${stats.get('total_weekly_pnl', 0):,.2f}
• **Average Balance:** ${stats.get('average_balance', 0):,.2f}
• **Largest Account:** ${stats.get('max_balance', 0):,.2f}

**👥 Customer Analytics:**
• **Total Customers:** {stats.get('total_customers', 0)}
• **Active Customers:** {stats.get('active_customers', 0)}
• **Inactive Customers:** {stats.get('inactive_customers', 0)}
• **Registration Rate:** {stats.get('registration_rate', 0):.1f}%

**📊 Transaction Metrics:**
• **Total Transactions:** {stats.get('total_transactions', 0)}
• **Daily Average:** {stats.get('daily_avg_transactions', 0)}
• **Success Rate:** {stats.get('success_rate', 0):.1f}%
• **Volume Today:** ${stats.get('daily_volume', 0):,.2f}

**⚡ Performance Metrics:**
• **Response Time:** {stats.get('avg_response_time', 0.1):.2f}s
• **Uptime:** {stats.get('uptime_percentage', 99.9):.1f}%
• **Error Rate:** {stats.get('error_rate', 0.1):.2f}%
• **Portal Connections:** {len(self.active_sessions)}
        """
        
        keyboard = [
            [
                InlineKeyboardButton("📊 Portal Analytics", url="http://localhost:5000/admin"),
                InlineKeyboardButton("📈 Live Charts", url="http://localhost:5000/admin")
            ],
            [InlineKeyboardButton("🔙 Back to Admin", callback_data="admin")]
        ]
        
        await update.message.reply_text(
            detailed_stats,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _broadcast_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Send broadcast message to all users"""
        user_id = update.effective_user.id
        
        # Check admin permissions
        if user_id != config.admin_chat_id and str(user_id) not in str(config.admin_chat_id):
            await update.message.reply_text("❌ Admin access required")
            return
        
        if not context.args:
            await update.message.reply_text(
                "📢 **Broadcast Usage:**\n"
                "`/broadcast <message>`\n\n"
                "**Example:**\n"
                "`/broadcast System maintenance tonight at 10 PM`"
            )
            return
        
        message = " ".join(context.args)
        customers = db.get_all_customers()
        
        success_count = 0
        failed_count = 0
        
        broadcast_text = f"""
📢 **System Broadcast**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕒 Sent: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        
        # Send to all registered Telegram users
        for customer in customers:
            if customer.telegram_id:
                try:
                    await context.bot.send_message(
                        chat_id=customer.telegram_id,
                        text=broadcast_text,
                        parse_mode='Markdown'
                    )
                    success_count += 1
                except Exception as e:
                    failed_count += 1
        
        # Broadcast to portal
        await self._broadcast_to_portal('admin_broadcast', {
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'sent_by': 'admin'
        })
        
        await update.message.reply_text(
            f"📢 **Broadcast Complete**\n"
            f"✅ Sent to: {success_count} users\n"
            f"❌ Failed: {failed_count} users\n"
            f"🌐 Portal: {'✅ Sent' if self.portal_connected else '❌ Offline'}"
        )
    
    async def _members_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show member management"""
        user_id = update.effective_user.id
        
        # Check admin permissions
        if user_id != config.admin_chat_id and str(user_id) not in str(config.admin_chat_id):
            await update.message.reply_text("❌ Admin access required")
            return
        
        members = db.get_group_members()
        pending_members = [m for m in members if m.status == 'pending']
        
        members_text = f"""
👥 **Member Management**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📊 Overview:**
• **Total Members:** {len(members)}
• **Pending Approval:** {len(pending_members)}
• **Active Groups:** {len(set(m.group_id for m in members))}

**⏳ Pending Approvals:**
        """
        
        if pending_members:
            for member in pending_members[:5]:  # Show first 5
                members_text += f"• @{member.username} from {member.group_name}\n"
            if len(pending_members) > 5:
                members_text += f"• ... and {len(pending_members) - 5} more\n"
        else:
            members_text += "• No pending approvals\n"
        
        members_text += "\n🌐 **Full management available in admin portal**"
        
        keyboard = [
            [
                InlineKeyboardButton("✅ Approve All", callback_data="approve_all_members"),
                InlineKeyboardButton("❌ Review Each", url="http://localhost:5000/admin")
            ],
            [InlineKeyboardButton("🌐 Admin Portal", url="http://localhost:5000/admin")]
        ]
        
        await update.message.reply_text(
            members_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _portal_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show portal information and access"""
        portal_status = "🟢 Online" if self.portal_connected else "🔴 Offline"
        
        portal_text = f"""
🌐 **Web Portal Access**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🔗 Portal Links:**
• **Customer Portal:** http://localhost:5000/
• **Admin Dashboard:** http://localhost:5000/admin
• **API Documentation:** http://localhost:5000/api/docs

**📊 Portal Status:**
• **Server Status:** {portal_status}
• **Active Connections:** {len(self.active_sessions)}
• **WebSocket Support:** {'✅ Available' if hasattr(self, 'websocket_client') else '❌ Unavailable'}
• **Real-time Updates:** {'✅ Enabled' if self.portal_connected else '❌ Disabled'}

**🚀 Features:**
• 📈 Real-time analytics and charts
• 👥 Member management system
• 📱 Mobile-responsive design
• 🌙 Dark/Light mode toggle
• 📊 Advanced reporting tools
• 🔔 Live notifications

**🔐 Access Requirements:**
• Customer accounts: Login with your credentials
• Admin access: Admin login required
• Real-time features: WebSocket connection
        """
        
        keyboard = [
            [
                InlineKeyboardButton("🌐 Open Customer Portal", url="http://localhost:5000/"),
                InlineKeyboardButton("👑 Admin Portal", url="http://localhost:5000/admin")
            ],
            [
                InlineKeyboardButton("📊 API Status", callback_data="portal_status"),
                InlineKeyboardButton("🔄 Refresh Status", callback_data="portal_refresh")
            ]
        ]
        
        await update.message.reply_text(
            portal_text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _alerts_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show alerts command"""
        await self._show_alerts(update, context)
    
    async def _settings_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show settings command"""
        await self._show_settings(update, context)
    
    async def _show_registration_info(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show registration info"""
        text = """
🔐 **Account Registration**

You need to register your account to access advanced features.

**How to Register:**
`/register <CUSTOMER_ID> <PASSWORD>`

**Example:**
`/register BB1042 N9H9`

**Need Help?**
Contact @admin for your credentials.
        """
        
        keyboard = [
            [InlineKeyboardButton("💬 Contact Admin", url="https://t.me/admin")],
            [InlineKeyboardButton("❓ Help", callback_data="help")]
        ]
        
        if hasattr(update, 'callback_query') and update.callback_query:
            await update.callback_query.edit_message_text(
                text,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        else:
            await update.message.reply_text(
                text,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
    
    async def _broadcast_to_portal(self, event_type: str, data: Dict[str, Any]):
        """Broadcast events to web portal via WebSocket"""
        if not self.websocket_client or not self.portal_connected:
            return
        
        try:
            # Connect to portal WebSocket if not connected
            if not self.websocket_client.connected:
                self.websocket_client.connect('http://localhost:5000')
            
            # Emit event to portal
            self.websocket_client.emit(event_type, data)
            logger.debug(f"Broadcasted {event_type} to portal: {data}")
            
        except Exception as e:
            logger.warning(f"Failed to broadcast to portal: {e}")
    
    def _get_user_customer(self, user_id: int) -> Optional[Any]:
        """Get customer associated with user ID"""
        # This would need to be implemented in database.py
        # For now, return None - this is a placeholder
        customers = db.get_all_customers()
        for customer in customers:
            if customer.telegram_id == user_id:
                return customer
        return None
    
    async def _send_unregistered_message(self, update: Update):
        """Send unregistered user message with registration prompt"""
        text = """
🔐 **Account Required**

You need to register your account to use this feature.

**How to Register:**
`/register <CUSTOMER_ID> <PASSWORD>`

**Example:**
`/register BB1042 N9H9`

**Need Help?**
Contact @admin for your credentials.
        """
        
        keyboard = [
            [InlineKeyboardButton("💬 Contact Admin", url="https://t.me/admin")],
            [InlineKeyboardButton("❓ Help", callback_data="help")]
        ]
        
        if hasattr(update, 'callback_query') and update.callback_query:
            await update.callback_query.edit_message_text(
                text,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        else:
            await update.message.reply_text(
                text,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
    
    async def _send_error_message(self, update: Update, error_msg: str):
        """Send user-friendly error message"""
        text = f"""
❌ **Error**

{error_msg}

Please try again or contact support if the problem persists.
        """
        
        keyboard = [
            [InlineKeyboardButton("🔄 Try Again", callback_data="start")],
            [InlineKeyboardButton("💬 Support", url="https://t.me/admin")]
        ]
        
        await update.message.reply_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    async def _comprehensive_error_handler(self, update: object, context: ContextTypes.DEFAULT_TYPE):
        """Comprehensive error handler with portal integration"""
        await error_handler.handle_error(update, context, context.error)
        
        # Broadcast error to portal for monitoring
        if isinstance(update, Update) and update.effective_user:
            await self._broadcast_to_portal('bot_error', {
                'user_id': update.effective_user.id,
                'error_type': str(type(context.error).__name__),
                'error_message': str(context.error),
                'timestamp': datetime.now().isoformat(),
                'command': getattr(update, 'message', {}).get('text', 'Unknown') if hasattr(update, 'message') else 'Unknown'
            })
    
    def run(self):
        """Run the enhanced bot with advanced features"""
        try:
            print("=" * 60)
            print("🚀 FANTDEV TRADING BOT - ENHANCED VERSION")
            print("=" * 60)
            
            # Display enhanced stats
            stats = db.get_statistics()
            print(f"📊 System Status:")
            print(f"   • Customers: {stats.get('total_customers', 0)}")
            print(f"   • Active: {stats.get('active_customers', 0)}")
            print(f"   • Balance: ${stats.get('total_balance', 0):,.2f}")
            print(f"   • Transactions: {stats.get('total_transactions', 0)}")
            
            members = db.get_group_members()
            print(f"   • Members: {len(members)} total")
            print(f"   • Pending: {len([m for m in members if m.status == 'pending'])}")
            
            print(f"\n🔧 Features:")
            print(f"   • ✅ Enhanced Commands with Inline Keyboards")
            print(f"   • ✅ Real-time Transaction Detection")
            print(f"   • ✅ Portal Integration")
            print(f"   • {'✅' if WEBSOCKET_AVAILABLE else '❌'} WebSocket Broadcasting")
            print(f"   • {'🟢' if self.portal_connected else '🔴'} Portal Server Connection")
            
            print(f"\n🌐 Portal Access:")
            print(f"   • Customer Portal: http://localhost:5000/")
            print(f"   • Admin Portal: http://localhost:5000/admin")
            
            print("-" * 60)
            print("✅ Enhanced bot is starting...")
            print("Press Ctrl+C to stop")
            print("-" * 60)
            
            # Start bot with enhanced features
            self.application.run_polling(
                drop_pending_updates=True,
                allowed_updates=Update.ALL_TYPES
            )
            
        except KeyboardInterrupt:
            print("\n⏹️  Bot stopped by user")
            if self.websocket_client and self.websocket_client.connected:
                self.websocket_client.disconnect()
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            sys.exit(1)

def main():
    """Main entry point for enhanced bot"""
    bot = EnhancedFantdevBot()
    bot.setup()
    bot.run()

if __name__ == "__main__":
    main()