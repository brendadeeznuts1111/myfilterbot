from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, MessageHandler, CommandHandler, CallbackQueryHandler, filters, ContextTypes
import logging
import json
from datetime import datetime, timedelta
import re
import asyncio
from typing import Dict, List, Optional

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# Bot configuration
BOT_TOKEN = "7555654864:AAGKxGxHGXDwJfP25le-ZGD-qhS9vDytttM"
ADMIN_CHAT_ID = "-2714719687"

# Load database
def load_database():
    with open('customer_database.json', 'r') as f:
        return json.load(f)

def save_database(db):
    with open('customer_database.json', 'w') as f:
        json.dump(db, f, indent=2)

# Global database
db = load_database()

# Transaction patterns to detect
TRANSACTION_PATTERNS = {
    'deposit': [r'\[credited!\]', r'credited', r'deposit.*success', r'received.*\$?\d+'],
    'withdrawal': [r'withdrawn', r'sent.*\$?\d+', r'withdrawal.*success'],
    'denied': [r'denied', r'rejected', r'failed', r'insufficient'],
    'expired': [r'expired', r'timeout', r'10 minutes.*expired'],
    'pending': [r'pending', r'processing', r'confirming']
}

class CustomerBot:
    def __init__(self):
        self.message_cache = []
        self.active_sessions = {}
        
    async def process_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Process incoming messages for customer activity"""
        message = update.message
        if not message or not message.text:
            return
        
        text = message.text
        text_lower = text.lower()
        from_user = message.from_user
        username = f"@{from_user.username}" if from_user.username else f"User_{from_user.id}"
        
        # Detect transaction type
        transaction_type = None
        amount = None
        
        # Extract amount if present
        amount_match = re.search(r'\$?(\d+(?:\.\d{2})?)', text)
        if amount_match:
            amount = float(amount_match.group(1))
        
        # Detect transaction type
        for tx_type, patterns in TRANSACTION_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    transaction_type = tx_type
                    break
            if transaction_type:
                break
        
        # Check for customer mentions
        matched_customers = []
        for customer_id, customer_data in db['customers'].items():
            # Check if message contains customer ID or password
            if (customer_id.lower() in text_lower or 
                customer_data['password'].lower() in text_lower):
                
                matched_customers.append(customer_id)
                
                # Log transaction
                transaction = {
                    'timestamp': datetime.now().isoformat(),
                    'customer_id': customer_id,
                    'type': transaction_type or 'mention',
                    'amount': amount,
                    'message': text[:200],
                    'from': username,
                    'chat_id': message.chat_id
                }
                
                db['transactions'].append(transaction)
                
                # Update balance if it's a transaction
                if transaction_type and amount:
                    if transaction_type == 'deposit':
                        db['customers'][customer_id]['balance'] += amount
                    elif transaction_type == 'withdrawal':
                        db['customers'][customer_id]['balance'] -= amount
                
                # Check for alerts
                await self.check_alerts(customer_id, transaction_type, amount, context)
        
        # Forward to admin if matches found
        if matched_customers:
            await self.forward_to_admin(message, matched_customers, transaction_type, amount, context)
            
            # Save database
            save_database(db)
    
    async def check_alerts(self, customer_id: str, tx_type: str, amount: float, context):
        """Check and send alerts based on thresholds"""
        customer = db['customers'][customer_id]
        alerts = db['alerts']
        
        alert_messages = []
        
        # Check balance alerts
        if customer['balance'] < alerts['low_balance']:
            alert_messages.append(f"⚠️ Low balance: ${customer['balance']}")
        
        # Check transaction size alerts
        if amount:
            if tx_type == 'deposit' and amount >= alerts['large_win']:
                alert_messages.append(f"🎯 Large deposit: ${amount}")
            elif tx_type == 'withdrawal' and amount >= abs(alerts['large_loss']):
                alert_messages.append(f"📉 Large withdrawal: ${amount}")
        
        # Send alert if needed
        if alert_messages:
            alert_text = f"🚨 Alert for {customer_id}\n"
            alert_text += "\n".join(alert_messages)
            
            try:
                await context.bot.send_message(
                    chat_id=ADMIN_CHAT_ID,
                    text=alert_text
                )
            except Exception as e:
                logging.error(f"Failed to send alert: {e}")
    
    async def forward_to_admin(self, message, customers: List[str], tx_type: str, amount: float, context):
        """Forward message to admin with enhanced info"""
        # Create detailed forward message
        forward_text = "━━━━━━━━━━━━━━━━━━\n"
        forward_text += "📊 Customer Activity Detected\n"
        forward_text += "━━━━━━━━━━━━━━━━━━\n\n"
        
        # Customer info
        for customer_id in customers:
            customer = db['customers'][customer_id]
            forward_text += f"👤 Customer: {customer_id}\n"
            forward_text += f"🔑 Password: {customer['password']}\n"
            forward_text += f"💰 Balance: ${customer['balance']}\n"
            forward_text += f"📈 Weekly P&L: ${customer['weekly_pnl']}\n"
            
            if customer.get('phone'):
                forward_text += f"📱 Phone: {customer['phone']}\n"
            
            forward_text += "\n"
        
        # Transaction info
        if tx_type:
            emoji = {
                'deposit': '✅',
                'withdrawal': '💸',
                'denied': '❌',
                'expired': '⏰',
                'pending': '⏳'
            }.get(tx_type, '📝')
            
            forward_text += f"{emoji} Transaction: {tx_type.upper()}\n"
            
            if amount:
                forward_text += f"💵 Amount: ${amount}\n"
        
        forward_text += f"\n📝 Original Message:\n{message.text}\n"
        forward_text += f"\n👤 From: {message.from_user.username or 'Unknown'}\n"
        forward_text += f"⏰ Time: {datetime.now().strftime('%I:%M %p')}\n"
        
        # Add action buttons
        keyboard = [
            [
                InlineKeyboardButton("📊 View Stats", callback_data=f"stats_{customers[0]}"),
                InlineKeyboardButton("📜 History", callback_data=f"history_{customers[0]}")
            ],
            [
                InlineKeyboardButton("✅ Mark Resolved", callback_data=f"resolve_{customers[0]}"),
                InlineKeyboardButton("🚨 Flag", callback_data=f"flag_{customers[0]}")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        try:
            await context.bot.send_message(
                chat_id=ADMIN_CHAT_ID,
                text=forward_text,
                reply_markup=reply_markup
            )
        except Exception as e:
            logging.error(f"Failed to forward message: {e}")

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline button callbacks"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    action, customer_id = data.split('_', 1)
    
    if action == 'stats':
        await show_customer_stats(query, customer_id, context)
    elif action == 'history':
        await show_customer_history(query, customer_id, context)
    elif action == 'resolve':
        await query.edit_message_text(f"✅ Marked as resolved for {customer_id}")
    elif action == 'flag':
        await query.edit_message_text(f"🚨 Flagged for review: {customer_id}")

async def show_customer_stats(query, customer_id: str, context):
    """Show detailed customer statistics"""
    customer = db['customers'].get(customer_id)
    if not customer:
        await query.edit_message_text("Customer not found")
        return
    
    # Calculate statistics
    transactions = [t for t in db['transactions'] if t['customer_id'] == customer_id]
    
    deposits = sum(t['amount'] or 0 for t in transactions if t['type'] == 'deposit')
    withdrawals = sum(t['amount'] or 0 for t in transactions if t['type'] == 'withdrawal')
    
    stats_text = f"📊 Statistics for {customer_id}\n"
    stats_text += "━━━━━━━━━━━━━━━━━━\n\n"
    stats_text += f"💰 Current Balance: ${customer['balance']}\n"
    stats_text += f"📈 Weekly P&L: ${customer['weekly_pnl']}\n"
    stats_text += f"✅ Total Deposits: ${deposits}\n"
    stats_text += f"💸 Total Withdrawals: ${withdrawals}\n"
    stats_text += f"📝 Total Transactions: {len(transactions)}\n"
    
    if customer.get('telegram_id'):
        stats_text += f"\n✅ Telegram Linked: Yes\n"
    else:
        stats_text += f"\n❌ Telegram Linked: No\n"
    
    await query.edit_message_text(stats_text)

async def show_customer_history(query, customer_id: str, context):
    """Show customer transaction history"""
    transactions = [t for t in db['transactions'] if t['customer_id'] == customer_id]
    
    if not transactions:
        await query.edit_message_text(f"No transaction history for {customer_id}")
        return
    
    history_text = f"📜 History for {customer_id}\n"
    history_text += "━━━━━━━━━━━━━━━━━━\n\n"
    
    # Show last 10 transactions
    for tx in transactions[-10:]:
        timestamp = datetime.fromisoformat(tx['timestamp']).strftime('%m/%d %I:%M%p')
        emoji = {
            'deposit': '✅',
            'withdrawal': '💸',
            'denied': '❌',
            'expired': '⏰',
            'pending': '⏳',
            'mention': '📝'
        }.get(tx['type'], '📝')
        
        history_text += f"{emoji} {timestamp}\n"
        
        if tx['amount']:
            history_text += f"   Amount: ${tx['amount']}\n"
        
        history_text += f"   {tx['message'][:50]}...\n\n"
    
    await query.edit_message_text(history_text)

async def admin_dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show admin dashboard"""
    if str(update.message.chat_id) != ADMIN_CHAT_ID:
        return
    
    # Calculate totals
    total_balance = sum(c['balance'] for c in db['customers'].values())
    total_weekly = sum(c['weekly_pnl'] for c in db['customers'].values())
    active_customers = sum(1 for c in db['customers'].values() if c['active'])
    
    dashboard = "📊 ADMIN DASHBOARD\n"
    dashboard += "━━━━━━━━━━━━━━━━━━\n\n"
    dashboard += f"👥 Total Customers: {len(db['customers'])}\n"
    dashboard += f"✅ Active: {active_customers}\n"
    dashboard += f"💰 Total Balance: ${total_balance:,.2f}\n"
    dashboard += f"📈 Weekly P&L: ${total_weekly:,.2f}\n"
    dashboard += f"📝 Total Transactions: {len(db['transactions'])}\n"
    
    # Top performers
    top_customers = sorted(db['customers'].items(), 
                          key=lambda x: x[1]['weekly_pnl'], 
                          reverse=True)[:5]
    
    dashboard += "\n🏆 Top Performers:\n"
    for customer_id, data in top_customers:
        dashboard += f"  {customer_id}: +${data['weekly_pnl']}\n"
    
    # At risk customers
    at_risk = [(k, v) for k, v in db['customers'].items() 
              if v['balance'] < db['alerts']['low_balance']]
    
    if at_risk:
        dashboard += "\n⚠️ Low Balance Alerts:\n"
        for customer_id, data in at_risk[:5]:
            dashboard += f"  {customer_id}: ${data['balance']}\n"
    
    # Action buttons
    keyboard = [
        [
            InlineKeyboardButton("📊 Export Report", callback_data="export_report"),
            InlineKeyboardButton("🔄 Refresh", callback_data="refresh_dashboard")
        ],
        [
            InlineKeyboardButton("👥 All Customers", callback_data="list_all_customers"),
            InlineKeyboardButton("📝 Recent Activity", callback_data="recent_activity")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(dashboard, reply_markup=reply_markup)

async def customer_register(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Enhanced customer registration"""
    if len(context.args) != 2:
        await update.message.reply_text(
            "📝 Registration Instructions:\n\n"
            "Use: /register <customer_id> <password>\n"
            "Example: /register BB1042 N9H9\n\n"
            "After registration, you'll receive:\n"
            "• Balance updates\n"
            "• Transaction confirmations\n"
            "• Important alerts"
        )
        return
    
    customer_id = context.args[0].upper()
    password = context.args[1].upper()
    
    if customer_id not in db['customers']:
        await update.message.reply_text("❌ Customer ID not found")
        return
    
    if db['customers'][customer_id]['password'] != password:
        await update.message.reply_text("❌ Invalid password")
        return
    
    # Register telegram account
    user = update.message.from_user
    db['customers'][customer_id]['telegram_id'] = user.id
    
    save_database(db)
    
    # Send welcome message
    customer = db['customers'][customer_id]
    welcome = f"✅ Welcome {customer_id}!\n\n"
    welcome += f"💰 Current Balance: ${customer['balance']}\n"
    welcome += f"📈 Weekly P&L: ${customer['weekly_pnl']}\n\n"
    welcome += "You'll now receive:\n"
    welcome += "• Transaction confirmations\n"
    welcome += "• Balance updates\n"
    welcome += "• Important alerts\n\n"
    welcome += "Commands:\n"
    welcome += "/balance - Check balance\n"
    welcome += "/history - View transactions\n"
    welcome += "/help - Get support"
    
    await update.message.reply_text(welcome)

async def customer_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Check customer balance"""
    user_id = update.message.from_user.id
    
    # Find customer
    customer_id = None
    for cid, data in db['customers'].items():
        if data.get('telegram_id') == user_id:
            customer_id = cid
            break
    
    if not customer_id:
        await update.message.reply_text(
            "❌ Not registered. Use /register <id> <password>"
        )
        return
    
    customer = db['customers'][customer_id]
    
    balance_text = f"💰 Account: {customer_id}\n"
    balance_text += "━━━━━━━━━━━━━━━━\n"
    balance_text += f"Balance: ${customer['balance']}\n"
    balance_text += f"Weekly P&L: ${customer['weekly_pnl']}\n"
    
    # Calculate today's activity
    today = datetime.now().date()
    today_transactions = [
        t for t in db['transactions'] 
        if t['customer_id'] == customer_id 
        and datetime.fromisoformat(t['timestamp']).date() == today
    ]
    
    if today_transactions:
        balance_text += f"\n📊 Today's Activity:\n"
        for tx in today_transactions:
            emoji = '✅' if tx['type'] == 'deposit' else '💸'
            balance_text += f"{emoji} ${tx['amount'] or 0}\n"
    
    await update.message.reply_text(balance_text)

def main():
    """Start the enhanced bot"""
    print("=" * 50)
    print("ENHANCED CUSTOMER TRACKING BOT")
    print("=" * 50)
    print(f"✅ Loaded {len(db['customers'])} customers")
    print(f"💰 Total balance tracked: ${sum(c['balance'] for c in db['customers'].values()):,.2f}")
    print(f"📊 Alert thresholds set")
    print("-" * 50)
    print("Starting bot... (Press Ctrl+C to stop)")
    
    # Create application
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Initialize bot
    bot = CustomerBot()
    
    # Command handlers
    app.add_handler(CommandHandler("dashboard", admin_dashboard))
    app.add_handler(CommandHandler("register", customer_register))
    app.add_handler(CommandHandler("balance", customer_balance))
    
    # Message handler
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND, 
        bot.process_message
    ))
    
    # Callback handler
    app.add_handler(CallbackQueryHandler(handle_callback))
    
    # Start polling
    app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()