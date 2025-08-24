"""
Email Service for Notification System
Handles email delivery with templates and SMTP configuration
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
import os
from datetime import datetime
import logging
import asyncio
import aiosmtplib
from jinja2 import Template

logger = logging.getLogger(__name__)

class EmailConfig:
    """Email configuration"""
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_name = os.getenv('EMAIL_FROM_NAME', 'Fantdev Trading Platform')
        self.from_email = os.getenv('EMAIL_FROM_ADDRESS', 'noreply@fantdev.trading')
        self.use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        self.use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'

class EmailTemplate:
    """Email template handler"""
    
    @staticmethod
    def get_base_template() -> str:
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{ subject }}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 0;
                    background-color: #f8f9fa;
                }
                .email-container {
                    background: white;
                    margin: 20px;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .email-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .email-logo {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .email-tagline {
                    opacity: 0.9;
                    font-size: 14px;
                }
                .email-content {
                    padding: 40px 30px;
                }
                .notification-alert {
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid;
                }
                .alert-info {
                    background: #e3f2fd;
                    border-color: #2196f3;
                    color: #1565c0;
                }
                .alert-success {
                    background: #e8f5e8;
                    border-color: #4caf50;
                    color: #2e7d32;
                }
                .alert-warning {
                    background: #fff3e0;
                    border-color: #ff9800;
                    color: #f57c00;
                }
                .alert-error {
                    background: #ffebee;
                    border-color: #f44336;
                    color: #c62828;
                }
                .button {
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 15px 5px;
                }
                .button:hover {
                    background: #5a6fd8;
                }
                .button-secondary {
                    background: #6c757d;
                }
                .email-footer {
                    background: #f8f9fa;
                    padding: 25px 30px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                    border-top: 1px solid #e9ecef;
                }
                .social-links {
                    margin: 15px 0;
                }
                .social-links a {
                    color: #667eea;
                    text-decoration: none;
                    margin: 0 10px;
                    font-weight: 500;
                }
                .unsubscribe {
                    margin-top: 15px;
                    font-size: 12px;
                    color: #999;
                }
                .unsubscribe a {
                    color: #666;
                }
                @media (max-width: 600px) {
                    .email-container {
                        margin: 10px;
                    }
                    .email-header, .email-content, .email-footer {
                        padding: 20px;
                    }
                    .button {
                        display: block;
                        text-align: center;
                        margin: 10px 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <div class="email-logo">🚀 {{ platform_name }}</div>
                    <div class="email-tagline">Professional Trading Platform</div>
                </div>
                
                <div class="email-content">
                    <h2>{{ title }}</h2>
                    
                    {% if alert_type %}
                    <div class="notification-alert alert-{{ alert_type }}">
                        {{ message }}
                    </div>
                    {% else %}
                    <p>{{ message }}</p>
                    {% endif %}
                    
                    {{ additional_content | safe }}
                    
                    {% if action_url %}
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{ action_url }}" class="button">{{ action_text or "View Details" }}</a>
                    </div>
                    {% endif %}
                    
                    {% if metadata %}
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="margin-top: 0;">Additional Information:</h4>
                        {% for key, value in metadata.items() %}
                        <p><strong>{{ key | title }}:</strong> {{ value }}</p>
                        {% endfor %}
                    </div>
                    {% endif %}
                </div>
                
                <div class="email-footer">
                    <p><strong>{{ platform_name }}</strong><br>
                    Professional Trading Platform</p>
                    
                    <div class="social-links">
                        <a href="{{ website_url or '#' }}">Website</a>
                        <a href="{{ support_url or '#' }}">Support</a>
                        <a href="{{ dashboard_url or '#' }}">Dashboard</a>
                    </div>
                    
                    <div class="unsubscribe">
                        <p>You received this email because you have an account with {{ platform_name }}.<br>
                        <a href="{{ unsubscribe_url or '#' }}">Unsubscribe from notifications</a></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    
    @classmethod
    def render_template(cls, template_data: Dict[str, Any]) -> str:
        """Render email template with data"""
        template = Template(cls.get_base_template())
        
        # Default values
        defaults = {
            'platform_name': 'Fantdev Trading Platform',
            'website_url': 'https://fantdev.trading',
            'support_url': 'https://fantdev.trading/support',
            'dashboard_url': 'https://fantdev.trading/dashboard',
            'unsubscribe_url': 'https://fantdev.trading/unsubscribe'
        }
        
        # Merge with provided data
        render_data = {**defaults, **template_data}
        
        return template.render(**render_data)

class EmailService:
    """Email service for sending notifications"""
    
    def __init__(self, config: Optional[EmailConfig] = None):
        self.config = config or EmailConfig()
        self.template_handler = EmailTemplate()
    
    async def send_email_async(self, 
                             to_emails: List[str], 
                             subject: str, 
                             html_content: str,
                             text_content: Optional[str] = None,
                             attachments: Optional[List[Dict[str, Any]]] = None) -> bool:
        """Send email asynchronously"""
        
        if not self.config.smtp_username or not self.config.smtp_password:
            logger.error("SMTP credentials not configured")
            return False
        
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['From'] = f"{self.config.from_name} <{self.config.from_email}>"
            message['To'] = ', '.join(to_emails)
            message['Subject'] = subject
            
            # Add text version if not provided
            if not text_content:
                text_content = self._html_to_text(html_content)
            
            # Attach text and HTML versions
            text_part = MIMEText(text_content, 'plain')
            html_part = MIMEText(html_content, 'html')
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    self._add_attachment(message, attachment)
            
            # Send email using aiosmtplib
            smtp_kwargs = {
                'hostname': self.config.smtp_server,
                'port': self.config.smtp_port,
                'username': self.config.smtp_username,
                'password': self.config.smtp_password,
            }
            
            if self.config.use_tls:
                smtp_kwargs['use_tls'] = True
            elif self.config.use_ssl:
                smtp_kwargs['use_tls'] = False
                smtp_kwargs['port'] = 465  # SSL port
            
            await aiosmtplib.send(
                message,
                **smtp_kwargs
            )
            
            logger.info(f"Email sent successfully to {to_emails}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_email_sync(self, 
                       to_emails: List[str], 
                       subject: str, 
                       html_content: str,
                       text_content: Optional[str] = None,
                       attachments: Optional[List[Dict[str, Any]]] = None) -> bool:
        """Send email synchronously"""
        
        if not self.config.smtp_username or not self.config.smtp_password:
            logger.error("SMTP credentials not configured")
            return False
        
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['From'] = f"{self.config.from_name} <{self.config.from_email}>"
            message['To'] = ', '.join(to_emails)
            message['Subject'] = subject
            
            # Add text version if not provided
            if not text_content:
                text_content = self._html_to_text(html_content)
            
            # Attach text and HTML versions
            text_part = MIMEText(text_content, 'plain')
            html_part = MIMEText(html_content, 'html')
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    self._add_attachment(message, attachment)
            
            # Send email
            if self.config.use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.config.smtp_server, self.config.smtp_port, context=context) as server:
                    server.login(self.config.smtp_username, self.config.smtp_password)
                    server.send_message(message)
            else:
                with smtplib.SMTP(self.config.smtp_server, self.config.smtp_port) as server:
                    if self.config.use_tls:
                        server.starttls()
                    server.login(self.config.smtp_username, self.config.smtp_password)
                    server.send_message(message)
            
            logger.info(f"Email sent successfully to {to_emails}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    async def send_notification_email(self, 
                                    to_email: str,
                                    notification_type: str,
                                    notification_data: Dict[str, Any]) -> bool:
        """Send notification email using templates"""
        
        # Map notification types to email configurations
        email_configs = {
            'transaction': {
                'subject': '💰 Transaction Alert - Fantdev Trading',
                'alert_type': 'info',
                'action_text': 'View Transaction'
            },
            'balance_update': {
                'subject': '📊 Balance Update - Fantdev Trading',
                'alert_type': 'success',
                'action_text': 'View Account'
            },
            'security_alert': {
                'subject': '🔒 Security Alert - Immediate Action Required',
                'alert_type': 'error',
                'action_text': 'Review Security'
            },
            'member_request': {
                'subject': '👥 New Member Request - Fantdev Trading',
                'alert_type': 'warning',
                'action_text': 'Review Request'
            },
            'trade_signal': {
                'subject': '📈 New Trade Signal - Fantdev Trading',
                'alert_type': 'info',
                'action_text': 'View Signal'
            },
            'system_update': {
                'subject': '🔧 System Update - Fantdev Trading',
                'alert_type': 'info',
                'action_text': 'Learn More'
            },
            'maintenance': {
                'subject': '🚧 Maintenance Notice - Fantdev Trading',
                'alert_type': 'warning',
                'action_text': 'View Schedule'
            },
            'promotion': {
                'subject': '🎉 Special Offer - Fantdev Trading',
                'alert_type': 'success',
                'action_text': 'Claim Offer'
            }
        }
        
        config = email_configs.get(notification_type, {
            'subject': 'Notification - Fantdev Trading',
            'alert_type': 'info',
            'action_text': 'View Details'
        })
        
        # Prepare template data
        template_data = {
            'subject': config['subject'],
            'title': notification_data.get('title', 'Notification'),
            'message': notification_data.get('message', ''),
            'alert_type': config['alert_type'],
            'action_text': config['action_text'],
            'action_url': notification_data.get('action_url', ''),
            'metadata': notification_data.get('metadata', {}),
            'timestamp': notification_data.get('created_at', datetime.now().isoformat())
        }
        
        # Add notification-specific content
        additional_content = self._generate_notification_content(notification_type, notification_data)
        if additional_content:
            template_data['additional_content'] = additional_content
        
        # Render email HTML
        html_content = self.template_handler.render_template(template_data)
        
        # Send email
        return await self.send_email_async(
            to_emails=[to_email],
            subject=config['subject'],
            html_content=html_content
        )
    
    def _generate_notification_content(self, notification_type: str, data: Dict[str, Any]) -> str:
        """Generate additional content based on notification type"""
        
        if notification_type == 'transaction':
            return f"""
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #059669;">Transaction Details</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">${data.get('amount', 0):,.2f}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">{data.get('action', 'Unknown').title()}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Account:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">{data.get('customer_id', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Time:</strong></td><td style="padding: 8px 0;">{data.get('timestamp', 'N/A')}</td></tr>
                </table>
            </div>
            """
        
        elif notification_type == 'trade_signal':
            return f"""
            <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h4 style="margin-top: 0; color: #7c3aed;">📈 Signal Details</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Symbol:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{data.get('symbol', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Action:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: 600;">{data.get('action', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Entry:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{data.get('entry_price', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Target:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{data.get('target_price', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Stop Loss:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{data.get('stop_price', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Confidence:</strong></td><td style="padding: 8px 0;">{data.get('confidence', 'N/A')}%</td></tr>
                </table>
            </div>
            """
        
        elif notification_type == 'security_alert':
            return f"""
            <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #fecaca;">
                <h4 style="margin-top: 0; color: #dc2626;">⚠️ Security Information</h4>
                <p style="color: #7f1d1d; margin: 10px 0;"><strong>Event:</strong> {data.get('event_type', 'Security Event')}</p>
                <p style="color: #7f1d1d; margin: 10px 0;"><strong>Time:</strong> {data.get('timestamp', 'Unknown')}</p>
                <p style="color: #7f1d1d; margin: 10px 0;"><strong>IP Address:</strong> {data.get('ip_address', 'Unknown')}</p>
                <div style="background: #fee2e2; padding: 15px; border-radius: 4px; margin: 15px 0;">
                    <p style="margin: 0; color: #991b1b; font-weight: 600;">If this was not you, please secure your account immediately and contact support.</p>
                </div>
            </div>
            """
        
        return ""
    
    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML to plain text (basic implementation)"""
        import re
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', html_content)
        
        # Decode HTML entities
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    def _add_attachment(self, message: MIMEMultipart, attachment: Dict[str, Any]):
        """Add attachment to email message"""
        try:
            with open(attachment['path'], 'rb') as file:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(file.read())
                
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {attachment["filename"]}'
            )
            message.attach(part)
            
        except Exception as e:
            logger.error(f"Failed to add attachment {attachment.get('path')}: {e}")

# Global email service instance
email_service = EmailService()

# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_email():
        # Test notification email
        test_data = {
            'title': 'Transaction Alert',
            'message': 'You have received a deposit of $5,000',
            'amount': 5000,
            'action': 'deposit',
            'customer_id': 'UV9587',
            'timestamp': datetime.now().isoformat()
        }
        
        success = await email_service.send_notification_email(
            to_email='test@example.com',
            notification_type='transaction',
            notification_data=test_data
        )
        
        print(f"Email sent: {success}")
    
    # Run test (requires SMTP configuration)
    # asyncio.run(test_email())