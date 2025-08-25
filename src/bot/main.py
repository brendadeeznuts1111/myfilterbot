#!/usr/bin/env python3
"""
Fantdev Trading Bot - Main Application
Clean, modular architecture with proper error handling
"""

import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters
)

from config import config
from database import db
from handlers import handlers
from utils.rate_limiter import rate_limiter
from services.error_handler import error_handler, error_tracker
from debug_handler import debug_handler
from services.portal_integration import setup_portal_integration
from services.chat_tracker import chat_tracker
from enhanced_chat_handlers import enhanced_chat_handlers
from authenticated_handlers import authenticated_handlers
from timezone_handler import timezone_handler

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class FantdevBot:
    """Main bot application"""
    
    def __init__(self):
        """Initialize the bot"""
        self.application = None
        self._validate_config()
        self._initialize_database()
        self._setup_error_handling()
        self._setup_portal_integration()
    
    def _validate_config(self):
        """Validate configuration"""
        if not config.token:
            logger.error("Bot token not configured!")
            sys.exit(1)
        
        if not config.admin_chat_id:
            logger.warning("Admin chat ID not configured")
        
        logger.info("Configuration validated")
    
    def _initialize_database(self):
        """Initialize and validate database"""
        stats = db.get_statistics()
        logger.info(f"Database initialized with {stats.get('total_customers', 0)} customers")
        logger.info(f"Total balance: ${stats.get('total_balance', 0):,.2f}")
    
    def _setup_error_handling(self):
        """Setup error handling and debug systems"""
        # Configure error handler with admin chat ID
        if config.admin_chat_id:
            error_handler.set_admin_chat_id(config.admin_chat_id)
            logger.info("Error handler configured with admin notifications")
        else:
            logger.warning("Admin chat ID not set - error notifications disabled")
        
        # Enable debug mode if in development
        if hasattr(config, 'debug_mode') and config.debug_mode:
            error_handler.enable_debug_mode(True)
            logger.info("Debug mode enabled")
        
        logger.info("Error handling system initialized")
    
    def _setup_portal_integration(self):
        """Setup portal integration for real-time updates"""
        try:
            portal_integration = setup_portal_integration()
            if portal_integration.enabled:
                logger.info("Portal integration enabled - Real-time updates active")
            else:
                logger.warning("Portal integration disabled - Portal server not available")
        except Exception as e:
            logger.error(f"Portal integration setup failed: {e}")
    
    def setup(self):
        """Setup bot handlers and configuration"""
        # Create application
        self.application = Application.builder().token(config.token).build()
        
        # Add command handlers
        commands = [
            ("start", handlers.start_command),
            ("account", handlers.account_command),
            ("balance", handlers.balance_command),
            ("register", handlers.register_command),
            ("verify", handlers.verify_command),  # Admin verification for duplicate passwords
            ("admin", handlers.admin_command),
            ("dashboard", authenticated_handlers.dashboard_command),  # Enhanced dashboard with auth
            ("login", authenticated_handlers.login_command),  # Persistent login
            ("logout", authenticated_handlers.logout_command),  # Logout
            ("history", authenticated_handlers.history_command),  # Player history
            ("fraud", authenticated_handlers.fraud_check_command),  # Fraud detection
            ("stats", enhanced_chat_handlers.stats_command),  # Chat statistics
            ("link", enhanced_chat_handlers.link_command),  # Get chat shortlink
            ("chats", enhanced_chat_handlers.chats_command),  # List all chats (admin)
            ("broadcast", enhanced_chat_handlers.broadcast_command),  # Broadcast to all chats
            ("timezone", timezone_handler.timezone_command),  # Set user timezone
            ("market", timezone_handler.market_hours_command),  # Global market hours
            ("debug", debug_handler.debug_command),  # Debug interface
            ("help", self._help_command),
        ]
        
        for command, handler in commands:
            self.application.add_handler(CommandHandler(command, handler))
        
        # Add message handlers
        # Enhanced message handler that tracks all chats
        async def enhanced_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
            """Process all messages with chat tracking"""
            # Track chat activity
            await enhanced_chat_handlers.on_message(update, context)
            # Process for transactions and customer activity
            await handlers.process_message(update, context)
        
        self.application.add_handler(
            MessageHandler(
                filters.TEXT & ~filters.COMMAND,
                enhanced_message_handler
            )
        )
        
        # Add handler for when bot joins new chat
        self.application.add_handler(
            MessageHandler(
                filters.StatusUpdate.NEW_CHAT_MEMBERS,
                enhanced_chat_handlers.on_chat_join
            )
        )
        
        # Add callback query handler with debug and chat support
        async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
            """Enhanced callback handler with debug and chat support"""
            data = update.callback_query.data
            if data.startswith("debug_"):
                await debug_handler.handle_debug_callback(update, context)
            elif data in ["full_chat_report", "export_chats", "refresh_chats", 
                         "confirm_broadcast", "cancel_broadcast"] or data.startswith("copy_link_"):
                await enhanced_chat_handlers.handle_chat_callback(update, context)
            else:
                await handlers.handle_callback(update, context)
        
        self.application.add_handler(CallbackQueryHandler(callback_handler))
        
        # Add comprehensive error handler
        self.application.add_error_handler(self._enhanced_error_handler)
        
        logger.info("Bot handlers configured")
    
    async def _help_command(self, update: Update, context):
        """Handle /help command"""
        help_text = """
❓ **Help & Support**
━━━━━━━━━━━━━━━━

**🔐 Authentication & Session:**
• `/login <id> <password> [remember]` - Login with persistent session
• `/logout` - End your session
• `/dashboard` - Access dashboard with auth token

**💰 Account Management:**
• `/start` - Welcome message
• `/register <id> <password>` - Register your account  
• `/balance` - Check your balance
• `/account` - Account management
• `/history [days]` - Transaction history

**📊 Chat Tracking:**
• `/stats` - Chat/global statistics
• `/link` - Get chat shortlink URL
• `/chats` - List all bot chats (admin)

**🛡️ Admin Commands:**
• `/admin` - Admin panel
• `/verify <token> <approve|deny>` - Verify registrations
• `/fraud <customer_id>` - Check fraud risk
• `/broadcast <message>` - Send to all chats

**🔗 How Chat Tracking Works:**
1. Bot automatically discovers all chats it's in
2. Creates unique shortlinks for each chat
3. Tracks all messages and activity
4. Stores in durable SQLite database

**📱 Session Features:**
• Stay logged in for 30 days with 'remember'
• One-click dashboard access
• JWT tokens for web authentication
• Fraud detection monitoring

**Support:**
Contact @fantdev_bot admin
"""
        await update.message.reply_text(
            help_text,
            parse_mode='Markdown'
        )
    
    async def _enhanced_error_handler(self, update: object, context):
        """Enhanced error handler with comprehensive logging and notification"""
        # Use the error handler system
        await error_handler.handle_error(update, context, context.error)
    
    async def _error_handler(self, update: object, context):
        """Legacy error handler - kept for backward compatibility"""
        logger.error(f"Exception while handling an update: {context.error}")
        
        if update and isinstance(update, Update) and update.effective_message:
            await update.effective_message.reply_text(
                "❌ An error occurred. Please try again later."
            )
    
    def run(self):
        """Run the bot"""
        try:
            print("=" * 50)
            print("🚀 FANTDEV TRADING BOT")
            print("=" * 50)
            
            # Display stats
            stats = db.get_statistics()
            print(f"📊 System Status:")
            print(f"   • Customers: {stats.get('total_customers', 0)}")
            print(f"   • Active: {stats.get('active_customers', 0)}")
            print(f"   • Balance: ${stats.get('total_balance', 0):,.2f}")
            print(f"   • Transactions: {stats.get('total_transactions', 0)}")
            
            print("-" * 50)
            print("✅ Bot is starting...")
            print("Press Ctrl+C to stop")
            print("-" * 50)
            
            # Start bot
            self.application.run_polling(
                drop_pending_updates=True,
                allowed_updates=Update.ALL_TYPES
            )
            
        except KeyboardInterrupt:
            print("\n⏹️  Bot stopped by user")
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            sys.exit(1)

def main():
    """Main entry point"""
    bot = FantdevBot()
    bot.setup()
    bot.run()

if __name__ == "__main__":
    main()
