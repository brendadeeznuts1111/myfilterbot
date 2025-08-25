/**
 * Recent Activity Component
 * Real-time transaction feed with live updates
 * Optimized for Bun API's high-performance responses
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTransactionHistory, useRealTimeUpdates } from '../../hooks/useEnhancedAPI';

interface RecentActivityProps {
  customerId?: string;
  className?: string;
  limit?: number;
  showFilters?: boolean;
  autoScroll?: boolean;
}

interface Transaction {
  id: string;
  customer_id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'bonus';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  description: string;
  reference?: string;
}

// Transaction Type Icons and Colors
const getTransactionStyle = (type: string) => {
  const styles = {
    deposit: { 
      icon: '⬇️', 
      bgColor: 'bg-green-50', 
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    },
    withdrawal: { 
      icon: '⬆️', 
      bgColor: 'bg-red-50', 
      textColor: 'text-red-700',
      borderColor: 'border-red-200'
    },
    trade: { 
      icon: '💹', 
      bgColor: 'bg-blue-50', 
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    },
    bonus: { 
      icon: '🎁', 
      bgColor: 'bg-purple-50', 
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200'
    },
  };
  return styles[type as keyof typeof styles] || styles.trade;
};

// Loading Skeleton
const ActivitySkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
);

// Individual Transaction Item
const TransactionItem: React.FC<{ 
  transaction: Transaction; 
  isNew?: boolean;
  onClick?: () => void;
}> = ({ transaction, isNew = false, onClick }) => {
  const style = getTransactionStyle(transaction.type);
  const [showDetails, setShowDetails] = useState(false);
  
  const formattedTime = new Date(transaction.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusStyle = {
    completed: 'text-green-600 bg-green-100',
    pending: 'text-yellow-600 bg-yellow-100',
    failed: 'text-red-600 bg-red-100',
  }[transaction.status];

  return (
    <div 
      className={`border rounded-lg p-4 transition-all duration-300 cursor-pointer hover:shadow-md ${
        isNew ? 'ring-2 ring-blue-300 shadow-lg animate-pulse bg-blue-50' : 'bg-white hover:bg-gray-50'
      } ${style.borderColor}`}
      onClick={() => {
        setShowDetails(!showDetails);
        onClick?.();
      }}
    >
      <div className="flex items-center space-x-4">
        {/* Transaction Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.bgColor}`}>
          <span className="text-lg">{style.icon}</span>
        </div>

        {/* Transaction Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {transaction.description}
            </p>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.textColor} ${style.bgColor}`}>
              {transaction.type.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center space-x-3 mt-1">
            <p className="text-xs text-gray-500">{formattedTime}</p>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle}`}>
              {transaction.status}
            </span>
            {transaction.reference && (
              <span className="text-xs text-gray-400 font-mono">
                {transaction.reference}
              </span>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className={`text-sm font-bold ${
            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {transaction.amount > 0 ? 'Credit' : 'Debit'}
          </p>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Transaction ID:</span>
              <p className="font-mono text-gray-800">{transaction.id}</p>
            </div>
            <div>
              <span className="text-gray-500">Customer ID:</span>
              <p className="font-mono text-gray-800">{transaction.customer_id}</p>
            </div>
            <div>
              <span className="text-gray-500">Timestamp:</span>
              <p className="text-gray-800">{new Date(transaction.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <p className="text-gray-800 capitalize">{transaction.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RecentActivity: React.FC<RecentActivityProps> = ({
  customerId = 'BB895', // Customer with real transaction data
  className = '',
  limit = 10,
  showFilters = true,
  autoScroll = true,
}) => {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(limit);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(new Set());

  // Get transaction data with real-time updates
  const { data: transactionData, isLoading, error, refetch } = useTransactionHistory(1, visibleCount, typeFilter || undefined);
  const { isConnected, lastMessage } = useRealTimeUpdates(customerId);

  const transactions = transactionData?.transactions || [];

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'transaction_update') {
      // Mark new transaction for highlighting
      if (lastMessage.transaction?.id) {
        setNewTransactionIds(prev => new Set([...prev, lastMessage.transaction.id]));
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setNewTransactionIds(prev => {
            const updated = new Set(prev);
            updated.delete(lastMessage.transaction.id);
            return updated;
          });
        }, 3000);
      }
      
      // Refetch data
      refetch();
    }
  }, [lastMessage, refetch]);

  // Filter types for dropdown
  const transactionTypes = [
    { value: '', label: 'All Types' },
    { value: 'deposit', label: '⬇️ Deposits' },
    { value: 'withdrawal', label: '⬆️ Withdrawals' },
    { value: 'trade', label: '💹 Trades' },
    { value: 'bonus', label: '🎁 Bonuses' },
  ];

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!transactions.length) return null;

    const totalDeposits = transactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawals = Math.abs(transactions
      .filter(t => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0));
    
    const pendingCount = transactions.filter(t => t.status === 'pending').length;
    
    return { totalDeposits, totalWithdrawals, pendingCount };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <ActivitySkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-500 mb-2">⚠️ Failed to load transactions</p>
          <p className="text-sm text-gray-500">{error.message}</p>
          <button 
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <div className={`flex items-center space-x-1 text-xs ${
            isConnected ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {transactionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Deposits</p>
            <p className="text-sm font-semibold text-green-600">
              +${summaryStats.totalDeposits.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Withdrawals</p>
            <p className="text-sm font-semibold text-red-600">
              -${summaryStats.totalWithdrawals.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-sm font-semibold text-yellow-600">
              {summaryStats.pendingCount}
            </p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">📊</p>
          <p className="text-sm">No transactions found</p>
          {typeFilter && (
            <button
              onClick={() => setTypeFilter('')}
              className="text-blue-500 text-sm mt-2 hover:underline"
            >
              Show all transactions
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.slice(0, visibleCount).map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              isNew={newTransactionIds.has(transaction.id)}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {transactionData && transactions.length > visibleCount && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            Load More ({transactions.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Pagination Info */}
      {transactionData?.pagination && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing {Math.min(visibleCount, transactions.length)} of {transactionData.pagination.total} transactions
        </div>
      )}
    </div>
  );
};

export default RecentActivity;