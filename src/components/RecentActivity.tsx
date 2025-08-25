/**
 * Enhanced Recent Activity Component
 * Advanced real-time transaction feed with intelligent analysis
 * Features: Smart filtering, risk analysis, pattern detection, live updates
 */

import React, { useState, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAPI } from '../hooks/useAPI';
import type {
  RecentActivityProps,
  TransactionData,
  FilterOptions,
} from '../shared/analytics-types';

// Advanced transaction analysis utilities
const calculateTransactionVelocity = (
  transactions: TransactionData[]
): number => {
  if (transactions.length < 2) return 0;

  const sortedTxns = transactions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const recentTxns = sortedTxns.slice(0, 10);
  const timeSpan =
    new Date(recentTxns[0].timestamp).getTime() -
    new Date(recentTxns[recentTxns.length - 1].timestamp).getTime();

  return timeSpan > 0 ? recentTxns.length / (timeSpan / (1000 * 60 * 60)) : 0; // txns per hour
};

const detectTransactionPatterns = (
  transactions: TransactionData[]
): {
  suspiciousPattern: boolean;
  rapidFire: boolean;
  roundNumbers: boolean;
  unusualTimes: boolean;
} => {
  const rapidFire = transactions.some((txn, index) => {
    if (index === 0) return false;
    const timeDiff =
      new Date(transactions[index - 1].timestamp).getTime() -
      new Date(txn.timestamp).getTime();
    return timeDiff < 60000; // Less than 1 minute apart
  });

  const roundNumbers =
    transactions.filter(
      txn => txn.amount % 1000 === 0 || txn.amount % 500 === 0
    ).length >
    transactions.length * 0.7;

  const unusualTimes =
    transactions.filter(txn => {
      const hour = new Date(txn.timestamp).getHours();
      return hour < 6 || hour > 22; // Before 6 AM or after 10 PM
    }).length >
    transactions.length * 0.3;

  return {
    suspiciousPattern: rapidFire || (roundNumbers && unusualTimes),
    rapidFire,
    roundNumbers,
    unusualTimes,
  };
};

const getTransactionRiskScore = (transaction: TransactionData): number => {
  let risk = 0;

  // Amount-based risk
  if (Math.abs(transaction.amount) > 100000) risk += 3;
  else if (Math.abs(transaction.amount) > 50000) risk += 2;
  else if (Math.abs(transaction.amount) > 10000) risk += 1;

  // Type-based risk
  if (transaction.type === 'withdrawal') risk += 1;

  // Status-based risk
  if (transaction.status === 'failed') risk += 2;
  else if (transaction.status === 'pending') risk += 1;

  // Description analysis
  if (
    transaction.description.includes('CASHAPP') ||
    transaction.description.includes('CHIME')
  )
    risk += 1;

  return Math.min(risk, 10) / 10; // Normalize to 0-1
};

export function RecentActivity({
  customerId,
  timeframe = '7d',
  refreshInterval = 5000, // Faster updates for real-time feel
  className = '',
  maxItems = 30,
  showFilters = true,
  groupByDate = true,
  highlightLarge = true,
  largeTransactionThreshold = 10000,
  onError,
  onDataUpdate,
}: RecentActivityProps) {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<Partial<FilterOptions>>({
    timeframe,
    transaction_types: [],
    status_filter: [],
    sort_by: 'timestamp',
    sort_order: 'desc',
    limit: maxItems,
  });

  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null
  );
  const [riskAnalysisEnabled, setRiskAnalysisEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Enhanced transaction data fetching with real-time analysis
  const {
    data: transactionData,
    error,
    loading,
    lastUpdated,
  } = useAPI<{
    success: boolean;
    transactions: Array<{
      id: string;
      customer_id: string;
      type: 'deposit' | 'withdrawal' | 'trade' | 'bonus';
      amount: number;
      status: 'pending' | 'completed' | 'failed';
      timestamp: string;
      description: string;
      reference?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }>(
    `/customer/transactions?${new URLSearchParams({
      page: '1',
      limit: (filters.limit || maxItems).toString(),
      ...(filters.transaction_types?.length && {
        type: filters.transaction_types.join(','),
      }),
      ...(filters.status_filter?.length && {
        status: filters.status_filter.join(','),
      }),
    })}`,
    {
      customerId,
      refreshInterval: autoRefresh ? refreshInterval : 0,
      dependencies: [filters, autoRefresh],
      cacheTTL: 1000, // Very short cache for real-time updates
    }
  );

  // Enhanced transaction analysis
  const transactionAnalysis = useMemo(() => {
    if (!transactionData?.transactions) return null;

    const transactions = transactionData.transactions.map(tx => ({
      ...tx,
      risk_score: getTransactionRiskScore(tx),
      balance_after: 0, // Will be calculated
      metadata: {
        method: tx.description.includes('CASHAPP')
          ? 'CashApp'
          : tx.description.includes('CHIME')
            ? 'Chime'
            : 'Other',
        reference: tx.reference,
      },
      tags: [
        tx.type === 'withdrawal' ? 'outgoing' : 'incoming',
        Math.abs(tx.amount) > largeTransactionThreshold ? 'large' : 'standard',
        tx.status === 'failed'
          ? 'failed'
          : tx.status === 'pending'
            ? 'pending'
            : 'completed',
      ],
    })) as TransactionData[];

    // Calculate running balance (simplified)
    let runningBalance = 0;
    transactions.reverse().forEach(tx => {
      runningBalance += tx.amount;
      tx.balance_after = runningBalance;
    });
    transactions.reverse();

    const velocity = calculateTransactionVelocity(transactions);
    const patterns = detectTransactionPatterns(transactions);

    // Risk categorization
    const highRiskTxns = transactions.filter(tx => tx.risk_score > 0.7);
    const largeTxns = transactions.filter(
      tx => Math.abs(tx.amount) > largeTransactionThreshold
    );
    const failedTxns = transactions.filter(tx => tx.status === 'failed');

    return {
      transactions,
      velocity,
      patterns,
      insights: {
        totalTransactions: transactions.length,
        highRiskCount: highRiskTxns.length,
        largeTransactionCount: largeTxns.length,
        failedTransactionCount: failedTxns.length,
        averageAmount:
          transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) /
          transactions.length,
        netFlow: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      },
    };
  }, [transactionData, largeTransactionThreshold]);

  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
    if (transactionData && onDataUpdate) {
      onDataUpdate(transactionData);
    }
  }, [error, transactionData, onError, onDataUpdate]);

  // Group transactions by date if enabled
  const groupedTransactions = useMemo(() => {
    if (!transactionData?.transactions || !groupByDate) {
      return { ungrouped: transactionData?.transactions || [] };
    }

    const grouped = transactionData.transactions.reduce(
      (groups, transaction) => {
        const date = new Date(transaction.timestamp).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
      },
      {} as Record<string, TransactionData[]>
    );

    return grouped;
  }, [transactionData?.transactions, groupByDate]);

  const getTransactionTypeColor = (type: TransactionData['type']) => {
    const colors = {
      deposit:
        theme === 'dark'
          ? 'text-green-400 bg-green-900/20'
          : 'text-green-600 bg-green-50',
      withdrawal:
        theme === 'dark'
          ? 'text-red-400 bg-red-900/20'
          : 'text-red-600 bg-red-50',
      trade:
        theme === 'dark'
          ? 'text-blue-400 bg-blue-900/20'
          : 'text-blue-600 bg-blue-50',
      bonus:
        theme === 'dark'
          ? 'text-purple-400 bg-purple-900/20'
          : 'text-purple-600 bg-purple-50',
      fee:
        theme === 'dark'
          ? 'text-orange-400 bg-orange-900/20'
          : 'text-orange-600 bg-orange-50',
      adjustment:
        theme === 'dark'
          ? 'text-yellow-400 bg-yellow-900/20'
          : 'text-yellow-600 bg-yellow-50',
    };
    return (
      colors[type] ||
      (theme === 'dark'
        ? 'text-gray-400 bg-gray-900/20'
        : 'text-gray-600 bg-gray-50')
    );
  };

  const getStatusColor = (status: TransactionData['status']) => {
    const colors = {
      completed: theme === 'dark' ? 'text-green-400' : 'text-green-600',
      pending: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600',
      processing: theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
      failed: theme === 'dark' ? 'text-red-400' : 'text-red-600',
      cancelled: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    };
    return (
      colors[status] || (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')
    );
  };

  const formatAmount = (amount: number, type: TransactionData['type']) => {
    const prefix = type === 'withdrawal' || type === 'fee' ? '-' : '+';
    return `${prefix}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };



  const renderEnhancedTransactionItem = (transaction: TransactionData) => {
    const isSelected = selectedTransaction === transaction.id;
    const riskScore = transaction.risk_score || 0;
    const isHighRisk = riskScore > 0.7;
    const isLarge = Math.abs(transaction.amount) > largeTransactionThreshold;

    return (
      <div
        key={transaction.id}
        className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
          isSelected
            ? 'ring-2 ring-blue-500 shadow-lg transform scale-[1.02]'
            : 'hover:shadow-md hover:border-blue-300'
        } ${
          isHighRisk && riskAnalysisEnabled
            ? theme === 'dark'
              ? 'bg-gradient-to-r from-red-900/20 to-orange-900/15 border-red-500/30'
              : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
            : isLarge
              ? theme === 'dark'
                ? 'bg-gradient-to-r from-purple-900/10 to-blue-900/10 border-purple-500/20'
                : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
              : theme === 'dark'
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
        onClick={() =>
          setSelectedTransaction(isSelected ? null : transaction.id)
        }
      >
        {/* Risk indicator */}
        {riskAnalysisEnabled && isHighRisk && (
          <div className='absolute top-2 right-2'>
            <div
              className='w-3 h-3 bg-red-500 rounded-full animate-pulse'
              title={`Risk Score: ${(riskScore * 100).toFixed(0)}%`}
            ></div>
          </div>
        )}

        {/* Transaction priority indicator */}
        {isLarge && (
          <div className='absolute top-2 left-2'>
            <div className='px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full'>
              LARGE
            </div>
          </div>
        )}
        {/* Main transaction content */}
        <div className='flex items-start justify-between mt-3'>
          <div className='flex-1'>
            {/* Status and type badges */}
            <div className='flex items-center gap-2 mb-3'>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${getTransactionTypeColor(
                  transaction.type
                )}`}
              >
                {transaction.type === 'deposit'
                  ? '📥'
                  : transaction.type === 'withdrawal'
                    ? '📤'
                    : '💱'}
                {transaction.type.toUpperCase()}
              </span>

              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  transaction.status
                )}`}
              >
                {transaction.status === 'completed'
                  ? '✅'
                  : transaction.status === 'pending'
                    ? '⏳'
                    : '❌'}
                {transaction.status.toUpperCase()}
              </span>

              {riskAnalysisEnabled && riskScore > 0.5 && (
                <div
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    riskScore > 0.7
                      ? 'bg-red-100 text-red-800'
                      : riskScore > 0.5
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  🛡️ Risk: {(riskScore * 100).toFixed(0)}%
                </div>
              )}
            </div>

            {/* Transaction description */}
            <div
              className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              {transaction.description}
            </div>

            {/* Timestamp and metadata */}
            <div
              className={`text-sm mb-3 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <div className='flex items-center space-x-4'>
                <span>
                  🕒 {new Date(transaction.timestamp).toLocaleString()}
                </span>
                {transaction.metadata?.method && (
                  <span>💳 {transaction.metadata.method}</span>
                )}
                {transaction.metadata?.reference && (
                  <span>🔗 {transaction.metadata.reference}</span>
                )}
              </div>
            </div>

            {/* Tags */}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className='flex gap-2 flex-wrap'>
                {transaction.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs font-medium rounded-lg ${
                      theme === 'dark'
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Expanded details when selected */}
            {isSelected && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}
              >
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='font-medium'>Transaction ID:</span>
                    <div className='font-mono text-xs mt-1'>
                      {transaction.id}
                    </div>
                  </div>
                  <div>
                    <span className='font-medium'>Customer ID:</span>
                    <div className='font-mono text-xs mt-1'>
                      {transaction.customer_id}
                    </div>
                  </div>
                  {riskAnalysisEnabled && (
                    <div className='col-span-2'>
                      <span className='font-medium'>Risk Analysis:</span>
                      <div className='mt-1 text-xs'>
                        Risk Score: {(riskScore * 100).toFixed(1)}% | Amount
                        Tier:{' '}
                        {Math.abs(transaction.amount) > 50000
                          ? 'Very High'
                          : Math.abs(transaction.amount) > 10000
                            ? 'High'
                            : Math.abs(transaction.amount) > 1000
                              ? 'Medium'
                              : 'Low'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amount and balance section */}
          <div className='text-right ml-6'>
            <div
              className={`text-2xl font-black mb-1 ${
                transaction.amount < 0 ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {formatAmount(transaction.amount, transaction.type)}
            </div>

            <div
              className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Balance:{' '}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
              }).format(transaction.balance_after)}
            </div>

            {/* Time indicator */}
            <div
              className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {(() => {
                const timeDiff =
                  Date.now() - new Date(transaction.timestamp).getTime();
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor(
                  (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
                );

                if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
                if (hours > 0) return `${hours}h ago`;
                if (minutes > 0) return `${minutes}m ago`;
                return 'Just now';
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`recent-activity ${className}`}>
        <div className='animate-pulse space-y-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
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
                className={`h-6 rounded mb-2 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              ></div>
              <div
                className={`h-3 rounded w-1/3 ${
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
      <div className={`recent-activity ${className}`}>
        <div
          className={`border rounded-lg p-6 text-center ${
            theme === 'dark'
              ? 'bg-red-900/20 border-red-500/30 text-red-400'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          <div className='text-lg font-medium mb-2'>
            Failed to load activity
          </div>
          <div className='text-sm opacity-75'>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`recent-activity ${className}`}>
      {/* Enhanced Header with Analytics */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex-1'>
          <div className='flex items-center space-x-3 mb-2'>
            <h3
              className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              📈 Transaction Feed
            </h3>
            {loading && (
              <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
            )}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 text-xs rounded-full transition-all ${
                autoRefresh
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {autoRefresh ? '🔄 Live' : '⏸️ Paused'}
            </button>
          </div>

          {/* Real-time Analytics Bar */}
          {transactionAnalysis && (
            <div className='flex items-center space-x-6 text-sm'>
              <div
                className={`flex items-center space-x-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                <span>📊</span>
                <span>
                  {transactionAnalysis.insights.totalTransactions} transactions
                </span>
              </div>

              {transactionAnalysis.insights.netFlow !== 0 && (
                <div
                  className={`flex items-center space-x-1 ${
                    transactionAnalysis.insights.netFlow > 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  <span>
                    {transactionAnalysis.insights.netFlow > 0 ? '💰' : '📤'}
                  </span>
                  <span>
                    Net:{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      notation: 'compact',
                    }).format(transactionAnalysis.insights.netFlow)}
                  </span>
                </div>
              )}

              {transactionAnalysis.velocity > 0 && (
                <div
                  className={`flex items-center space-x-1 ${
                    transactionAnalysis.velocity > 5
                      ? 'text-orange-600'
                      : 'text-blue-600'
                  }`}
                >
                  <span>⚡</span>
                  <span>{transactionAnalysis.velocity.toFixed(1)} txns/hr</span>
                </div>
              )}

              {riskAnalysisEnabled &&
                transactionAnalysis.insights.highRiskCount > 0 && (
                  <div className='flex items-center space-x-1 text-red-600'>
                    <span>⚠️</span>
                    <span>
                      {transactionAnalysis.insights.highRiskCount} high risk
                    </span>
                  </div>
                )}

              {lastUpdated && (
                <div
                  className={`text-xs ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  Updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          <button
            onClick={() => setRiskAnalysisEnabled(!riskAnalysisEnabled)}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
              riskAnalysisEnabled
                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🛡️ Risk Analysis {riskAnalysisEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className='flex flex-wrap gap-4 mb-6'>
          <select
            value={filters.timeframe || timeframe}
            onChange={e =>
              setFilters(prev => ({
                ...prev,
                timeframe: e.target.value as any,
              }))
            }
            className={`text-sm px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value='1d'>Last 24 Hours</option>
            <option value='7d'>Last 7 Days</option>
            <option value='30d'>Last 30 Days</option>
            <option value='90d'>Last 90 Days</option>
            <option value='all'>All Time</option>
          </select>

          <select
            value={filters.sort_by || 'timestamp'}
            onChange={e =>
              setFilters(prev => ({ ...prev, sort_by: e.target.value as any }))
            }
            className={`text-sm px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value='timestamp'>Sort by Date</option>
            <option value='amount'>Sort by Amount</option>
            <option value='type'>Sort by Type</option>
          </select>

          <button
            onClick={() =>
              setFilters(prev => ({
                ...prev,
                sort_order: prev.sort_order === 'desc' ? 'asc' : 'desc',
              }))
            }
            className={`text-sm px-3 py-2 rounded border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            {filters.sort_order === 'desc' ? '↓' : '↑'}
            {filters.sort_order === 'desc' ? ' Newest' : ' Oldest'}
          </button>
        </div>
      )}

      {/* Enhanced Transaction Feed */}
      <div className='space-y-4'>
        {/* Pattern warnings */}
        {transactionAnalysis?.patterns.suspiciousPattern && (
          <div
            className={`p-4 rounded-lg border-l-4 ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-500 text-red-300'
                : 'bg-red-50 border-red-400 text-red-700'
            }`}
          >
            <div className='flex items-center space-x-2'>
              <span className='text-lg'>⚠️</span>
              <div>
                <div className='font-semibold'>
                  Suspicious Transaction Pattern Detected
                </div>
                <div className='text-sm mt-1'>
                  {transactionAnalysis.patterns.rapidFire &&
                    '• Rapid-fire transactions detected '}
                  {transactionAnalysis.patterns.roundNumbers &&
                    '• High frequency of round amounts '}
                  {transactionAnalysis.patterns.unusualTimes &&
                    '• Transactions at unusual hours'}
                </div>
              </div>
            </div>
          </div>
        )}

        {transactionAnalysis ? (
          groupByDate ? (
            Object.entries(groupedTransactions).map(([date, transactions]) => (
              <div key={date}>
                {date !== 'ungrouped' && (
                  <div
                    className={`flex items-center justify-between mb-4 px-4 py-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    }`}
                  >
                    <div
                      className={`text-lg font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      📅{' '}
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div
                      className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {transactions.length} transaction
                      {transactions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                <div className='space-y-4'>
                  {transactions.map(renderEnhancedTransactionItem)}
                </div>
              </div>
            ))
          ) : (
            <div className='space-y-4'>
              {transactionAnalysis.transactions.map(
                renderEnhancedTransactionItem
              )}
            </div>
          )
        ) : (
          <div
            className={`text-center py-12 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <div className='text-lg font-medium mb-2'>
              No transactions found
            </div>
            <div className='text-sm'>
              Try adjusting your filters or timeframe
            </div>
          </div>
        )}

        {/* Load more button with improved styling */}
        {transactionData?.pagination &&
          transactionData.pagination.total_pages > 1 && (
            <div className='text-center pt-6'>
              <button
                onClick={() => {
                  console.log('Load more transactions - implement pagination');
                }}
                className={`px-6 py-3 rounded-xl border-2 transition-all hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-900 to-purple-900 border-blue-500 text-white hover:from-blue-800 hover:to-purple-800'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 text-blue-700 hover:from-blue-100 hover:to-purple-100'
                }`}
              >
                📄 Load More Transactions (
                {transactionData.pagination.total -
                  transactionData.transactions.length}{' '}
                remaining)
              </button>
            </div>
          )}
      </div>

      {/* Enhanced footer with insights */}
      {transactionAnalysis && (
        <div
          className={`mt-8 p-6 rounded-xl ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600'
              : 'bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200'
          }`}
        >
          <h4
            className={`text-lg font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            📊 Transaction Insights
          </h4>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
            <div className='text-center'>
              <div
                className={`text-2xl font-black ${
                  transactionAnalysis.insights.netFlow > 0
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}
              >
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact',
                }).format(transactionAnalysis.insights.netFlow)}
              </div>
              <div
                className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Net Cash Flow
              </div>
            </div>
            <div className='text-center'>
              <div
                className={`text-2xl font-black ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact',
                }).format(transactionAnalysis.insights.averageAmount)}
              </div>
              <div
                className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Avg Transaction
              </div>
            </div>
            <div className='text-center'>
              <div
                className={`text-2xl font-black ${
                  transactionAnalysis.velocity > 5
                    ? 'text-orange-500'
                    : 'text-blue-500'
                }`}
              >
                {transactionAnalysis.velocity.toFixed(1)}
              </div>
              <div
                className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Txns/Hour
              </div>
            </div>
            <div className='text-center'>
              <div
                className={`text-2xl font-black ${
                  transactionAnalysis.insights.highRiskCount > 0
                    ? 'text-red-500'
                    : 'text-green-500'
                }`}
              >
                {transactionAnalysis.insights.highRiskCount}
              </div>
              <div
                className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                High Risk
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
