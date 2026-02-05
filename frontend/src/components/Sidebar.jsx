import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiLogOut,
  FiMenu,
  FiX,
  FiActivity,
  FiSettings,
  FiShield,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import RoleBadge from './RoleBadge';
import NotificationBell from './NotificationBell';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser, hasPermission, hasAnyPermission } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome, show: hasPermission('canViewDashboard') },
    { name: 'Contracts', href: '/contracts', icon: FiFileText, show: hasAnyPermission('canViewAllContracts', 'canViewOwnContracts') },
    {
      name: 'Users',
      href: '/users',
      icon: FiUsers,
      show: hasPermission('canManageUsers'),
    },
  ];

  const adminNavigation = [
    { name: 'System Logs', href: '/admin/system-logs', icon: FiActivity, show: hasPermission('canViewSystemLogs') },
    { name: 'Workflows', href: '/admin/workflows', icon: FiSettings, show: hasPermission('canConfigureWorkflow') },
    { name: 'Permissions', href: '/admin/permissions', icon: FiShield, show: hasPermission('canConfigurePermissions') },
  ];

  const showAdminSection = adminNavigation.some(item => item.show);

  const handleLogout = async () => {
    try {
      await logout();
      logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      logoutUser();
      navigate('/login');
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg text-slate-700 hover:scale-105 transition-transform"
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
        }}
      >
        {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div 
            className="flex items-center justify-center h-16 px-4"
            style={{
              background: 'linear-gradient(145deg, #334155 0%, #1e293b 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #4da6d8 0%, #1a6fa8 100%)',
                }}
              >
                <span className="text-xl font-bold text-white">S</span>
              </div>
              <span className="text-xl font-bold text-white tracking-wide">Signora</span>
            </div>
          </div>

          {/* User Info */}
          <div 
            className="px-4 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #4da6d8 0%, #1a6fa8 100%)',
                }}
              >
                <span className="text-sm font-semibold text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation
              .filter((item) => item.show)
              .map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'text-white shadow-lg'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #4da6d8 0%, #1a6fa8 100%)',
                    } : {}}
                    onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}

            {/* Admin Section */}
            {showAdminSection && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                {adminNavigation.filter(item => item.show).map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'text-white shadow-lg'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      style={isActive ? {
                        background: 'linear-gradient(135deg, #4da6d8 0%, #1a6fa8 100%)',
                      } : {}}
                      onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                      onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Logout */}
          <div 
            className="px-3 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white transition-all duration-300 w-full"
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <FiLogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
