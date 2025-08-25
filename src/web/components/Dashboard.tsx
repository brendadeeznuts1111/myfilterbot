import React, { useState, useEffect } from 'react';

export function Dashboard() {

import { EquityCurveChart } from './analytics/EquityCurveChart';
import { PerformanceKPI } from './analytics/PerformanceKPI';
import { RecentActivity } from './analytics/RecentActivity';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardData } from '../../hooks/useEnhancedAPI';
import { useTheme } from '../../hooks/useTheme';

  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'activity'>('overview');

  // Enhanced dashboard data with real-time updates
  const {
    balance,
    analytics,
    transactions,
    isLoading,
    hasError,
    isConnected,
    lastUpdate,
    apiPerformance,
    refresh
  } = useDashboardData();

  // Fallback to legacy API hook for backward compatibility
  const { data: legacyAnalytics } = useAPI('/customer/analytics', {
    customerId: user?.customer_id,
    refreshInterval: 10000
  });

  const { data: systemHealth } = useAPI('/health');

  // Use enhanced data when available, fallback to legacy
  const displayAnalytics = analytics?.analytics || legacyAnalytics;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Header with Real-time Status */}
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                  Trading Dashboard
                </h2>
                <div className={`flex items-center space-x-1 text-xs ${
                  isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <span>{isConnected ? 'Live' : 'Offline'}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Welcome back, {user?.customer_id} • {apiPerformance.isHealthy ? '⚡ System Healthy' : '⚠️ Performance Issues'}
              </p>
            </div>
            
            {/* Enhanced Controls */}
            <div className="mt-4 flex items-center space-x-4 md:mt-0 md:ml-4">
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { id: 'overview', label: '📊 Overview', description: 'Key metrics' },
                  { id: 'performance', label: '📈 Performance', description: 'Detailed analytics' },
                  { id: 'activity', label: '🔄 Activity', description: 'Recent transactions' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title={tab.description}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={refresh}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                <span className="ml-1 hidden sm:inline">Refresh</span>
              </button>

              {/* Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="block pl-3 pr-8 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                <option value="1d">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
              </select>
            </div>
          </div>

          {/* Main Content - Tab-based Layout */}
          <div className="space-y-8">
            {/* Error State */}
            {hasError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-red-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Data Loading Error
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      Some dashboard data could not be loaded. Using cached data where available.
                    </p>
                    <button
                      onClick={refresh}
                      className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-500 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Enhanced Performance KPIs */}
                <PerformanceKPI customerId={user?.customer_id} />

                {/* Quick Summary Cards - Legacy Fallback */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="mr-2">📊</span>
                        Performance Overview
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">ROI</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {displayAnalytics?.performance_metrics?.roi_percentage?.toFixed(2) || '0.00'}%
                            </span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (displayAnalytics?.performance_metrics?.roi_percentage || 0) >= 0 
                                  ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ 
                                width: `${Math.min(Math.abs(displayAnalytics?.performance_metrics?.roi_percentage || 0), 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="mr-2">🔧</span>
                        System Status
                        <span className="ml-2 text-xs text-gray-500">
                          {apiPerformance.averageResponseTime.toFixed(1)}ms avg
                        </span>
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">API Health</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            apiPerformance.isHealthy
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {apiPerformance.isHealthy ? 'Healthy' : 'Degraded'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Success Rate</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(apiPerformance.successRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">WebSocket</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isConnected
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                          }`}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'performance' && (
              <>
                {/* Equity Curve Chart */}
                <EquityCurveChart customerId={user?.customer_id} height={400} />
                
                {/* Additional Performance Metrics */}
                <PerformanceKPI customerId={user?.customer_id} />
              </>
            )}

            {activeTab === 'activity' && (
              <>
                {/* Recent Activity Feed */}
                <RecentActivity 
                  customerId={user?.customer_id} 
                  limit={20}
                  showFilters={true}
                  autoScroll={true}
                />
              </>
            )}
          </div>

          {/* Footer with Last Update Info */}
          {lastUpdate && (
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {new Date(lastUpdate.timestamp || Date.now()).toLocaleString()}
                {lastUpdate.type && ` • ${lastUpdate.type}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}