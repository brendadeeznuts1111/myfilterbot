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
    filters
)

from src.config import config
from src.database import db
from src.handlers import handlers
from src.utils import rate_limiter

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
            ("admin", handlers.admin_command),
            ("dashboard", handlers.admin_command),  # Alias for admin
            ("help", self._help_command),
        ]
        
        for command, handler in commands:
            self.application.add_handler(CommandHandler(command, handler))
        
        # Add message handler
        self.application.add_handler(
            MessageHandler(
                filters.TEXT & ~filters.COMMAND,
                handlers.process_message
            )
        )
        
        # Add callback query handler
        self.application.add_handler(
            CallbackQueryHandler(handlers.handle_callback)
        )
        
        # Add error handler
        self.application.add_error_handler(self._error_handler)
        
        logger.info("Bot handlers configured")
    
    async def _help_command(self, update: Update, context):
        """Handle /help command"""
        help_text = """
❓ **Help & Support**
━━━━━━━━━━━━━━━━

**Basic Commands:**
• `/start` - Welcome message
• `/register <id> <password>` - Register your account
• `/balance` - Check your balance
• `/account` - Account management

**Admin Commands:**
• `/admin` or `/dashboard` - Admin panel
• `/help` - This help message

**How It Works:**
1. Register with your customer ID
2. Bot monitors groups for your activity
3. Receive alerts for transactions
4. Track balance and P&L

**Features:**
✅ Real-time transaction detection
📊 Balance tracking
🔔 Instant alerts
📈 Performance analytics

**Support:**
Contact @admin for assistance
"""
        await update.message.reply_text(
            help_text,
            parse_mode='Markdown'
        )
    
    async def _error_handler(self, update: object, context):
        """Handle errors"""
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