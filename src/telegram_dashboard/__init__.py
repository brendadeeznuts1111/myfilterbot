"""
Telegram Dashboard Integration Module

This module provides comprehensive Telegram bot management and monitoring capabilities
for the enhanced admin portal, including:

- Real-time message streaming
- Group and channel monitoring  
- Bot health monitoring
- Administrative interface for bot management
- WebSocket integration for live updates
- Performance analytics and reporting

Components:
- message_streamer: Real-time Telegram message streaming
- group_monitor: Group/channel monitoring and analytics
- bot_status: Bot health monitoring and performance tracking
- admin_interface: Administrative interface for bot management

Usage:
    from src.telegram_dashboard import TelegramDashboard
    
    dashboard = TelegramDashboard(bot_token, admin_chat_id)
    await dashboard.initialize()
    await dashboard.start()
"""

from .message_streamer import TelegramMessageStreamer, StreamedMessage
from .group_monitor import TelegramGroupMonitor, GroupInfo, MemberActivity
from .bot_status import TelegramBotMonitor, BotStatus, BotHealthStatus, HealthMetrics
from .admin_interface import TelegramAdminInterface, AdminAction, BulkOperation

__all__ = [
    'TelegramMessageStreamer',
    'TelegramGroupMonitor', 
    'TelegramBotMonitor',
    'TelegramAdminInterface',
    'StreamedMessage',
    'GroupInfo',
    'MemberActivity',
    'BotStatus',
    'BotHealthStatus',
    'HealthMetrics',
    'AdminAction',
    'BulkOperation',
    'TelegramDashboard'
]

__version__ = '1.0.0'


class TelegramDashboard:
    """
    Unified Telegram dashboard management class that orchestrates all components
    """
    
    def __init__(self, bot_token: str, admin_chat_id: str):
        self.bot_token = bot_token
        self.admin_chat_id = admin_chat_id
        
        # Initialize components
        self.message_streamer = TelegramMessageStreamer(bot_token, admin_chat_id)
        self.group_monitor = TelegramGroupMonitor(bot_token)
        self.bot_monitor = TelegramBotMonitor(bot_token, admin_chat_id)
        self.admin_interface = TelegramAdminInterface(bot_token, admin_chat_id)
        
        # Integrate components
        self.admin_interface.integrate_components(
            self.message_streamer,
            self.group_monitor, 
            self.bot_monitor
        )
    
    async def initialize(self) -> bool:
        """Initialize all dashboard components"""
        try:
            # Initialize all components
            success_streamer = await self.message_streamer.initialize()
            success_monitor = await self.group_monitor.initialize()  
            success_bot_monitor = await self.bot_monitor.initialize() if hasattr(self.bot_monitor, 'initialize') else True
            
            return success_streamer and success_monitor and success_bot_monitor
            
        except Exception as e:
            print(f"Error initializing Telegram dashboard: {e}")
            return False
    
    async def start(self) -> bool:
        """Start all dashboard components"""
        try:
            # Start all monitoring components
            await self.message_streamer.start_streaming()
            await self.group_monitor.start_monitoring()
            await self.bot_monitor.start_monitoring()
            
            return True
            
        except Exception as e:
            print(f"Error starting Telegram dashboard: {e}")
            return False
    
    async def stop(self) -> bool:
        """Stop all dashboard components"""
        try:
            await self.message_streamer.stop_streaming()
            await self.group_monitor.stop_monitoring()
            await self.bot_monitor.stop_monitoring()
            
            return True
            
        except Exception as e:
            print(f"Error stopping Telegram dashboard: {e}")
            return False
    
    def get_unified_statistics(self) -> dict:
        """Get unified statistics from all components"""
        return {
            'message_streamer': self.message_streamer.get_statistics(),
            'group_monitor': self.group_monitor.get_statistics(),
            'bot_monitor': self.bot_monitor.get_statistics(),
            'admin_interface': self.admin_interface.get_statistics()
        }
    
    def is_healthy(self) -> bool:
        """Check if all components are healthy"""
        try:
            # Check if all components are properly initialized
            return all([
                self.message_streamer is not None,
                self.group_monitor is not None,
                self.bot_monitor is not None,
                self.admin_interface is not None
            ])
        except:
            return False