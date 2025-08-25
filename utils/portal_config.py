"""
Portal Configuration System
Defines configurations for different portal types with navigation and features
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum


class PortalType(Enum):
    """Available portal types"""
    ADMIN = "admin"
    MANAGER = "manager"
    CUSTOMER = "customer"
    DASHBOARD = "dashboard"


@dataclass
class PortalConfig:
    """Configuration for a portal"""
    # Basic Info
    title: str
    description: str
    portal_type: PortalType
    url: str
    
    # Branding
    brand_name: str = "Fantdev"
    logo_icon: str = "fas fa-chart-line"
    theme_color: str = "#667eea"
    
    # Features
    show_sidebar: bool = True
    show_nav_toggle: bool = True
    show_portal_type: bool = True
    show_user_stats: bool = True
    show_activity_stats: bool = True
    show_footer_links: bool = True
    
    # Integration
    telegram_integration: bool = False
    websocket_support: bool = False
    
    # SEO & Meta
    keywords: str = ""
    robots: str = "noindex, nofollow"
    og_type: str = "website"
    og_image: str = "/images/dashboard-og.jpg"
    twitter_image: str = "/images/dashboard-twitter.jpg"
    
    # App Info
    app_title: str = "Fantdev Dashboard"
    app_name: str = "Fantdev Trading Portal"
    app_category: str = "UtilityApplication"
    version: str = "2.0"
    screenshot: str = "/images/dashboard-thumbnail.jpg"
    
    # Additional
    body_class: str = ""
    type_label: str = ""
    features: List[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['portal_type'] = self.portal_type.value
        return data


class PortalNavigationConfig:
    """Navigation configuration for different portal types"""
    
    @staticmethod
    def get_admin_navigation() -> List[Dict[str, Any]]:
        """Admin portal navigation"""
        return [
            {
                'id': 'dashboard',
                'title': 'Dashboard',
                'action': 'get-dashboard',
                'icon': 'fas fa-tachometer-alt',
                'permission': None
            },
            {
                'id': 'users',
                'title': 'User Management',
                'action': 'get-users',
                'icon': 'fas fa-users',
                'permission': 'manage_users'
            },
            {
                'id': 'agents',
                'title': 'Agent Management',
                'action': 'get-agents',
                'icon': 'fas fa-user-tie',
                'permission': 'manage_agents'
            },
            {
                'id': 'customers',
                'title': 'Customer Management',
                'action': 'get-customers',
                'icon': 'fas fa-user-friends',
                'permission': 'manage_customers'
            },
            {
                'id': 'transactions',
                'title': 'Transaction Management',
                'action': 'get-transactions',
                'icon': 'fas fa-exchange-alt',
                'permission': 'manage_transactions'
            },
            {
                'id': 'analytics',
                'title': 'Analytics & Reports',
                'icon': 'fas fa-chart-bar',
                'has_submenu': True,
                'permission': 'view_analytics',
                'submenu': [
                    {
                        'title': 'Performance Analytics',
                        'action': 'get-performance-analytics',
                        'permission': 'view_analytics'
                    },
                    {
                        'title': 'Financial Reports',
                        'action': 'get-financial-reports',
                        'permission': 'view_financial'
                    },
                    {
                        'title': 'User Activity',
                        'action': 'get-user-activity',
                        'permission': 'view_analytics'
                    },
                    {
                        'title': 'System Health',
                        'action': 'get-system-health',
                        'permission': 'view_system'
                    }
                ]
            },
            {
                'id': 'bot_management',
                'title': 'Bot Management',
                'icon': 'fas fa-robot',
                'has_submenu': True,
                'permission': 'manage_bots',
                'submenu': [
                    {
                        'title': 'Bot Configuration',
                        'action': 'get-bot-config',
                        'permission': 'manage_bots'
                    },
                    {
                        'title': 'Message Filters',
                        'action': 'get-message-filters',
                        'permission': 'manage_bots'
                    },
                    {
                        'title': 'Bot Analytics',
                        'action': 'get-bot-analytics',
                        'permission': 'view_analytics'
                    }
                ]
            },
            {
                'id': 'system',
                'title': 'System Settings',
                'icon': 'fas fa-cogs',
                'has_submenu': True,
                'permission': 'system_admin',
                'submenu': [
                    {
                        'title': 'General Settings',
                        'action': 'get-system-settings',
                        'permission': 'system_admin'
                    },
                    {
                        'title': 'Security Settings',
                        'action': 'get-security-settings',
                        'permission': 'system_admin'
                    },
                    {
                        'title': 'API Management',
                        'action': 'get-api-management',
                        'permission': 'system_admin'
                    },
                    {
                        'title': 'Backup & Restore',
                        'action': 'get-backup-restore',
                        'permission': 'system_admin'
                    }
                ]
            }
        ]
    
    @staticmethod
    def get_manager_navigation() -> List[Dict[str, Any]]:
        """Manager portal navigation (from original refactoring)"""
        return [
            {
                'id': 'dashboard',
                'title': 'Dashboard',
                'action': 'get-dashboard',
                'icon': 'glypth-dashboard',
                'permission': None
            },
            {
                'id': 'messaging',
                'title': 'Messaging',
                'action': 'get-messaging',
                'icon': 'glypth-messaging',
                'permission': None
            },
            {
                'id': 'customers',
                'title': 'Customers',
                'action': 'get-customers',
                'icon': 'glypth-customers',
                'permission': None
            },
            {
                'id': 'transactions',
                'title': 'Transactions',
                'action': 'get-transactions',
                'icon': 'glypth-tickets',
                'permission': None
            },
            {
                'id': 'reporting',
                'title': 'Reporting',
                'icon': 'glypth-seo-performance-marketing-graphic',
                'has_submenu': True,
                'submenu': [
                    {
                        'title': 'Agent Performance',
                        'action': 'get-agent-performance',
                        'data_type': 'C'
                    },
                    {
                        'title': 'Analysis',
                        'action': 'get-analysis'
                    },
                    {
                        'title': 'IP Tracker',
                        'action': 'get-ip-tracker'
                    },
                    {
                        'title': 'Transaction History',
                        'action': 'get-transaction-history'
                    },
                    {
                        'title': 'Collections',
                        'action': 'get-settled-figure'
                    },
                    {
                        'title': 'Deleted Wagers',
                        'action': 'delete-wager'
                    }
                ]
            },
            {
                'id': 'tools',
                'title': 'Tools',
                'icon': 'glypth-electrocardiogram-report',
                'has_submenu': True,
                'submenu': [
                    {
                        'title': 'Bet Ticker',
                        'action': 'get-bet-ticker',
                        'data_type': 'external'
                    },
                    {
                        'title': 'Ticketwriter',
                        'action': 'get-lines',
                        'data_type': 'place-bets'
                    },
                    {
                        'title': 'Sportsbook Lines',
                        'action': 'get-lines',
                        'data_type': 'sportbook',
                        'css_class': 'not-trigger'
                    },
                    {
                        'title': 'Scores',
                        'action': 'get-scores',
                        'css_class': 'not-trigger'
                    }
                ]
            },
            {
                'id': 'add_customer',
                'title': 'Add Customer',
                'action': 'add-account',
                'icon': 'glypth-group',
                'permission': 'add_customer'
            },
            {
                'id': 'live_limits',
                'title': 'My Live Limits',
                'action': 'live-betting-new',
                'icon': 'glypth-tickets-for-the-show',
                'permission': None
            },
            {
                'id': 'billing',
                'title': 'Billing',
                'action': 'get-agent-billing',
                'icon': 'glypth-agent_billing',
                'permission': 'billing'
            }
        ]
    
    @staticmethod
    def get_customer_navigation() -> List[Dict[str, Any]]:
        """Customer portal navigation"""
        return [
            {
                'id': 'dashboard',
                'title': 'Dashboard',
                'action': 'get-dashboard',
                'icon': 'fas fa-home',
                'permission': None
            },
            {
                'id': 'account',
                'title': 'My Account',
                'action': 'get-account',
                'icon': 'fas fa-user',
                'permission': None
            },
            {
                'id': 'balance',
                'title': 'Balance & Transactions',
                'action': 'get-balance',
                'icon': 'fas fa-wallet',
                'permission': None
            },
            {
                'id': 'trading',
                'title': 'Trading',
                'icon': 'fas fa-chart-line',
                'has_submenu': True,
                'submenu': [
                    {
                        'title': 'Place Trade',
                        'action': 'place-trade'
                    },
                    {
                        'title': 'Trade History',
                        'action': 'get-trade-history'
                    },
                    {
                        'title': 'Open Positions',
                        'action': 'get-open-positions'
                    },
                    {
                        'title': 'P&L Summary',
                        'action': 'get-pnl-summary'
                    }
                ]
            },
            {
                'id': 'deposits',
                'title': 'Deposits',
                'action': 'get-deposits',
                'icon': 'fas fa-plus-circle',
                'permission': None
            },
            {
                'id': 'withdrawals',
                'title': 'Withdrawals',
                'action': 'get-withdrawals',
                'icon': 'fas fa-minus-circle',
                'permission': None
            },
            {
                'id': 'support',
                'title': 'Support',
                'action': 'get-support',
                'icon': 'fas fa-life-ring',
                'permission': None
            }
        ]
    
    @staticmethod
    def get_dashboard_navigation() -> List[Dict[str, Any]]:
        """Dashboard portal navigation (minimal)"""
        return [
            {
                'id': 'overview',
                'title': 'Overview',
                'action': 'get-overview',
                'icon': 'fas fa-chart-pie',
                'permission': None
            },
            {
                'id': 'messages',
                'title': 'Messages',
                'action': 'get-messages',
                'icon': 'fas fa-comments',
                'permission': None
            },
            {
                'id': 'analytics',
                'title': 'Analytics',
                'action': 'get-analytics',
                'icon': 'fas fa-chart-bar',
                'permission': None
            },
            {
                'id': 'filters',
                'title': 'Filters',
                'action': 'get-filters',
                'icon': 'fas fa-filter',
                'permission': None
            },
            {
                'id': 'export',
                'title': 'Export Data',
                'action': 'export-data',
                'icon': 'fas fa-download',
                'permission': None
            }
        ]


class PortalConfigManager:
    """Manages portal configurations"""
    
    @staticmethod
    def get_portal_config(portal_type: PortalType) -> PortalConfig:
        """Get configuration for a specific portal type"""
        configs = {
            PortalType.ADMIN: PortalConfig(
                title="Enhanced Admin Dashboard",
                description="Advanced admin dashboard with real-time analytics, WebSocket updates, and comprehensive trading bot management. Monitor performance, manage customers, and track transactions.",
                portal_type=PortalType.ADMIN,
                url="/admin/dashboard",
                keywords="trading dashboard, real-time analytics, telegram bot admin, customer management, transaction tracking, WebSocket monitoring, fantdev trading system",
                websocket_support=True,
                show_user_stats=True,
                show_activity_stats=True,
                type_label="Admin",
                logo_icon="fas fa-shield-alt",
                theme_color="#dc3545",
                og_image="/images/admin-og.jpg",
                twitter_image="/images/admin-twitter.jpg",
                features=[
                    "Real-time system monitoring",
                    "User and agent management",
                    "Advanced analytics and reporting",
                    "Bot configuration and control",
                    "Security and audit logs",
                    "System health monitoring",
                    "API management",
                    "Backup and restore"
                ]
            ),
            
            PortalType.MANAGER: PortalConfig(
                title="Manager Dashboard",
                description="Comprehensive manager interface for trading operations, customer management, and performance analytics.",
                portal_type=PortalType.MANAGER,
                url="/manager",
                keywords="manager dashboard, trading operations, customer management, performance analytics, agent tools",
                show_user_stats=True,
                show_activity_stats=True,
                type_label="Manager",
                logo_icon="fas fa-user-tie",
                theme_color="#28a745",
                features=[
                    "Customer management",
                    "Transaction processing",
                    "Performance reporting",
                    "Agent tools and utilities",
                    "Billing management",
                    "Live betting limits"
                ]
            ),
            
            PortalType.CUSTOMER: PortalConfig(
                title="Customer Trading Portal",
                description="Access your trading account with real-time balance updates, P&L tracking, transaction history, and advanced analytics. Secure JWT authentication and WebSocket updates.",
                portal_type=PortalType.CUSTOMER,
                url="/portal",
                keywords="trading portal, customer dashboard, real-time trading, P&L tracking, transaction history, Fantdev, trading analytics",
                websocket_support=True,
                show_user_stats=True,
                show_activity_stats=False,
                type_label="Customer",
                logo_icon="fas fa-user",
                theme_color="#007bff",
                og_image="/images/customer-og.jpg",
                twitter_image="/images/customer-twitter.jpg",
                features=[
                    "Real-time balance updates",
                    "P&L tracking and analytics",
                    "Transaction history",
                    "Secure authentication",
                    "Trading interface",
                    "Deposit and withdrawal management",
                    "Customer support integration"
                ]
            ),
            
            PortalType.DASHBOARD: PortalConfig(
                title="Filter Bot Dashboard",
                description="Real-time message viewer and analytics dashboard for Telegram trading bot. Monitor filtered messages, track activity, and analyze patterns with interactive charts.",
                portal_type=PortalType.DASHBOARD,
                url="/dashboard",
                keywords="filter bot, message viewer, telegram dashboard, trading analytics, message monitoring, Fantdev bot",
                telegram_integration=True,
                websocket_support=True,
                show_user_stats=False,
                show_activity_stats=True,
                show_sidebar=True,
                type_label="Dashboard",
                logo_icon="fas fa-chart-line",
                theme_color="#6f42c1",
                features=[
                    "Real-time message viewing",
                    "Advanced message filtering",
                    "Pattern detection and analysis",
                    "Interactive charts and statistics",
                    "Search functionality",
                    "Export capabilities",
                    "Telegram Web App integration",
                    "Dark/Light theme support"
                ]
            )
        }
        
        return configs.get(portal_type, configs[PortalType.DASHBOARD])
    
    @staticmethod
    def get_navigation_for_portal(portal_type: PortalType) -> List[Dict[str, Any]]:
        """Get navigation configuration for a portal type"""
        nav_configs = {
            PortalType.ADMIN: PortalNavigationConfig.get_admin_navigation(),
            PortalType.MANAGER: PortalNavigationConfig.get_manager_navigation(),
            PortalType.CUSTOMER: PortalNavigationConfig.get_customer_navigation(),
            PortalType.DASHBOARD: PortalNavigationConfig.get_dashboard_navigation()
        }
        
        return nav_configs.get(portal_type, [])
    
    @staticmethod
    def get_all_portal_types() -> List[PortalType]:
        """Get all available portal types"""
        return list(PortalType)


# Flask integration helper
def register_portal_helpers(app):
    """Register portal helpers with Flask app"""
    config_manager = PortalConfigManager()
    
    @app.context_processor
    def inject_portal_config():
        return {
            'PortalType': PortalType,
            'portal_config_manager': config_manager
        }
    
    return config_manager
