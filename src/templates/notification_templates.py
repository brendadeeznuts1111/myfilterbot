"""
Enhanced Notification Templates
Provides rich, customizable templates for different notification types
"""

from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import re

class TemplateTheme(Enum):
    """Visual themes for notifications"""
    MODERN = "modern"
    CLASSIC = "classic"
    MINIMAL = "minimal"
    PROFESSIONAL = "professional"

class NotificationTemplate:
    """Enhanced notification template with rich formatting"""
    
    def __init__(self, 
                 title_template: str, 
                 message_template: str,
                 html_template: Optional[str] = None,
                 email_template: Optional[str] = None,
                 sms_template: Optional[str] = None,
                 telegram_template: Optional[str] = None,
                 variables: Optional[Dict[str, str]] = None):
        
        self.title_template = title_template
        self.message_template = message_template
        self.html_template = html_template
        self.email_template = email_template
        self.sms_template = sms_template
        self.telegram_template = telegram_template
        self.variables = variables or {}
    
    def render(self, data: Dict[str, Any], channel: str = 'web') -> Dict[str, str]:
        """Render template with provided data"""
        
        # Select appropriate template based on channel
        if channel == 'email' and self.email_template:
            message_template = self.email_template
        elif channel == 'sms' and self.sms_template:
            message_template = self.sms_template
        elif channel == 'telegram' and self.telegram_template:
            message_template = self.telegram_template
        elif channel == 'web' and self.html_template:
            message_template = self.html_template
        else:
            message_template = self.message_template
        
        # Safe template rendering with fallbacks
        try:
            title = self._safe_format(self.title_template, data)
            message = self._safe_format(message_template, data)
            
            return {
                'title': title,
                'message': message,
                'channel': channel,
                'rendered_at': datetime.now().isoformat()
            }
        except Exception as e:
            # Fallback to basic template if rendering fails
            return {
                'title': 'Notification',
                'message': 'You have a new notification from the trading platform.',
                'channel': channel,
                'error': str(e),
                'rendered_at': datetime.now().isoformat()
            }
    
    def _safe_format(self, template: str, data: Dict[str, Any]) -> str:
        """Safely format template with data, providing fallbacks"""
        
        # Find all template variables
        variables = re.findall(r'\{([^}]+)\}', template)
        
        # Create safe data dict with fallbacks
        safe_data = {}
        for var in variables:
            if var in data:
                safe_data[var] = str(data[var])
            elif var in self.variables:
                safe_data[var] = self.variables[var]
            else:
                safe_data[var] = f"[{var}]"  # Fallback placeholder
        
        return template.format(**safe_data)

class EnhancedNotificationTemplates:
    """Enhanced template collection with rich formatting"""
    
    @staticmethod
    def get_templates() -> Dict[str, NotificationTemplate]:
        return {
            'transaction': NotificationTemplate(
                title_template='💰 Transaction Alert',
                message_template='Transaction {action} of ${amount:,.2f} for account {customer_id}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #10b981;">
                    <h3 style="color: #059669; margin: 0 0 8px 0;">💰 Transaction Alert</h3>
                    <p style="margin: 0; color: #374151;">
                        Transaction <strong>{action}</strong> of <strong style="color: #059669;">${amount:,.2f}</strong> 
                        for account <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px;">{customer_id}</code>
                    </p>
                    <small style="color: #6b7280;">Time: {timestamp}</small>
                </div>
                ''',
                email_template='''
                Dear Admin,
                
                A transaction has been processed on the trading platform:
                
                • Action: {action}
                • Amount: ${amount:,.2f}
                • Customer: {customer_id}
                • Time: {timestamp}
                • Transaction ID: {transaction_id}
                
                Please review this transaction in your admin dashboard.
                
                Best regards,
                Fantdev Trading Platform
                ''',
                telegram_template='💰 <b>Transaction Alert</b>\n\n<code>{action}</code> of <b>${amount:,.2f}</b>\nCustomer: <code>{customer_id}</code>\nTime: {timestamp}',
                sms_template='Transaction {action} ${amount:,.2f} for {customer_id}. Review in admin panel.',
                variables={
                    'action': 'deposit',
                    'amount': '0',
                    'customer_id': 'Unknown',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'transaction_id': 'N/A'
                }
            ),
            
            'balance_update': NotificationTemplate(
                title_template='📊 Balance Update',
                message_template='Your balance has been updated to ${new_balance:,.2f}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1d4ed8; margin: 0 0 8px 0;">📊 Balance Update</h3>
                    <p style="margin: 0; color: #374151;">
                        Your balance has been updated to <strong style="color: #1d4ed8;">${new_balance:,.2f}</strong>
                    </p>
                    {change_text}
                    <small style="color: #6b7280;">Updated: {timestamp}</small>
                </div>
                ''',
                email_template='''
                Dear {customer_name},
                
                Your account balance has been updated:
                
                • Previous Balance: ${old_balance:,.2f}
                • New Balance: ${new_balance:,.2f}
                • Change: ${change:+,.2f}
                • Updated: {timestamp}
                
                Login to your customer portal to view more details.
                
                Best regards,
                Fantdev Trading Team
                ''',
                telegram_template='📊 <b>Balance Update</b>\n\nNew balance: <b>${new_balance:,.2f}</b>\nChange: <code>{change:+,.2f}</code>',
                sms_template='Balance updated to ${new_balance:,.2f}. Change: {change:+,.2f}',
                variables={
                    'new_balance': '0',
                    'old_balance': '0',
                    'change': '0',
                    'customer_name': 'Customer',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'change_text': ''
                }
            ),
            
            'security_alert': NotificationTemplate(
                title_template='🔒 Security Alert',
                message_template='Security event detected: {event_type}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #ef4444; background: #fef2f2;">
                    <h3 style="color: #dc2626; margin: 0 0 8px 0;">🔒 Security Alert</h3>
                    <p style="margin: 0; color: #7f1d1d;">
                        <strong>Security event detected:</strong> {event_type}
                    </p>
                    <p style="margin: 8px 0 0 0; color: #991b1b;">
                        {event_description}
                    </p>
                    <small style="color: #7f1d1d;">Time: {timestamp} | IP: {ip_address}</small>
                </div>
                ''',
                email_template='''
                SECURITY ALERT - Immediate Action Required
                
                A security event has been detected on your account:
                
                • Event Type: {event_type}
                • Description: {event_description}
                • Time: {timestamp}
                • IP Address: {ip_address}
                • User Agent: {user_agent}
                
                If this was not you, please contact support immediately.
                
                Security Team
                Fantdev Trading Platform
                ''',
                telegram_template='🔒 <b>SECURITY ALERT</b>\n\n⚠️ {event_type}\n{event_description}\n\nTime: <code>{timestamp}</code>\nIP: <code>{ip_address}</code>',
                sms_template='SECURITY ALERT: {event_type} detected. Check your account immediately.',
                variables={
                    'event_type': 'Unknown Security Event',
                    'event_description': 'A security event was detected on your account.',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'ip_address': 'Unknown',
                    'user_agent': 'Unknown'
                }
            ),
            
            'member_request': NotificationTemplate(
                title_template='👥 New Member Request',
                message_template='{username} has requested to join {group_name}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #d97706; margin: 0 0 8px 0;">👥 New Member Request</h3>
                    <p style="margin: 0; color: #374151;">
                        <strong>{username}</strong> has requested to join <strong>{group_name}</strong>
                    </p>
                    <div style="margin-top: 12px;">
                        <a href="#" style="background: #059669; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; margin-right: 8px;">Approve</a>
                        <a href="#" style="background: #dc2626; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px;">Deny</a>
                    </div>
                    <small style="color: #6b7280;">User ID: {telegram_id} | Time: {timestamp}</small>
                </div>
                ''',
                email_template='''
                New Member Request - Action Required
                
                A new member has requested to join your trading group:
                
                • Username: @{username}
                • Group: {group_name}
                • Telegram ID: {telegram_id}
                • Request Time: {timestamp}
                
                Please review and approve/deny this request in your admin panel.
                
                Group Management Team
                Fantdev Trading Platform
                ''',
                telegram_template='👥 <b>New Member Request</b>\n\n<b>@{username}</b> wants to join <i>{group_name}</i>\n\nID: <code>{telegram_id}</code>\nTime: {timestamp}',
                sms_template='New member request: @{username} wants to join {group_name}. Check admin panel.',
                variables={
                    'username': 'Unknown User',
                    'group_name': 'Trading Group',
                    'telegram_id': '0',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
            ),
            
            'trade_signal': NotificationTemplate(
                title_template='📈 Trade Signal',
                message_template='New {signal_type} signal for {symbol}: {action}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #8b5cf6;">
                    <h3 style="color: #7c3aed; margin: 0 0 8px 0;">📈 Trade Signal</h3>
                    <p style="margin: 0; color: #374151;">
                        New <strong>{signal_type}</strong> signal for <strong>{symbol}</strong>
                    </p>
                    <div style="margin: 8px 0; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                        <strong style="color: {action_color};">{action}</strong>
                        <br><small>Entry: {entry_price} | Target: {target_price} | Stop: {stop_price}</small>
                    </div>
                    <small style="color: #6b7280;">Confidence: {confidence}% | Time: {timestamp}</small>
                </div>
                ''',
                email_template='''
                New Trade Signal Available
                
                A new trading signal has been generated:
                
                • Symbol: {symbol}
                • Signal Type: {signal_type}
                • Action: {action}
                • Entry Price: {entry_price}
                • Target Price: {target_price}
                • Stop Loss: {stop_price}
                • Confidence: {confidence}%
                • Generated: {timestamp}
                
                Review the full analysis in your trading dashboard.
                
                Trading Team
                Fantdev Trading Platform
                ''',
                telegram_template='📈 <b>Trade Signal</b>\n\n<b>{symbol}</b> - {signal_type}\n<b>{action}</b>\n\nEntry: <code>{entry_price}</code>\nTarget: <code>{target_price}</code>\nStop: <code>{stop_price}</code>\nConfidence: {confidence}%',
                sms_template='Trade Signal: {action} {symbol} at {entry_price}. Target: {target_price}',
                variables={
                    'symbol': 'Unknown',
                    'signal_type': 'Technical',
                    'action': 'BUY/SELL',
                    'entry_price': '0.00',
                    'target_price': '0.00',
                    'stop_price': '0.00',
                    'confidence': '0',
                    'action_color': '#059669',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
            ),
            
            'system_update': NotificationTemplate(
                title_template='🔧 System Update',
                message_template='System update: {update_message}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #6b7280;">
                    <h3 style="color: #4b5563; margin: 0 0 8px 0;">🔧 System Update</h3>
                    <p style="margin: 0; color: #374151;">{update_message}</p>
                    {details_html}
                    <small style="color: #6b7280;">Version: {version} | Time: {timestamp}</small>
                </div>
                ''',
                email_template='''
                System Update Notification
                
                The trading platform has been updated:
                
                • Update: {update_message}
                • Version: {version}
                • Applied: {timestamp}
                • Downtime: {downtime}
                
                {update_details}
                
                Technical Team
                Fantdev Trading Platform
                ''',
                telegram_template='🔧 <b>System Update</b>\n\n{update_message}\n\nVersion: <code>{version}</code>\nApplied: {timestamp}',
                sms_template='System update applied: {update_message}. Version {version}',
                variables={
                    'update_message': 'The system has been updated with improvements.',
                    'version': '1.0.0',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'downtime': '0 minutes',
                    'update_details': '',
                    'details_html': ''
                }
            ),
            
            'maintenance': NotificationTemplate(
                title_template='🚧 Maintenance Notice',
                message_template='Scheduled maintenance: {maintenance_message}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #f59e0b; background: #fffbeb;">
                    <h3 style="color: #d97706; margin: 0 0 8px 0;">🚧 Maintenance Notice</h3>
                    <p style="margin: 0; color: #92400e;"><strong>{maintenance_message}</strong></p>
                    <div style="margin: 8px 0; color: #b45309;">
                        <strong>Scheduled:</strong> {start_time} - {end_time}<br>
                        <strong>Duration:</strong> {duration}<br>
                        <strong>Impact:</strong> {impact}
                    </div>
                    <small style="color: #a16207;">We apologize for any inconvenience.</small>
                </div>
                ''',
                email_template='''
                Scheduled Maintenance Notification
                
                Please be advised of upcoming scheduled maintenance:
                
                • Description: {maintenance_message}
                • Start Time: {start_time}
                • End Time: {end_time}
                • Estimated Duration: {duration}
                • Expected Impact: {impact}
                
                During this time, some services may be unavailable.
                
                We apologize for any inconvenience and appreciate your patience.
                
                Operations Team
                Fantdev Trading Platform
                ''',
                telegram_template='🚧 <b>Maintenance Notice</b>\n\n{maintenance_message}\n\n⏰ {start_time} - {end_time}\n📊 Impact: {impact}',
                sms_template='Maintenance scheduled {start_time} - {end_time}. {maintenance_message}',
                variables={
                    'maintenance_message': 'Scheduled maintenance will be performed.',
                    'start_time': datetime.now().strftime('%Y-%m-%d %H:%M'),
                    'end_time': (datetime.now() + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M'),
                    'duration': '2 hours',
                    'impact': 'Limited functionality'
                }
            ),
            
            'promotion': NotificationTemplate(
                title_template='🎉 Special Offer',
                message_template='New promotion available: {promotion_message}',
                html_template='''
                <div style="padding: 15px; border-left: 4px solid #ec4899; background: linear-gradient(135deg, #fdf2f8, #fce7f3);">
                    <h3 style="color: #be185d; margin: 0 0 8px 0;">🎉 Special Offer</h3>
                    <p style="margin: 0; color: #9d174d;"><strong>{promotion_message}</strong></p>
                    <div style="margin: 12px 0; padding: 10px; background: white; border-radius: 6px; border: 1px solid #f3e8ff;">
                        <div style="color: #7c2d12;"><strong>Offer Details:</strong></div>
                        <ul style="margin: 4px 0; color: #92400e;">
                            <li>Discount: {discount}</li>
                            <li>Valid Until: {expiry_date}</li>
                            <li>Code: {promo_code}</li>
                        </ul>
                    </div>
                    <a href="{cta_link}" style="background: #be185d; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">Claim Offer</a>
                </div>
                ''',
                email_template='''
                Special Promotion - Limited Time Offer!
                
                {promotion_message}
                
                Offer Details:
                • Discount/Bonus: {discount}
                • Promotion Code: {promo_code}
                • Valid Until: {expiry_date}
                • Terms: {terms}
                
                Don't miss out on this exclusive opportunity!
                
                Marketing Team
                Fantdev Trading Platform
                ''',
                telegram_template='🎉 <b>Special Offer</b>\n\n{promotion_message}\n\n💰 <b>{discount}</b>\nCode: <code>{promo_code}</code>\nValid until: {expiry_date}',
                sms_template='Special offer: {promotion_message}. Use code {promo_code} by {expiry_date}',
                variables={
                    'promotion_message': 'Exclusive promotion available for limited time!',
                    'discount': '20% bonus',
                    'promo_code': 'SAVE20',
                    'expiry_date': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
                    'cta_link': '#',
                    'terms': 'Terms and conditions apply'
                }
            )
        }
    
    @staticmethod
    def render_notification(notification_type: str, data: Dict[str, Any], channel: str = 'web', theme: TemplateTheme = TemplateTheme.MODERN) -> Dict[str, str]:
        """Render a notification using the appropriate template"""
        
        templates = EnhancedNotificationTemplates.get_templates()
        
        if notification_type not in templates:
            # Fallback template
            template = NotificationTemplate(
                title_template='Notification',
                message_template='You have a new notification: {message}',
                variables={'message': 'System notification'}
            )
        else:
            template = templates[notification_type]
        
        return template.render(data, channel)
    
    @staticmethod
    def get_available_types() -> list:
        """Get list of available notification types"""
        return list(EnhancedNotificationTemplates.get_templates().keys())
    
    @staticmethod
    def validate_template_data(notification_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and enhance template data with defaults"""
        
        templates = EnhancedNotificationTemplates.get_templates()
        if notification_type not in templates:
            return data
        
        template = templates[notification_type]
        validated_data = data.copy()
        
        # Add default values for missing variables
        for key, default_value in template.variables.items():
            if key not in validated_data:
                validated_data[key] = default_value
        
        # Add common variables
        if 'timestamp' not in validated_data:
            validated_data['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        return validated_data

# Export for easy import
__all__ = ['NotificationTemplate', 'EnhancedNotificationTemplates', 'TemplateTheme']