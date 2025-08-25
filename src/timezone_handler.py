"""
Timezone Handler for Telegram Bot
Manages timezone-aware operations for global trading
"""

import os
import pytz
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram.constants import ParseMode

logger = logging.getLogger(__name__)

class TimezoneHandler:
    """Handles timezone operations for the bot"""
    
    TRADING_ZONES = {
        "America/New_York": {
            "label": "New York (EST/EDT)",
            "emoji": "🗽",
            "market_hours": (9.5, 16),  # 9:30 AM - 4:00 PM
            "offset": "UTC-5/-4"
        },
        "America/Chicago": {
            "label": "Chicago (CST/CDT)",
            "emoji": "🏙️",
            "market_hours": (8.5, 15),  # 8:30 AM - 3:00 PM
            "offset": "UTC-6/-5"
        },
        "America/Los_Angeles": {
            "label": "Los Angeles (PST/PDT)",
            "emoji": "🌴",
            "market_hours": (6.5, 13),  # 6:30 AM - 1:00 PM
            "offset": "UTC-8/-7"
        },
        "Europe/London": {
            "label": "London (GMT/BST)",
            "emoji": "🇬🇧",
            "market_hours": (8, 16.5),  # 8:00 AM - 4:30 PM
            "offset": "UTC+0/+1"
        },
        "Asia/Tokyo": {
            "label": "Tokyo (JST)",
            "emoji": "🗾",
            "market_hours": (9, 15),  # 9:00 AM - 3:00 PM
            "offset": "UTC+9"
        },
        "Asia/Hong_Kong": {
            "label": "Hong Kong (HKT)",
            "emoji": "🏮",
            "market_hours": (9.5, 16),  # 9:30 AM - 4:00 PM
            "offset": "UTC+8"
        },
        "UTC": {
            "label": "UTC",
            "emoji": "🌐",
            "market_hours": None,
            "offset": "UTC+0"
        }
    }
    
    def __init__(self, default_timezone: str = "America/Chicago"):
        """Initialize with default timezone"""
        self.default_timezone = default_timezone
        self.user_timezones = {}  # Store user timezone preferences
        
        # Set process timezone (for Python)
        os.environ['TZ'] = default_timezone
        try:
            import time
            time.tzset()
        except AttributeError:
            pass  # Windows doesn't have tzset
    
    def get_current_time(self, timezone: str = None) -> datetime:
        """Get current time in specified timezone"""
        tz = pytz.timezone(timezone or self.default_timezone)
        return datetime.now(tz)
    
    def format_time(self, dt: datetime = None, timezone: str = None) -> str:
        """Format datetime for display with timezone"""
        if dt is None:
            dt = self.get_current_time(timezone)
        elif timezone:
            tz = pytz.timezone(timezone)
            dt = dt.astimezone(tz)
        
        return dt.strftime("%B %d, %Y %I:%M %p %Z")
    
    def is_market_open(self, timezone: str = None) -> Tuple[bool, str]:
        """Check if market is open in specified timezone"""
        tz_name = timezone or self.default_timezone
        
        if tz_name not in self.TRADING_ZONES:
            return True, "24/7"  # Unknown market, assume always open
        
        zone_info = self.TRADING_ZONES[tz_name]
        if not zone_info["market_hours"]:
            return True, "24/7"  # No market hours defined
        
        current = self.get_current_time(tz_name)
        
        # Check if weekend
        if current.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False, "Weekend - Market Closed"
        
        # Check market hours
        current_hour = current.hour + current.minute / 60
        open_hour, close_hour = zone_info["market_hours"]
        
        if open_hour <= current_hour <= close_hour:
            return True, f"Open until {close_hour:.1f}:00"
        elif current_hour < open_hour:
            return False, f"Opens at {open_hour:.1f}:00"
        else:
            return False, f"Closed at {close_hour:.1f}:00"
    
    async def timezone_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /timezone command"""
        try:
            user_id = update.effective_user.id
            
            # Create timezone selection keyboard
            keyboard = []
            for i in range(0, len(self.TRADING_ZONES), 2):
                row = []
                zones = list(self.TRADING_ZONES.items())
                
                for j in range(2):
                    if i + j < len(zones):
                        tz, info = zones[i + j]
                        row.append(InlineKeyboardButton(
                            f"{info['emoji']} {info['label'].split('(')[0].strip()}",
                            callback_data=f"tz_set_{tz}"
                        ))
                keyboard.append(row)
            
            # Add current timezone info
            current_tz = self.user_timezones.get(user_id, self.default_timezone)
            keyboard.append([InlineKeyboardButton(
                f"Current: {self.TRADING_ZONES.get(current_tz, {}).get('label', current_tz)}",
                callback_data="tz_current"
            )])
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                "🌍 **Select Your Timezone**\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                "Choose your preferred timezone for:\n"
                "• Transaction timestamps\n"
                "• Market hours display\n"
                "• Alert scheduling\n",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error in timezone command: {e}")
    
    async def market_hours_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show global market hours"""
        try:
            market_status = "📊 **Global Market Status**\n"
            market_status += "━" * 30 + "\n\n"
            
            for tz_name, info in self.TRADING_ZONES.items():
                if info["market_hours"]:
                    current_time = self.get_current_time(tz_name)
                    is_open, status = self.is_market_open(tz_name)
                    
                    emoji = "🟢" if is_open else "🔴"
                    time_str = current_time.strftime("%I:%M %p")
                    
                    market_status += f"{info['emoji']} **{info['label'].split('(')[0].strip()}**\n"
                    market_status += f"   {emoji} {status}\n"
                    market_status += f"   Current: {time_str}\n\n"
            
            # Add legend
            market_status += "━" * 30 + "\n"
            market_status += "🟢 Market Open | 🔴 Market Closed\n"
            market_status += "Times shown in local market timezone"
            
            await update.message.reply_text(
                market_status,
                parse_mode=ParseMode.MARKDOWN
            )
            
        except Exception as e:
            logger.error(f"Error in market hours command: {e}")
    
    async def handle_timezone_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle timezone selection callbacks"""
        try:
            query = update.callback_query
            await query.answer()
            
            data = query.data
            user_id = update.effective_user.id
            
            if data.startswith("tz_set_"):
                # Set user timezone
                new_tz = data.replace("tz_set_", "")
                self.user_timezones[user_id] = new_tz
                
                # Get timezone info
                tz_info = self.TRADING_ZONES[new_tz]
                current_time = self.get_current_time(new_tz)
                
                # Check market status
                market_msg = ""
                if tz_info["market_hours"]:
                    is_open, status = self.is_market_open(new_tz)
                    market_msg = f"\n\n**Market Status:** {status}"
                
                await query.edit_message_text(
                    f"✅ **Timezone Updated**\n\n"
                    f"**New Timezone:** {tz_info['label']}\n"
                    f"**Current Time:** {current_time.strftime('%I:%M %p %Z')}\n"
                    f"**Offset:** {tz_info['offset']}"
                    f"{market_msg}\n\n"
                    f"All timestamps will now be shown in this timezone.",
                    parse_mode=ParseMode.MARKDOWN
                )
                
            elif data == "tz_current":
                current_tz = self.user_timezones.get(user_id, self.default_timezone)
                tz_info = self.TRADING_ZONES.get(current_tz, {})
                current_time = self.get_current_time(current_tz)
                
                await query.answer(
                    f"Current: {tz_info.get('label', current_tz)} - {current_time.strftime('%I:%M %p')}",
                    show_alert=True
                )
                
        except Exception as e:
            logger.error(f"Error handling timezone callback: {e}")
    
    def get_user_timezone(self, user_id: int) -> str:
        """Get user's preferred timezone"""
        return self.user_timezones.get(user_id, self.default_timezone)
    
    def convert_timestamp(self, timestamp: str, user_id: int) -> str:
        """Convert timestamp to user's timezone"""
        try:
            # Parse the timestamp
            dt = datetime.fromisoformat(timestamp)
            
            # Get user timezone
            user_tz = self.get_user_timezone(user_id)
            tz = pytz.timezone(user_tz)
            
            # Convert to user timezone
            if dt.tzinfo is None:
                # Assume UTC if no timezone info
                dt = pytz.UTC.localize(dt)
            
            user_time = dt.astimezone(tz)
            return user_time.strftime("%b %d %I:%M %p %Z")
            
        except Exception as e:
            logger.error(f"Error converting timestamp: {e}")
            return timestamp
    
    def schedule_market_alerts(self, context: ContextTypes.DEFAULT_TYPE):
        """Schedule alerts for market open/close times"""
        for tz_name, info in self.TRADING_ZONES.items():
            if info["market_hours"]:
                open_hour, close_hour = info["market_hours"]
                
                # Schedule market open alert
                context.job_queue.run_daily(
                    callback=lambda ctx, tz=tz_name: self._market_open_alert(ctx, tz),
                    time=datetime.now().replace(
                        hour=int(open_hour),
                        minute=int((open_hour % 1) * 60),
                        second=0
                    ).time(),
                    days=(0, 1, 2, 3, 4),  # Monday to Friday
                    name=f"market_open_{tz_name}"
                )
                
                # Schedule market close alert
                context.job_queue.run_daily(
                    callback=lambda ctx, tz=tz_name: self._market_close_alert(ctx, tz),
                    time=datetime.now().replace(
                        hour=int(close_hour),
                        minute=int((close_hour % 1) * 60),
                        second=0
                    ).time(),
                    days=(0, 1, 2, 3, 4),  # Monday to Friday
                    name=f"market_close_{tz_name}"
                )
    
    async def _market_open_alert(self, context: ContextTypes.DEFAULT_TYPE, timezone: str):
        """Send market open alert"""
        info = self.TRADING_ZONES[timezone]
        message = f"{info['emoji']} **{info['label'].split('(')[0]} Market Open**\n\n"
        message += f"Trading has begun in {timezone}"
        
        # Send to users who selected this timezone
        for user_id, user_tz in self.user_timezones.items():
            if user_tz == timezone:
                try:
                    await context.bot.send_message(
                        chat_id=user_id,
                        text=message,
                        parse_mode=ParseMode.MARKDOWN
                    )
                except Exception as e:
                    logger.error(f"Error sending market open alert: {e}")
    
    async def _market_close_alert(self, context: ContextTypes.DEFAULT_TYPE, timezone: str):
        """Send market close alert"""
        info = self.TRADING_ZONES[timezone]
        message = f"{info['emoji']} **{info['label'].split('(')[0]} Market Closed**\n\n"
        message += f"Trading has ended in {timezone}"
        
        # Send to users who selected this timezone
        for user_id, user_tz in self.user_timezones.items():
            if user_tz == timezone:
                try:
                    await context.bot.send_message(
                        chat_id=user_id,
                        text=message,
                        parse_mode=ParseMode.MARKDOWN
                    )
                except Exception as e:
                    logger.error(f"Error sending market close alert: {e}")

# Create global instance
timezone_handler = TimezoneHandler()