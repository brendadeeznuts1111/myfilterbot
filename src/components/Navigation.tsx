import React from "react";
import { useTheme } from "../hooks/useTheme";

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  user: any;
  isAuthenticated: boolean;
}

export function Navigation({ activeView, onViewChange, user, isAuthenticated }: NavigationProps) {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'customer', label: 'Customer Portal', icon: '👤' },
    { id: 'admin', label: 'Admin Panel', icon: '⚙️', adminOnly: true },
    { id: 'trading', label: 'Trading View', icon: '📈' },
    { id: 'analytics', label: 'Analytics', icon: '📉' },
    { id: 'settings', label: 'Settings', icon: '🔧' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gray-900/80 border-gray-700' 
        : 'bg-white/80 border-gray-200'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              🚀 FantDev
            </div>
            <div className={`text-sm px-2 py-1 rounded-full ${
              theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}>
              Trading Bot
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              if (item.adminOnly && (!user || !user.isAdmin)) return null;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeView === item.id
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-blue-500 text-white shadow-lg'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'text-yellow-400 hover:bg-gray-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* User Info */}
            {isAuthenticated ? (
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user?.customer_id?.[0] || 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium">{user?.customer_id || 'Guest'}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    ${user?.balance?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
            ) : (
              <button className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}>
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto py-2 px-4 space-x-2">
          {navItems.map(item => {
            if (item.adminOnly && (!user || !user.isAdmin)) return null;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex-shrink-0 flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  activeView === item.id
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-800'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}