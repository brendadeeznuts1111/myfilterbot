import React, { useState } from "react";
import "./index.css";

// Analytics Components
import { RealTimeAnalyticsCenter } from "./components/RealTimeAnalyticsCenter";
import { EnhancedAnalyticsDashboard } from "./components/EnhancedAnalyticsDashboard";

// Types
type AppView = 'legacy-analytics' | 'enhanced-analytics';

function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('enhanced-analytics');
  const [customerId] = useState('BB1042'); // Demo customer with comprehensive trading data

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white text-gray-900">
      {/* Dashboard Toggle Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">
                🚀 Trading Bot Analytics
              </h1>
              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Bun v1.2.21+ Powered
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('enhanced-analytics')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    currentView === 'enhanced-analytics'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  ⚡ Enhanced Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('legacy-analytics')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    currentView === 'legacy-analytics'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📊 Legacy Dashboard
                </button>
              </div>
              
              <div className="text-sm text-gray-500 font-mono">
                Customer: {customerId}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="relative">
        {currentView === 'enhanced-analytics' ? (
          <div>
            {/* Performance Badge */}
            <div className="absolute top-4 right-4 z-40">
              <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Sub-millisecond API</span>
                </div>
              </div>
            </div>
            
            <EnhancedAnalyticsDashboard customerId={customerId} />
          </div>
        ) : (
          <div>
            {/* Legacy Badge */}
            <div className="absolute top-4 right-4 z-40">
              <div className="bg-gray-500 text-white px-4 py-2 rounded-full shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm font-medium">Legacy Version</span>
                </div>
              </div>
            </div>
            
            <RealTimeAnalyticsCenter customerId={customerId} />
          </div>
        )}
      </div>

      {/* Feature Comparison Footer */}
      <div className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Enhanced vs Legacy Dashboard Comparison
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Enhanced Features */}
              <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-green-500">
                <h4 className="text-lg font-semibold text-green-700 mb-3">
                  ⚡ Enhanced Dashboard Features
                </h4>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li>• TanStack Query with intelligent caching</li>
                  <li>• Sub-millisecond API response tracking</li>
                  <li>• Real-time WebSocket updates</li>
                  <li>• Interactive Recharts visualizations</li>
                  <li>• Optimistic UI updates</li>
                  <li>• Background data synchronization</li>
                  <li>• TypeScript-first API client</li>
                  <li>• Performance monitoring built-in</li>
                </ul>
              </div>
              
              {/* Legacy Features */}
              <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-gray-400">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">
                  📊 Legacy Dashboard Features
                </h4>
                <ul className="text-left space-y-2 text-sm text-gray-600">
                  <li>• Basic API integration</li>
                  <li>• Static data visualization</li>
                  <li>• Manual refresh required</li>
                  <li>• Limited error handling</li>
                  <li>• No performance monitoring</li>
                  <li>• Basic loading states</li>
                  <li>• No real-time updates</li>
                  <li>• Limited TypeScript support</li>
                </ul>
              </div>
            </div>
            
            <p className="mt-6 text-sm text-gray-500">
              The Enhanced Dashboard leverages Bun v1.2.21+'s performance optimizations including 
              500x faster postMessage(), automatic ETag support, and native TypeScript execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return <AppContent />;
}

export default App;