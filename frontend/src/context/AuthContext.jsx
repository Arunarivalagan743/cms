import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Default permissions (all false for safety)
const defaultPermissions = {
  canCreateContract: false,
  canEditDraft: false,
  canEditSubmitted: false,
  canDeleteContract: false,
  canSubmitContract: false,
  canApproveContract: false,
  canRejectContract: false,
  canAmendContract: false,
  canViewAllContracts: false,
  canViewOwnContracts: true,
  canManageUsers: false,
  canAssignRoles: false,
  canViewAuditLogs: false,
  canViewSystemLogs: false,
  canConfigureWorkflow: false,
  canConfigurePermissions: false,
  canViewDashboard: true,
  canViewReports: false,
};

// Permission refresh interval (5 minutes)
const PERMISSION_REFRESH_INTERVAL = 5 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const lastRefreshRef = useRef(Date.now());

  // Helper to check if user has a specific permission
  const hasPermission = useCallback((permissionKey) => {
    return permissions[permissionKey] === true;
  }, [permissions]);

  // Helper to check multiple permissions (returns true if ANY permission is granted)
  const hasAnyPermission = useCallback((...permissionKeys) => {
    return permissionKeys.some(key => permissions[key] === true);
  }, [permissions]);

  // Helper to check multiple permissions (returns true if ALL permissions are granted)
  const hasAllPermissions = useCallback((...permissionKeys) => {
    return permissionKeys.every(key => permissions[key] === true);
  }, [permissions]);

  useEffect(() => {
    loadUser();
  }, []);

  // Auto-refresh permissions when page becomes visible or periodically
  useEffect(() => {
    if (!user) return;

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Only refresh if more than 30 seconds since last refresh
        if (now - lastRefreshRef.current > 30000) {
          refreshPermissions();
        }
      }
    };

    // Periodic refresh
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshPermissions();
      }
    }, PERMISSION_REFRESH_INTERVAL);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user]);

  const loadUser = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (!token) {
      setLoading(false);
      return;
    }

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Load permissions from saved user
        if (parsedUser.permissions) {
          setPermissions({ ...defaultPermissions, ...parsedUser.permissions });
        }
      } catch (e) {
        localStorage.removeItem('user');
      }
    }

    try {
      const response = await getCurrentUser();
      const userData = response.data || response;
      setUser(userData);
      // Update permissions from server
      if (userData.permissions) {
        setPermissions({ ...defaultPermissions, ...userData.permissions });
      }
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setPermissions(defaultPermissions);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Set permissions from login response
    if (userData.permissions) {
      setPermissions({ ...defaultPermissions, ...userData.permissions });
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPermissions(defaultPermissions);
  };

  // Refresh user permissions (useful after permission changes)
  const refreshPermissions = async () => {
    try {
      const response = await getCurrentUser();
      const userData = response.data || response;
      setUser(userData);
      if (userData.permissions) {
        setPermissions({ ...defaultPermissions, ...userData.permissions });
      }
      localStorage.setItem('user', JSON.stringify(userData));
      lastRefreshRef.current = Date.now();
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  };

  const value = {
    user,
    setUser,
    loginUser,
    logoutUser,
    loading,
    isAuthenticated: !!user,
    // Role checks (kept for backward compatibility)
    isSuperAdmin: user?.role === 'super_admin',
    isLegal: user?.role === 'legal',
    isFinance: user?.role === 'finance' || user?.role === 'senior_finance',
    isClient: user?.role === 'client',
    // Permission system
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
