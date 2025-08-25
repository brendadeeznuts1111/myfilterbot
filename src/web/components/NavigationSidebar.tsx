/**
 * NavigationSidebar Component
 * Refactored from legacy HTML to modern React/TypeScript
 * Integrates with dashboard configuration service
 */

import React, { useState, useEffect } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  action?: string;
  href?: string;
  subItems?: NavItem[];
  badge?: string | number;
  badgeColor?: string;
  featureFlag?: string;
  roles?: string[];
}

interface NavigationSidebarProps {
  userRole?: string;
  onNavigate?: (action: string) => void;
  className?: string;
  featureFlags?: Record<string, boolean>;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  userRole = 'agent',
  onNavigate,
  className = '',
  featureFlags = {}
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeItem, setActiveItem] = useState<string>('');

  // Navigation structure matching the original HTML
  const navigationItems: NavItem[] = [
    {
      id: 'transactions',
      label: 'Transactions',
      icon: 'fa-exchange-alt',
      action: 'get-transactions'
    },
    {
      id: 'reporting',
      label: 'Reporting',
      icon: 'fa-chart-bar',
      subItems: [
        {
          id: 'agent-performance',
          label: 'Agent Performance',
          icon: 'fa-user-tie',
          action: 'get-agent-performance'
        },
        {
          id: 'analysis',
          label: 'Analysis',
          icon: 'fa-analytics',
          action: 'get-analysis'
        },
        {
          id: 'ip-tracker',
          label: 'IP Tracker',
          icon: 'fa-network-wired',
          action: 'get-ip-tracker'
        },
        {
          id: 'transaction-history',
          label: 'Transaction History',
          icon: 'fa-history',
          action: 'get-transaction-history'
        },
        {
          id: 'collections',
          label: 'Collections',
          icon: 'fa-money-check-alt',
          action: 'get-collections'
        },
        {
          id: 'deleted-wagers',
          label: 'Deleted Wagers',
          icon: 'fa-trash-alt',
          action: 'get-deleted-wagers',
          roles: ['admin', 'master_agent']
        }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: 'fa-tools',
      subItems: [
        {
          id: 'bet-ticker',
          label: 'Bet Ticker',
          icon: 'fa-scroll',
          action: 'get-bet-ticker'
        },
        {
          id: 'ticketwriter',
          label: 'Ticketwriter',
          icon: 'fa-edit',
          action: 'get-ticketwriter'
        },
        {
          id: 'sportsbook-lines',
          label: 'Sportsbook Lines',
          icon: 'fa-list-alt',
          action: 'get-sportsbook-lines'
        },
        {
          id: 'scores',
          label: 'Scores',
          icon: 'fa-football-ball',
          action: 'get-scores'
        }
      ]
    },
    {
      id: 'add-players',
      label: 'Add Players',
      icon: 'fa-user-plus',
      action: 'add-account',
      roles: ['admin', 'master_agent', 'agent']
    },
    {
      id: 'live-betting-limits',
      label: 'Live Betting Limits',
      icon: 'fa-tachometer-alt',
      action: 'get-live-betting-limits',
      featureFlag: 'liveBetting'
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: 'fa-file-invoice-dollar',
      action: 'get-billing',
      badge: 'New',
      badgeColor: 'bg-red-500'
    },
    {
      id: 'rules',
      label: 'Rules',
      icon: 'fa-gavel',
      action: 'get-rules'
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: 'fa-address-card',
      action: 'get-contact'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'fa-cog',
      action: 'show-settings-modal'
    },
    {
      id: 'desktop-view',
      label: 'Desktop View',
      icon: 'fa-desktop',
      action: 'switch-to-desktop'
    },
    {
      id: 'mobile-view',
      label: 'Mobile View',
      icon: 'fa-mobile-alt',
      action: 'switch-to-mobile'
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: 'fa-sign-out-alt',
      href: '/logout'
    }
  ];

  // Filter navigation items based on user role and feature flags
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // Check role permissions
      if (item.roles && !item.roles.includes(userRole)) {
        return false;
      }

      // Check feature flags
      if (item.featureFlag && !featureFlags[item.featureFlag]) {
        return false;
      }

      // Filter sub-items recursively
      if (item.subItems) {
        item.subItems = filterNavItems(item.subItems);
      }

      return true;
    });
  };

  const visibleNavItems = filterNavItems(navigationItems);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemClick = (item: NavItem) => {
    if (item.subItems) {
      toggleExpanded(item.id);
    } else {
      setActiveItem(item.id);
      
      if (item.action && onNavigate) {
        onNavigate(item.action);
      } else if (item.href) {
        window.location.href = item.href;
      }
    }
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const isActive = activeItem === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
      <li key={item.id} className="fantdev-nav-item">
        <a
          href={item.href || '#'}
          onClick={(e) => {
            if (!item.href) e.preventDefault();
            handleItemClick(item);
          }}
          className={`
            fantdev-nav-link
            ${level > 0 ? 'fantdev-nav-link-sub' : ''}
            ${isActive ? 'fantdev-nav-link-active' : ''}
            ${hasSubItems ? 'fantdev-nav-link-expandable' : ''}
          `}
          data-action={item.action}
          data-language={`L-${item.id.toUpperCase().replace(/-/g, '_')}`}
        >
          <div className="fantdev-nav-link-content">
            <i className={`fa ${item.icon} fantdev-nav-icon`}></i>
            <span className="fantdev-nav-label">{item.label}</span>
            {item.badge && (
              <span className={`fantdev-nav-badge ${item.badgeColor || 'bg-gray-500'}`}>
                {item.badge}
              </span>
            )}
            {hasSubItems && (
              <i className={`fa fa-chevron-${isExpanded ? 'down' : 'right'} fantdev-nav-chevron`}></i>
            )}
          </div>
        </a>
        
        {hasSubItems && isExpanded && (
          <ul className="fantdev-nav-submenu">
            {item.subItems!.map(subItem => renderNavItem(subItem, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav className={`fantdev-sidebar ${className}`}>
      <ul className="fantdev-nav">
        {visibleNavItems.map(item => renderNavItem(item))}
      </ul>
    </nav>
  );
};

export default NavigationSidebar;

// Export navigation configuration for use in other components
export const navigationConfig = {
  getNavigationItems: (userRole: string, featureFlags: Record<string, boolean>): NavItem[] => {
    // This can be used to get navigation items programmatically
    return [];
  },
  
  // Map data-action values to API endpoints
  actionToEndpointMap: {
    'get-transactions': '/api/dashboard/transactions',
    'get-agent-performance': '/api/reports/agent-performance',
    'get-analysis': '/api/reports/analysis',
    'get-ip-tracker': '/api/security/ip-tracker',
    'get-transaction-history': '/api/reports/transaction-history',
    'get-collections': '/api/reports/collections',
    'get-deleted-wagers': '/api/reports/deleted-wagers',
    'get-bet-ticker': '/api/tools/bet-ticker',
    'get-ticketwriter': '/api/tools/ticketwriter',
    'get-sportsbook-lines': '/api/tools/sportsbook-lines',
    'get-scores': '/api/tools/scores',
    'add-account': '/api/customers/add',
    'get-live-betting-limits': '/api/betting/live-limits',
    'get-billing': '/api/billing',
    'get-rules': '/api/content/rules',
    'get-contact': '/api/content/contact',
    'show-settings-modal': null, // Handled client-side
    'switch-to-desktop': null, // Handled client-side
    'switch-to-mobile': null, // Handled client-side
  }
};