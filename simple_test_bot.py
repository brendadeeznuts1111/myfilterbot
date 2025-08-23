#!/usr/bin/env python3
"""Simple test bot to verify connection"""

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import logging

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', 
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Bot token
BOT_TOKEN = "7555654864:AAE8ZsVnJbRK_41JZVMZAXDSCFstGRcxCY0"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when /start is issued."""
    logger.info(f"Start command from {update.effective_user.username}")
    await update.message.reply_text(
        '✅ Bot is working!\n\n'
        'Commands:\n'
        '/start - Test connection\n'
        '/dashboard - Admin panel\n'
        '/register <id> <password> - Register account'
    )

async def dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show dashboard"""
    logger.info(f"Dashboard command from {update.effective_user.username}")
    await update.message.reply_text(
        '📊 DASHBOARD\n'
        '━━━━━━━━━━━━\n'
        '✅ Bot Active\n'
        '👥 25 Customers\n'
        '💰 Total: $17,209\n'
    )

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Echo any message"""
    logger.info(f"Message from {update.effective_user.username}: {update.message.text}")
    if "BB1042" in update.message.text.upper():
        await update.message.reply_text(
            f"🔔 Detected customer BB1042 in message:\n{update.message.text}"
        )

def main():
    """Start the bot."""
    print("Starting simple test bot...")
    
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()

    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("dashboard", dashboard))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    # Run the bot
    application.run_polling()

if __name__ == '__main__':
    main()