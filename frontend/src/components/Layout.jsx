import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ToastContainer from './ToastContainer';

const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <ToastContainer />
      
      {/* Main Content */}
      <div className="lg:pl-60">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 px-4 lg:px-6 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-10"></div>
            <h1 className="text-lg font-semibold text-slate-800">
              Contract Management System
            </h1>
            <NotificationBell />
          </div>
        </div>

        {/* Page Content */}
        <main className="px-4 lg:px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
