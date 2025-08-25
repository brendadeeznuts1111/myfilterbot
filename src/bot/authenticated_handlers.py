"""
Enhanced Bot Handlers with Session Persistence and Dashboard Integration
"""

from typing import Dict, List, Optional, Any, Tuple, Set, Union
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram.constants import ParseMode
from datetime import datetime
import logging

from services.session_manager import session_manager, fraud_detector, player_history
from database import db

logger = logging.getLogger(__name__)

class AuthenticatedHandlers:
    """Handles authenticated sessions and dashboard integration"""
    
    async def login_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Enhanced login with persistent session
        Usage: /login <customer_id> <password> [remember]
        """
        try:
            user = update.effective_user
            args = context.args
            
            if len(args) < 2:
                await update.message.reply_text(
                    "🔐 **Login to Dashboard**\n\n"
                    "Usage: `/login <customer_id> <password> [remember]`\n"
                    "Example: `/login BB1042 N9H9 remember`\n\n"
                    "Add 'remember' to stay logged in for 30 days",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            customer_id = args[0].upper()
            password = args[1].upper()
            remember_me = len(args) > 2 and args[2].lower() == 'remember'
            
            # Validate credentials
            customer = db.get_customer(customer_id)
            if not customer or customer.password != password:
                await update.message.reply_text(
                    "❌ Invalid credentials. Please check and try again.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Check for fraud patterns
            fraud_check = fraud_detector.check_login_pattern(
                user.id, 
                update.message.from_user.ip_address if hasattr(update.message.from_user, 'ip_address') else None
            )
            
            if fraud_check['require_verification']:
                await update.message.reply_text(
                    f"⚠️ **Security Alert**\n\n"
                    f"Risk Level: {fraud_check['risk_level']}\n"
                    f"Alerts: {', '.join(fraud_check['alerts'])}\n\n"
                    f"Please contact admin for verification.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Create persistent session
            session_result = session_manager.create_session(
                telegram_id=user.id,
                customer_id=customer_id,
                username=f"@{user.username}" if user.username else str(user.id),
                remember_me=remember_me
            )
            
            if session_result['success']:
                # Register customer if not already
                if not customer.telegram_id:
                    db.register_customer(customer_id, user.id, f"@{user.username}")
                
                # Create dashboard access button
                keyboard = [[
                    InlineKeyboardButton(
                        "🌐 Open Dashboard", 
                        url=session_result['dashboard_url']
                    )
                ]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                # Send success message with dashboard link
                await update.message.reply_text(
                    f"✅ **Login Successful!**\n\n"
                    f"**Customer:** {customer_id}\n"
                    f"**Balance:** ${customer.balance:,.2f}\n"
                    f"**Session:** {'30 days' if remember_me else '24 hours'}\n\n"
                    f"🔗 **Dashboard Access:**\n"
                    f"`{session_result['dashboard_url']}`\n\n"
                    f"Click the button below to open your dashboard:",
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=reply_markup
                )
                
                # Store session token in context for future use
                context.user_data['session_token'] = session_result['session_token']
                context.user_data['dashboard_token'] = session_result['dashboard_token']
                
            else:
                await update.message.reply_text(
                    "❌ Failed to create session. Please try again.",
                    parse_mode=ParseMode.MARKDOWN
                )
                
        except Exception as e:
            logger.error(f"Error in login command: {e}")
            await update.message.reply_text(
                "❌ An error occurred during login.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def dashboard_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Quick access to dashboard for logged-in users
        """
        try:
            user_id = update.effective_user.id
            
            # Check for existing session
            session = session_manager.get_session(telegram_id=user_id)
            
            if not session:
                # Not logged in
                keyboard = [[
                    InlineKeyboardButton("🔐 Login", callback_data="prompt_login")
                ]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    "❌ **Not Logged In**\n\n"
                    "You need to login first to access the dashboard.\n"
                    "Use: `/login <customer_id> <password>`",
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=reply_markup
                )
                return
            
            # Update activity
            session_manager.update_activity(session.session_id)
            
            # Generate fresh dashboard token
            dashboard_token = session_manager._generate_dashboard_token(session)
            dashboard_url = session_manager._generate_dashboard_url(dashboard_token)
            
            # Get player history
            history = player_history.get_player_history(session.customer_id, days=7)
            
            keyboard = [[
                InlineKeyboardButton("🌐 Open Dashboard", url=dashboard_url)
            ], [
                InlineKeyboardButton("📊 Full History", callback_data="show_history"),
                InlineKeyboardButton("🔄 Refresh", callback_data="refresh_dashboard")
            ]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                f"📊 **Dashboard Access**\n"
                f"━━━━━━━━━━━━━━━━━\n\n"
                f"**Customer:** {session.customer_id}\n"
                f"**Balance:** ${history.get('current_balance', 0):,.2f}\n"
                f"**Weekly P&L:** ${history.get('weekly_pnl', 0):+,.2f}\n"
                f"**Transactions (7d):** {history.get('transaction_count', 0)}\n\n"
                f"**Quick Stats:**\n"
                f"• Deposits: ${history.get('total_deposits', 0):,.2f}\n"
                f"• Withdrawals: ${history.get('total_withdrawals', 0):,.2f}\n"
                f"• Net Flow: ${history.get('net_flow', 0):+,.2f}\n\n"
                f"Click below to open your dashboard:",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in dashboard command: {e}")
            await update.message.reply_text(
                "❌ Error accessing dashboard.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def history_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Get detailed player history
        Usage: /history [days]
        """
        try:
            user_id = update.effective_user.id
            
            # Check session
            session = session_manager.get_session(telegram_id=user_id)
            if not session:
                await update.message.reply_text(
                    "❌ Please login first: `/login <customer_id> <password>`",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Get days parameter
            days = 30  # Default
            if context.args and context.args[0].isdigit():
                days = min(int(context.args[0]), 365)  # Max 1 year
            
            # Get history
            history = player_history.get_player_history(session.customer_id, days)
            
            if 'error' in history:
                await update.message.reply_text(
                    f"❌ Error getting history: {history['error']}",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Format transaction list
            tx_list = ""
            for tx in history['transactions'][-10:]:  # Last 10
                emoji = "💰" if tx['type'] == 'deposit' else "💸"
                amount = tx.get('amount', 0)
                date = datetime.fromisoformat(tx['timestamp']).strftime('%m/%d %I:%M%p')
                tx_list += f"{emoji} {date}: ${amount:,.2f}\n"
            
            if not tx_list:
                tx_list = "No recent transactions"
            
            # Check fraud patterns
            fraud_analysis = ""
            if history['transaction_count'] > 0:
                # Analyze recent activity
                recent_deposits = sum(1 for tx in history['transactions'] 
                                    if tx['type'] == 'deposit')
                recent_withdrawals = sum(1 for tx in history['transactions'] 
                                       if tx['type'] == 'withdrawal')
                
                if recent_withdrawals > recent_deposits * 2:
                    fraud_analysis = "\n⚠️ **Alert:** High withdrawal activity detected"
            
            await update.message.reply_text(
                f"📜 **Player History ({days} days)**\n"
                f"━━━━━━━━━━━━━━━━━\n\n"
                f"**Customer:** {session.customer_id}\n"
                f"**Status:** {history['status'].upper()}\n"
                f"**Registered:** {history.get('registration_date', 'N/A')[:10]}\n"
                f"**Last Active:** {history.get('last_activity', 'N/A')[:10]}\n\n"
                f"**📊 Statistics:**\n"
                f"• Current Balance: ${history['current_balance']:,.2f}\n"
                f"• Weekly P&L: ${history['weekly_pnl']:+,.2f}\n"
                f"• Total Deposits: ${history['total_deposits']:,.2f}\n"
                f"• Total Withdrawals: ${history['total_withdrawals']:,.2f}\n"
                f"• Net Flow: ${history['net_flow']:+,.2f}\n"
                f"• Transactions: {history['transaction_count']}\n\n"
                f"**📜 Recent Transactions:**\n"
                f"```\n{tx_list}```"
                f"{fraud_analysis}",
                parse_mode=ParseMode.MARKDOWN
            )
            
        except Exception as e:
            logger.error(f"Error in history command: {e}")
            await update.message.reply_text(
                "❌ Error retrieving history.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def logout_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Logout and destroy session"""
        try:
            user_id = update.effective_user.id
            
            # Destroy session
            if session_manager.destroy_session(telegram_id=user_id):
                # Clear context data
                context.user_data.clear()
                
                await update.message.reply_text(
                    "✅ **Logged Out Successfully**\n\n"
                    "Your session has been terminated.\n"
                    "Dashboard access has been revoked.\n\n"
                    "Use `/login` to sign in again.",
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await update.message.reply_text(
                    "ℹ️ You are not currently logged in.",
                    parse_mode=ParseMode.MARKDOWN
                )
                
        except Exception as e:
            logger.error(f"Error in logout command: {e}")
            await update.message.reply_text(
                "❌ Error during logout.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def fraud_check_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Check fraud risk for a customer (Admin only)
        Usage: /fraud <customer_id>
        """
        try:
            # This would normally check if user is admin
            # For now, we'll proceed
            
            if not context.args:
                await update.message.reply_text(
                    "Usage: `/fraud <customer_id>`",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            customer_id = context.args[0].upper()
            
            # Get player history
            history = player_history.get_player_history(customer_id, days=30)
            
            if 'error' in history:
                await update.message.reply_text(
                    f"❌ Customer not found: {customer_id}",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Analyze patterns
            risk_indicators = []
            risk_score = 0
            
            # Check for rapid withdrawals
            recent_txs = history['transactions'][-20:]
            withdrawal_count = sum(1 for tx in recent_txs if tx['type'] == 'withdrawal')
            if withdrawal_count > 10:
                risk_indicators.append("High withdrawal frequency")
                risk_score += 30
            
            # Check for declining balance
            if history['current_balance'] < 100 and history['weekly_pnl'] < 0:
                risk_indicators.append("Declining balance with losses")
                risk_score += 20
            
            # Check for unusual transaction amounts
            if history['transactions']:
                amounts = [tx.get('amount', 0) for tx in history['transactions'] if tx.get('amount')]
                if amounts:
                    avg_amount = sum(amounts) / len(amounts)
                    large_txs = [a for a in amounts if a > avg_amount * 3]
                    if large_txs:
                        risk_indicators.append(f"Unusual transaction sizes ({len(large_txs)} large)")
                        risk_score += 25
            
            # Determine risk level
            if risk_score < 20:
                risk_level = "✅ LOW"
                risk_color = "🟢"
            elif risk_score < 50:
                risk_level = "⚠️ MEDIUM"
                risk_color = "🟡"
            else:
                risk_level = "🚨 HIGH"
                risk_color = "🔴"
            
            # Format indicators
            indicators_text = "\n".join(f"• {ind}" for ind in risk_indicators) if risk_indicators else "• No unusual patterns detected"
            
            await update.message.reply_text(
                f"🔍 **Fraud Risk Analysis**\n"
                f"━━━━━━━━━━━━━━━━━\n\n"
                f"**Customer:** {customer_id}\n"
                f"**Risk Score:** {risk_score}/100\n"
                f"**Risk Level:** {risk_level} {risk_color}\n\n"
                f"**📊 Account Overview:**\n"
                f"• Balance: ${history['current_balance']:,.2f}\n"
                f"• Weekly P&L: ${history['weekly_pnl']:+,.2f}\n"
                f"• 30d Deposits: ${history['total_deposits']:,.2f}\n"
                f"• 30d Withdrawals: ${history['total_withdrawals']:,.2f}\n"
                f"• Transaction Count: {history['transaction_count']}\n\n"
                f"**⚠️ Risk Indicators:**\n"
                f"{indicators_text}\n\n"
                f"**Recommendations:**\n"
                f"{'• Monitor account closely' if risk_score > 30 else '• Standard monitoring'}\n"
                f"{'• Consider withdrawal limits' if risk_score > 50 else ''}",
                parse_mode=ParseMode.MARKDOWN
            )
            
        except Exception as e:
            logger.error(f"Error in fraud check: {e}")
            await update.message.reply_text(
                "❌ Error performing fraud check.",
                parse_mode=ParseMode.MARKDOWN
            )


# Create global instance
authenticated_handlers = AuthenticatedHandlers()