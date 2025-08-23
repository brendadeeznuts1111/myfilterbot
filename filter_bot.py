from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
import logging

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# ============== CONFIGURATION ==============
# STEP 1: Replace with your bot token from @BotFather
BOT_TOKEN = "7555654864:AAGKxGxHGXDwJfP25le-ZGD-qhS9vDytttM"

# STEP 2: Replace with your personal chat ID (get it from @userinfobot)
YOUR_CHAT_ID = "-2714719687"

# STEP 3: Add keywords to filter for
KEYWORDS = ["urgent", "help", "important", "emergency", "asap", "#task", 
            "meeting", "deadline", "review", "call", "problem", "issue",
            "critical", "need", "please", "today", "tomorrow", "now",
            "@here", "@all", "attention", "update", "status", "[credited!]",
            "Your 10 minutes have expired", "removed the address", "/start to begin", "⏰",
            "deposit was denied"]

# Optional: Add specific usernames to always forward from
IMPORTANT_USERS = ["@blissfulborat"]  # Add usernames here
# ============================================

async def forward_if_important(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Check messages and forward important ones"""
    message = update.message
    
    # Skip if no text
    if not message or not message.text:
        return
    
    text_lower = message.text.lower()
    username = f"@{message.from_user.username}" if message.from_user.username else ""
    
    # Check if message contains keywords
    keyword_found = any(keyword.lower() in text_lower for keyword in KEYWORDS)
    
    # Check if message is from important user
    from_important_user = username in IMPORTANT_USERS if username else False
    
    if keyword_found or from_important_user:
        try:
            # Forward the message
            await context.bot.forward_message(
                chat_id=YOUR_CHAT_ID, 
                from_chat_id=message.chat_id, 
                message_id=message.message_id
            )
            
            # Log what was forwarded
            reason = []
            if keyword_found:
                matching_keywords = [k for k in KEYWORDS if k.lower() in text_lower]
                reason.append(f"keywords: {', '.join(matching_keywords)}")
            if from_important_user:
                reason.append(f"user: {username}")
            
            logging.info(f"Forwarded message - {' | '.join(reason)}")
            logging.info(f"Preview: {message.text[:100]}...")
            
        except Exception as e:
            logging.error(f"Failed to forward message: {e}")

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when /start command is issued"""
    await update.message.reply_text(
        "🤖 Filter Bot Active!\n\n"
        f"Monitoring for keywords: {', '.join(KEYWORDS)}\n"
        f"Forwarding to chat ID: {YOUR_CHAT_ID}\n\n"
        "Add me to a group as admin to start filtering!"
    )

def main():
    """Start the bot"""
    print("=" * 50)
    print("TELEGRAM FILTER BOT")
    print("=" * 50)
    
    # Check configuration
    if BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("❌ ERROR: Please add your bot token!")
        print("1. Message @BotFather on Telegram")
        print("2. Send /newbot and follow instructions")
        print("3. Copy the token and paste it in this file")
        return
    
    if YOUR_CHAT_ID == "YOUR_CHAT_ID_HERE":
        print("❌ ERROR: Please add your chat ID!")
        print("1. Message @userinfobot on Telegram")
        print("2. Copy your ID number")
        print("3. Paste it in this file")
        return
    
    print(f"✅ Bot configured!")
    print(f"📋 Filtering keywords: {', '.join(KEYWORDS)}")
    print(f"📬 Forwarding to chat: {YOUR_CHAT_ID}")
    print("-" * 50)
    print("Starting bot... (Press Ctrl+C to stop)")
    
    # Create application
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    app.add_handler(MessageHandler(filters.COMMAND & filters.Regex("^/start$"), start_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, forward_if_important))
    
    # Start polling
    app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()