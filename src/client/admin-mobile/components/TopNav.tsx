import React from 'react';
import { Menu, Bell, User } from 'lucide-react';

interface TopNavProps {
  onToggleSidebar: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="ml-2 text-lg font-semibold text-gray-800 md:hidden">
            Fantdev Admin
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
