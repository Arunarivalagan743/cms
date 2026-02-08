import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ToastContainer from './ToastContainer';

const Layout = () => {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <ToastContainer />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pt-[52px] md:pt-0">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 px-4 lg:px-6 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-800">
              Contract Management System
            </h1>
            <NotificationBell />
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
