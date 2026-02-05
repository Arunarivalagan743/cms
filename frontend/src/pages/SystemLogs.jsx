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
  login: { icon: FiLogIn, color: 'text-green-600', bg: 'bg-green-100', label: 'Login' },
  login_failed: { icon: FiAlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Login Failed' },
  logout: { icon: FiLogOut, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Logout' },
  user_created: { icon: FiUserPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'User Created' },
  user_updated: { icon: FiEdit, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'User Updated' },
  user_deleted: { icon: FiUserMinus, color: 'text-red-600', bg: 'bg-red-100', label: 'User Deleted' },
  user_disabled: { icon: FiUserMinus, color: 'text-orange-600', bg: 'bg-orange-100', label: 'User Disabled' },
  user_enabled: { icon: FiUserCheck, color: 'text-green-600', bg: 'bg-green-100', label: 'User Enabled' },
  role_changed: { icon: FiShield, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Role Changed' },
  password_reset: { icon: FiMail, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Password Reset' },
  password_changed: { icon: FiShield, color: 'text-green-600', bg: 'bg-green-100', label: 'Password Changed' },
  invite_sent: { icon: FiMail, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Invite Sent' },
  invite_resent: { icon: FiMail, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Invite Resent' },
  workflow_updated: { icon: FiSettings, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Workflow Updated' },
  permission_updated: { icon: FiShield, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Permission Updated' },
  system_config_changed: { icon: FiSettings, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Config Changed' },
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
    setFilters({ action: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionDisplay = (action) => {
    const config = actionConfig[action] || { 
      icon: FiActivity, 
      color: 'text-gray-600', 
      bg: 'bg-gray-100',
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
          <div className="card bg-blue-50 border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{stats.todayLogs}</div>
            <div className="text-sm text-blue-600">Today's Events</div>
          </div>
          <div className="card bg-green-50 border-green-200">
            <div className="text-2xl font-bold text-green-700">{stats.loginCount}</div>
            <div className="text-sm text-green-600">Logins Today</div>
          </div>
          <div className="card bg-red-50 border-red-200">
            <div className="text-2xl font-bold text-red-700">{stats.failedLogins}</div>
            <div className="text-sm text-red-600">Failed Logins</div>
          </div>
          <div className="card bg-purple-50 border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{stats.userChanges}</div>
            <div className="text-sm text-purple-600">User Changes</div>
          </div>
          <div className="card bg-gray-50 border-gray-200">
            <div className="text-2xl font-bold text-gray-700">{stats.totalLogs}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
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
                  <option value="role_changed">Role Changed</option>
                </optgroup>
                <optgroup label="Password">
                  <option value="password_reset">Password Reset</option>
                  <option value="password_changed">Password Changed</option>
                </optgroup>
                <optgroup label="System">
                  <option value="workflow_updated">Workflow Updated</option>
                  <option value="permission_updated">Permission Updated</option>
                </optgroup>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                className="input-field"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                className="input-field"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <button
              onClick={clearFilters}
              className="btn-secondary whitespace-nowrap"
            >
              Clear Filters
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
                        <div className={`relative px-1`}>
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${actionDisplay.bg}`}>
                            <ActionIcon className={`h-5 w-5 ${actionDisplay.color}`} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionDisplay.bg} ${actionDisplay.color}`}>
                              {actionDisplay.label}
                            </span>
                            {!log.success && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                Failed
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
