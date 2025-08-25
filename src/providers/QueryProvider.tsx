/**
 * TanStack Query Provider for Enhanced Analytics Dashboard
 * Optimized for Bun API's sub-millisecond response times
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create QueryClient with optimized settings for high-performance Bun API
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Optimized for Bun's fast API responses
      staleTime: 1000 * 30, // 30 seconds - data stays fresh
      refetchInterval: 1000 * 60, // 1 minute auto-refetch
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error: any) => {
        // Don't retry 4xx errors, but retry network errors up to 3 times
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Declare static defines for dead code elimination
declare const ENABLE_CONSOLE_LOGS: boolean;
declare const ENABLE_DEV_TOOLS: boolean;

// Add performance monitoring to the QueryClient (eliminated in production)
if (typeof ENABLE_CONSOLE_LOGS !== 'undefined' ? ENABLE_CONSOLE_LOGS : true) {
  if (typeof window !== 'undefined') {
    queryClient.getQueryCache().subscribe(event => {
      if (event?.type === 'updated' && event.action?.type === 'success') {
        const duration = event.query?.state?.dataUpdatedAt
          ? Date.now() - event.query.state.dataUpdatedAt
          : 0;

        if (duration > 0 && duration < 1000) {
          console.log(
            `⚡ Query "${event.query.queryHash}" completed in ${duration}ms`
          );
        }
      }
    });
  }
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development - eliminated in production builds */}
      {(typeof ENABLE_DEV_TOOLS !== 'undefined'
        ? ENABLE_DEV_TOOLS
        : process.env.NODE_ENV === 'development') && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position='bottom-left'
          toggleButtonProps={{
            style: {
              marginLeft: '5px',
              transform: 'none',
              fontSize: '12px',
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
}

export { queryClient };
