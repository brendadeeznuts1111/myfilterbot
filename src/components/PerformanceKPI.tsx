/**
 * Enhanced Performance KPI Component
 * Advanced real-time analytics with intelligent alerts and trend analysis
 * Features: Multi-timeframe analysis, risk metrics, comparative benchmarks
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAPI } from '../hooks/useAPI';
import type {
  PerformanceKPIProps,
  KPIData,
} from '../shared/analytics-types';

// Advanced KPI calculation utilities
const calculateVolatility = (balanceTrend: number[]): number => {
  if (balanceTrend.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < balanceTrend.length; i++) {
    const ret = (balanceTrend[i] - balanceTrend[i - 1]) / balanceTrend[i - 1];
    if (isFinite(ret)) returns.push(ret);
  }

  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
    returns.length;
  return Math.sqrt(variance) * 100; // Return as percentage
};

const calculateSharpeRatio = (
  returns: number[],
  riskFreeRate = 0.02
): number => {
  if (returns.length === 0) return 0;
  const meanReturn =
    returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) /
      returns.length
  );
  return stdDev === 0 ? 0 : (meanReturn - riskFreeRate) / stdDev;
};

const calculateMaxDrawdown = (balanceTrend: number[]): number => {
  if (balanceTrend.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = balanceTrend[0];

  for (let i = 1; i < balanceTrend.length; i++) {
    if (balanceTrend[i] > peak) {
      peak = balanceTrend[i];
    }
    const drawdown = (peak - balanceTrend[i]) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown * 100; // Return as percentage
};

const getRiskLevel = (
  volatility: number,
  maxDrawdown: number
): 'low' | 'medium' | 'high' | 'extreme' => {
  if (volatility < 5 && maxDrawdown < 10) return 'low';
  if (volatility < 15 && maxDrawdown < 25) return 'medium';
  if (volatility < 30 && maxDrawdown < 50) return 'high';
  return 'extreme';
};

export function PerformanceKPI({
  customerId,
  timeframe = '7d',
  _refreshInterval = 5000,
  className = '',
  kpiKeys,
  showTargets = true,
  showTrends = true,
  layout = 'grid',
  maxItems = 12,
  onError,
  onDataUpdate,
}: PerformanceKPIProps) {
  const { theme } = useTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);

  // Fetch analytics with enhanced real-time updates (faster for trading data)
  const {
    data: metricsData,
    error,
    loading,
    lastUpdated,
  } = useAPI<{
    analytics: {
      balance_trend: number[];
      transaction_summary: {
        total: number;
        completed: number;
        pending: number;
        failed: number;
        by_type: {
          deposits: number;
          withdrawals: number;
          trades: number;
          bonuses: number;
        };
      };
      performance_metrics: {
        total_deposits: number;
        total_withdrawals: number;
        net_pnl: number;
        roi_percentage: number;
      };
      activity_stats: {
        total_transactions: number;
        last_transaction: string;
        average_transaction_size: number;
      };
    };
    generated_at: string;
  }>(`/customer/analytics?timeframe=${selectedTimeframe}`, {
    customerId,
    refreshInterval: 2000, // Ultra-fast 2-second updates for real-time feel
    cacheTTL: 1000,
    dependencies: [selectedTimeframe],
  });

  // Advanced metrics calculations
  const advancedMetrics = useMemo(() => {
    if (!metricsData?.analytics) return null;

    const {
      balance_trend,
      performance_metrics,
      transaction_summary,
      activity_stats,
    } = metricsData.analytics;

    // Risk calculations
    const volatility = calculateVolatility(balance_trend);
    const maxDrawdown = calculateMaxDrawdown(balance_trend);
    const riskLevel = getRiskLevel(volatility, maxDrawdown);

    // Performance calculations
    const totalVolume =
      performance_metrics.total_deposits +
      Math.abs(performance_metrics.total_withdrawals);
    const winRate =
      (transaction_summary.by_type.deposits /
        Math.max(1, transaction_summary.total)) *
      100;
    const avgPositionSize = activity_stats.average_transaction_size;

    // Profit factor (gross profit / gross loss)
    const grossProfit = performance_metrics.total_deposits;
    const grossLoss = Math.abs(performance_metrics.total_withdrawals);
    const profitFactor =
      grossLoss === 0 ? (grossProfit > 0 ? 999 : 0) : grossProfit / grossLoss;

    // Recovery factor (net profit / max drawdown)
    const recoveryFactor =
      maxDrawdown === 0
        ? 999
        : Math.abs(performance_metrics.net_pnl) / maxDrawdown;

    // Sharpe ratio calculation
    const returns = [];
    for (let i = 1; i < balance_trend.length; i++) {
      if (balance_trend[i - 1] !== 0) {
        returns.push(
          (balance_trend[i] - balance_trend[i - 1]) / balance_trend[i - 1]
        );
      }
    }
    const sharpeRatio = calculateSharpeRatio(returns);

    return {
      volatility,
      maxDrawdown,
      riskLevel,
      winRate,
      profitFactor,
      recoveryFactor,
      sharpeRatio,
      totalVolume,
      avgPositionSize,
    };
  }, [metricsData]);

  // Alert system for significant changes
  useEffect(() => {
    if (!advancedMetrics || !alertsEnabled) return;

    const alerts = [];
    if (advancedMetrics.maxDrawdown > 50) alerts.push('High drawdown detected');
    if (advancedMetrics.volatility > 30) alerts.push('Extreme volatility');
    if (advancedMetrics.winRate < 30) alerts.push('Low win rate');
    if (advancedMetrics.riskLevel === 'extreme')
      alerts.push('Extreme risk level');

    setActiveAlerts(alerts);
  }, [advancedMetrics, alertsEnabled]);

  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
    if (metricsData && onDataUpdate) {
      onDataUpdate(metricsData);
    }
  }, [error, metricsData, onError, onDataUpdate]);

  // Advanced KPI generation with comprehensive trading metrics
  const generateAdvancedKPIs = (): KPIData[] => {
    if (!metricsData?.analytics || !advancedMetrics) return [];

    const { performance_metrics, transaction_summary } =
      metricsData.analytics;

    const kpis: KPIData[] = [
      // Core Performance Metrics
      {
        label: 'Account Balance',
        value: performance_metrics.total_deposits + performance_metrics.net_pnl,
        change: performance_metrics.net_pnl,
        changePercent: performance_metrics.roi_percentage,
        trend: performance_metrics.net_pnl >= 0 ? 'up' : 'down',
        format: 'currency',
        timeframe: selectedTimeframe,
        status:
          performance_metrics.net_pnl > 0
            ? 'excellent'
            : performance_metrics.net_pnl > -1000
              ? 'warning'
              : 'critical',
        icon: '💰',
        priority: 1,
      },
      {
        label: 'Net P&L',
        value: performance_metrics.net_pnl,
        changePercent: performance_metrics.roi_percentage,
        trend: performance_metrics.net_pnl >= 0 ? 'up' : 'down',
        format: 'currency',
        timeframe: selectedTimeframe,
        status:
          performance_metrics.net_pnl > 1000
            ? 'excellent'
            : performance_metrics.net_pnl > 0
              ? 'good'
              : performance_metrics.net_pnl > -500
                ? 'warning'
                : 'critical',
        icon: '📈',
        priority: 2,
      },
      {
        label: 'ROI Percentage',
        value: performance_metrics.roi_percentage / 100,
        trend: performance_metrics.roi_percentage >= 0 ? 'up' : 'down',
        format: 'percentage',
        timeframe: selectedTimeframe,
        target: 0.15,
        status:
          performance_metrics.roi_percentage > 15
            ? 'excellent'
            : performance_metrics.roi_percentage > 5
              ? 'good'
              : performance_metrics.roi_percentage > -5
                ? 'warning'
                : 'critical',
        icon: '🎯',
        priority: 3,
      },

      // Risk Management Metrics
      {
        label: 'Max Drawdown',
        value: advancedMetrics.maxDrawdown / 100,
        trend:
          advancedMetrics.maxDrawdown < 10
            ? 'up'
            : advancedMetrics.maxDrawdown < 25
              ? 'neutral'
              : 'down',
        format: 'percentage',
        timeframe: selectedTimeframe,
        target: 0.1,
        status:
          advancedMetrics.maxDrawdown < 5
            ? 'excellent'
            : advancedMetrics.maxDrawdown < 15
              ? 'good'
              : advancedMetrics.maxDrawdown < 25
                ? 'warning'
                : 'critical',
        icon: '⚠️',
        priority: 4,
      },
      {
        label: 'Volatility',
        value: advancedMetrics.volatility / 100,
        trend:
          advancedMetrics.volatility < 10
            ? 'up'
            : advancedMetrics.volatility < 20
              ? 'neutral'
              : 'down',
        format: 'percentage',
        timeframe: selectedTimeframe,
        target: 0.15,
        status:
          advancedMetrics.volatility < 5
            ? 'excellent'
            : advancedMetrics.volatility < 15
              ? 'good'
              : advancedMetrics.volatility < 30
                ? 'warning'
                : 'critical',
        icon: '📊',
        priority: 8,
      },
      {
        label: 'Risk Level',
        value: advancedMetrics.riskLevel,
        trend:
          advancedMetrics.riskLevel === 'low'
            ? 'up'
            : advancedMetrics.riskLevel === 'medium'
              ? 'neutral'
              : 'down',
        format: 'text',
        timeframe: selectedTimeframe,
        status:
          advancedMetrics.riskLevel === 'low'
            ? 'excellent'
            : advancedMetrics.riskLevel === 'medium'
              ? 'good'
              : advancedMetrics.riskLevel === 'high'
                ? 'warning'
                : 'critical',
        icon: '🛡️',
        priority: 5,
      },

      // Trading Activity Metrics
      {
        label: 'Win Rate',
        value: advancedMetrics.winRate / 100,
        trend:
          advancedMetrics.winRate > 60
            ? 'up'
            : advancedMetrics.winRate > 40
              ? 'neutral'
              : 'down',
        format: 'percentage',
        timeframe: selectedTimeframe,
        target: 0.6,
        status:
          advancedMetrics.winRate > 70
            ? 'excellent'
            : advancedMetrics.winRate > 50
              ? 'good'
              : advancedMetrics.winRate > 30
                ? 'warning'
                : 'critical',
        icon: '🎲',
        priority: 6,
      },
      {
        label: 'Profit Factor',
        value: advancedMetrics.profitFactor,
        trend:
          advancedMetrics.profitFactor > 1.5
            ? 'up'
            : advancedMetrics.profitFactor > 1
              ? 'neutral'
              : 'down',
        format: 'ratio',
        timeframe: selectedTimeframe,
        target: 1.5,
        status:
          advancedMetrics.profitFactor > 2
            ? 'excellent'
            : advancedMetrics.profitFactor > 1.2
              ? 'good'
              : advancedMetrics.profitFactor > 1
                ? 'warning'
                : 'critical',
        icon: '⚖️',
        priority: 7,
      },
      {
        label: 'Sharpe Ratio',
        value: advancedMetrics.sharpeRatio,
        trend:
          advancedMetrics.sharpeRatio > 1
            ? 'up'
            : advancedMetrics.sharpeRatio > 0
              ? 'neutral'
              : 'down',
        format: 'ratio',
        timeframe: selectedTimeframe,
        target: 1.5,
        status:
          advancedMetrics.sharpeRatio > 2
            ? 'excellent'
            : advancedMetrics.sharpeRatio > 1
              ? 'good'
              : advancedMetrics.sharpeRatio > 0
                ? 'warning'
                : 'critical',
        icon: '📐',
        priority: 9,
      },

      // Volume and Activity Metrics
      {
        label: 'Total Volume',
        value: advancedMetrics.totalVolume,
        trend: 'neutral',
        format: 'currency',
        timeframe: selectedTimeframe,
        status: 'good',
        icon: '💹',
        priority: 10,
      },
      {
        label: 'Avg Position Size',
        value: advancedMetrics.avgPositionSize,
        trend: 'neutral',
        format: 'currency',
        timeframe: selectedTimeframe,
        status: 'good',
        icon: '📏',
        priority: 11,
      },
      {
        label: 'Total Transactions',
        value: transaction_summary.total,
        trend: 'up',
        format: 'number',
        timeframe: selectedTimeframe,
        status:
          transaction_summary.total > 10
            ? 'excellent'
            : transaction_summary.total > 5
              ? 'good'
              : 'warning',
        icon: '📋',
        priority: 12,
      },
    ];

    // Sort by priority and filter
    let sortedKpis = kpis.sort(
      (a, b) => (a.priority || 999) - (b.priority || 999)
    );

    // Filter KPIs if specific keys are requested
    if (kpiKeys) {
      sortedKpis = sortedKpis.filter(kpi =>
        kpiKeys.some(key => kpi.label.toLowerCase().includes(key.toLowerCase()))
      );
    }

    return sortedKpis.slice(0, maxItems);
  };

  const formatValue = (
    value: number | string,
    format: KPIData['format']
  ): string => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
          notation: Math.abs(value) >= 1000000 ? 'compact' : 'standard',
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'number':
        return value.toLocaleString();
      case 'text':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1);
      default:
        return value.toLocaleString();
    }
  };

  // Advanced status color mapping with gradients
  const getAdvancedStatusStyle = (
    status: KPIData['status'],
    isDark: boolean,
    priority?: number
  ) => {
    const baseStyles = {
      excellent: isDark
        ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/40 text-green-300 shadow-green-500/20'
        : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 text-green-700 shadow-green-200/50',
      good: isDark
        ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-500/40 text-blue-300 shadow-blue-500/20'
        : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 text-blue-700 shadow-blue-200/50',
      warning: isDark
        ? 'bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border-yellow-500/40 text-yellow-300 shadow-yellow-500/20'
        : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 text-yellow-700 shadow-yellow-200/50',
      critical: isDark
        ? 'bg-gradient-to-br from-red-900/30 to-pink-900/20 border-red-500/40 text-red-300 shadow-red-500/20'
        : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300 text-red-700 shadow-red-200/50',
    };

    const priorityGlow =
      priority && priority <= 3
        ? 'shadow-lg transform hover:scale-105'
        : 'shadow-md hover:shadow-lg';
    return `${baseStyles[status]} ${priorityGlow} transition-all duration-300`;
  };



  const getTrendIcon = (trend: KPIData['trend']) => {
    switch (trend) {
      case 'up':
        return <span className='text-green-500'>↗</span>;
      case 'down':
        return <span className='text-red-500'>↙</span>;
      default:
        return <span className='text-gray-500'>→</span>;
    }
  };

  if (loading) {
    return (
      <div className={`performance-kpi ${className}`}>
        <div
          className={`grid ${layout === 'grid' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1'} gap-4`}
        >
          {Array.from({ length: maxItems }).map((_, i) => (
            <div
              key={i}
              className={`animate-pulse border rounded-lg p-4 ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div
                className={`h-4 rounded mb-2 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              ></div>
              <div
                className={`h-8 rounded mb-2 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              ></div>
              <div
                className={`h-3 rounded w-1/2 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              ></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`performance-kpi ${className}`}>
        <div
          className={`border rounded-lg p-6 text-center ${
            theme === 'dark'
              ? 'bg-red-900/20 border-red-500/30 text-red-400'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          <div className='text-lg font-medium mb-2'>Failed to load KPIs</div>
          <div className='text-sm opacity-75'>{error}</div>
        </div>
      </div>
    );
  }

  const kpiData = generateAdvancedKPIs();

  return (
    <div className={`performance-kpi ${className}`}>
      {/* Enhanced Header with Real-time Indicators */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center space-x-4'>
          <div>
            <h3
              className={`text-xl font-bold flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              📊 Advanced Performance Analytics
              {loading && (
                <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
              )}
            </h3>
            <div className='flex items-center space-x-4 text-xs mt-1'>
              {lastUpdated && (
                <p
                  className={
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }
                >
                  🔄 Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
              {advancedMetrics && (
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    advancedMetrics.riskLevel === 'low'
                      ? 'bg-green-100 text-green-800'
                      : advancedMetrics.riskLevel === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : advancedMetrics.riskLevel === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                  }`}
                >
                  Risk: {advancedMetrics.riskLevel.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='flex items-center space-x-3'>
          {/* Alerts Toggle */}
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
              alertsEnabled
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔔 Alerts {alertsEnabled ? 'ON' : 'OFF'}
          </button>

          {/* Timeframe Selector */}
          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value as any)}
            className={`text-sm px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
            } transition-all`}
          >
            <option value='1d'>24 Hours</option>
            <option value='7d'>7 Days</option>
            <option value='30d'>30 Days</option>
            <option value='90d'>90 Days</option>
            <option value='all'>All Time</option>
          </select>
        </div>
      </div>

      {/* Active Alerts Bar */}
      {activeAlerts.length > 0 && (
        <div className='mb-4 p-3 rounded-lg bg-red-50 border border-red-200'>
          <div className='flex items-center space-x-2'>
            <span className='text-red-600 font-medium'>⚠️ Active Alerts:</span>
            <div className='flex flex-wrap gap-2'>
              {activeAlerts.map((alert, index) => (
                <span
                  key={index}
                  className='px-2 py-1 bg-red-100 text-red-700 rounded text-xs'
                >
                  {alert}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced KPI Cards Grid */}
      <div
        className={`grid gap-6 ${
          layout === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : layout === 'list'
              ? 'grid-cols-1 max-w-4xl'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {kpiData.map((kpi, index) => (
          <div
            key={`${kpi.label}-${index}`}
            className={`relative border-2 rounded-xl p-6 cursor-pointer ${getAdvancedStatusStyle(
              kpi.status,
              theme === 'dark',
              kpi.priority
            )}`}
            title={`Priority ${kpi.priority || 'N/A'} • Last updated: ${lastUpdated?.toLocaleTimeString()}`}
          >
            {/* Priority Indicator */}
            {kpi.priority && kpi.priority <= 3 && (
              <div className='absolute top-2 right-2'>
                <div className='w-2 h-2 bg-yellow-400 rounded-full animate-pulse'></div>
              </div>
            )}

            {/* Header with Icon and Label */}
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center space-x-2'>
                {kpi.icon && <span className='text-lg'>{kpi.icon}</span>}
                <span
                  className={`text-sm font-semibold tracking-wide uppercase ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {kpi.label}
                </span>
              </div>
              {showTrends && (
                <div className='flex items-center space-x-1'>
                  {getTrendIcon(kpi.trend)}
                  {kpi.priority && kpi.priority <= 5 && (
                    <span className='text-xs text-yellow-600'>★</span>
                  )}
                </div>
              )}
            </div>

            {/* Main Value Display */}
            <div
              className={`text-3xl font-black mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              {formatValue(kpi.value, kpi.format)}
            </div>

            {/* Additional Info Row */}
            <div className='flex items-center justify-between text-xs'>
              <div className='flex flex-col space-y-1'>
                {showTargets && kpi.target && (
                  <div
                    className={
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }
                  >
                    Target: {formatValue(kpi.target, kpi.format)}
                  </div>
                )}

                {kpi.changePercent !== undefined &&
                  Math.abs(kpi.changePercent) > 0.01 && (
                    <div
                      className={`flex items-center ${
                        kpi.changePercent >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      <span className='mr-1 text-sm'>
                        {kpi.changePercent >= 0 ? '↗️' : '↘️'}
                      </span>
                      {Math.abs(kpi.changePercent).toFixed(1)}%
                    </div>
                  )}
              </div>

              {/* Status Badge */}
              <div
                className={`px-2 py-1 rounded-full text-xs font-bold ${
                  kpi.status === 'excellent'
                    ? 'bg-green-200 text-green-800'
                    : kpi.status === 'good'
                      ? 'bg-blue-200 text-blue-800'
                      : kpi.status === 'warning'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                }`}
              >
                {kpi.status.toUpperCase()}
              </div>
            </div>

            {/* Risk Level Specific Indicators */}
            {kpi.label === 'Risk Level' && advancedMetrics && (
              <div className='mt-3 text-xs'>
                <div className='flex justify-between'>
                  <span>Volatility:</span>
                  <span className='font-medium'>
                    {advancedMetrics.volatility.toFixed(1)}%
                  </span>
                </div>
                <div className='flex justify-between mt-1'>
                  <span>Max DD:</span>
                  <span className='font-medium'>
                    {advancedMetrics.maxDrawdown.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Performance Summary Footer */}
      {advancedMetrics && (
        <div
          className={`mt-8 p-4 rounded-lg ${
            theme === 'dark'
              ? 'bg-gray-800/50 border border-gray-700'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
            <div className='text-center'>
              <div
                className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {formatValue(advancedMetrics.totalVolume, 'currency')}
              </div>
              <div
                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
              >
                Total Volume
              </div>
            </div>
            <div className='text-center'>
              <div
                className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {advancedMetrics.winRate.toFixed(1)}%
              </div>
              <div
                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
              >
                Win Rate
              </div>
            </div>
            <div className='text-center'>
              <div
                className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {advancedMetrics.profitFactor.toFixed(2)}
              </div>
              <div
                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
              >
                Profit Factor
              </div>
            </div>
            <div className='text-center'>
              <div
                className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {advancedMetrics.sharpeRatio.toFixed(2)}
              </div>
              <div
                className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
              >
                Sharpe Ratio
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
