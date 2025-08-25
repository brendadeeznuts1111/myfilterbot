import React from 'react';
import { useTheme } from '../hooks/useTheme';

export function TradingView() {
  const { theme } = useTheme();

  return (
    <div className={`trading-view ${theme === 'dark' ? 'dark' : ''}`}>
      <div className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-4'>
          Trading View
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='bg-gray-50 dark:bg-gray-700 p-4 rounded-lg'>
            <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2'>
              Market Overview
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>
              Real-time market data and trading insights will be displayed here.
            </p>
          </div>
          <div className='bg-gray-50 dark:bg-gray-700 p-4 rounded-lg'>
            <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2'>
              Portfolio Performance
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>
              Your trading performance metrics and analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
