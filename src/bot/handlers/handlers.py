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
import asyncio

from config import config, messages, patterns, keywords
from database import db, Customer, Transaction
from utils.utils import detect_transaction, format_currency, calculate_percentage
from services.error_handler import error_handler_decorator, ErrorCategory, ErrorSeverity
from services.portal_integration import notify_customer_activity, notify_balance_change, process_group_message, is_portal_enabled
from services.chat_manager import chat_manager
from services.shortlink_service import shortlink_service

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from SECURITY_FIX_duplicate_passwords import SecureRegistrationSystem

logger = logging.getLogger(__name__)

class BotHandlers:
    """Main bot handlers class"""
    
    def __init__(self):
        self.pending_registrations = {}
        self.secure_registration = SecureRegistrationSystem()
    
    # Command Handlers
    @error_handler_decorator(ErrorCategory.TELEGRAM, ErrorSeverity.LOW)
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
    
    @error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
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
    
    @error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
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
    
    @error_handler_decorator(ErrorCategory.VALIDATION, ErrorSeverity.HIGH)
    async def register_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /register command with enhanced security"""
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
            user = update.effective_user
            telegram_username = f"@{user.username}" if user.username else None
            
            # Use secure registration system
            result = self.secure_registration.secure_register_customer(
                customer_id, password, user.id, telegram_username
            )
            
            if result.get('success'):
                # Successful registration
                await update.message.reply_text(
                    f"✅ **Registration Successful**\n\n"
                    f"**Customer ID:** {result['customer_id']}\n"
                    f"**Balance:** ${result['balance']:,.2f}\n"
                    f"**Weekly P&L:** ${result['weekly_pnl']:+,.2f}\n"
                    f"**Status:** {result['security_status']}\n\n"
                    "You can now receive transaction alerts and use bot commands!",
                    parse_mode=ParseMode.MARKDOWN
                )
                
                # Notify admin of successful registration
                await self._notify_admin_registration(result, user, context)
                
            elif result.get('verification_required'):
                # Duplicate password security risk - require admin verification
                await self._handle_duplicate_password_registration(result, update, context)
                
            else:
                # Registration failed
                error_msg = result.get('message', 'Registration failed')
                error_type = result.get('error', 'UNKNOWN')
                
                if error_type == 'CUSTOMER_NOT_FOUND':
                    await update.message.reply_text(
                        "❌ **Customer ID not found**\n\n"
                        "Please check your customer ID and try again.\n"
                        "Contact admin if you need assistance.",
                        parse_mode=ParseMode.MARKDOWN
                    )
                elif error_type == 'INVALID_PASSWORD':
                    await update.message.reply_text(
                        "❌ **Invalid password**\n\n"
                        "The password provided doesn't match our records.\n"
                        "Please verify your credentials and try again.",
                        parse_mode=ParseMode.MARKDOWN
                    )
                elif error_type == 'ALREADY_REGISTERED':
                    registered_to = result.get('registered_to', 'Unknown')
                    await update.message.reply_text(
                        f"⚠️ **Already Registered**\n\n"
                        f"Customer {customer_id} is already registered to: {registered_to}\n\n"
                        "If this is incorrect, please contact admin.",
                        parse_mode=ParseMode.MARKDOWN
                    )
                elif error_type == 'TELEGRAM_ID_IN_USE':
                    registered_customer = result.get('registered_customer', 'Unknown')
                    await update.message.reply_text(
                        f"⚠️ **Account Already Linked**\n\n"
                        f"Your Telegram account is already registered to customer: {registered_customer}\n\n"
                        "Each Telegram account can only be linked to one customer.",
                        parse_mode=ParseMode.MARKDOWN
                    )
                else:
                    await update.message.reply_text(
                        f"❌ **Registration Failed**\n\n"
                        f"{error_msg}\n\n"
                        "Please try again or contact admin for assistance.",
                        parse_mode=ParseMode.MARKDOWN
                    )
                
        except Exception as e:
            logger.error(f"Error in secure register command: {e}")
            await update.message.reply_text(
                "❌ **System Error**\n\n"
                "A system error occurred during registration.\n"
                "Please try again later or contact admin.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    @error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.MEDIUM)
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
    
    @error_handler_decorator(ErrorCategory.VALIDATION, ErrorSeverity.HIGH)
    async def verify_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /verify command for admin verification of duplicate password registrations"""
        try:
            # Check if user is admin
            if str(update.message.chat_id) != config.admin_chat_id:
                return
            
            if len(context.args) != 2:
                await update.message.reply_text(
                    "🔧 **Admin Verification Command**\n\n"
                    "Usage: `/verify <token> <approve|deny>`\n"
                    "Example: `/verify abc123def456 approve`",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            verification_token = context.args[0]
            action = context.args[1].lower()
            
            if action not in ['approve', 'deny']:
                await update.message.reply_text(
                    "❌ Invalid action. Use 'approve' or 'deny'",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Process verification
            admin_confirmation = (action == 'approve')
            result = self.secure_registration.admin_verify_duplicate_password_registration(
                verification_token, admin_confirmation
            )
            
            if result.get('success'):
                await update.message.reply_text(
                    f"✅ **Registration Approved**\n\n"
                    f"**Customer:** {result['customer_id']}\n"
                    f"**Balance:** ${result['balance']:,.2f}\n"
                    f"**Status:** {result['security_status']}\n\n"
                    "User has been notified of successful registration.",
                    parse_mode=ParseMode.MARKDOWN
                )
            elif result.get('error') == 'ADMIN_DENIED':
                await update.message.reply_text(
                    f"❌ **Registration Denied**\n\n"
                    "The registration request has been denied.\n"
                    "User has been notified.",
                    parse_mode=ParseMode.MARKDOWN
                )
            elif result.get('error') == 'INVALID_TOKEN':
                await update.message.reply_text(
                    "❌ **Invalid or Expired Token**\n\n"
                    "The verification token is not found or has expired.",
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await update.message.reply_text(
                    f"❌ **Verification Failed**\n\n"
                    f"{result.get('message', 'Unknown error occurred')}",
                    parse_mode=ParseMode.MARKDOWN
                )
            
        except Exception as e:
            logger.error(f"Error in verify command: {e}")
            await self._send_error(update)
    
    # Chat Member Handler
    @error_handler_decorator(ErrorCategory.TELEGRAM, ErrorSeverity.MEDIUM)
    async def handle_my_chat_member(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle bot being added/removed from chats"""
        try:
            await chat_manager.handle_my_chat_member(update)
            
            # Get chat info for notifications
            chat_member = update.my_chat_member
            chat = chat_member.chat
            new_status = chat_member.new_chat_member.status
            old_status = chat_member.old_chat_member.status if chat_member.old_chat_member else None
            
            # Notify admin about chat changes
            if old_status not in ['member', 'administrator'] and new_status in ['member', 'administrator']:
                # Bot was added
                notification = f"""
🎉 **Bot Added to New Chat**
━━━━━━━━━━━━━━━━━━━━━━━
**Type:** {chat.type}
**Title:** {chat.title or 'Private Chat'}
**ID:** `{chat.id}`
**Username:** @{chat.username if chat.username else 'N/A'}
**Status:** {new_status}
**Time:** {datetime.now().strftime('%I:%M %p')}

Total Chats: {len(await chat_manager.get_all_chats())}
"""
                await context.bot.send_message(
                    chat_id=config.admin_chat_id,
                    text=notification,
                    parse_mode=ParseMode.MARKDOWN
                )
                
            elif old_status in ['member', 'administrator'] and new_status in ['left', 'kicked']:
                # Bot was removed
                notification = f"""
⚠️ **Bot Removed from Chat**
━━━━━━━━━━━━━━━━━━━━━━━
**Title:** {chat.title or 'Private Chat'}
**ID:** `{chat.id}`
**Reason:** {new_status}
**Time:** {datetime.now().strftime('%I:%M %p')}

Remaining Chats: {len(await chat_manager.get_all_chats())}
"""
                await context.bot.send_message(
                    chat_id=config.admin_chat_id,
                    text=notification,
                    parse_mode=ParseMode.MARKDOWN
                )
                
        except Exception as e:
            logger.error(f"Error handling my_chat_member: {e}")
    
    # Message Handler
    @error_handler_decorator(ErrorCategory.TRANSACTION, ErrorSeverity.HIGH)
    async def process_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Process incoming messages for customer activity"""
        try:
            message = update.message
            if not message or not message.text:
                return
            
            text = message.text
            from_user = message.from_user
            username = f"@{from_user.username}" if from_user.username else f"User_{from_user.id}"
            chat_id = str(message.chat_id)
            
            # Track chat activity
            await chat_manager.update_chat_activity(chat_id, {
                'messages_received': 1
            })
            
            # Check if it's a command
            if text.startswith('/'):
                await chat_manager.update_chat_activity(chat_id, {
                    'commands_processed': 1
                })
            
            # Detect transaction
            tx_info = detect_transaction(text)
            if tx_info and tx_info.get('type'):
                await chat_manager.update_chat_activity(chat_id, {
                    'transactions_detected': 1
                })
            
            # Check for customer mentions
            matched_customers = self._find_customer_mentions(text)
            for customer_id in matched_customers:
                await chat_manager.update_chat_activity(chat_id, {
                    'customer_mentioned': customer_id
                })
            
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
    @error_handler_decorator(ErrorCategory.TELEGRAM, ErrorSeverity.MEDIUM)
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
            
            # Verification callbacks
            elif data.startswith("verify_"):
                await self._handle_verification_callback(query, data)
                
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
    
    async def _handle_verification_callback(self, query, data):
        """Handle verification button callbacks"""
        try:
            # Parse callback data: verify_approve_TOKEN or verify_deny_TOKEN
            parts = data.split('_', 2)
            if len(parts) != 3:
                await query.edit_message_text("❌ Invalid verification data")
                return
            
            action = parts[1]  # approve or deny
            verification_token = parts[2]
            
            # Process verification
            admin_confirmation = (action == 'approve')
            result = self.secure_registration.admin_verify_duplicate_password_registration(
                verification_token, admin_confirmation
            )
            
            if result.get('success'):
                await query.edit_message_text(
                    f"✅ **Registration Approved**\n\n"
                    f"**Customer:** {result['customer_id']}\n"
                    f"**Balance:** ${result['balance']:,.2f}\n"
                    f"**Status:** {result['security_status']}\n\n"
                    f"✅ User has been notified of successful registration.",
                    parse_mode=ParseMode.MARKDOWN
                )
            elif result.get('error') == 'ADMIN_DENIED':
                await query.edit_message_text(
                    f"❌ **Registration Denied**\n\n"
                    f"The registration request has been denied by admin.\n\n"
                    f"❌ User has been notified.",
                    parse_mode=ParseMode.MARKDOWN
                )
            elif result.get('error') == 'INVALID_TOKEN':
                await query.edit_message_text(
                    f"❌ **Token Expired**\n\n"
                    f"This verification token is no longer valid.",
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await query.edit_message_text(
                    f"❌ **Verification Failed**\n\n"
                    f"{result.get('message', 'Unknown error occurred')}",
                    parse_mode=ParseMode.MARKDOWN
                )
                
        except Exception as e:
            logger.error(f"Error in verification callback: {e}")
            await query.edit_message_text(
                "❌ **System Error**\n\nFailed to process verification request.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def _handle_duplicate_password_registration(self, result, update, context):
        """Handle duplicate password registration requiring admin verification"""
        try:
            duplicate_customers = result.get('duplicate_customers', [])
            verification_token = result.get('verification_token')
            
            # Notify user about security verification
            await update.message.reply_text(
                f"🔐 **Security Verification Required**\n\n"
                f"⚠️ Multiple customers share the same password.\n"
                f"For security purposes, admin verification is required.\n\n"
                f"**Customers with this password:** {', '.join(duplicate_customers)}\n\n"
                f"**Next Steps:**\n"
                f"1. Admin has been notified\n"
                f"2. Please wait for verification\n"
                f"3. You'll be notified once approved\n\n"
                f"**Verification ID:** `{verification_token}`",
                parse_mode=ParseMode.MARKDOWN
            )
            
            # Send detailed alert to admin
            await self._notify_admin_duplicate_password_risk(result, update, context)
            
        except Exception as e:
            logger.error(f"Error handling duplicate password registration: {e}")
    
    async def _notify_admin_registration(self, result, user, context):
        """Notify admin of successful registration"""
        try:
            admin_text = f"✅ **New Registration**\n\n"
            admin_text += f"**Customer:** {result['customer_id']}\n"
            admin_text += f"**Telegram:** @{user.username} ({user.id})\n"
            admin_text += f"**Balance:** ${result['balance']:,.2f}\n"
            admin_text += f"**Security Status:** {result['security_status']}\n"
            admin_text += f"**Time:** {datetime.now().strftime('%I:%M %p')}"
            
            await context.bot.send_message(
                chat_id=config.admin_chat_id,
                text=admin_text,
                parse_mode=ParseMode.MARKDOWN
            )
        except Exception as e:
            logger.error(f"Error notifying admin of registration: {e}")
    
    async def _notify_admin_duplicate_password_risk(self, result, update, context):
        """Notify admin of duplicate password security risk"""
        try:
            user = update.effective_user
            duplicate_customers = result.get('duplicate_customers', [])
            verification_token = result.get('verification_token')
            
            admin_text = f"🚨 **SECURITY ALERT: Duplicate Password Registration**\n\n"
            admin_text += f"**User:** @{user.username} ({user.id})\n"
            admin_text += f"**Attempting Customer:** {update.message.text.split()[1] if len(update.message.text.split()) > 1 else 'Unknown'}\n"
            admin_text += f"**Password shared with:** {', '.join(duplicate_customers)}\n"
            admin_text += f"**Verification Token:** `{verification_token}`\n\n"
            admin_text += f"**Action Required:**\n"
            admin_text += f"1. Verify user identity\n"
            admin_text += f"2. Confirm they own the correct account\n"
            admin_text += f"3. Use `/verify {verification_token} approve` to approve\n"
            admin_text += f"4. Use `/verify {verification_token} deny` to deny\n\n"
            admin_text += f"⚠️ **Security Risk:** Multiple customers sharing passwords compromises account security!"
            
            keyboard = [[
                InlineKeyboardButton(f"✅ Approve", callback_data=f"verify_approve_{verification_token}"),
                InlineKeyboardButton(f"❌ Deny", callback_data=f"verify_deny_{verification_token}")
            ]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await context.bot.send_message(
                chat_id=config.admin_chat_id,
                text=admin_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        except Exception as e:
            logger.error(f"Error notifying admin of duplicate password risk: {e}")

# Create global handler instance
handlers = BotHandlers()