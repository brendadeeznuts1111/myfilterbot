/**
 * @fileoverview High-Performance API Hook for Fantdev Trading Bot
 * @version 2.1.0
 * @author Fantdev Development Team
 *
 * Optimized for Bun's sub-millisecond response times
 * Features SWR-like caching with real-time updates
 * Includes rate limiting and circuit breaker protection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRateLimiter } from '../utils/rateLimiter';

/**
 * Configuration options for API requests
 */
interface APIConfig {
  /** Base URL for API requests (defaults to localhost:3003) */
  baseURL?: string;
  /** Customer ID for authenticated requests */
  customerId?: string;
  /** Admin ID for admin-level requests */
  adminId?: string;
  /** Admin permissions array */
  adminPermissions?: string[];
  /** Refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Number of retry attempts (default: 2) */
  retryCount?: number;
  /** Enable response caching (default: true) */
  cache?: boolean;
}

/**
 * API response structure returned by useAPI hook
 * @template T - Type of the response data
 */
interface APIResponse<T> {
  /** Response data or null if not loaded/error */
  data: T | null;
  /** Error message or null if no error */
  error: string | null;
  /** Loading state indicator */
  loading: boolean;
  /** Function to manually refetch data */
  refetch: () => Promise<void>;
  /** Timestamp of last successful update */
  lastUpdated: Date | null;
}

// Global cache for API responses
const apiCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
    expiry: number;
  }
>();

// Global config
let globalConfig: APIConfig = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3003',
  refreshInterval: 30000, // 30 seconds - reduced from 5s to prevent flooding
  retryCount: 2, // Reduced from 3 to prevent excessive retries
  cache: true,
};

/**
 * Configure global API settings
 * @param config - Global configuration options
 * @example
 * ```typescript
 * configureAPI({
 *   baseURL: 'https://api.fantdev.com',
 *   refreshInterval: 60000,
 *   retryCount: 3
 * });
 * ```
 */
export function configureAPI(config: APIConfig) {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * High-performance React hook for API data fetching with caching and real-time updates
 *
 * @template T - Type of the expected response data
 * @param endpoint - API endpoint path (e.g., '/customers', '/stats')
 * @param options - Configuration options for the request
 * @returns APIResponse object with data, loading state, error, and refetch function
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { data, loading, error } = useAPI<Customer[]>('/customers');
 *
 * // With options
 * const { data, refetch } = useAPI<CustomerStats>('/customer/BB1042', {
 *   customerId: 'BB1042',
 *   refreshInterval: 10000,
 *   cache: true
 * });
 *
 * // Manual refetch
 * const handleRefresh = () => refetch();
 * ```
 */
export function useAPI<T = any>(
  endpoint: string,
  options: APIConfig & {
    /** Dependencies array - refetch when these change */
    dependencies?: any[];
    /** Whether to fetch immediately on mount (default: true) */
    immediate?: boolean;
    /** Cache time-to-live in milliseconds (default: 30000) */
    cacheTTL?: number;
  } = {}
): APIResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const config = { ...globalConfig, ...options };
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
  const cacheTTL = options.cacheTTL || 30000; // 30 seconds default

  const fetchData = useCallback(
    async (retryAttempt = 0) => {
      if (!mountedRef.current) return;

      // Check rate limiter first
      const rateLimitCheck = apiRateLimiter.shouldAllow(endpoint);
      if (!rateLimitCheck.allowed) {
        console.warn(`🚫 Rate limited: ${endpoint} - ${rateLimitCheck.reason}`);
        setError(rateLimitCheck.reason || 'Rate limited');
        setLoading(false);

        // Schedule retry after rate limit window
        if (rateLimitCheck.retryAfter && retryAttempt < 2) {
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              fetchData(retryAttempt + 1);
            }
          }, rateLimitCheck.retryAfter * 1000);
        }
        return;
      }

      // Check cache first
      if (config.cache) {
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() < cached.expiry) {
          setData(cached.data);
          setLastUpdated(new Date(cached.timestamp));
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (config.customerId) {
          headers['X-Customer-ID'] = config.customerId;
          headers['X-User-ID'] = config.customerId; // Also add X-User-ID for auth middleware
        }

        if (config.adminId) {
          headers['X-Admin-ID'] = config.adminId;
          headers['X-User-ID'] = config.adminId; // Also add X-User-ID for auth middleware
          if (config.adminPermissions?.length) {
            headers['X-Admin-Permissions'] = config.adminPermissions.join(',');
          }
        }

        // If no specific user provided, default to a customer ID for demo
        if (!config.customerId && !config.adminId) {
          headers['X-Customer-ID'] = 'BB1042';
          headers['X-User-ID'] = 'BB1042';
        }

        const startTime = performance.now();
        const response = await fetch(`${config.baseURL}/api${endpoint}`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        const endTime = performance.now();

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: 'Unknown error' }));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        const responseData = result.success ? result.data || result : result;

        if (mountedRef.current) {
          setData(responseData);
          setLastUpdated(new Date());
          setError(null);

          // Cache the response
          if (config.cache) {
            apiCache.set(cacheKey, {
              data: responseData,
              timestamp: Date.now(),
              expiry: Date.now() + cacheTTL,
            });
          }

          // Log performance for sub-millisecond tracking
          const responseTime = endTime - startTime;
          if (responseTime < 5) {
            console.log(
              `⚡ Ultra-fast API response: ${endpoint} in ${responseTime.toFixed(2)}ms`
            );
          }

          // Record successful request
          apiRateLimiter.recordResult(endpoint, true);
        }
      } catch (err) {
        if (mountedRef.current) {
          const errorMessage =
            err instanceof Error ? err.message : 'Network error';

          // Record failed request for circuit breaker
          apiRateLimiter.recordResult(endpoint, false);

          // Implement exponential backoff with jitter
          if (retryAttempt < (config.retryCount || 0)) {
            const baseDelay = Math.min(1000 * Math.pow(2, retryAttempt), 30000); // Max 30 seconds
            const jitter = Math.random() * 1000; // Add 0-1 second jitter
            const delay = baseDelay + jitter;

            console.log(
              `🔄 Retrying API call to ${endpoint} in ${Math.round(delay)}ms (attempt ${retryAttempt + 1}/${config.retryCount})`
            );

            retryTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                fetchData(retryAttempt + 1);
              }
            }, delay);
          } else {
            setError(errorMessage);
            console.error(`❌ API Error for ${endpoint}:`, errorMessage);
          }
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [endpoint, cacheKey, cacheTTL, config]
  );

  // Setup automatic refresh for real-time data
  useEffect(() => {
    if (!options.immediate && options.immediate !== false) {
      fetchData();
    }

    if (config.refreshInterval && config.refreshInterval > 0) {
      fetchTimeoutRef.current = setInterval(() => {
        fetchData();
      }, config.refreshInterval);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearInterval(fetchTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchData, config.refreshInterval, options.dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    error,
    loading,
    refetch,
    lastUpdated,
  };
}

// Specialized hooks for different endpoints

export function useCustomerBalance(customerId?: string) {
  return useAPI<{
    current: number;
    weekly_pnl: number;
    last_updated: string;
    currency: string;
  }>('/customer/balance', {
    customerId,
    refreshInterval: 2000, // Ultra-fast updates for balance
    cacheTTL: 5000,
  });
}

export function useCustomerAnalytics(customerId?: string) {
  return useAPI<{
    balance_trend: number[];
    transaction_summary: any;
    performance_metrics: {
      total_deposits: number;
      total_withdrawals: number;
      net_pnl: number;
      roi_percentage: number;
    };
    activity_stats: any;
    generated_at: string;
  }>('/customer/analytics', {
    customerId,
    refreshInterval: 10000, // 10 seconds for analytics
    cacheTTL: 15000,
  });
}

export function useTransactionHistory(
  customerId?: string,
  page = 1,
  limit = 20
) {
  return useAPI<{
    transactions: Array<{
      id: string;
      type: 'deposit' | 'withdrawal' | 'trade' | 'bonus';
      amount: number;
      status: 'pending' | 'completed' | 'failed';
      timestamp: string;
      description: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }>(`/customer/transactions?page=${page}&limit=${limit}`, {
    customerId,
    refreshInterval: 5000, // 5 seconds for transaction updates
    cacheTTL: 10000,
    dependencies: [page, limit],
  });
}

export function useSystemHealth() {
  return useAPI<{
    status: string;
    timestamp: string;
    services: {
      customer_api: string;
      notification_api: string;
      security_api: string;
    };
    routes: number;
    uptime: number;
  }>('/health', {
    refreshInterval: 30000, // 30 seconds for health check
    cacheTTL: 10000,
    cache: false, // Always fresh health data
  });
}

// Utility functions for cache management

export function clearAPICache(pattern?: string) {
  if (pattern) {
    const regex = new RegExp(pattern);
    for (const key of apiCache.keys()) {
      if (regex.test(key)) {
        apiCache.delete(key);
      }
    }
  } else {
    apiCache.clear();
  }
}

export function preloadAPI(endpoint: string, options: APIConfig = {}) {
  // Pre-fetch data to warm the cache
  const config = { ...globalConfig, ...options };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.customerId) headers['X-Customer-ID'] = config.customerId;
  if (config.adminId) headers['X-Admin-ID'] = config.adminId;

  fetch(`${config.baseURL}/api${endpoint}`, { headers })
    .then(res => res.json())
    .then(data => {
      const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
      apiCache.set(cacheKey, {
        data: data.success ? data.data || data : data,
        timestamp: Date.now(),
        expiry: Date.now() + 30000,
      });
    })
    .catch(console.error);
}

export { globalConfig };
