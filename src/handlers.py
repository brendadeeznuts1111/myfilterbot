"""
Bot command and message handlers
"""
from typing import List, Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram.constants import ParseMode
from datetime import datetime
import logging
import re

from .config import config, messages, patterns, keywords
from .database import db, Customer, Transaction
from .utils import detect_transaction, format_currency, calculate_percentage

logger = logging.getLogger(__name__)

class BotHandlers:
    """Main bot handlers class"""
    
    def __init__(self):
        self.pending_registrations = {}
    
    # Command Handlers
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        try:
            keyboard = [
                [
                    InlineKeyboardButton("📝 Register", callback_data="menu_register"),
                    InlineKeyboardButton("💰 Balance", callback_data="menu_balance")
                ],
                [
                    InlineKeyboardButton("📊 Dashboard", callback_data="menu_dashboard"),
                    InlineKeyboardButton("❓ Help", callback_data="menu_help")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                messages.WELCOME,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        except Exception as e:
            logger.error(f"Error in start command: {e}")
            await self._send_error(update)
    
    async def account_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /account command - unified account management"""
        try:
            user_id = update.effective_user.id
            customer = db.find_customer_by_telegram(user_id)
            
            if not customer:
                await self._prompt_registration(update)
                return
            
            keyboard = [
                [
                    InlineKeyboardButton("💰 Balance", callback_data="account_balance"),
                    InlineKeyboardButton("📜 History", callback_data="account_history")
                ],
                [
                    InlineKeyboardButton("📊 Analytics", callback_data="account_analytics"),
                    InlineKeyboardButton("⚙️ Settings", callback_data="account_settings")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            account_text = f"""
💼 **Account Management**
━━━━━━━━━━━━━━━━━

**Customer:** {customer.customer_id}
**Status:** {'✅ Active' if customer.active else '❌ Inactive'}
**Balance:** {format_currency(customer.balance)}
**Weekly P&L:** {format_currency(customer.weekly_pnl, show_sign=True)}

Select an option below:
"""
            
            await update.message.reply_text(
                account_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        except Exception as e:
            logger.error(f"Error in account command: {e}")
            await self._send_error(update)
    
    async def balance_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /balance command - quick balance check"""
        try:
            user_id = update.effective_user.id
            customer = db.find_customer_by_telegram(user_id)
            
            if not customer:
                await update.message.reply_text(
                    messages.ERROR_NOT_REGISTERED,
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Get today's transactions
            transactions = db.get_customer_transactions(customer.customer_id)
            today = datetime.now().date()
            today_txs = [t for t in transactions 
                        if datetime.fromisoformat(t.timestamp).date() == today]
            
            today_change = sum(
                t.amount if t.type == 'deposit' else -t.amount 
                for t in today_txs if t.amount
            )
            
            pnl_percentage = calculate_percentage(customer.weekly_pnl, customer.balance)
            
            balance_text = messages.BALANCE_REPORT.format(
                customer_id=customer.customer_id,
                balance=customer.balance,
                weekly_pnl=customer.weekly_pnl,
                pnl_percentage=pnl_percentage,
                status='Active' if customer.active else 'Inactive',
                today_count=len(today_txs),
                today_change=today_change
            )
            
            await update.message.reply_text(
                balance_text,
                parse_mode=ParseMode.MARKDOWN
            )
        except Exception as e:
            logger.error(f"Error in balance command: {e}")
            await self._send_error(update)
    
    async def register_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /register command"""
        try:
            if len(context.args) != 2:
                keyboard = [[
                    InlineKeyboardButton("📖 Registration Help", callback_data="help_register")
                ]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    "📝 **Registration**\n\n"
                    "Usage: `/register <customer_id> <password>`\n"
                    "Example: `/register BB1042 N9H9`",
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=reply_markup
                )
                return
            
            customer_id = context.args[0].upper()
            password = context.args[1].upper()
            
            # Validate customer
            customer = db.get_customer(customer_id)
            if not customer:
                await update.message.reply_text(
                    "❌ Customer ID not found.\n"
                    "Please check your ID and try again.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            if customer.password != password:
                await update.message.reply_text(
                    "❌ Invalid password.\n"
                    "Please check your credentials.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Register
            user = update.effective_user
            success = db.register_customer(
                customer_id,
                user.id,
                f"@{user.username}" if user.username else None
            )
            
            if success:
                await update.message.reply_text(
                    messages.REGISTRATION_SUCCESS.format(
                        customer_id=customer_id,
                        balance=customer.balance,
                        weekly_pnl=customer.weekly_pnl
                    ),
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await self._send_error(update)
                
        except Exception as e:
            logger.error(f"Error in register command: {e}")
            await self._send_error(update)
    
    async def admin_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /admin command - admin dashboard"""
        try:
            # Check if user is admin (remove for testing)
            # if str(update.message.chat_id) != config.admin_chat_id:
            #     return
            
            stats = db.get_statistics()
            top_performers = db.get_top_performers(5)
            at_risk = db.get_low_balance_customers()[:5]
            
            dashboard = f"""
{messages.DASHBOARD_HEADER.format(
    timestamp=datetime.now().strftime('%B %d, %Y %I:%M %p')
)}

**📊 Overview**
• Customers: {stats['total_customers']} ({stats['active_customers']} active)
• Total Balance: {format_currency(stats['total_balance'])}
• Weekly P&L: {format_currency(stats['total_weekly_pnl'], show_sign=True)}
• Transactions: {stats['total_transactions']}
• Registered Users: {stats['registered_users']}

**🏆 Top Performers**
"""
            for i, customer in enumerate(top_performers, 1):
                dashboard += f"{i}. {customer.customer_id}: {format_currency(customer.weekly_pnl, show_sign=True)}\n"
            
            if at_risk:
                dashboard += "\n**⚠️ Low Balance Alerts**\n"
                for customer in at_risk:
                    dashboard += f"• {customer.customer_id}: {format_currency(customer.balance)}\n"
            
            keyboard = [
                [
                    InlineKeyboardButton("📊 Full Report", callback_data="admin_report"),
                    InlineKeyboardButton("👥 All Customers", callback_data="admin_customers")
                ],
                [
                    InlineKeyboardButton("📈 Analytics", callback_data="admin_analytics"),
                    InlineKeyboardButton("⚙️ Settings", callback_data="admin_settings")
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
            logger.error(f"Error in admin command: {e}")
            await self._send_error(update)
    
    # Message Handler
    async def process_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Process incoming messages for customer activity"""
        try:
            message = update.message
            if not message or not message.text:
                return
            
            text = message.text
            from_user = message.from_user
            username = f"@{from_user.username}" if from_user.username else f"User_{from_user.id}"
            
            # Detect transaction
            tx_info = detect_transaction(text)
            
            # Check for customer mentions
            matched_customers = self._find_customer_mentions(text)
            
            # Check for important keywords
            has_keywords = any(kw.lower() in text.lower() for kw in keywords.get_all())
            
            # Check if from important user
            is_important = keywords.is_important_user(username)
            
            # Process if relevant
            if matched_customers or has_keywords or is_important:
                await self._process_relevant_message(
                    message, matched_customers, tx_info, 
                    has_keywords, is_important, context
                )
        
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    # Callback Query Handler
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline button callbacks"""
        try:
            query = update.callback_query
            await query.answer()
            
            data = query.data
            
            # Menu callbacks
            if data.startswith("menu_"):
                await self._handle_menu_callback(query, data)
            
            # Account callbacks
            elif data.startswith("account_"):
                await self._handle_account_callback(query, data)
            
            # Admin callbacks
            elif data.startswith("admin_"):
                await self._handle_admin_callback(query, data)
            
            # Help callbacks
            elif data.startswith("help_"):
                await self._handle_help_callback(query, data)
                
        except Exception as e:
            logger.error(f"Error handling callback: {e}")
            await query.edit_message_text("❌ An error occurred. Please try again.")
    
    # Helper Methods
    def _find_customer_mentions(self, text: str) -> List[str]:
        """Find customer IDs mentioned in text"""
        text_lower = text.lower()
        matched = []
        
        for customer in db.get_all_customers():
            if (customer.customer_id.lower() in text_lower or 
                customer.password.lower() in text_lower):
                matched.append(customer.customer_id)
        
        return list(set(matched))  # Remove duplicates
    
    async def _process_relevant_message(self, message, customers, tx_info, 
                                       has_keywords, is_important, context):
        """Process message that matches criteria"""
        # Log transaction if applicable
        for customer_id in customers:
            transaction = Transaction(
                timestamp=datetime.now().isoformat(),
                customer_id=customer_id,
                type=tx_info['type'] or 'mention',
                amount=tx_info['amount'],
                message=message.text[:200],
                from_user=f"@{message.from_user.username}" if message.from_user.username else str(message.from_user.id),
                chat_id=message.chat_id
            )
            
            db.add_transaction(transaction)
            
            # Update balance if it's a financial transaction
            if tx_info['type'] and tx_info['amount']:
                db.update_balance(customer_id, tx_info['amount'], tx_info['type'])
        
        # Forward to admin
        await self._forward_to_admin(message, customers, tx_info, context)
    
    async def _forward_to_admin(self, message, customers, tx_info, context):
        """Forward relevant message to admin"""
        forward_text = "🔔 **Activity Detected**\n━━━━━━━━━━━━━━━\n\n"
        
        if customers:
            forward_text += "**Customers Mentioned:**\n"
            for cid in customers:
                customer = db.get_customer(cid)
                forward_text += f"• {cid} (Balance: {format_currency(customer.balance)})\n"
            forward_text += "\n"
        
        if tx_info['type']:
            emoji = patterns.get_emoji(tx_info['type'])
            forward_text += f"**Transaction:** {emoji} {tx_info['type'].title()}\n"
            if tx_info['amount']:
                forward_text += f"**Amount:** {format_currency(tx_info['amount'])}\n"
            forward_text += f"**Confidence:** {tx_info['confidence']:.0%}\n\n"
        
        forward_text += f"**Message:**\n{message.text}\n\n"
        forward_text += f"**From:** {message.from_user.username or 'Unknown'}\n"
        forward_text += f"**Time:** {datetime.now().strftime('%I:%M %p')}"
        
        keyboard = []
        if customers:
            keyboard.append([
                InlineKeyboardButton(
                    f"View {customers[0]}", 
                    callback_data=f"view_customer_{customers[0]}"
                )
            ])
        
        reply_markup = InlineKeyboardMarkup(keyboard) if keyboard else None
        
        await context.bot.send_message(
            chat_id=config.admin_chat_id,
            text=forward_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _send_error(self, update: Update):
        """Send generic error message"""
        await update.message.reply_text(
            "❌ An error occurred. Please try again later.\n"
            "If the problem persists, contact support.",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def _prompt_registration(self, update: Update):
        """Prompt user to register"""
        keyboard = [[
            InlineKeyboardButton("📝 How to Register", callback_data="help_register")
        ]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            messages.ERROR_NOT_REGISTERED,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def _handle_menu_callback(self, query, data):
        """Handle main menu callbacks"""
        if data == "menu_register":
            await query.edit_message_text(
                "📝 **Registration**\n\n"
                "To register, use:\n"
                "`/register <customer_id> <password>`\n\n"
                "Example: `/register BB1042 N9H9`",
                parse_mode=ParseMode.MARKDOWN
            )
        elif data == "menu_balance":
            # Simulate balance command
            user_id = query.from_user.id
            customer = db.find_customer_by_telegram(user_id)
            if customer:
                await query.edit_message_text(
                    f"💰 **Quick Balance**\n\n"
                    f"Balance: {format_currency(customer.balance)}\n"
                    f"Weekly P&L: {format_currency(customer.weekly_pnl, show_sign=True)}",
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await query.edit_message_text(messages.ERROR_NOT_REGISTERED, parse_mode=ParseMode.MARKDOWN)
    
    async def _handle_account_callback(self, query, data):
        """Handle account menu callbacks"""
        # Implementation for account callbacks
        pass
    
    async def _handle_admin_callback(self, query, data):
        """Handle admin menu callbacks"""
        if data == "admin_refresh":
            # Refresh dashboard
            stats = db.get_statistics()
            await query.edit_message_text(
                f"📊 **Dashboard Refreshed**\n\n"
                f"Total Balance: {format_currency(stats['total_balance'])}\n"
                f"Active Customers: {stats['active_customers']}",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def _handle_help_callback(self, query, data):
        """Handle help callbacks"""
        if data == "help_register":
            await query.edit_message_text(
                "📖 **Registration Guide**\n\n"
                "1. Get your customer ID and password from admin\n"
                "2. Use the command: `/register <id> <password>`\n"
                "3. You'll receive confirmation with your balance\n"
                "4. Start receiving alerts and updates!\n\n"
                "Need help? Contact @admin",
                parse_mode=ParseMode.MARKDOWN
            )

# Create global handler instance
handlers = BotHandlers()