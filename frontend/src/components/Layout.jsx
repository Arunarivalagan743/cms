import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ToastContainer from './ToastContainer';

const Layout = () => {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <ToastContainer />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pt-[52px] md:pt-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 px-5 lg:px-8 py-3.5 bg-white/95 backdrop-blur-sm border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
              Contract Management System
            </h1>
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-8 py-6 bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
