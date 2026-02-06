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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
      >
        {mobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-slate-800 transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-14 px-4 border-b border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center">
                <span className="text-base font-semibold text-white">S</span>
              </div>
              <span className="text-lg font-semibold text-white">Signora</span>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {navigation
              .filter((item) => item.show)
              .map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

            {/* Admin Section */}
            {showAdminSection && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Administration
                  </p>
                </div>
                {adminNavigation.filter(item => item.show).map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Logout */}
          <div className="px-3 py-3 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors w-full"
            >
              <FiLogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
