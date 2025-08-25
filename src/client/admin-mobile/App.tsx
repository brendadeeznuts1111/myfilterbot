import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import useMediaQuery from './hooks/useMediaQuery';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={closeSidebar}
            isMobile={isMobile}
          />
          
          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-screen">
            <TopNav onToggleSidebar={toggleSidebar} />
            
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Routes>
            </main>
          </div>
        </div>
        
        {/* Mobile sidebar overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={closeSidebar}
          />
        )}
      </div>
    </Router>
  );
};

export default App;
