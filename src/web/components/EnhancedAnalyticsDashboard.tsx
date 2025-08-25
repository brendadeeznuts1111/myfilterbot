/**
 * Enhanced Analytics Dashboard
 * Combines all analytics components with real-time updates
 * Showcases Bun API's sub-millisecond performance
 */

import React, { useState, useEffect } from 'react';
import PerformanceDashboard from './PerformanceDashboard';
import AdvancedCharting from './AdvancedCharting';
import { useCustomerBalance, useCustomerAnalytics, useTransactionHistory } from '../hooks/useAPI';

interface EnhancedAnalyticsDashboardProps {
  customerId?: string;
  className?: string;
}

// Dashboard Layout Skeleton
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Performance Banner Skeleton */}
    <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
    </div>

    {/* KPI Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>

    {/* Chart and Activity Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Dashboard Controls
const DashboardControls: React.FC<{
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefresh: boolean;
  onAutoRefreshToggle: (enabled: boolean) => void;
  responseTime: number;
}> = ({ onRefresh, isRefreshing, autoRefresh, onAutoRefreshToggle, responseTime }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Analytics Dashboard
          <span className="ml-3 text-lg">🚀</span>
        </h1>
        <p className="text-gray-600">
          Real-time performance tracking powered by Bun API
        </p>
      </div>

      <div className="flex items-center space-x-4">
        {/* Performance Indicator */}
        <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              responseTime < 5 ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">
              API: {responseTime.toFixed(1)}ms
            </span>
          </div>
        </div>

        {/* Auto-refresh Toggle */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshToggle(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Auto-refresh</span>
        </label>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <span className={`${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
          <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </div>
  );
};

// Inner Dashboard Component (with access to hooks)
const DashboardContent: React.FC<{ customerId: string }> = ({ customerId }) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [responseTime, setResponseTime] = useState(0);

  // Get dashboard data using our existing hooks
  const { data: balance, error: balanceError, loading: balanceLoading, refetch: refetchBalance } = useCustomerBalance(customerId);
  const { data: analytics, error: analyticsError, loading: analyticsLoading, refetch: refetchAnalytics } = useCustomerAnalytics(customerId);
  const { data: transactions, error: transactionsError, loading: transactionsLoading, refetch: refetchTransactions } = useTransactionHistory(customerId);

  // Track API response times
  useEffect(() => {
    const startTime = performance.now();
    Promise.all([
      balance ? Promise.resolve() : refetchBalance(),
      analytics ? Promise.resolve() : refetchAnalytics()
    ]).finally(() => {
      const endTime = performance.now();
      setResponseTime(endTime - startTime);
    });
  }, [balance, analytics, refetchBalance, refetchAnalytics]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchBalance();
      refetchAnalytics();
      refetchTransactions();
      setRefreshCounter(prev => prev + 1);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refetchBalance, refetchAnalytics, refetchTransactions]);

  const handleManualRefresh = () => {
    refetchBalance();
    refetchAnalytics();
    refetchTransactions();
    setRefreshCounter(prev => prev + 1);
  };

  const isLoading = balanceLoading || analyticsLoading || transactionsLoading;
  const hasError = balanceError || analyticsError || transactionsError;

  // Show loading skeleton while initial data loads
  if (isLoading && !balance) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardControls
        onRefresh={handleManualRefresh}
        isRefreshing={isLoading}
        autoRefresh={autoRefresh}
        onAutoRefreshToggle={setAutoRefresh}
        responseTime={responseTime}
      />

      {/* Error State */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-700">
              Some data couldn't be loaded. Please try refreshing.
            </p>
            <button
              onClick={handleManualRefresh}
              className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Performance Dashboard */}
      <div className="mb-8">
        <PerformanceDashboard customerId={customerId} />
      </div>

      {/* Advanced Charts */}
      <div className="mb-8">
        <AdvancedCharting customerId={customerId} />
      </div>

      {/* Real-time Status Footer */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                !hasError ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className="text-gray-600">
                API: {!hasError ? 'Connected' : 'Error'}
              </span>
            </div>
            
            <div className="text-gray-500">
              Last refresh: {refreshCounter === 0 ? 'Initial load' : `${refreshCounter} updates ago`}
            </div>
          </div>

          <div className="text-gray-500">
            Powered by Bun v1.2.21+ • Response: {responseTime.toFixed(1)}ms
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({
  customerId = 'BB895', // Customer with real transaction data
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-gray-100 ${className}`}>
      <DashboardContent customerId={customerId} />
    </div>
  );
};

export default EnhancedAnalyticsDashboard;