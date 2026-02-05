import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ToastContainer from './ToastContainer';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300">
      <Sidebar />
      <ToastContainer />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <div 
          className="sticky top-0 z-10 px-4 lg:px-8 py-4 shadow-md"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-10"></div>
            <h1 
              className="text-xl font-semibold lg:text-2xl"
              style={{ 
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
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
