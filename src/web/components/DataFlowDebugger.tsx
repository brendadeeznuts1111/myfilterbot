/**
 * Data Flow Debugger Component
 * Shows real-time data flow from API to React components
 * Validates the enhanced dashboard data integration
 */

import React, { useState, useEffect } from 'react';
import { useCustomer } from '../contexts/CustomerContext';
import { useCustomerBalance, useCustomerAnalytics, useTransactionHistory, useAPIPerformance } from '../../hooks/useEnhancedAPI';

export const DataFlowDebugger: React.FC = () => {
  const { customerId, apiClient, isReady } = useCustomer();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Use the actual hooks that the dashboard uses
  const balanceQuery = useCustomerBalance();
  const analyticsQuery = useCustomerAnalytics();
  const transactionsQuery = useTransactionHistory(1, 5);
  const performance = useAPIPerformance();

  const runDirectApiTest = async () => {
    if (!apiClient) return;
    
    const startTime = performance.now();
    try {
      const balance = await apiClient.getCustomerBalance();
      const endTime = performance.now();
      
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        test: 'Direct API Call',
        success: true,
        responseTime: endTime - startTime,
        data: balance,
      }]);
    } catch (error) {
      const endTime = performance.now();
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        test: 'Direct API Call',
        success: false,
        responseTime: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    }
  };

  const getQueryStatus = (query: any) => {
    if (query.isLoading) return '⏳ Loading...';
    if (query.error) return `❌ Error: ${query.error.message}`;
    if (query.data) return '✅ Success';
    return '⚪ Idle';
  };

  const formatData = (data: any, maxLength = 200) => {
    const str = JSON.stringify(data, null, 2);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  if (!isExpanded) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors shadow-lg z-50"
        onClick={() => setIsExpanded(true)}
      >
        🔍 Debug Data Flow
      </div>
    );
  }

  return (
    <div className="fixed inset-4 bg-white rounded-lg shadow-2xl z-50 overflow-hidden">
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">🔍 Data Flow Debugger</h3>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>
      
      <div className="p-6 max-h-full overflow-y-auto">
        {/* Customer Context Status */}
        <div className="mb-6 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">👤 Customer Context Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Customer ID:</strong> {customerId || 'Not Set'}
            </div>
            <div>
              <strong>API Client:</strong> {apiClient ? '✅ Ready' : '❌ Not Ready'}
            </div>
            <div>
              <strong>Context Ready:</strong> {isReady ? '✅ Yes' : '❌ No'}
            </div>
            <div>
                              <strong>API Base URL:</strong> {apiClient ? (process.env.REACT_APP_API_URL || 'http://localhost:3003') : 'N/A'}
            </div>
          </div>
        </div>

        {/* Query Status */}
        <div className="mb-6 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">📊 React Query Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Balance Query:</span>
              <span>{getQueryStatus(balanceQuery)}</span>
            </div>
            <div className="flex justify-between">
              <span>Analytics Query:</span>
              <span>{getQueryStatus(analyticsQuery)}</span>
            </div>
            <div className="flex justify-between">
              <span>Transactions Query:</span>
              <span>{getQueryStatus(transactionsQuery)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Fetch:</span>
              <span>{balanceQuery.dataUpdatedAt ? new Date(balanceQuery.dataUpdatedAt).toLocaleTimeString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-6 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">⚡ Performance Metrics</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Avg Response:</strong><br />
              {performance.averageResponseTime.toFixed(1)}ms
            </div>
            <div>
              <strong>Success Rate:</strong><br />
              {(performance.successRate * 100).toFixed(1)}%
            </div>
            <div>
              <strong>Health Status:</strong><br />
              {performance.isHealthy ? '✅ Healthy' : '⚠️ Issues'}
            </div>
          </div>
        </div>

        {/* Real Data Preview */}
        <div className="mb-6 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">📈 Real Data Preview</h4>
          
          {balanceQuery.data && (
            <div className="mb-4">
              <h5 className="font-medium text-green-600">Balance Data (BB895):</h5>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                {formatData(balanceQuery.data)}
              </pre>
            </div>
          )}
          
          {analyticsQuery.data && (
            <div className="mb-4">
              <h5 className="font-medium text-blue-600">Analytics Data (BB895):</h5>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                {formatData(analyticsQuery.analytics)}
              </pre>
            </div>
          )}
          
          {transactionsQuery.data && (
            <div className="mb-4">
              <h5 className="font-medium text-purple-600">Transaction Data (BB895):</h5>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                {formatData(transactionsQuery.data.transactions)}
              </pre>
            </div>
          )}
        </div>

        {/* Test Actions */}
        <div className="mb-6 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">🧪 Test Actions</h4>
          <div className="space-x-2">
            <button
              onClick={runDirectApiTest}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Test Direct API Call
            </button>
            <button
              onClick={() => {
                balanceQuery.refetch();
                analyticsQuery.refetch();
                transactionsQuery.refetch();
              }}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Refetch All Queries
            </button>
            <button
              onClick={() => setTestResults([])}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Clear Test Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">📋 Test Results</h4>
            <div className="max-h-40 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 mb-2 rounded text-sm ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  } border`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{result.test}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()} 
                      ({result.responseTime.toFixed(1)}ms)
                    </span>
                  </div>
                  {result.success ? (
                    <pre className="text-xs mt-1 overflow-x-auto">
                      {formatData(result.data, 100)}
                    </pre>
                  ) : (
                    <p className="text-red-600 text-xs mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataFlowDebugger;