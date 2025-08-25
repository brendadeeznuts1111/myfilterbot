/**
 * High-Performance API Hook
 * Optimized for Bun's sub-millisecond response times
 * Features SWR-like caching with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface APIConfig {
  baseURL?: string;
  customerId?: string;
  adminId?: string;
  adminPermissions?: string[];
  refreshInterval?: number;
  retryCount?: number;
  cache?: boolean;
}

interface APIResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// Global cache for API responses
const apiCache = new Map<string, {
  data: any;
  timestamp: number;
  expiry: number;
}>();

// Global config
let globalConfig: APIConfig = {
  baseURL: 'http://localhost:3003',
  refreshInterval: 5000, // 5 seconds for real-time feel
  retryCount: 3,
  cache: true
};

export function configureAPI(config: APIConfig) {
  globalConfig = { ...globalConfig, ...config };
}

export function useAPI<T = any>(
  endpoint: string, 
  options: APIConfig & { 
    dependencies?: any[];
    immediate?: boolean;
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

  const fetchData = useCallback(async (retryAttempt = 0) => {
    if (!mountedRef.current) return;

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
      const headers: HeadersInit = {
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
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      const endTime = performance.now();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const responseData = result.success ? (result.data || result) : result;

      if (mountedRef.current) {
        setData(responseData);
        setLastUpdated(new Date());
        setError(null);

        // Cache the response
        if (config.cache) {
          apiCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now(),
            expiry: Date.now() + cacheTTL
          });
        }

        // Log performance for sub-millisecond tracking
        const responseTime = endTime - startTime;
        if (responseTime < 5) {
          console.log(`⚡ Ultra-fast API response: ${endpoint} in ${responseTime.toFixed(2)}ms`);
        }
      }

    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Network error';
        
        // Retry logic for failed requests
        if (retryAttempt < (config.retryCount || 0)) {
          console.log(`🔄 Retrying API call to ${endpoint} (attempt ${retryAttempt + 1})`);
          retryTimeoutRef.current = setTimeout(() => {
            fetchData(retryAttempt + 1);
          }, Math.pow(2, retryAttempt) * 1000); // Exponential backoff
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
  }, [endpoint, cacheKey, cacheTTL, config]);

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
    lastUpdated
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
    cacheTTL: 5000
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
    cacheTTL: 15000
  });
}

export function useTransactionHistory(customerId?: string, page = 1, limit = 20) {
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
    dependencies: [page, limit]
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
    cache: false // Always fresh health data
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
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  if (config.customerId) headers['X-Customer-ID'] = config.customerId;
  if (config.adminId) headers['X-Admin-ID'] = config.adminId;

  fetch(`${config.baseURL}/api${endpoint}`, { headers })
    .then(res => res.json())
    .then(data => {
      const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
      apiCache.set(cacheKey, {
        data: data.success ? (data.data || data) : data,
        timestamp: Date.now(),
        expiry: Date.now() + 30000
      });
    })
    .catch(console.error);
}

export { globalConfig };