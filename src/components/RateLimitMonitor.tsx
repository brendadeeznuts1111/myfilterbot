import React, { useState, useEffect } from 'react';

interface RateLimitStatus {
  global: {
    tokens: number;
    maxTokens: number;
  };
  activeChatLimits: number;
  activeGroupLimits: number;
}

interface TelegramLimits {
  global: string;
  perChat: string;
  perGroup: string;
  batchLimit: string;
}

export const RateLimitMonitor: React.FC = () => {
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [telegramLimits, setTelegramLimits] = useState<TelegramLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const workerUrl = process.env.REACT_APP_WORKER_URL || 'http://localhost:8787';

  const fetchRateLimitStatus = async () => {
    try {
      const response = await fetch(`${workerUrl}/api/rate-limit`);
      if (!response.ok) throw new Error('Failed to fetch rate limit status');
      
      const data = await response.json();
      setRateLimit(data.rateLimit);
      setTelegramLimits(data.telegram);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLimitStatus();
    const interval = setInterval(fetchRateLimitStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getTokenPercentage = () => {
    if (!rateLimit) return 0;
    return (rateLimit.global.tokens / rateLimit.global.maxTokens) * 100;
  };

  const getTokenColor = (percentage: number) => {
    if (percentage > 66) return '#10b981'; // green
    if (percentage > 33) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Rate Limit Monitor Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchRateLimitStatus}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const percentage = getTokenPercentage();
  const tokenColor = getTokenColor(percentage);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📊 Rate Limit Monitor</h2>
        <div className="text-sm text-gray-500">
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Global Rate Limit */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-700">Global Rate Limit</h3>
          <span className="text-lg font-bold" style={{ color: tokenColor }}>
            {rateLimit?.global.tokens}/{rateLimit?.global.maxTokens} tokens
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: tokenColor
            }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {telegramLimits?.global}
        </p>
      </div>

      {/* Active Limits */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {rateLimit?.activeChatLimits || 0}
          </div>
          <div className="text-sm text-gray-600">Active Chat Limits</div>
          <div className="text-xs text-gray-500 mt-1">{telegramLimits?.perChat}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {rateLimit?.activeGroupLimits || 0}
          </div>
          <div className="text-sm text-gray-600">Active Group Limits</div>
          <div className="text-xs text-gray-500 mt-1">{telegramLimits?.perGroup}</div>
        </div>
      </div>

      {/* Telegram Limits Info */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Telegram API Limits</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Global: {telegramLimits?.global}</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Per Chat: {telegramLimits?.perChat}</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Per Group: {telegramLimits?.perGroup}</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Batch: {telegramLimits?.batchLimit}</span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${percentage > 20 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
          <span className="text-sm text-gray-600">
            {percentage > 20 ? 'Healthy' : 'Rate Limited'}
          </span>
        </div>
        <button
          onClick={fetchRateLimitStatus}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};