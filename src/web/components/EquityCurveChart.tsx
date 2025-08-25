/**
 * Equity Curve Chart Component
 * Historical performance visualization with Recharts
 * Features: Balance tracking, P&L visualization, drawdown analysis
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { useTheme } from '../hooks/useTheme';
import { useAPI } from '../hooks/useAPI';
import type { 
  EquityCurveChartProps,
  EquityCurveDataPoint,
  ChartConfig
} from '../shared/analytics-types';

export function EquityCurveChart({
  customerId,
  timeframe = '30d',
  refreshInterval = 30000,
  className = '',
  chartConfig = {},
  showDrawdown = true,
  showBenchmark = false,
  benchmarkData,
  annotations = [],
  onError,
  onDataUpdate
}: EquityCurveChartProps) {
  const { theme } = useTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [showTooltipDetails, setShowTooltipDetails] = useState(true);

  // Default chart configuration with theme support
  const defaultConfig: ChartConfig = {
    type: 'area',
    theme: theme,
    height: 400,
    showGrid: true,
    showTooltip: true,
    showLegend: true,
    colors: {
      primary: theme === 'dark' ? '#60a5fa' : '#3b82f6',
      secondary: theme === 'dark' ? '#34d399' : '#10b981',
      positive: theme === 'dark' ? '#34d399' : '#10b981',
      negative: theme === 'dark' ? '#f87171' : '#ef4444',
      neutral: theme === 'dark' ? '#9ca3af' : '#6b7280'
    },
    timeFormat: 'MMM dd',
    valueFormat: '$,.2f',
    ...chartConfig
  };

  // Fetch equity curve data
  const { data: equityData, error, loading, lastUpdated } = useAPI<{
    equity_curve: EquityCurveDataPoint[];
    timeframe: string;
    stats: {
      total_return: number;
      max_balance: number;
      min_balance: number;
      max_drawdown: number;
      volatility: number;
    };
  }>(`/customer/equity-curve?timeframe=${selectedTimeframe}`, {
    customerId,
    refreshInterval,
    dependencies: [selectedTimeframe],
    cacheTTL: refreshInterval / 2
  });

  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
    if (equityData && onDataUpdate) {
      onDataUpdate(equityData);
    }
  }, [error, equityData, onError, onDataUpdate]);

  // Process and format chart data
  const chartData = useMemo(() => {
    if (!equityData?.equity_curve) return [];

    return equityData.equity_curve.map((point, index) => ({
      ...point,
      timestamp: new Date(point.timestamp),
      date: new Date(point.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(selectedTimeframe === '1y' || selectedTimeframe === 'all' ? { year: 'numeric' } : {})
      }),
      drawdownPercent: Math.abs(point.drawdown * 100),
      balanceChange: index > 0 ? point.balance - equityData.equity_curve[index - 1].balance : 0,
      benchmark: benchmarkData?.[index]?.balance || null
    }));
  }, [equityData?.equity_curve, benchmarkData, selectedTimeframe]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className={`p-4 rounded-lg shadow-lg border ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-600 text-white' 
          : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <div className="font-medium mb-2">{label}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Balance:</span>
            <span className="font-medium">
              ${data.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Daily P&L:</span>
            <span className={`font-medium ${
              data.daily_change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {data.daily_change >= 0 ? '+' : ''}${data.daily_change.toFixed(2)} 
              ({data.daily_change_percent >= 0 ? '+' : ''}{(data.daily_change_percent * 100).toFixed(2)}%)
            </span>
          </div>
          {showDrawdown && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">Drawdown:</span>
              <span className="font-medium text-red-500">
                -{data.drawdownPercent.toFixed(2)}%
              </span>
            </div>
          )}
          {data.benchmark && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">Benchmark:</span>
              <span className="font-medium">
                ${data.benchmark.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">High Water Mark:</span>
            <span className="font-medium">
              ${data.high_water_mark.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Format axis values
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className={`equity-curve-chart ${className}`}>
        <div className={`animate-pulse border rounded-lg p-6 ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className={`h-6 rounded mb-4 ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}></div>
          <div className={`h-${defaultConfig.height / 16} rounded ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`equity-curve-chart ${className}`}>
        <div className={`border rounded-lg p-6 text-center ${
          theme === 'dark' 
            ? 'bg-red-900/20 border-red-500/30 text-red-400' 
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <div className="text-lg font-medium mb-2">Failed to load equity curve</div>
          <div className="text-sm opacity-75">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`equity-curve-chart ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Equity Curve
          </h3>
          {equityData?.stats && (
            <div className={`text-sm mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Total Return: 
              <span className={`ml-1 font-medium ${
                equityData.stats.total_return >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {equityData.stats.total_return >= 0 ? '+' : ''}{equityData.stats.total_return.toFixed(2)}%
              </span>
              {' • '}
              Max Drawdown: 
              <span className="ml-1 font-medium text-red-500">
                -{Math.abs(equityData.stats.max_drawdown * 100).toFixed(2)}%
              </span>
            </div>
          )}
          {lastUpdated && (
            <p className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'area')}
            className={`text-sm px-3 py-1 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="area">Area Chart</option>
            <option value="line">Line Chart</option>
          </select>

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className={`text-sm px-3 py-1 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
            <option value="1y">1 Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className={`border rounded-lg p-4 ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`} style={{ height: defaultConfig.height + 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={defaultConfig.colors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={defaultConfig.colors.primary} stopOpacity={0} />
                </linearGradient>
                {showDrawdown && (
                  <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={defaultConfig.colors.negative} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={defaultConfig.colors.negative} stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              
              {defaultConfig.showGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
              )}
              
              <XAxis 
                dataKey="date" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
              />
              
              {defaultConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
              
              {defaultConfig.showLegend && (
                <Legend 
                  wrapperStyle={{ 
                    color: theme === 'dark' ? '#f3f4f6' : '#374151' 
                  }} 
                />
              )}

              <Area
                type="monotone"
                dataKey="balance"
                stroke={defaultConfig.colors.primary}
                strokeWidth={2}
                fill="url(#balanceGradient)"
                name="Balance"
              />

              {showBenchmark && benchmarkData && (
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke={defaultConfig.colors.secondary}
                  strokeWidth={1}
                  strokeDasharray="5,5"
                  fill="none"
                  name="Benchmark"
                />
              )}

              {showDrawdown && (
                <Area
                  type="monotone"
                  dataKey="drawdownPercent"
                  stroke={defaultConfig.colors.negative}
                  strokeWidth={1}
                  fill="url(#drawdownGradient)"
                  name="Drawdown %"
                  yAxisId="right"
                />
              )}

              {/* Reference line for break-even */}
              <ReferenceLine 
                y={equityData?.equity_curve?.[0]?.balance || 0} 
                stroke={defaultConfig.colors.neutral}
                strokeDasharray="2,2"
                label="Initial Balance"
              />

              {/* Brush for time selection */}
              <Brush 
                dataKey="date" 
                height={30}
                stroke={defaultConfig.colors.primary}
                fill={theme === 'dark' ? '#1f2937' : '#f9fafb'}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              {defaultConfig.showGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
              )}
              
              <XAxis 
                dataKey="date" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
              />
              
              {defaultConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
              
              {defaultConfig.showLegend && (
                <Legend 
                  wrapperStyle={{ 
                    color: theme === 'dark' ? '#f3f4f6' : '#374151' 
                  }} 
                />
              )}

              <Line
                type="monotone"
                dataKey="balance"
                stroke={defaultConfig.colors.primary}
                strokeWidth={2}
                dot={false}
                name="Balance"
              />

              {showBenchmark && benchmarkData && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke={defaultConfig.colors.secondary}
                  strokeWidth={1}
                  strokeDasharray="5,5"
                  dot={false}
                  name="Benchmark"
                />
              )}

              <ReferenceLine 
                y={equityData?.equity_curve?.[0]?.balance || 0} 
                stroke={defaultConfig.colors.neutral}
                strokeDasharray="2,2"
                label="Initial Balance"
              />

              <Brush 
                dataKey="date" 
                height={30}
                stroke={defaultConfig.colors.primary}
                fill={theme === 'dark' ? '#1f2937' : '#f9fafb'}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Statistics */}
      {equityData?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className={`text-center p-3 rounded ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Max Balance
            </div>
            <div className={`font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              ${equityData.stats.max_balance.toLocaleString()}
            </div>
          </div>
          <div className={`text-center p-3 rounded ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Min Balance
            </div>
            <div className={`font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              ${equityData.stats.min_balance.toLocaleString()}
            </div>
          </div>
          <div className={`text-center p-3 rounded ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Volatility
            </div>
            <div className={`font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {(equityData.stats.volatility * 100).toFixed(2)}%
            </div>
          </div>
          <div className={`text-center p-3 rounded ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Total Return
            </div>
            <div className={`font-bold ${
              equityData.stats.total_return >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {equityData.stats.total_return >= 0 ? '+' : ''}{equityData.stats.total_return.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Annotations */}
      {annotations.length > 0 && (
        <div className="mt-4">
          <h4 className={`text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Key Events
          </h4>
          <div className="space-y-2">
            {annotations.map((annotation, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm p-2 rounded ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  annotation.type === 'success' ? 'bg-green-500' :
                  annotation.type === 'warning' ? 'bg-yellow-500' :
                  annotation.type === 'error' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}></span>
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {new Date(annotation.timestamp).toLocaleDateString()}
                </span>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {annotation.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}