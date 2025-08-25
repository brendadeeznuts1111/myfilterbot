/**
 * Equity Curve Chart Component
 * Interactive balance visualization with Recharts
 * Optimized for real-time updates from Bun API
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { useCustomerAnalytics } from '../../hooks/useEnhancedAPI';

interface EquityCurveChartProps {
  customerId?: string;
  className?: string;
  height?: number;
  showArea?: boolean;
  showGrid?: boolean;
  animate?: boolean;
}

interface ChartDataPoint {
  date: string;
  balance: number;
  timestamp: number;
  formattedDate: string;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const balance = payload[0].value;

  return (
    <div className="bg-white p-4 border rounded-lg shadow-lg">
      <p className="text-sm font-medium text-gray-800 mb-2">{data.formattedDate}</p>
      <p className="text-lg font-bold text-blue-600">
        ${balance?.toLocaleString()}
      </p>
    </div>
  );
};

// Loading Skeleton
const ChartSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div className="bg-white rounded-lg p-6" style={{ height }}>
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        <div className="h-4 bg-gray-200 rounded w-3/6"></div>
      </div>
    </div>
  </div>
);

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  customerId = 'BB895', // Customer with real transaction data
  className = '',
  height = 400,
  showArea = true,
  showGrid = true,
  animate = true,
}) => {
  const { analytics, isLoading, error, lastUpdated } = useCustomerAnalytics();
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null);
  const [viewMode, setViewMode] = useState<'line' | 'area'>('area');

  // Process balance trend data for chart
  const chartData = useMemo(() => {
    if (!analytics?.balance_trend || analytics.balance_trend.length === 0) {
      return [];
    }

    return analytics.balance_trend.map((balance, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (analytics.balance_trend.length - 1 - index));
      
      return {
        date: date.toISOString().split('T')[0],
        balance: Math.round(balance),
        timestamp: date.getTime(),
        formattedDate: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
      };
    });
  }, [analytics?.balance_trend]);

  // Calculate trend metrics
  const trendMetrics = useMemo(() => {
    if (chartData.length < 2) return null;

    const firstValue = chartData[0].balance;
    const lastValue = chartData[chartData.length - 1].balance;
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;
    const maxValue = Math.max(...chartData.map(d => d.balance));
    const minValue = Math.min(...chartData.map(d => d.balance));
    
    return {
      change,
      changePercent,
      isPositive: change > 0,
      maxValue,
      minValue,
      range: maxValue - minValue,
    };
  }, [chartData]);

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 text-center" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">
            <p className="text-lg mb-2">📊</p>
            <p className="text-sm">Unable to load chart data</p>
            <p className="text-xs text-gray-400 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 text-center" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">
            <p className="text-lg mb-2">📈</p>
            <p className="text-sm">No balance data available</p>
          </div>
        </div>
      </div>
    );
  }

  const ChartComponent = showArea ? AreaChart : LineChart;
  const gradientId = `balanceGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            📈 Balance Trend (30 Days)
            {lastUpdated && (
              <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            )}
          </h3>
          {trendMetrics && (
            <div className="flex items-center mt-2 space-x-4">
              <div className={`text-sm font-medium ${
                trendMetrics.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trendMetrics.isPositive ? '+' : ''}${trendMetrics.change.toLocaleString()} 
                ({trendMetrics.changePercent > 0 ? '+' : ''}{trendMetrics.changePercent.toFixed(1)}%)
              </div>
              <div className="text-xs text-gray-500">
                Range: ${trendMetrics.minValue.toLocaleString()} - ${trendMetrics.maxValue.toLocaleString()}
              </div>
            </div>
          )}
        </div>
        
        {/* View Controls */}
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('area')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'area' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setViewMode('line')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'line' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height - 120}>
        <ChartComponent
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onMouseMove={(data) => {
            if (data?.activePayload?.[0]) {
              setSelectedPoint(data.activePayload[0].payload);
            }
          }}
          onMouseLeave={() => setSelectedPoint(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="5%" 
                stopColor={trendMetrics?.isPositive ? "#10B981" : "#EF4444"} 
                stopOpacity={0.3}
              />
              <stop 
                offset="95%" 
                stopColor={trendMetrics?.isPositive ? "#10B981" : "#EF4444"} 
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>

          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f0f0f0"
            opacity={showGrid ? 1 : 0}
          />
          
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Reference line for break-even */}
          {trendMetrics && (
            <ReferenceLine 
              y={chartData[0]?.balance} 
              stroke="#9CA3AF" 
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
          )}

          {showArea && viewMode === 'area' ? (
            <Area
              type="monotone"
              dataKey="balance"
              stroke={trendMetrics?.isPositive ? "#10B981" : "#EF4444"}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              animationDuration={animate ? 1000 : 0}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="balance"
              stroke={trendMetrics?.isPositive ? "#10B981" : "#EF4444"}
              strokeWidth={3}
              dot={false}
              activeDot={{ 
                r: 6, 
                fill: trendMetrics?.isPositive ? "#10B981" : "#EF4444",
                strokeWidth: 2,
                stroke: '#fff'
              }}
              animationDuration={animate ? 1000 : 0}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Selected Point Info */}
      {selectedPoint && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{selectedPoint.formattedDate}</span>
            <span className="text-lg font-semibold text-gray-900">
              ${selectedPoint.balance.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Last updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)} seconds ago
        </div>
      )}
    </div>
  );
};

export default EquityCurveChart;