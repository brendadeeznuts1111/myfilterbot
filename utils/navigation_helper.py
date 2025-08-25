"""
Navigation Helper for Manager Interface
Provides utilities for managing navigation state, permissions, and menu generation
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum


class Permission(Enum):
    """User permissions for navigation items"""
    AGENT_ADMIN = "agent_admin"
    GAME_ADMIN = "game_admin"
    ADD_CUSTOMER = "add_customer"
    BILLING = "billing"
    VIEW_REPORTS = "view_reports"
    MANAGE_TRANSACTIONS = "manage_transactions"


@dataclass
class NavigationItem:
    """Represents a single navigation item"""
    id: str
    title: str
    action: str
    icon: str
    permission: Optional[Permission] = None
    language_key: Optional[str] = None
    css_class: Optional[str] = None
    submenu: Optional[List['NavigationItem']] = None
    show_condition: Optional[str] = None
    onclick: Optional[str] = None
    data_type: Optional[str] = None


class NavigationHelper:
    """Helper class for managing navigation in Jinja2 templates"""
    
    def __init__(self):
        self.navigation_config = self._build_navigation_config()
    
    def _build_navigation_config(self) -> Dict[str, List[NavigationItem]]:
        """Build the complete navigation configuration"""
        return {
            'main_items': [
                NavigationItem(
                    id='dashboard',
                    title='Dashboard',
                    action='get-dashboard',
                    icon='glypth-dashboard',
                    language_key='L-1'
                ),
                NavigationItem(
                    id='messaging',
                    title='Messaging',
                    action='get-messaging',
                    icon='glypth-messaging',
                    language_key='L-2'
                ),
                NavigationItem(
                    id='customers',
                    title='Customers',
                    action='get-customers',
                    icon='glypth-customers',
                    language_key='L-3'
                ),
                NavigationItem(
                    id='transactions',
                    title='Transactions',
                    action='get-transactions',
                    icon='glypth-tickets',
                    language_key='L-28',
                    permission=Permission.MANAGE_TRANSACTIONS
                ),
                NavigationItem(
                    id='agent_admin',
                    title='Agent Admin',
                    action='get-agent-admin',
                    icon='glypth-agent-admin',
                    permission=Permission.AGENT_ADMIN
                ),
                NavigationItem(
                    id='player_count',
                    title='Player Count',
                    action='get-player-count',
                    icon='glypth-player-count'
                ),
                NavigationItem(
                    id='game_admin',
                    title='Game Admin',
                    action='get-game-admin',
                    icon='glypth-game-admin',
                    permission=Permission.GAME_ADMIN
                ),
                NavigationItem(
                    id='reporting',
                    title='Reporting',
                    action='',
                    icon='glypth-seo-performance-marketing-graphic',
                    permission=Permission.VIEW_REPORTS,
                    submenu=[
                        NavigationItem(
                            id='agent_performance',
                            title='Agent Performance',
                            action='get-agent-performance',
                            icon='',
                            data_type='C',
                            language_key='L-329'
                        ),
                        NavigationItem(
                            id='analysis',
                            title='Analysis',
                            action='get-analysis',
                            icon='',
                            language_key='L-935'
                        ),
                        NavigationItem(
                            id='ip_tracker',
                            title='IP Tracker',
                            action='get-ip-tracker',
                            icon='',
                            language_key='L-333'
                        ),
                        NavigationItem(
                            id='transaction_history',
                            title='Transaction History',
                            action='get-transaction-history',
                            icon='',
                            language_key='L-317'
                        ),
                        NavigationItem(
                            id='collections',
                            title='Collections',
                            action='get-settled-figure',
                            icon='',
                            language_key='L-823'
                        ),
                        NavigationItem(
                            id='deleted_wagers',
                            title='Deleted Wagers',
                            action='delete-wager',
                            icon='',
                            language_key='L-824'
                        )
                    ]
                ),
                NavigationItem(
                    id='tools',
                    title='Tools',
                    action='',
                    icon='glypth-electrocardiogram-report',
                    submenu=[
                        NavigationItem(
                            id='bet_ticker',
                            title='Bet Ticker',
                            action='get-bet-ticker',
                            icon='',
                            data_type='external',
                            language_key='L-545'
                        ),
                        NavigationItem(
                            id='ticketwriter',
                            title='Ticketwriter',
                            action='get-lines',
                            icon='',
                            data_type='place-bets',
                            language_key='L-826'
                        ),
                        NavigationItem(
                            id='sportsbook_lines',
                            title='Sportsbook Lines',
                            action='get-lines',
                            icon='',
                            data_type='sportbook',
                            css_class='not-trigger',
                            language_key='L-825'
                        ),
                        NavigationItem(
                            id='scores',
                            title='Scores',
                            action='get-scores',
                            icon='',
                            css_class='not-trigger',
                            language_key='L-20'
                        )
                    ]
                ),
                NavigationItem(
                    id='add_customer',
                    title='Add Customer',
                    action='add-account',
                    icon='glypth-group',
                    language_key='L-821',
                    permission=Permission.ADD_CUSTOMER
                ),
                NavigationItem(
                    id='live_limits',
                    title='My Live Limits',
                    action='live-betting-new',
                    icon='glypth-tickets-for-the-show',
                    language_key='L-1385'
                ),
                NavigationItem(
                    id='billing',
                    title='Billing',
                    action='get-agent-billing',
                    icon='glypth-agent_billing',
                    language_key='L-828',
                    permission=Permission.BILLING
                ),
                NavigationItem(
                    id='rules',
                    title='Rules',
                    action='get-rules',
                    icon='fa fa-tasks',
                    language_key='L-270'
                ),
                NavigationItem(
                    id='contact',
                    title='Contact',
                    action='get-contact',
                    icon='fa fa-phone'
                )
            ],
            'system_items': [
                NavigationItem(
                    id='settings',
                    title='Settings',
                    action='show-settings-modal',
                    icon='fa fa-gear',
                    language_key='L-407',
                    css_class='setting-agent',
                    onclick="$('.modal#update-settings').modal('show');"
                ),
                NavigationItem(
                    id='desktop_view',
                    title='Desktop View',
                    action='desktop-view',
                    icon='fa fa-desktop',
                    show_condition='not_mobile_only'
                ),
                NavigationItem(
                    id='mobile_view',
                    title='Mobile View',
                    action='mobile-view',
                    icon='fa fa-tablet',
                    show_condition='not_mobile_only'
                ),
                NavigationItem(
                    id='logout',
                    title='Logout',
                    action='sign-out',
                    icon='icon-power3'
                )
            ]
        }
    
    def get_navigation_for_user(self, user, active_section: str = 'dashboard', 
                               is_mobile_only: bool = False) -> Dict[str, Any]:
        """Get filtered navigation items for a specific user"""
        filtered_main = []
        filtered_system = []
        
        # Filter main items based on permissions
        for item in self.navigation_config['main_items']:
            if self._user_can_access(user, item):
                # Filter submenu items if they exist
                if item.submenu:
                    filtered_submenu = [
                        subitem for subitem in item.submenu 
                        if self._user_can_access(user, subitem)
                    ]
                    # Create a copy with filtered submenu
                    filtered_item = NavigationItem(
                        id=item.id,
                        title=item.title,
                        action=item.action,
                        icon=item.icon,
                        permission=item.permission,
                        language_key=item.language_key,
                        css_class=item.css_class,
                        submenu=filtered_submenu,
                        show_condition=item.show_condition,
                        onclick=item.onclick,
                        data_type=item.data_type
                    )
                    filtered_main.append(filtered_item)
                else:
                    filtered_main.append(item)
        
        # Filter system items
        for item in self.navigation_config['system_items']:
            if self._should_show_item(item, is_mobile_only) and self._user_can_access(user, item):
                filtered_system.append(item)
        
        return {
            'main_items': filtered_main,
            'system_items': filtered_system,
            'active_section': active_section
        }
    
    def _user_can_access(self, user, item: NavigationItem) -> bool:
        """Check if user has permission to access navigation item"""
        if not item.permission:
            return True
        
        if not user:
            return False
        
        # Assuming user has a has_permission method
        if hasattr(user, 'has_permission'):
            return user.has_permission(item.permission.value)
        
        # Fallback: check if user has permissions attribute
        if hasattr(user, 'permissions'):
            return item.permission.value in user.permissions
        
        return False
    
    def _should_show_item(self, item: NavigationItem, is_mobile_only: bool) -> bool:
        """Check if item should be shown based on conditions"""
        if item.show_condition == 'not_mobile_only' and is_mobile_only:
            return False
        return True
    
    def get_breadcrumb(self, active_section: str, subsection: str = None) -> List[Dict[str, str]]:
        """Generate breadcrumb navigation"""
        breadcrumb = [{'title': 'Dashboard', 'url': '#', 'action': 'get-dashboard'}]
        
        # Find the active section
        for item in self.navigation_config['main_items']:
            if item.id == active_section:
                breadcrumb.append({
                    'title': item.title,
                    'url': '#',
                    'action': item.action,
                    'active': not subsection
                })
                
                # If there's a subsection, find it in submenu
                if subsection and item.submenu:
                    for subitem in item.submenu:
                        if subitem.id == subsection:
                            breadcrumb.append({
                                'title': subitem.title,
                                'url': '#',
                                'action': subitem.action,
                                'active': True
                            })
                            break
                break
        
        return breadcrumb


# Flask integration helper
def register_navigation_helpers(app):
    """Register navigation helpers with Flask app"""
    nav_helper = NavigationHelper()
    
    @app.context_processor
    def inject_navigation():
        return {
            'navigation_helper': nav_helper,
            'Permission': Permission
        }
    
    return nav_helper


# Example usage in Flask route
def example_flask_route():
    """Example of how to use in a Flask route"""
    from flask import render_template, g
    
    nav_helper = NavigationHelper()
    navigation_data = nav_helper.get_navigation_for_user(
        user=g.current_user,
        active_section='dashboard',
        is_mobile_only=False
    )
    
    return render_template('manager.html', 
                         navigation=navigation_data,
                         breadcrumb=nav_helper.get_breadcrumb('dashboard'))
