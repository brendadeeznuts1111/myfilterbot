/**
 * Enhanced API Hooks using TanStack Query
 * Provides caching, real-time updates, and optimistic updates
 * Leverages Bun API's sub-millisecond performance with proper customer context
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  CustomerBalance,
  CustomerProfile,
  WithdrawalRequest,
  WithdrawalResponse,
  APIPerformanceMetrics,
} from '../lib/api-client';
import { useCustomer, useApiClient } from '../contexts/CustomerContext';

// Query Keys for consistent caching
export const queryKeys = {
  customer: {
    all: ['customer'] as const,
    profile: (customerId: string) =>
      [...queryKeys.customer.all, customerId, 'profile'] as const,
    balance: (customerId: string) =>
      [...queryKeys.customer.all, customerId, 'balance'] as const,
    analytics: (customerId: string) =>
      [...queryKeys.customer.all, customerId, 'analytics'] as const,
    transactions: (
      customerId: string,
      page?: number,
      limit?: number,
      type?: string
    ) =>
      [
        ...queryKeys.customer.all,
        customerId,
        'transactions',
        { page, limit, type },
      ] as const,
  },
  performance: ['performance'] as const,
} as const;

// Configuration for different query types
const queryConfig = {
  // High-frequency data with aggressive caching
  realTime: {
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 3,
  },
  // Medium-frequency data
  standard: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  },
  // Low-frequency data
  static: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 1,
  },
};

// Customer Profile Hook
export function useCustomerProfile() {
  const { customerId } = useCustomer();
  const apiClient = useApiClient();

  return useQuery({
    queryKey: queryKeys.customer.profile(customerId!),
    queryFn: () => apiClient.getCustomerProfile(),
    enabled: !!customerId,
    ...queryConfig.standard,
  });
}

// Customer Balance Hook with real-time updates
export function useCustomerBalance() {
  const { customerId } = useCustomer();
  const apiClient = useApiClient();

  const query = useQuery({
    queryKey: queryKeys.customer.balance(customerId!),
    queryFn: () => apiClient.getCustomerBalance(),
    enabled: !!customerId,
    ...queryConfig.realTime,
  });

  return {
    ...query,
    // Add helper methods for UI
    balance: query.data?.balance,
    isPositivePnL: (query.data?.balance?.weekly_pnl || 0) > 0,
    lastUpdated: query.data?.balance?.last_updated
      ? new Date(query.data.balance.last_updated)
      : null,
  };
}

// Customer Analytics Hook
export function useCustomerAnalytics() {
  const { customerId } = useCustomer();
  const apiClient = useApiClient();

  const query = useQuery({
    queryKey: queryKeys.customer.analytics(customerId!),
    queryFn: () => apiClient.getCustomerAnalytics(),
    enabled: !!customerId,
    ...queryConfig.realTime,
  });

  return {
    ...query,
    analytics: query.data?.analytics,
    lastUpdated: query.data?.generated_at
      ? new Date(query.data.generated_at)
      : null,
    // Computed metrics for UI
    winRate: query.data?.analytics
      ? query.data.analytics.transaction_summary.completed /
        query.data.analytics.transaction_summary.total
      : 0,
    totalTrades: query.data?.analytics?.activity_stats?.total_transactions || 0,
  };
}

// Transaction History Hook with pagination
export function useTransactionHistory(page = 1, limit = 20, type?: string) {
  const { customerId } = useCustomer();
  const apiClient = useApiClient();

  return useQuery({
    queryKey: queryKeys.customer.transactions(customerId!, page, limit, type),
    queryFn: () => apiClient.getTransactionHistory(page, limit, type),
    enabled: !!customerId,
    ...queryConfig.standard,
    // Keep previous data while fetching new pages
    keepPreviousData: true,
  });
}

// Withdrawal Mutation Hook
export function useWithdrawalMutation() {
  const queryClient = useQueryClient();
  const { customerId } = useCustomer();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: (withdrawal: WithdrawalRequest) =>
      apiClient.requestWithdrawal(withdrawal),
    onSuccess: (data: WithdrawalResponse) => {
      if (!customerId) return;

      // Invalidate balance and transactions to refresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.customer.balance(customerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customer.transactions(customerId),
      });

      // Optimistically update balance if withdrawal was successful
      queryClient.setQueryData(
        queryKeys.customer.balance(customerId),
        (oldData: CustomerBalance | undefined) => {
          if (!oldData || !data.success) return oldData;

          return {
            ...oldData,
            balance: {
              ...oldData.balance,
              current:
                oldData.balance.current - Math.abs(data.transaction.amount),
              last_updated: data.transaction.timestamp,
            },
          };
        }
      );
    },
    onError: error => {
      console.error('Withdrawal request failed:', error);
    },
  });
}

// Profile Update Mutation Hook
export function useProfileUpdateMutation() {
  const queryClient = useQueryClient();
  const { customerId } = useCustomer();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: (updates: Partial<CustomerProfile['profile']>) =>
      apiClient.updateCustomerProfile(updates),
    onMutate: async updates => {
      if (!customerId) return;

      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.customer.profile(customerId),
      });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData(
        queryKeys.customer.profile(customerId)
      );

      // Optimistically update profile
      queryClient.setQueryData(
        queryKeys.customer.profile(customerId),
        (old: CustomerProfile | undefined) => {
          if (!old) return old;
          return {
            ...old,
            profile: { ...old.profile, ...updates },
            last_updated: new Date().toISOString(),
          };
        }
      );

      return { previousProfile };
    },
    onError: (error, updates, context) => {
      if (!customerId) return;

      // Rollback optimistic update
      if (context?.previousProfile) {
        queryClient.setQueryData(
          queryKeys.customer.profile(customerId),
          context.previousProfile
        );
      }
    },
    onSettled: () => {
      if (!customerId) return;

      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(customerId),
      });
    },
  });
}

// API Performance Monitoring Hook
export function useAPIPerformance() {
  const apiClient = useApiClient();
  const [metrics, setMetrics] = useState<APIPerformanceMetrics[]>([]);
  const [averageResponseTime, setAverageResponseTime] = useState(0);
  const [successRate, setSuccessRate] = useState(1);

  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = apiClient.getPerformanceMetrics();
      const avgTime = apiClient.getAverageResponseTime();
      const success = apiClient.getSuccessRate();

      setMetrics(currentMetrics);
      setAverageResponseTime(avgTime);
      setSuccessRate(success);
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial load

    return () => clearInterval(interval);
  }, [apiClient]);

  return {
    metrics,
    averageResponseTime,
    successRate,
    isHealthy: successRate > 0.95 && averageResponseTime < 100, // 95% success, <100ms
  };
}

// Real-time WebSocket Hook
export function useRealTimeUpdates(customerId?: string) {
  const queryClient = useQueryClient();
  const { customerId: contextCustomerId } = useCustomer();
  const apiClient = useApiClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const targetCustomerId = customerId || contextCustomerId;

  useEffect(() => {
    if (!targetCustomerId) return;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = apiClient.createWebSocket(targetCustomerId);

        ws.onopen = () => {
          setIsConnected(true);
          console.log(
            `🔗 WebSocket connected for customer: ${targetCustomerId}`
          );
        };

        ws.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);

            // Invalidate relevant queries based on message type
            switch (data.type) {
              case 'balance_update':
                queryClient.invalidateQueries({
                  queryKey: queryKeys.customer.balance(targetCustomerId),
                });
                break;
              case 'transaction_update':
                queryClient.invalidateQueries({
                  queryKey: queryKeys.customer.transactions(targetCustomerId),
                });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.customer.analytics(targetCustomerId),
                });
                break;
              case 'profile_update':
                queryClient.invalidateQueries({
                  queryKey: queryKeys.customer.profile(targetCustomerId),
                });
                break;
              default:
                // Invalidate all customer data for unknown updates
                queryClient.invalidateQueries({
                  queryKey: queryKeys.customer.all,
                  predicate: query => query.queryKey.includes(targetCustomerId),
                });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log('🔌 WebSocket disconnected, attempting to reconnect...');
          // Exponential backoff reconnection
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = error => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
        // Retry connection after delay
        reconnectTimeout = setTimeout(connect, 10000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [targetCustomerId, queryClient, apiClient]);

  return {
    isConnected,
    lastMessage,
    connectionStatus: isConnected ? 'connected' : 'disconnected',
  };
}

// Prefetch hook for performance optimization
export function usePrefetchCustomerData() {
  const queryClient = useQueryClient();
  const { customerId } = useCustomer();
  const apiClient = useApiClient();

  return {
    prefetchProfile: () => {
      if (!customerId) return;
      return queryClient.prefetchQuery({
        queryKey: queryKeys.customer.profile(customerId),
        queryFn: () => apiClient.getCustomerProfile(),
        staleTime: queryConfig.standard.staleTime,
      });
    },

    prefetchBalance: () => {
      if (!customerId) return;
      return queryClient.prefetchQuery({
        queryKey: queryKeys.customer.balance(customerId),
        queryFn: () => apiClient.getCustomerBalance(),
        staleTime: queryConfig.realTime.staleTime,
      });
    },

    prefetchAnalytics: () => {
      if (!customerId) return;
      return queryClient.prefetchQuery({
        queryKey: queryKeys.customer.analytics(customerId),
        queryFn: () => apiClient.getCustomerAnalytics(),
        staleTime: queryConfig.realTime.staleTime,
      });
    },
  };
}

// Dashboard data batch loader
export function useDashboardData() {
  const balance = useCustomerBalance();
  const analytics = useCustomerAnalytics();
  const transactions = useTransactionHistory(1, 10);
  const performance = useAPIPerformance();
  const realTime = useRealTimeUpdates();

  const isLoading =
    balance.isLoading || analytics.isLoading || transactions.isLoading;
  const hasError = balance.error || analytics.error || transactions.error;

  return {
    // Data
    balance: balance.data,
    analytics: analytics.data,
    transactions: transactions.data,

    // Loading states
    isLoading,
    hasError,

    // Real-time status
    isConnected: realTime.isConnected,
    lastUpdate: realTime.lastMessage,

    // Performance metrics
    apiPerformance: {
      averageResponseTime: performance.averageResponseTime,
      successRate: performance.successRate,
      isHealthy: performance.isHealthy,
    },

    // Helper methods
    refresh: () => {
      balance.refetch();
      analytics.refetch();
      transactions.refetch();
    },
  };
}
