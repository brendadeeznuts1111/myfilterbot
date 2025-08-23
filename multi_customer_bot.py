from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes
import logging
import json
from datetime import datetime
import re

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# Load configuration
with open('customer_config.json', 'r') as f:
    config = json.load(f)

# Bot configuration
BOT_TOKEN = "7555654864:AAGKxGxHGXDwJfP25le-ZGD-qhS9vDytttM"
ADMIN_CHAT_ID = "-2714719687"  # Your main monitoring chat

# Message storage for analytics
message_history = []

async def analyze_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Analyze each message for customer-specific keywords"""
    message = update.message
    
    if not message or not message.text:
        return
    
    text_lower = message.text.lower()
    from_user = message.from_user
    username = f"@{from_user.username}" if from_user.username else f"User_{from_user.id}"
    
    # Track all messages for analytics
    message_data = {
        'timestamp': datetime.now().isoformat(),
        'from': username,
        'chat_id': message.chat_id,
        'text': message.text,
        'matched_customers': []
    }
    
    # Check which customers this message relates to
    for customer_id, customer_data in config['customers'].items():
        if not customer_data['active']:
            continue
            
        # Check if message contains customer-specific keywords
        matched_keywords = []
        for keyword in customer_data['keywords']:
            if keyword.lower() in text_lower:
                matched_keywords.append(keyword)
        
        # Check global keywords
        for keyword in config['global_keywords']:
            if keyword.lower() in text_lower:
                matched_keywords.append(keyword)
        
        # Check if message is from customer's telegram account
        is_from_customer = (username == customer_data['telegram_username'] or 
                          str(from_user.id) == str(customer_data.get('telegram_id', '')))
        
        if matched_keywords or is_from_customer:
            message_data['matched_customers'].append({
                'customer_id': customer_id,
                'keywords': matched_keywords,
                'is_from_customer': is_from_customer
            })
            
            # Forward to admin with customer info
            forward_text = f"🔔 Customer Alert: {customer_id}\n"
            forward_text += f"📱 From: {username}\n"
            
            if matched_keywords:
                forward_text += f"🔑 Keywords: {', '.join(matched_keywords)}\n"
            
            if is_from_customer:
                forward_text += f"✅ Message from customer's account\n"
            
            forward_text += f"\n📝 Message:\n{message.text}"
            
            try:
                await context.bot.send_message(
                    chat_id=ADMIN_CHAT_ID,
                    text=forward_text
                )
                logging.info(f"Forwarded message for customer {customer_id}")
            except Exception as e:
                logging.error(f"Failed to forward message: {e}")
    
    # Store message for analytics
    if message_data['matched_customers']:
        message_history.append(message_data)
        
        # Keep only last 1000 messages in memory
        if len(message_history) > 1000:
            message_history.pop(0)

async def register_customer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Register a customer's Telegram account"""
    if len(context.args) != 2:
        await update.message.reply_text(
            "Usage: /register <customer_id> <password>\n"
            "Example: /register BB1042 N9H9"
        )
        return
    
    customer_id = context.args[0].upper()
    password = context.args[1].upper()
    
    # Verify customer exists and password matches
    if customer_id not in config['customers']:
        await update.message.reply_text("❌ Customer ID not found")
        return
    
    if config['customers'][customer_id]['password'] != password:
        await update.message.reply_text("❌ Invalid password")
        return
    
    # Register this Telegram account to the customer
    user = update.message.from_user
    username = f"@{user.username}" if user.username else None
    
    config['customers'][customer_id]['telegram_id'] = user.id
    config['customers'][customer_id]['telegram_username'] = username
    
    # Save updated config
    with open('customer_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    await update.message.reply_text(
        f"✅ Customer {customer_id} registered!\n"
        f"Your messages will now be tracked.\n"
        f"Monitoring keywords: {', '.join(config['customers'][customer_id]['keywords'][:5])}"
    )
    
    logging.info(f"Registered customer {customer_id} with Telegram ID {user.id}")

async def customer_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show customer their monitoring status"""
    user_id = update.message.from_user.id
    username = f"@{update.message.from_user.username}" if update.message.from_user.username else None
    
    # Find customer by telegram ID or username
    customer_found = None
    for customer_id, data in config['customers'].items():
        if (str(data.get('telegram_id')) == str(user_id) or 
            data.get('telegram_username') == username):
            customer_found = customer_id
            break
    
    if not customer_found:
        await update.message.reply_text(
            "❌ You are not registered as a customer.\n"
            "Use /register <customer_id> <password> to register."
        )
        return
    
    customer_data = config['customers'][customer_found]
    
    # Count messages for this customer
    customer_messages = [m for m in message_history 
                        if any(c['customer_id'] == customer_found 
                              for c in m.get('matched_customers', []))]
    
    status_text = f"📊 Customer Status: {customer_found}\n"
    status_text += f"━━━━━━━━━━━━━━━━\n"
    status_text += f"✅ Active: {customer_data['active']}\n"
    status_text += f"📱 Telegram: {customer_data.get('telegram_username', 'Not set')}\n"
    status_text += f"📨 Messages tracked today: {len(customer_messages)}\n"
    status_text += f"\n🔑 Your Keywords:\n"
    
    for keyword in customer_data['keywords'][:10]:
        status_text += f"  • {keyword}\n"
    
    if len(customer_data['keywords']) > 10:
        status_text += f"  ... and {len(customer_data['keywords']) - 10} more\n"
    
    await update.message.reply_text(status_text)

async def add_keyword(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Add keyword for a customer"""
    if len(context.args) < 1:
        await update.message.reply_text(
            "Usage: /addkeyword <keyword>\n"
            "Example: /addkeyword payment"
        )
        return
    
    user_id = update.message.from_user.id
    keyword = ' '.join(context.args)
    
    # Find customer
    customer_found = None
    for customer_id, data in config['customers'].items():
        if str(data.get('telegram_id')) == str(user_id):
            customer_found = customer_id
            break
    
    if not customer_found:
        await update.message.reply_text("❌ Please register first with /register")
        return
    
    # Add keyword
    if keyword not in config['customers'][customer_found]['keywords']:
        config['customers'][customer_found]['keywords'].append(keyword)
        
        # Save config
        with open('customer_config.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        await update.message.reply_text(f"✅ Added keyword: {keyword}")
    else:
        await update.message.reply_text(f"ℹ️ Keyword already exists: {keyword}")

async def list_customers(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command to list all customers"""
    # Check if admin
    if str(update.message.chat_id) != ADMIN_CHAT_ID:
        return
    
    text = "👥 Customer Overview\n━━━━━━━━━━━━━━━━\n"
    
    for customer_id, data in config['customers'].items():
        status = "✅" if data['active'] else "❌"
        telegram = data.get('telegram_username', 'Not registered')
        
        # Count messages
        customer_messages = [m for m in message_history 
                            if any(c['customer_id'] == customer_id 
                                  for c in m.get('matched_customers', []))]
        
        text += f"\n{status} {customer_id} ({data['password']})\n"
        text += f"   Telegram: {telegram}\n"
        text += f"   Messages: {len(customer_messages)}\n"
        text += f"   Keywords: {len(data['keywords'])}\n"
    
    await update.message.reply_text(text)

async def analytics(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show analytics for all customers"""
    if str(update.message.chat_id) != ADMIN_CHAT_ID:
        return
    
    text = "📊 Analytics Report\n━━━━━━━━━━━━━━━━\n"
    
    # Customer activity
    customer_activity = {}
    for msg in message_history:
        for match in msg.get('matched_customers', []):
            cid = match['customer_id']
            if cid not in customer_activity:
                customer_activity[cid] = {'count': 0, 'keywords': set()}
            customer_activity[cid]['count'] += 1
            customer_activity[cid]['keywords'].update(match['keywords'])
    
    # Sort by activity
    sorted_customers = sorted(customer_activity.items(), 
                            key=lambda x: x[1]['count'], 
                            reverse=True)
    
    text += "\n🔥 Most Active Customers:\n"
    for customer_id, stats in sorted_customers[:10]:
        text += f"  {customer_id}: {stats['count']} messages\n"
        if stats['keywords']:
            text += f"    Top keywords: {', '.join(list(stats['keywords'])[:3])}\n"
    
    # Time analysis
    if message_history:
        text += f"\n⏰ Time Analysis:\n"
        text += f"  Total messages tracked: {len(message_history)}\n"
        text += f"  Active customers: {len(customer_activity)}\n"
    
    await update.message.reply_text(text)

def main():
    """Start the bot"""
    print("=" * 50)
    print("MULTI-CUSTOMER FILTER BOT")
    print("=" * 50)
    print(f"✅ Loaded {len(config['customers'])} customers")
    print(f"📋 Global keywords: {', '.join(config['global_keywords'][:5])}")
    print("-" * 50)
    print("Starting bot... (Press Ctrl+C to stop)")
    
    # Create application
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Command handlers
    app.add_handler(CommandHandler("register", register_customer))
    app.add_handler(CommandHandler("status", customer_status))
    app.add_handler(CommandHandler("addkeyword", add_keyword))
    app.add_handler(CommandHandler("customers", list_customers))
    app.add_handler(CommandHandler("analytics", analytics))
    
    # Message handler for all text messages
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, analyze_message))
    
    # Start polling
    app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()