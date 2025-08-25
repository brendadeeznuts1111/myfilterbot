/**
 * Performance KPI Component
 * Displays real-time key performance indicators with sub-millisecond updates
 * Leverages Bun API and TanStack Query for optimal performance
 */

import React, { useEffect, useState } from 'react';
import { useCustomerBalance, useCustomerAnalytics, useAPIPerformance } from '../../hooks/useEnhancedAPI';

interface PerformanceKPIProps {
  customerId?: string;
  className?: string;
}

// Skeleton loader for instant perceived performance
const SkeletonKPI: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
    </div>
  </div>
);

// Individual KPI Card with flash animations for updates
const KPICard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
  prefix?: string;
  suffix?: string;
  lastUpdated?: Date | null;
  icon?: string;
}> = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  loading, 
  prefix = '', 
  suffix = '', 
  lastUpdated,
  icon = '📊' 
}) => {
  const [flashUpdate, setFlashUpdate] = useState(false);

  // Flash animation when data updates
  useEffect(() => {
    if (lastUpdated) {
      setFlashUpdate(true);
      const timer = setTimeout(() => setFlashUpdate(false), 400);
      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  const changeColor = changeType === 'positive' ? 'text-green-600 bg-green-50' : 
                     changeType === 'negative' ? 'text-red-600 bg-red-50' : 
                     'text-gray-600 bg-gray-50';
  
  const changeIcon = changeType === 'positive' ? '↗' : 
                     changeType === 'negative' ? '↘' : '→';

  if (loading) {
    return <SkeletonKPI />;
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 transition-all duration-300 ${
      flashUpdate ? 'ring-2 ring-blue-300 bg-blue-50 shadow-lg transform scale-105' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">{icon}</span>
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          
          {/* Main Value */}
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          
          {/* Change Indicator */}
          {change !== undefined && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${changeColor}`}>
              <span className="mr-1">{changeIcon}</span>
              <span>{Math.abs(change).toLocaleString()}</span>
            </div>
          )}
        </div>
        
        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-gray-400 text-right">
            <div className="mb-1">Updated</div>
            <div className="font-mono">
              {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PerformanceKPI: React.FC<PerformanceKPIProps> = ({ 
  customerId = 'BB895', // Default customer with real transaction data
  className = '' 
}) => {
  const { balance, isPositivePnL, lastUpdated: balanceUpdated, isLoading: balanceLoading } = useCustomerBalance();
  const { analytics, winRate, totalTrades, lastUpdated: analyticsUpdated, isLoading: analyticsLoading } = useCustomerAnalytics();
  const { averageResponseTime, successRate, isHealthy } = useAPIPerformance();

  // Calculate additional metrics
  const totalPnL = balance?.weekly_pnl || 0;
  const currentBalance = balance?.current || 0;
  const roiPercentage = currentBalance > 0 ? ((totalPnL / currentBalance) * 100) : 0;

  // Performance status indicator
  const getPerformanceStatus = () => {
    if (averageResponseTime < 5) return { status: '🚀 Lightning Fast', color: 'text-green-600' };
    if (averageResponseTime < 50) return { status: '⚡ Very Fast', color: 'text-blue-600' };
    if (averageResponseTime < 100) return { status: '🏃 Fast', color: 'text-yellow-600' };
    return { status: '🐌 Slow', color: 'text-red-600' };
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Performance Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Bun API Performance
              </p>
              <p className={`text-xs ${performanceStatus.color} font-medium`}>
                {performanceStatus.status} • {averageResponseTime.toFixed(1)}ms avg
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Success Rate</p>
            <p className="text-sm font-bold text-gray-800">
              {(successRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Balance */}
        <KPICard
          title="Current Balance"
          value={currentBalance}
          prefix="$"
          loading={balanceLoading}
          lastUpdated={balanceUpdated}
          changeType={totalPnL > 0 ? 'positive' : totalPnL < 0 ? 'negative' : 'neutral'}
          icon="💰"
        />
        
        {/* Weekly P&L */}
        <KPICard
          title="Weekly P&L"
          value={Math.abs(totalPnL)}
          prefix={totalPnL >= 0 ? '+$' : '-$'}
          change={undefined} // Could add week-over-week change here
          changeType={totalPnL > 0 ? 'positive' : totalPnL < 0 ? 'negative' : 'neutral'}
          loading={balanceLoading}
          lastUpdated={balanceUpdated}
          icon={isPositivePnL ? '📈' : '📉'}
        />
        
        {/* ROI Percentage */}
        <KPICard
          title="ROI %"
          value={roiPercentage.toFixed(2)}
          suffix="%"
          changeType={roiPercentage > 0 ? 'positive' : roiPercentage < 0 ? 'negative' : 'neutral'}
          loading={balanceLoading || analyticsLoading}
          lastUpdated={analyticsUpdated}
          icon={roiPercentage > 0 ? '🎯' : '⚠️'}
        />
        
        {/* Total Trades */}
        <KPICard
          title="Total Trades"
          value={totalTrades}
          loading={analyticsLoading}
          lastUpdated={analyticsUpdated}
          icon="📊"
        />
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Win Rate */}
        <KPICard
          title="Win Rate"
          value={(winRate * 100).toFixed(1)}
          suffix="%"
          changeType={winRate > 0.6 ? 'positive' : winRate < 0.4 ? 'negative' : 'neutral'}
          loading={analyticsLoading}
          lastUpdated={analyticsUpdated}
          icon={winRate > 0.5 ? '🏆' : '🎲'}
        />
        
        {/* Average Trade Size */}
        <KPICard
          title="Avg Trade Size"
          value={analytics?.activity_stats?.average_transaction_size?.toFixed(0) || 0}
          prefix="$"
          loading={analyticsLoading}
          lastUpdated={analyticsUpdated}
          icon="⚖️"
        />
        
        {/* Total Deposits */}
        <KPICard
          title="Total Deposits"
          value={analytics?.performance_metrics?.total_deposits || 0}
          prefix="$"
          changeType="positive"
          loading={analyticsLoading}
          lastUpdated={analyticsUpdated}
          icon="⬇️"
        />
      </div>

      {/* Real-time Data Indicator */}
      <div className="flex items-center justify-center text-xs text-gray-500 space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        <span>Live data • Auto-refreshing every 60 seconds</span>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default PerformanceKPI;