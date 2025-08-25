import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className={`settings-page ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-6">
                Settings
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Appearance
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Dark Mode
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Switch between light and dark themes
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className="sr-only">Toggle dark mode</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Account Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Customer ID
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {user?.customer_id || 'Not available'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Account Status
                      </label>
                      <p className={`text-sm ${
                        user?.active 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {user?.active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Telegram ID
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {user?.telegram_id || 'Not connected'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Username
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {user?.username || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Preferences
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Email Notifications
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Receive updates via email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Push Notifications
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Get real-time alerts on your device
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Telegram Notifications
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Receive updates via Telegram bot
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Actions
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={logout}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}