"""
Telegram administration interface for dashboard integration
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict

from telegram import Bot, Chat, ChatMember, Message, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode, ChatAction, ChatMemberStatus
from telegram.error import TelegramError, BadRequest, Forbidden

from .message_streamer import TelegramMessageStreamer
from .group_monitor import TelegramGroupMonitor
from .bot_status import TelegramBotMonitor

@dataclass
class AdminAction:
    """Administrative action record"""
    action_id: str
    action_type: str
    target_type: str  # user, group, message
    target_id: str
    admin_user_id: int
    admin_username: str
    timestamp: str
    parameters: Dict[str, Any]
    status: str  # pending, success, failed
    result: Optional[str]

@dataclass
class BulkOperation:
    """Bulk operation for multiple targets"""
    operation_id: str
    operation_type: str
    targets: List[str]
    parameters: Dict[str, Any]
    progress: Dict[str, Any]
    started_at: str
    completed_at: Optional[str]
    status: str

class TelegramAdminInterface:
    """Comprehensive Telegram administration interface for dashboard"""
    
    def __init__(self, bot_token: str, admin_chat_id: str):
        self.bot_token = bot_token
        self.admin_chat_id = admin_chat_id
        self.bot = Bot(token=bot_token)
        self.logger = logging.getLogger(__name__)
        
        # Component integrations
        self.message_streamer: Optional[TelegramMessageStreamer] = None
        self.group_monitor: Optional[TelegramGroupMonitor] = None
        self.bot_monitor: Optional[TelegramBotMonitor] = None
        
        # Action tracking
        self.admin_actions: List[AdminAction] = []
        self.bulk_operations: Dict[str, BulkOperation] = {}
        
        # Statistics
        self.stats = {
            'total_actions': 0,
            'successful_actions': 0,
            'failed_actions': 0,
            'messages_sent': 0,
            'users_managed': 0,
            'groups_managed': 0,
            'bulk_operations': 0
        }
        
        # Permissions and restrictions
        self.admin_permissions = {
            'can_send_messages': True,
            'can_manage_users': True,
            'can_manage_groups': True,
            'can_delete_messages': True,
            'can_broadcast': True,
            'can_export_data': True
        }
    
    def integrate_components(self, message_streamer: TelegramMessageStreamer,
                           group_monitor: TelegramGroupMonitor,
                           bot_monitor: TelegramBotMonitor):
        """Integrate with other dashboard components"""
        self.message_streamer = message_streamer
        self.group_monitor = group_monitor
        self.bot_monitor = bot_monitor
        self.logger.info("Dashboard components integrated")
    
    # ===== MESSAGE MANAGEMENT =====
    
    async def send_message(self, chat_id: Union[int, str], text: str, 
                          parse_mode: str = ParseMode.HTML,
                          disable_preview: bool = False) -> Dict[str, Any]:
        """Send message to chat"""
        try:
            action = self._create_action("send_message", "message", str(chat_id), {
                'text': text[:100] + "..." if len(text) > 100 else text,
                'parse_mode': parse_mode,
                'disable_preview': disable_preview
            })
            
            message = await self.bot.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode=parse_mode,
                disable_web_page_preview=disable_preview
            )
            
            self._complete_action(action.action_id, "success", f"Message sent: {message.message_id}")
            self.stats['messages_sent'] += 1
            
            return {
                'success': True,
                'message_id': message.message_id,
                'chat_id': message.chat_id
            }
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error sending message: {e}")
            return {'success': False, 'error': str(e)}
    
    async def send_bulk_messages(self, targets: List[Union[int, str]], 
                               text: str, delay: float = 1.0) -> str:
        """Send message to multiple chats"""
        operation_id = f"bulk_msg_{int(datetime.now().timestamp())}"
        
        bulk_op = BulkOperation(
            operation_id=operation_id,
            operation_type="bulk_message",
            targets=[str(t) for t in targets],
            parameters={'text': text, 'delay': delay},
            progress={'sent': 0, 'failed': 0, 'total': len(targets)},
            started_at=datetime.now().isoformat(),
            completed_at=None,
            status="running"
        )
        
        self.bulk_operations[operation_id] = bulk_op
        
        # Start async task
        asyncio.create_task(self._execute_bulk_message(operation_id))
        
        return operation_id
    
    async def _execute_bulk_message(self, operation_id: str):
        """Execute bulk message operation"""
        try:
            operation = self.bulk_operations[operation_id]
            text = operation.parameters['text']
            delay = operation.parameters['delay']
            
            for target in operation.targets:
                try:
                    await self.send_message(target, text)
                    operation.progress['sent'] += 1
                    
                except Exception as e:
                    operation.progress['failed'] += 1
                    self.logger.error(f"Failed to send bulk message to {target}: {e}")
                
                # Delay between messages
                await asyncio.sleep(delay)
            
            operation.completed_at = datetime.now().isoformat()
            operation.status = "completed"
            self.stats['bulk_operations'] += 1
            
        except Exception as e:
            self.bulk_operations[operation_id].status = "failed"
            self.logger.error(f"Error in bulk message operation: {e}")
    
    async def delete_message(self, chat_id: Union[int, str], message_id: int) -> Dict[str, Any]:
        """Delete a message"""
        try:
            action = self._create_action("delete_message", "message", f"{chat_id}_{message_id}", {
                'chat_id': str(chat_id),
                'message_id': message_id
            })
            
            await self.bot.delete_message(chat_id=chat_id, message_id=message_id)
            
            self._complete_action(action.action_id, "success", "Message deleted")
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error deleting message: {e}")
            return {'success': False, 'error': str(e)}
    
    async def forward_message(self, from_chat_id: Union[int, str], 
                            to_chat_id: Union[int, str], message_id: int) -> Dict[str, Any]:
        """Forward a message"""
        try:
            action = self._create_action("forward_message", "message", f"{from_chat_id}_{message_id}", {
                'from_chat_id': str(from_chat_id),
                'to_chat_id': str(to_chat_id),
                'message_id': message_id
            })
            
            forwarded_message = await self.bot.forward_message(
                chat_id=to_chat_id,
                from_chat_id=from_chat_id,
                message_id=message_id
            )
            
            self._complete_action(action.action_id, "success", 
                                f"Message forwarded: {forwarded_message.message_id}")
            
            return {
                'success': True,
                'new_message_id': forwarded_message.message_id
            }
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error forwarding message: {e}")
            return {'success': False, 'error': str(e)}
    
    # ===== USER MANAGEMENT =====
    
    async def get_chat_member(self, chat_id: Union[int, str], user_id: int) -> Dict[str, Any]:
        """Get chat member information"""
        try:
            member = await self.bot.get_chat_member(chat_id=chat_id, user_id=user_id)
            
            return {
                'success': True,
                'user_id': member.user.id,
                'username': member.user.username,
                'first_name': member.user.first_name,
                'last_name': member.user.last_name,
                'status': member.status,
                'is_admin': member.status in [ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER],
                'can_delete_messages': getattr(member, 'can_delete_messages', False),
                'can_restrict_members': getattr(member, 'can_restrict_members', False)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting chat member: {e}")
            return {'success': False, 'error': str(e)}
    
    async def ban_user(self, chat_id: Union[int, str], user_id: int, 
                      duration: Optional[int] = None) -> Dict[str, Any]:
        """Ban user from chat"""
        try:
            action = self._create_action("ban_user", "user", str(user_id), {
                'chat_id': str(chat_id),
                'user_id': user_id,
                'duration': duration
            })
            
            until_date = None
            if duration:
                until_date = datetime.now() + timedelta(seconds=duration)
            
            await self.bot.ban_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                until_date=until_date
            )
            
            self._complete_action(action.action_id, "success", 
                                f"User banned {f'for {duration} seconds' if duration else 'permanently'}")
            self.stats['users_managed'] += 1
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error banning user: {e}")
            return {'success': False, 'error': str(e)}
    
    async def unban_user(self, chat_id: Union[int, str], user_id: int) -> Dict[str, Any]:
        """Unban user from chat"""
        try:
            action = self._create_action("unban_user", "user", str(user_id), {
                'chat_id': str(chat_id),
                'user_id': user_id
            })
            
            await self.bot.unban_chat_member(chat_id=chat_id, user_id=user_id)
            
            self._complete_action(action.action_id, "success", "User unbanned")
            self.stats['users_managed'] += 1
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error unbanning user: {e}")
            return {'success': False, 'error': str(e)}
    
    async def mute_user(self, chat_id: Union[int, str], user_id: int, 
                       duration: Optional[int] = None) -> Dict[str, Any]:
        """Mute user in chat"""
        try:
            action = self._create_action("mute_user", "user", str(user_id), {
                'chat_id': str(chat_id),
                'user_id': user_id,
                'duration': duration
            })
            
            until_date = None
            if duration:
                until_date = datetime.now() + timedelta(seconds=duration)
            
            await self.bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=self._get_muted_permissions(),
                until_date=until_date
            )
            
            self._complete_action(action.action_id, "success", 
                                f"User muted {f'for {duration} seconds' if duration else 'indefinitely'}")
            self.stats['users_managed'] += 1
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error muting user: {e}")
            return {'success': False, 'error': str(e)}
    
    # ===== GROUP MANAGEMENT =====
    
    async def get_chat_info(self, chat_id: Union[int, str]) -> Dict[str, Any]:
        """Get comprehensive chat information"""
        try:
            chat = await self.bot.get_chat(chat_id)
            member_count = await self.bot.get_chat_member_count(chat_id)
            
            # Get administrators
            administrators = []
            try:
                admins = await self.bot.get_chat_administrators(chat_id)
                for admin in admins:
                    admin_info = {
                        'user_id': admin.user.id,
                        'username': admin.user.username,
                        'first_name': admin.user.first_name,
                        'status': admin.status,
                        'can_delete_messages': getattr(admin, 'can_delete_messages', False),
                        'can_restrict_members': getattr(admin, 'can_restrict_members', False),
                        'can_promote_members': getattr(admin, 'can_promote_members', False)
                    }
                    administrators.append(admin_info)
            except:
                administrators = []
            
            return {
                'success': True,
                'chat_id': chat.id,
                'title': chat.title,
                'type': chat.type,
                'description': chat.description,
                'member_count': member_count,
                'administrators': administrators,
                'permissions': self._extract_chat_permissions(chat)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting chat info: {e}")
            return {'success': False, 'error': str(e)}
    
    async def update_chat_title(self, chat_id: Union[int, str], title: str) -> Dict[str, Any]:
        """Update chat title"""
        try:
            action = self._create_action("update_title", "group", str(chat_id), {
                'chat_id': str(chat_id),
                'new_title': title
            })
            
            await self.bot.set_chat_title(chat_id=chat_id, title=title)
            
            self._complete_action(action.action_id, "success", f"Title updated to: {title}")
            self.stats['groups_managed'] += 1
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error updating chat title: {e}")
            return {'success': False, 'error': str(e)}
    
    async def update_chat_description(self, chat_id: Union[int, str], description: str) -> Dict[str, Any]:
        """Update chat description"""
        try:
            action = self._create_action("update_description", "group", str(chat_id), {
                'chat_id': str(chat_id),
                'new_description': description
            })
            
            await self.bot.set_chat_description(chat_id=chat_id, description=description)
            
            self._complete_action(action.action_id, "success", "Description updated")
            self.stats['groups_managed'] += 1
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error updating chat description: {e}")
            return {'success': False, 'error': str(e)}
    
    async def pin_message(self, chat_id: Union[int, str], message_id: int, 
                         disable_notification: bool = False) -> Dict[str, Any]:
        """Pin a message in chat"""
        try:
            action = self._create_action("pin_message", "message", f"{chat_id}_{message_id}", {
                'chat_id': str(chat_id),
                'message_id': message_id,
                'disable_notification': disable_notification
            })
            
            await self.bot.pin_chat_message(
                chat_id=chat_id,
                message_id=message_id,
                disable_notification=disable_notification
            )
            
            self._complete_action(action.action_id, "success", "Message pinned")
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error pinning message: {e}")
            return {'success': False, 'error': str(e)}
    
    async def unpin_message(self, chat_id: Union[int, str], message_id: Optional[int] = None) -> Dict[str, Any]:
        """Unpin message(s) in chat"""
        try:
            action_target = f"{chat_id}_{message_id}" if message_id else str(chat_id)
            action = self._create_action("unpin_message", "message", action_target, {
                'chat_id': str(chat_id),
                'message_id': message_id
            })
            
            if message_id:
                await self.bot.unpin_chat_message(chat_id=chat_id, message_id=message_id)
                result_msg = "Message unpinned"
            else:
                await self.bot.unpin_all_chat_messages(chat_id=chat_id)
                result_msg = "All messages unpinned"
            
            self._complete_action(action.action_id, "success", result_msg)
            
            return {'success': True}
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error unpinning message: {e}")
            return {'success': False, 'error': str(e)}
    
    # ===== ANALYTICS AND REPORTING =====
    
    async def get_chat_analytics(self, chat_id: Union[int, str], days: int = 7) -> Dict[str, Any]:
        """Get chat analytics from integrated components"""
        try:
            analytics = {
                'chat_id': str(chat_id),
                'period_days': days,
                'generated_at': datetime.now().isoformat()
            }
            
            # Get group info from group monitor
            if self.group_monitor:
                group_info = self.group_monitor.get_group_info(int(chat_id))
                if group_info:
                    analytics['group_info'] = group_info
            
            # Get recent messages from message streamer
            if self.message_streamer:
                recent_messages = self.message_streamer.get_recent_messages(
                    limit=100, chat_id=int(chat_id)
                )
                analytics['recent_activity'] = {
                    'message_count': len(recent_messages),
                    'messages': recent_messages[:10]  # Last 10 for preview
                }
            
            return {'success': True, 'analytics': analytics}
            
        except Exception as e:
            self.logger.error(f"Error getting chat analytics: {e}")
            return {'success': False, 'error': str(e)}
    
    async def export_chat_data(self, chat_id: Union[int, str], format_type: str = "json") -> Dict[str, Any]:
        """Export chat data"""
        try:
            if not self.admin_permissions.get('can_export_data', False):
                return {'success': False, 'error': 'Export permission denied'}
            
            action = self._create_action("export_data", "group", str(chat_id), {
                'chat_id': str(chat_id),
                'format': format_type
            })
            
            # Get comprehensive data
            chat_info = await self.get_chat_info(chat_id)
            analytics = await self.get_chat_analytics(chat_id, 30)
            
            export_data = {
                'export_metadata': {
                    'chat_id': str(chat_id),
                    'exported_at': datetime.now().isoformat(),
                    'format': format_type,
                    'exported_by': 'admin_interface'
                },
                'chat_info': chat_info.get('data', {}) if chat_info['success'] else {},
                'analytics': analytics.get('analytics', {}) if analytics['success'] else {}
            }
            
            # Generate export file (in practice, this would save to file system)
            export_filename = f"chat_export_{chat_id}_{int(datetime.now().timestamp())}.{format_type}"
            
            self._complete_action(action.action_id, "success", f"Data exported to {export_filename}")
            
            return {
                'success': True,
                'filename': export_filename,
                'data': export_data
            }
            
        except Exception as e:
            self._complete_action(action.action_id, "failed", str(e))
            self.logger.error(f"Error exporting chat data: {e}")
            return {'success': False, 'error': str(e)}
    
    # ===== UTILITY METHODS =====
    
    def _create_action(self, action_type: str, target_type: str, target_id: str, 
                      parameters: Dict[str, Any]) -> AdminAction:
        """Create new admin action record"""
        action_id = f"{action_type}_{int(datetime.now().timestamp())}_{len(self.admin_actions)}"
        
        action = AdminAction(
            action_id=action_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            admin_user_id=0,  # Would be set from request context
            admin_username="system",  # Would be set from request context
            timestamp=datetime.now().isoformat(),
            parameters=parameters,
            status="pending",
            result=None
        )
        
        self.admin_actions.append(action)
        self.stats['total_actions'] += 1
        
        return action
    
    def _complete_action(self, action_id: str, status: str, result: str):
        """Complete admin action"""
        for action in self.admin_actions:
            if action.action_id == action_id:
                action.status = status
                action.result = result
                
                if status == "success":
                    self.stats['successful_actions'] += 1
                else:
                    self.stats['failed_actions'] += 1
                break
    
    def _get_muted_permissions(self):
        """Get permissions for muted user"""
        from telegram import ChatPermissions
        return ChatPermissions(
            can_send_messages=False,
            can_send_media_messages=False,
            can_send_polls=False,
            can_send_other_messages=False,
            can_add_web_page_previews=False,
            can_change_info=False,
            can_invite_users=False,
            can_pin_messages=False
        )
    
    def _extract_chat_permissions(self, chat: Chat) -> Dict[str, bool]:
        """Extract chat permissions"""
        if hasattr(chat, 'permissions') and chat.permissions:
            return {
                'can_send_messages': chat.permissions.can_send_messages,
                'can_send_media_messages': chat.permissions.can_send_media_messages,
                'can_send_polls': chat.permissions.can_send_polls,
                'can_send_other_messages': chat.permissions.can_send_other_messages,
                'can_add_web_page_previews': chat.permissions.can_add_web_page_previews,
                'can_change_info': chat.permissions.can_change_info,
                'can_invite_users': chat.permissions.can_invite_users,
                'can_pin_messages': chat.permissions.can_pin_messages
            }
        return {}
    
    # ===== API METHODS FOR DASHBOARD =====
    
    def get_recent_actions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent admin actions"""
        recent_actions = sorted(
            self.admin_actions,
            key=lambda x: x.timestamp,
            reverse=True
        )[:limit]
        
        return [asdict(action) for action in recent_actions]
    
    def get_bulk_operations_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all bulk operations"""
        return {
            op_id: asdict(operation)
            for op_id, operation in self.bulk_operations.items()
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive admin interface statistics"""
        return {
            **self.stats,
            'active_bulk_operations': len([
                op for op in self.bulk_operations.values()
                if op.status in ['running', 'pending']
            ]),
            'recent_actions_count': len([
                action for action in self.admin_actions
                if datetime.fromisoformat(action.timestamp).date() == datetime.now().date()
            ]),
            'permissions': self.admin_permissions
        }
    
    def update_permissions(self, permissions: Dict[str, bool]) -> bool:
        """Update admin permissions"""
        try:
            self.admin_permissions.update(permissions)
            self.logger.info("Admin permissions updated")
            return True
        except Exception as e:
            self.logger.error(f"Error updating permissions: {e}")
            return False
    
    async def test_connectivity(self) -> Dict[str, Any]:
        """Test Telegram API connectivity"""
        try:
            start_time = datetime.now()
            bot_info = await self.bot.get_me()
            response_time = (datetime.now() - start_time).total_seconds()
            
            return {
                'success': True,
                'bot_info': {
                    'id': bot_info.id,
                    'username': bot_info.username,
                    'first_name': bot_info.first_name,
                    'can_join_groups': bot_info.can_join_groups,
                    'can_read_all_group_messages': bot_info.can_read_all_group_messages
                },
                'response_time': response_time
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}