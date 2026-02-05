import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ToastContainer from './ToastContainer';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <ToastContainer />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-10"></div> {/* Spacer for mobile menu button */}
            <h1 className="text-xl font-semibold text-gray-900 lg:text-2xl">
              Contract Management System
            </h1>
            <NotificationBell />
          </div>
        </div>

        {/* Page Content */}
        <main className="px-4 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
