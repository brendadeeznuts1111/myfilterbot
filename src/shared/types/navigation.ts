/**
 * Navigation Type Definitions
 * Centralized navigation interfaces and types for the dashboard
 */

// User role types matching your RBAC system
export type UserRole = 'admin' | 'master_agent' | 'agent' | 'player' | 'affiliate';

// Navigation item interface
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  action?: string;
  href?: string;
  subItems?: NavigationItem[];
  badge?: string | number;
  badgeColor?: 'red' | 'green' | 'blue' | 'yellow' | 'gray';
  featureFlag?: string;
  roles?: UserRole[];
  order?: number;
  divider?: boolean;
  disabled?: boolean;
  tooltip?: string;
  customClass?: string;
}

// Navigation action types
export type NavigationAction = 
  | 'get-transactions'
  | 'get-agent-performance'
  | 'get-analysis'
  | 'get-ip-tracker'
  | 'get-transaction-history'
  | 'get-collections'
  | 'get-deleted-wagers'
  | 'get-bet-ticker'
  | 'get-ticketwriter'
  | 'get-sportsbook-lines'
  | 'get-scores'
  | 'add-account'
  | 'get-live-betting-limits'
  | 'get-billing'
  | 'get-rules'
  | 'get-contact'
  | 'show-settings-modal'
  | 'switch-to-desktop'
  | 'switch-to-mobile';

// Navigation configuration interface
export interface NavigationConfig {
  items: NavigationItem[];
  defaultExpanded?: string[];
  sidebarWidth?: number;
  collapsible?: boolean;
  persistState?: boolean;
  mobileBreakpoint?: number;
}

// Navigation state interface
export interface NavigationState {
  expandedItems: Set<string>;
  activeItem: string;
  isCollapsed: boolean;
  searchQuery: string;
  filteredItems: NavigationItem[];
}

// Navigation event handlers
export interface NavigationHandlers {
  onNavigate?: (action: NavigationAction, item: NavigationItem) => void;
  onExpand?: (itemId: string, expanded: boolean) => void;
  onCollapse?: (collapsed: boolean) => void;
  onSearch?: (query: string) => void;
}

// API endpoint mapping type
export type ActionEndpointMap = Record<NavigationAction, string | null>;

// Navigation context interface for React Context API
export interface NavigationContextValue {
  config: NavigationConfig;
  state: NavigationState;
  handlers: NavigationHandlers;
  userRole: UserRole;
  featureFlags: Record<string, boolean>;
  updateActiveItem: (itemId: string) => void;
  toggleExpanded: (itemId: string) => void;
  toggleSidebar: () => void;
  searchItems: (query: string) => void;
}

// Dashboard action response interface
export interface DashboardActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

// Navigation API interface
export interface NavigationAPI {
  loadNavigationConfig: () => Promise<NavigationConfig>;
  saveNavigationState: (state: Partial<NavigationState>) => void;
  getNavigationState: () => NavigationState | null;
  executeAction: (action: NavigationAction) => Promise<DashboardActionResponse>;
}

// Navigation utility types
export type NavigationItemPredicate = (item: NavigationItem) => boolean;
export type NavigationItemTransformer = (item: NavigationItem) => NavigationItem;

// Navigation permission checker
export interface NavigationPermissionChecker {
  canViewItem: (item: NavigationItem, userRole: UserRole, featureFlags: Record<string, boolean>) => boolean;
  canExecuteAction: (action: NavigationAction, userRole: UserRole) => boolean;
}

// Export default navigation configuration
export const defaultNavigationConfig: NavigationConfig = {
  items: [],
  defaultExpanded: [],
  sidebarWidth: 260,
  collapsible: true,
  persistState: true,
  mobileBreakpoint: 768
};

// Export action to endpoint mapping
export const actionEndpointMapping: ActionEndpointMap = {
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
  'show-settings-modal': null,
  'switch-to-desktop': null,
  'switch-to-mobile': null
};