import { useState, useEffect } from 'react';
import {
  FiActivity,
  FiFilter,
  FiRefreshCw,
  FiLogIn,
  FiLogOut,
  FiUserPlus,
  FiUserMinus,
  FiUserCheck,
  FiEdit,
  FiShield,
  FiAlertTriangle,
  FiMail,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { getSystemLogs, getSystemLogStats } from '../services/adminService';
import { formatDate } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import RoleBadge from '../components/RoleBadge';
import EmptyState from '../components/EmptyState';

const actionConfig = {
  login: { icon: FiLogIn, color: 'text-green-600', label: 'Login' },
  login_failed: { icon: FiAlertTriangle, color: 'text-red-600', label: 'Login Failed' },
  logout: { icon: FiLogOut, color: 'text-slate-500', label: 'Logout' },
  user_created: { icon: FiUserPlus, color: 'text-blue-600', label: 'User Created' },
  user_updated: { icon: FiEdit, color: 'text-amber-600', label: 'User Updated' },
  user_deleted: { icon: FiUserMinus, color: 'text-red-600', label: 'User Deleted' },
  user_disabled: { icon: FiUserMinus, color: 'text-orange-600', label: 'User Disabled' },
  user_enabled: { icon: FiUserCheck, color: 'text-green-600', label: 'User Enabled' },
  role_changed: { icon: FiShield, color: 'text-purple-600', label: 'Role Changed' },
  password_reset: { icon: FiMail, color: 'text-blue-600', label: 'Password Reset' },
  password_changed: { icon: FiShield, color: 'text-green-600', label: 'Password Changed' },
  invite_sent: { icon: FiMail, color: 'text-blue-600', label: 'Invite Sent' },
  invite_resent: { icon: FiMail, color: 'text-blue-600', label: 'Invite Resent' },
  workflow_updated: { icon: FiSettings, color: 'text-indigo-600', label: 'Workflow Updated' },
  permission_updated: { icon: FiShield, color: 'text-purple-600', label: 'Permission Updated' },
  system_config_changed: { icon: FiSettings, color: 'text-slate-600', label: 'Config Changed' },
};

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
    search: '',
    success: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, [pagination.page, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const [logsResponse, statsData] = await Promise.all([
        getSystemLogs(params),
        getSystemLogStats(),
      ]);

      setLogs(logsResponse.data);
      setPagination(logsResponse.pagination);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ action: '', startDate: '', endDate: '', search: '', success: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionDisplay = (action) => {
    const config = actionConfig[action] || { 
      icon: FiActivity, 
      color: 'text-slate-600',
      label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
    return config;
  };

  const renderLogDetails = (log) => {
    const { action, details, performedBy, targetUser } = log;
    
    switch (action) {
      case 'login':
        return <span>logged in successfully</span>;
      case 'login_failed':
        return <span className="text-red-600">login failed - {details?.reason || 'unknown reason'}</span>;
      case 'logout':
        return <span>logged out</span>;
      case 'user_created':
        return <span>created user <strong>{details?.userName}</strong> ({details?.assignedRole})</span>;
      case 'role_changed':
        return (
          <span>
            changed {targetUser?.name || 'user'}'s role from{' '}
            <RoleBadge role={details?.fromRole} size="xs" /> to{' '}
            <RoleBadge role={details?.toRole} size="xs" />
          </span>
        );
      case 'user_disabled':
        return <span className="text-orange-600">disabled user <strong>{details?.userName}</strong></span>;
      case 'user_enabled':
        return <span className="text-green-600">enabled user <strong>{details?.userName}</strong></span>;
      case 'user_deleted':
        return <span className="text-red-600">deleted user <strong>{details?.userName}</strong></span>;
      case 'invite_sent':
      case 'invite_resent':
        return <span>sent invite to <strong>{details?.email}</strong></span>;
      case 'password_changed':
        return <span>changed password ({details?.type === 'initial_setup' ? 'initial setup' : 'reset'})</span>;
      case 'password_reset':
        return <span>requested password reset</span>;
      case 'workflow_updated':
        return <span>updated workflow <strong>{details?.workflowName}</strong> ({details?.action})</span>;
      case 'permission_updated':
        return <span>updated permissions for <strong>{details?.role}</strong> role</span>;
      default:
        return <span>{JSON.stringify(details)}</span>;
    }
  };

  if (loading && logs.length === 0) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Activity Logs</h2>
          <p className="text-gray-600 mt-1">Monitor all platform activity and security events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-gray-200' : ''}`}
          >
            <FiFilter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={fetchData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card">
            <div className="text-2xl font-bold text-blue-600">{stats.todayLogs}</div>
            <div className="text-sm text-slate-500">Today's Events</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-green-600">{stats.loginCount}</div>
            <div className="text-sm text-slate-500">Logins Today</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-red-600">{stats.failedLogins}</div>
            <div className="text-sm text-slate-500">Failed Logins</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-purple-600">{stats.userChanges}</div>
            <div className="text-sm text-slate-500">User Changes</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-slate-700">{stats.totalLogs}</div>
            <div className="text-sm text-slate-500">Total Events</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
              <input
                type="text"
                className="input-field"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                className="input-field"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                <optgroup label="Authentication">
                  <option value="login">Login</option>
                  <option value="login_failed">Login Failed</option>
                  <option value="logout">Logout</option>
                </optgroup>
                <optgroup label="User Management">
                  <option value="user_created">User Created</option>
                  <option value="user_updated">User Updated</option>
                  <option value="user_deleted">User Deleted</option>
                  <option value="user_disabled">User Disabled</option>
                  <option value="user_enabled">User Enabled</option>
                  <option value="role_changed">Role Changed</option>
                </optgroup>
                <optgroup label="Invites & Password">
                  <option value="invite_sent">Invite Sent</option>
                  <option value="invite_resent">Invite Resent</option>
                  <option value="password_reset">Password Reset</option>
                  <option value="password_changed">Password Changed</option>
                </optgroup>
                <optgroup label="System">
                  <option value="workflow_updated">Workflow Updated</option>
                  <option value="permission_updated">Permission Updated</option>
                  <option value="system_config_changed">Config Changed</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input-field"
                value={filters.success}
                onChange={(e) => handleFilterChange('success', e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                className="input-field"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                className="input-field"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="btn-secondary whitespace-nowrap"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Timeline */}
      {logs.length === 0 ? (
        <EmptyState
          icon={FiActivity}
          title="No activity logs found"
          description="System activity will appear here as users interact with the platform"
        />
      ) : (
        <div className="card">
          <div className="flow-root">
            <ul className="-mb-8">
              {logs.map((log, idx) => {
                const actionDisplay = getActionDisplay(log.action);
                const ActionIcon = actionDisplay.icon;
                const isLast = idx === logs.length - 1;

                return (
                  <li key={log._id}>
                    <div className="relative pb-8">
                      {!isLast && (
                        <span
                          className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex items-start space-x-3">
                        <div className="relative px-1">
                          <div className="h-10 w-10 rounded-full flex items-center justify-center border border-slate-200">
                            <ActionIcon className={`h-5 w-5 ${actionDisplay.color}`} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${actionDisplay.color}`}>
                              {actionDisplay.label}
                            </span>
                            {!log.success && (
                              <span className="text-xs font-medium text-red-600">
                                (Failed)
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">
                            <span className="font-medium">
                              {log.performedBy?.name || log.details?.email || 'Unknown User'}
                            </span>
                            {log.performedBy?.role && (
                              <span className="text-gray-500 ml-1">
                                ({log.performedBy.role})
                              </span>
                            )}
                            {' '}
                            {renderLogDetails(log)}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatDate(log.createdAt, true)}</span>
                            {log.ipAddress && log.ipAddress !== 'unknown' && (
                              <span>IP: {log.ipAddress}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="btn-secondary flex items-center gap-1 disabled:opacity-50"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="btn-secondary flex items-center gap-1 disabled:opacity-50"
                >
                  Next
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
