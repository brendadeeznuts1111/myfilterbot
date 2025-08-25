"""
Enhanced Bot Handlers with Chat Tracking and Multi-Group Support
Automatically discovers and tracks all chats the bot is in
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ChatMember
from telegram.ext import ContextTypes
from telegram.constants import ParseMode, ChatType
from datetime import datetime
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .chat_tracker import ChatInfo

from .chat_tracker import chat_tracker
from .session_manager import session_manager
from .database import db

logger = logging.getLogger(__name__)

class EnhancedChatHandlers:
    """Handles chat tracking and multi-group management"""
    
    async def on_chat_join(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Called when bot is added to a new chat/group
        Automatically registers the chat and creates shortlink
        """
        try:
            chat = update.effective_chat
            if not chat:
                return
            
            # Get chat member info to check if bot is admin
            bot_member = await chat.get_member(context.bot.id)
            is_admin = bot_member.status in [ChatMember.ADMINISTRATOR, ChatMember.OWNER]
            
            # Get member count for groups
            member_count = None
            if chat.type in [ChatType.GROUP, ChatType.SUPERGROUP]:
                member_count = await chat.get_member_count()
            
            # Register the chat
            chat_info = chat_tracker.register_chat(
                chat_id=chat.id,
                chat_type=chat.type,
                title=chat.title,
                username=chat.username,
                member_count=member_count,
                is_admin=is_admin
            )
            
            if chat_info:
                # Send welcome message with shortlink
                shortlink_url = f"https://t.me/fantdev_bot/{chat_info.shortlink}"
                
                keyboard = [[
                    InlineKeyboardButton("📊 Dashboard", callback_data="chat_dashboard"),
                    InlineKeyboardButton("⚙️ Settings", callback_data="chat_settings")
                ]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                welcome_msg = f"""
🎉 **Fantdev Bot Activated!**

I'm now tracking this chat and all activities.

**Chat Info:**
• Type: {chat.type}
• ID: `{chat.id}`
• Shortlink: {shortlink_url}
{'• Members: ' + str(member_count) if member_count else ''}
{'🛡️ Bot has admin privileges' if is_admin else ''}

**Available Commands:**
/help - Show all commands
/stats - Chat statistics
/link - Get chat shortlink
/register - Register customer account

I'll automatically track:
• All messages and transactions
• Member activity
• Customer mentions
• Important keywords
"""
                
                await context.bot.send_message(
                    chat_id=chat.id,
                    text=welcome_msg,
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=reply_markup
                )
                
                # Notify all admin chats about new chat
                await self._notify_admins_new_chat(chat_info, context)
                
        except Exception as e:
            logger.error(f"Error handling chat join: {e}")
    
    async def on_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Process all messages to track chat activity
        This runs for EVERY message in EVERY chat
        """
        try:
            message = update.message
            if not message:
                return
            
            chat = message.chat
            user = message.from_user
            
            # Register chat if not already registered
            chat_info = chat_tracker.get_chat(chat.id)
            if not chat_info:
                # Auto-discover and register new chat
                chat_info = chat_tracker.register_chat(
                    chat_id=chat.id,
                    chat_type=chat.type,
                    title=chat.title,
                    username=chat.username
                )
                
                if chat_info:
                    logger.info(f"Auto-discovered new chat: {chat.id} ({chat.type})")
            
            # Log the message for activity tracking
            chat_tracker.log_message(
                chat_id=chat.id,
                message_id=message.message_id,
                user_id=user.id if user else 0,
                username=user.username if user else None,
                message_text=message.text,
                message_type='text' if message.text else 'other'
            )
            
            # Update chat activity
            chat_tracker.update_chat_activity(chat.id)
            
        except Exception as e:
            logger.error(f"Error processing message for chat tracking: {e}")
    
    async def stats_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Show statistics for current chat or all chats (admin)
        """
        try:
            chat = update.effective_chat
            user = update.effective_user
            
            # Get current chat info
            chat_info = chat_tracker.get_chat(chat.id)
            if not chat_info:
                # Register if not exists
                chat_info = chat_tracker.register_chat(
                    chat_id=chat.id,
                    chat_type=chat.type,
                    title=chat.title,
                    username=chat.username
                )
            
            # Check if user is admin (simplified check)
            # In production, you'd check against your admin list
            is_bot_admin = user.id in [123456789]  # Replace with actual admin IDs
            
            if is_bot_admin and chat.type == ChatType.PRIVATE:
                # Show global statistics for admin in private chat
                stats = chat_tracker.get_chat_statistics()
                admin_chats = chat_tracker.get_admin_chats()
                
                stats_text = f"""
📊 **Global Bot Statistics**
{'=' * 30}

**📈 Overview:**
• Total Chats: {stats['total_chats']}
• Active Chats: {stats['active_chats']}
• Admin Privileges: {stats['admin_chats']} chats
• 24h Activity: {stats['recent_activity_24h']} chats

**📱 Chat Distribution:**
"""
                for chat_type, count in stats['chats_by_type'].items():
                    stats_text += f"• {chat_type.title()}: {count}\n"
                
                stats_text += f"""

**💬 7-Day Activity:**
• Messages: {stats['message_stats_7d']['total_messages']}
• Active Chats: {stats['message_stats_7d']['active_chats']}
• Unique Users: {stats['message_stats_7d']['unique_users']}

**🛡️ Admin Chats:**
"""
                for i, admin_chat in enumerate(admin_chats[:5], 1):
                    stats_text += f"{i}. {admin_chat.title or 'Unnamed'} ({admin_chat.chat_id})\n"
                
                # Add buttons for more options
                keyboard = [
                    [InlineKeyboardButton("📋 Full Report", callback_data="full_chat_report")],
                    [InlineKeyboardButton("📤 Export Data", callback_data="export_chats")]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
            else:
                # Show statistics for current chat
                shortlink_url = f"https://t.me/fantdev_bot/{chat_info.shortlink}"
                
                stats_text = f"""
📊 **Chat Statistics**
{'=' * 30}

**Chat Info:**
• Name: {chat_info.title or 'Private Chat'}
• Type: {chat_info.chat_type}
• Chat ID: `{chat_info.chat_id}`
• Shortlink: {shortlink_url}

**Activity:**
• First Seen: {chat_info.first_seen[:10]}
• Last Active: {chat_info.last_activity[:19]}
• Members: {chat_info.member_count or 'N/A'}
{'• 🛡️ Bot is Admin' if chat_info.is_admin else ''}

**Status:**
• Active: {'✅ Yes' if chat_info.is_active else '❌ No'}
• Tracking: ✅ Enabled
"""
                
                keyboard = [[
                    InlineKeyboardButton("🔗 Copy Link", callback_data=f"copy_link_{chat_info.shortlink}")
                ]]
                reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                stats_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in stats command: {e}")
            await update.message.reply_text(
                "❌ Error retrieving statistics.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def link_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Get shortlink for current chat"""
        try:
            chat = update.effective_chat
            
            # Get or create chat info
            chat_info = chat_tracker.get_chat(chat.id)
            if not chat_info:
                chat_info = chat_tracker.register_chat(
                    chat_id=chat.id,
                    chat_type=chat.type,
                    title=chat.title,
                    username=chat.username
                )
            
            if chat_info:
                shortlink_url = f"https://t.me/fantdev_bot/{chat_info.shortlink}"
                
                await update.message.reply_text(
                    f"🔗 **Chat Shortlink**\n\n"
                    f"Full URL: {shortlink_url}\n"
                    f"Short Code: `{chat_info.shortlink}`\n\n"
                    f"Use this link to quickly access this chat's dashboard and analytics.",
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await update.message.reply_text(
                    "❌ Could not generate shortlink.",
                    parse_mode=ParseMode.MARKDOWN
                )
                
        except Exception as e:
            logger.error(f"Error in link command: {e}")
    
    async def chats_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        List all chats the bot is in (admin only)
        """
        try:
            user = update.effective_user
            
            # Simple admin check - replace with your admin validation
            is_admin = user.id in [123456789]  # Replace with actual admin IDs
            
            if not is_admin:
                await update.message.reply_text(
                    "❌ This command is for administrators only.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Get all active chats
            chats = chat_tracker.get_all_chats(active_only=True)
            
            if not chats:
                await update.message.reply_text(
                    "📭 No active chats found.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            # Format chat list
            chat_list = "📋 **Active Chats**\n"
            chat_list += "=" * 30 + "\n\n"
            
            for i, chat in enumerate(chats[:20], 1):  # Limit to 20 for message length
                chat_list += f"**{i}. {chat.title or 'Unnamed'}**\n"
                chat_list += f"   • Type: {chat.chat_type}\n"
                chat_list += f"   • ID: `{chat.chat_id}`\n"
                chat_list += f"   • Link: `{chat.shortlink}`\n"
                if chat.member_count:
                    chat_list += f"   • Members: {chat.member_count}\n"
                if chat.is_admin:
                    chat_list += f"   • 🛡️ Admin\n"
                chat_list += f"   • Active: {chat.last_activity[:10]}\n\n"
            
            if len(chats) > 20:
                chat_list += f"_... and {len(chats) - 20} more chats_\n"
            
            # Add action buttons
            keyboard = [
                [InlineKeyboardButton("📊 Full Report", callback_data="full_chat_report")],
                [InlineKeyboardButton("📤 Export", callback_data="export_chats"),
                 InlineKeyboardButton("🔄 Refresh", callback_data="refresh_chats")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                chat_list,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in chats command: {e}")
            await update.message.reply_text(
                "❌ Error retrieving chat list.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def broadcast_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Broadcast message to all active chats (admin only)
        Usage: /broadcast <message>
        """
        try:
            user = update.effective_user
            
            # Admin check
            is_admin = user.id in [123456789]  # Replace with actual admin IDs
            
            if not is_admin:
                await update.message.reply_text(
                    "❌ This command is for administrators only.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            if not context.args:
                await update.message.reply_text(
                    "Usage: `/broadcast <message>`\n"
                    "This will send the message to all active chats.",
                    parse_mode=ParseMode.MARKDOWN
                )
                return
            
            broadcast_message = ' '.join(context.args)
            
            # Get all active chats
            chats = chat_tracker.get_all_chats(active_only=True)
            
            # Confirmation prompt
            keyboard = [[
                InlineKeyboardButton("✅ Confirm", callback_data=f"confirm_broadcast"),
                InlineKeyboardButton("❌ Cancel", callback_data="cancel_broadcast")
            ]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Store broadcast message in context for later use
            context.user_data['pending_broadcast'] = {
                'message': broadcast_message,
                'chat_count': len(chats)
            }
            
            await update.message.reply_text(
                f"📢 **Broadcast Confirmation**\n\n"
                f"Message: _{broadcast_message}_\n\n"
                f"This will be sent to **{len(chats)} active chats**.\n\n"
                f"Are you sure you want to proceed?",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in broadcast command: {e}")
    
    async def handle_chat_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle callbacks related to chat management"""
        try:
            query = update.callback_query
            await query.answer()
            
            data = query.data
            
            if data == "full_chat_report":
                # Generate and send full report
                report = chat_tracker.generate_chat_report()
                
                # Split into multiple messages if too long
                if len(report) > 4000:
                    parts = [report[i:i+4000] for i in range(0, len(report), 4000)]
                    for part in parts:
                        await query.message.reply_text(
                            f"```\n{part}\n```",
                            parse_mode=ParseMode.MARKDOWN
                        )
                else:
                    await query.message.reply_text(
                        f"```\n{report}\n```",
                        parse_mode=ParseMode.MARKDOWN
                    )
            
            elif data == "export_chats":
                # Export chat data to JSON
                filepath = chat_tracker.export_to_json()
                await query.message.reply_document(
                    document=open(filepath, 'rb'),
                    caption="📤 Chat data exported to JSON"
                )
            
            elif data == "refresh_chats":
                # Refresh chat list
                await self.chats_command(update, context)
            
            elif data == "confirm_broadcast":
                # Execute broadcast
                if 'pending_broadcast' in context.user_data:
                    broadcast_data = context.user_data['pending_broadcast']
                    message = broadcast_data['message']
                    
                    chats = chat_tracker.get_all_chats(active_only=True)
                    success_count = 0
                    fail_count = 0
                    
                    await query.edit_message_text(
                        f"📢 Broadcasting to {len(chats)} chats...",
                        parse_mode=ParseMode.MARKDOWN
                    )
                    
                    for chat in chats:
                        try:
                            await context.bot.send_message(
                                chat_id=chat.chat_id,
                                text=f"📢 **Broadcast Message**\n\n{message}",
                                parse_mode=ParseMode.MARKDOWN
                            )
                            success_count += 1
                        except Exception as e:
                            logger.error(f"Failed to send to {chat.chat_id}: {e}")
                            fail_count += 1
                            # Mark chat as inactive if bot was removed
                            if "bot was blocked" in str(e).lower() or "chat not found" in str(e).lower():
                                chat_tracker.mark_chat_inactive(chat.chat_id)
                    
                    await query.message.reply_text(
                        f"✅ **Broadcast Complete**\n\n"
                        f"• Successful: {success_count}\n"
                        f"• Failed: {fail_count}",
                        parse_mode=ParseMode.MARKDOWN
                    )
                    
                    # Clear pending broadcast
                    del context.user_data['pending_broadcast']
            
            elif data == "cancel_broadcast":
                await query.edit_message_text(
                    "❌ Broadcast cancelled.",
                    parse_mode=ParseMode.MARKDOWN
                )
                if 'pending_broadcast' in context.user_data:
                    del context.user_data['pending_broadcast']
            
            elif data.startswith("copy_link_"):
                shortlink = data.replace("copy_link_", "")
                shortlink_url = f"https://t.me/fantdev_bot/{shortlink}"
                await query.answer(f"Link copied: {shortlink_url}", show_alert=True)
                
        except Exception as e:
            logger.error(f"Error handling chat callback: {e}")
            await query.edit_message_text(
                "❌ An error occurred.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def _notify_admins_new_chat(self, chat_info: "ChatInfo", context: ContextTypes.DEFAULT_TYPE):
        """Notify all admin chats about a new chat being added"""
        try:
            admin_chats = chat_tracker.get_admin_chats()
            
            notification = f"""
🆕 **New Chat Added**

• Name: {chat_info.title or 'Private Chat'}
• Type: {chat_info.chat_type}
• ID: `{chat_info.chat_id}`
• Shortlink: {chat_tracker.base_shortlink_url}/{chat_info.shortlink}
• Members: {chat_info.member_count or 'N/A'}
{'• 🛡️ Bot has admin privileges' if chat_info.is_admin else ''}

The bot is now tracking all activity in this chat.
"""
            
            for admin_chat in admin_chats:
                try:
                    await context.bot.send_message(
                        chat_id=admin_chat.chat_id,
                        text=notification,
                        parse_mode=ParseMode.MARKDOWN
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin chat {admin_chat.chat_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Error notifying admins: {e}")


# Create global instance
enhanced_chat_handlers = EnhancedChatHandlers()