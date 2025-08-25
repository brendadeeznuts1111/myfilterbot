/**
 * Navigation Handler Service
 * Handles navigation actions and API calls for dashboard navigation
 */

import type {
  NavigationAction,
  DashboardActionResponse,
} from '../shared/types/navigation';
import { actionEndpointMapping } from '../shared/types/navigation';

export class NavigationHandler {
  private baseUrl: string;
  private authToken: string | null = null;
  private loadingStates: Map<NavigationAction, boolean> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 30000; // 30 seconds

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.initializeAuth();
  }

  /**
   * Initialize authentication from localStorage or session
   */
  private initializeAuth(): void {
    if (typeof window !== 'undefined') {
      this.authToken =
        localStorage.getItem('authToken') ||
        sessionStorage.getItem('authToken');
    }
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  /**
   * Handle navigation action
   */
  public async handleNavigationAction(
    action: NavigationAction
  ): Promise<DashboardActionResponse> {
    // Check if action has an endpoint mapping
    const endpoint = actionEndpointMapping[action];

    if (endpoint === null) {
      // Handle client-side actions
      return this.handleClientSideAction(action);
    }

    if (!endpoint) {
      return {
        success: false,
        error: `No endpoint mapping found for action: ${action}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Check cache first
    const cached = this.getCachedData(endpoint);
    if (cached) {
      return {
        success: true,
        data: cached,
        timestamp: new Date().toISOString(),
      };
    }

    // Set loading state
    this.loadingStates.set(action, true);

    try {
      const response = await this.fetchFromAPI(endpoint);

      // Cache the response
      this.cacheData(endpoint, response);

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch data',
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.loadingStates.set(action, false);
    }
  }

  /**
   * Handle client-side actions that don't require API calls
   */
  private async handleClientSideAction(
    action: NavigationAction
  ): Promise<DashboardActionResponse> {
    switch (action) {
      case 'show-settings-modal':
        this.showSettingsModal();
        return {
          success: true,
          data: { modalShown: true },
          timestamp: new Date().toISOString(),
        };

      case 'switch-to-desktop':
        this.switchViewMode('desktop');
        return {
          success: true,
          data: { viewMode: 'desktop' },
          timestamp: new Date().toISOString(),
        };

      case 'switch-to-mobile':
        this.switchViewMode('mobile');
        return {
          success: true,
          data: { viewMode: 'mobile' },
          timestamp: new Date().toISOString(),
        };

      default:
        return {
          success: false,
          error: `Unknown client-side action: ${action}`,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Fetch data from API endpoint
   */
  private async fetchFromAPI(endpoint: string): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Cache data with TTL
   */
  private cacheData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached data if valid
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Show settings modal (client-side action)
   */
  private showSettingsModal(): void {
    // Dispatch custom event for modal
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('dashboard:showSettingsModal');
      window.dispatchEvent(event);
    }
  }

  /**
   * Switch view mode (client-side action)
   */
  private switchViewMode(mode: 'desktop' | 'mobile'): void {
    if (typeof window !== 'undefined') {
      // Update viewport meta tag for mobile view
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        if (mode === 'mobile') {
          viewport.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=1.0'
          );
        } else {
          viewport.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0'
          );
        }
      }

      // Add/remove CSS class
      document.body.classList.toggle('mobile-view', mode === 'mobile');
      document.body.classList.toggle('desktop-view', mode === 'desktop');

      // Save preference
      localStorage.setItem('viewMode', mode);

      // Dispatch event
      const event = new CustomEvent('dashboard:viewModeChanged', {
        detail: { mode },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Check if an action is currently loading
   */
  public isLoading(action: NavigationAction): boolean {
    return this.loadingStates.get(action) || false;
  }

  /**
   * Clear cache for specific endpoint or all cache
   */
  public clearCache(endpoint?: string): void {
    if (endpoint) {
      this.cache.delete(endpoint);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Batch fetch multiple actions
   */
  public async batchFetchActions(
    actions: NavigationAction[]
  ): Promise<Map<NavigationAction, DashboardActionResponse>> {
    const results = new Map<NavigationAction, DashboardActionResponse>();

    // Process actions in parallel
    const promises = actions.map(async action => {
      const response = await this.handleNavigationAction(action);
      results.set(action, response);
    });

    await Promise.all(promises);

    return results;
  }
}

// Export singleton instance
export const navigationHandler = new NavigationHandler();

// Export specific action handlers for direct use
export const navigationActions = {
  // Transaction actions
  getTransactions: () =>
    navigationHandler.handleNavigationAction('get-transactions'),

  // Reporting actions
  getAgentPerformance: () =>
    navigationHandler.handleNavigationAction('get-agent-performance'),
  getAnalysis: () => navigationHandler.handleNavigationAction('get-analysis'),
  getIPTracker: () =>
    navigationHandler.handleNavigationAction('get-ip-tracker'),
  getTransactionHistory: () =>
    navigationHandler.handleNavigationAction('get-transaction-history'),
  getCollections: () =>
    navigationHandler.handleNavigationAction('get-collections'),
  getDeletedWagers: () =>
    navigationHandler.handleNavigationAction('get-deleted-wagers'),

  // Tools actions
  getBetTicker: () =>
    navigationHandler.handleNavigationAction('get-bet-ticker'),
  getTicketwriter: () =>
    navigationHandler.handleNavigationAction('get-ticketwriter'),
  getSportsbookLines: () =>
    navigationHandler.handleNavigationAction('get-sportsbook-lines'),
  getScores: () => navigationHandler.handleNavigationAction('get-scores'),

  // Account actions
  addAccount: () => navigationHandler.handleNavigationAction('add-account'),

  // Betting actions
  getLiveBettingLimits: () =>
    navigationHandler.handleNavigationAction('get-live-betting-limits'),

  // System actions
  getBilling: () => navigationHandler.handleNavigationAction('get-billing'),
  getRules: () => navigationHandler.handleNavigationAction('get-rules'),
  getContact: () => navigationHandler.handleNavigationAction('get-contact'),

  // UI actions
  showSettings: () =>
    navigationHandler.handleNavigationAction('show-settings-modal'),
  switchToDesktop: () =>
    navigationHandler.handleNavigationAction('switch-to-desktop'),
  switchToMobile: () =>
    navigationHandler.handleNavigationAction('switch-to-mobile'),
};
