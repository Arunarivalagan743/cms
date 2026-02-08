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
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSend,
  FiRepeat,
  FiTrash2,
  FiBell,
  FiEye,
} from 'react-icons/fi';
import { getComprehensiveSystemLogs, getComprehensiveStats } from '../services/adminService';
import { formatDate } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import RoleBadge from '../components/RoleBadge';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

// Comprehensive action configuration for ALL platform activities
const actionConfig = {
  // User Management Activities
  login: { icon: FiLogIn, color: 'text-green-600', label: 'Login', category: 'User' },
  login_failed: { icon: FiAlertTriangle, color: 'text-red-600', label: 'Login Failed', category: 'User' },
  logout: { icon: FiLogOut, color: 'text-slate-500', label: 'Logout', category: 'User' },
  user_created: { icon: FiUserPlus, color: 'text-blue-600', label: 'User Created', category: 'User' },
  user_updated: { icon: FiEdit, color: 'text-amber-600', label: 'User Updated', category: 'User' },
  user_deleted: { icon: FiUserMinus, color: 'text-red-600', label: 'User Deleted', category: 'User' },
  user_disabled: { icon: FiUserMinus, color: 'text-orange-600', label: 'User Disabled', category: 'User' },
  user_enabled: { icon: FiUserCheck, color: 'text-green-600', label: 'User Enabled', category: 'User' },
  role_changed: { icon: FiShield, color: 'text-purple-600', label: 'Role Changed', category: 'User' },
  password_reset: { icon: FiMail, color: 'text-blue-600', label: 'Password Reset', category: 'User' },
  password_changed: { icon: FiShield, color: 'text-green-600', label: 'Password Changed', category: 'User' },
  invite_sent: { icon: FiMail, color: 'text-blue-600', label: 'Invite Sent', category: 'User' },
  invite_resent: { icon: FiMail, color: 'text-blue-600', label: 'Invite Resent', category: 'User' },
  
  // Contract Lifecycle Activities (new comprehensive actions)
  contract_created: { icon: FiFileText, color: 'text-blue-600', label: 'Contract Created', category: 'Contract' },
  contract_updated: { icon: FiEdit, color: 'text-amber-600', label: 'Contract Updated', category: 'Contract' },
  contract_submitted: { icon: FiSend, color: 'text-indigo-600', label: 'Contract Submitted', category: 'Contract' },
  contract_approved_finance: { icon: FiCheckCircle, color: 'text-green-600', label: 'Finance Approved', category: 'Contract' },
  contract_rejected_finance: { icon: FiXCircle, color: 'text-red-600', label: 'Finance Rejected', category: 'Contract' },
  contract_approved_client: { icon: FiCheckCircle, color: 'text-green-600', label: 'Client Approved', category: 'Contract' },
  contract_rejected_client: { icon: FiXCircle, color: 'text-red-600', label: 'Client Rejected', category: 'Contract' },
  contract_amended: { icon: FiRepeat, color: 'text-purple-600', label: 'Contract Amended', category: 'Contract' },
  contract_activated: { icon: FiCheckCircle, color: 'text-green-600', label: 'Contract Activated', category: 'Contract' },
  contract_viewed: { icon: FiEye, color: 'text-blue-500', label: 'Contract Viewed', category: 'Contract' },
  contract_viewed_client: { icon: FiEye, color: 'text-blue-500', label: 'Client Viewed', category: 'Contract' },
  contract_opened_review: { icon: FiEye, color: 'text-blue-500', label: 'Opened for Review', category: 'Contract' },
  contract_forwarded_client: { icon: FiSend, color: 'text-indigo-600', label: 'Forwarded to Client', category: 'Contract' },
  finance_remarks_added: { icon: FiBell, color: 'text-amber-600', label: 'Finance Remarks', category: 'Contract' },
  client_remarks_added: { icon: FiBell, color: 'text-amber-600', label: 'Client Remarks', category: 'Contract' },
  status_changed: { icon: FiRepeat, color: 'text-indigo-600', label: 'Status Changed', category: 'Contract' },
  version_incremented: { icon: FiRepeat, color: 'text-purple-600', label: 'Version Incremented', category: 'Contract' },
  login_success: { icon: FiLogIn, color: 'text-green-600', label: 'Login Success', category: 'Auth' },

  // Legacy Contract Activities
  created: { icon: FiFileText, color: 'text-blue-600', label: 'Contract Created', category: 'Contract' },
  updated: { icon: FiEdit, color: 'text-amber-600', label: 'Contract Updated', category: 'Contract' },
  submitted: { icon: FiSend, color: 'text-indigo-600', label: 'Contract Submitted', category: 'Contract' },
  approved: { icon: FiCheckCircle, color: 'text-green-600', label: 'Contract Approved', category: 'Contract' },
  rejected: { icon: FiXCircle, color: 'text-red-600', label: 'Contract Rejected', category: 'Contract' },
  amended: { icon: FiRepeat, color: 'text-purple-600', label: 'Contract Amended', category: 'Contract' },
  viewed: { icon: FiEye, color: 'text-blue-500', label: 'Contract Viewed', category: 'Contract' },
  sent_remarks_to_client: { icon: FiSend, color: 'text-indigo-600', label: 'Remarks Sent to Client', category: 'Contract' },
  
  // System & Workflow Activities
  workflow_updated: { icon: FiSettings, color: 'text-indigo-600', label: 'Workflow Updated', category: 'System' },
  workflow_created: { icon: FiSettings, color: 'text-indigo-600', label: 'Workflow Created', category: 'System' },
  workflow_activated: { icon: FiSettings, color: 'text-green-600', label: 'Workflow Activated', category: 'System' },
  workflow_deactivated: { icon: FiSettings, color: 'text-gray-600', label: 'Workflow Deactivated', category: 'System' },
  permission_updated: { icon: FiShield, color: 'text-purple-600', label: 'Permission Updated', category: 'System' },
  system_config_changed: { icon: FiSettings, color: 'text-slate-600', label: 'Config Changed', category: 'System' },
  
  // Notification Activities
  notification_sent: { icon: FiBell, color: 'text-blue-500', label: 'Notification Sent', category: 'Notification' },
};

import { useAuth } from '../context/AuthContext';

const SystemLogs = () => {
  const { loading: authLoading, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '', // 'User' or 'Contract'
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user, pagination.page, filters]);

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
        getComprehensiveSystemLogs(params),
        getComprehensiveStats(),
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
    setFilters({ action: '', resourceType: '', startDate: '', endDate: '', search: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionDisplay = (action) => {
    const config = actionConfig[action] || { 
      icon: FiActivity, 
      color: 'text-slate-600',
      label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      category: 'Unknown'
    };
    return config;
  };

  const renderLogDetails = (log) => {
    const { action, details, performedBy, targetUser, resourceType, contractNumber, versionDetails, remarks } = log;
    
    // Helper to get user display name
    const getUserDisplay = (user, fallbackEmail) => {
      if (user?.name) return user.name;
      if (fallbackEmail) return fallbackEmail;
      return 'System';
    };
    
    // Contract-related activities
    if (resourceType === 'Contract') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{getUserDisplay(performedBy, details?.email)}</span>
            {performedBy?.role && <RoleBadge role={performedBy.role} size="xs" />}
            <span className="text-gray-600">
              {action === 'created' && 'created contract'}
              {action === 'updated' && 'updated contract'}
              {action === 'submitted' && 'submitted contract'}
              {action === 'approved' && 'approved contract'}
              {action === 'rejected' && 'rejected contract'}
              {action === 'amended' && 'amended contract'}
              {action === 'viewed' && 'viewed contract'}
            </span>
          </div>
          
          {/* Contract Details */}
          <div className="pl-4 border-l-2 border-gray-200 space-y-1.5">
            {contractNumber && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-32">Contract #:</span>
                <span className="font-mono text-gray-900">{contractNumber}</span>
              </div>
            )}
            
            {versionDetails && (
              <>
                {versionDetails.contractName && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-32">Contract Name:</span>
                    <span className="font-medium text-gray-900">{versionDetails.contractName}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-32">Version:</span>
                  <span className="font-mono text-gray-700">v{versionDetails.versionNumber}</span>
                </div>
                
                {versionDetails.status && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-32">Status:</span>
                    <StatusBadge status={versionDetails.status} size="xs" />
                  </div>
                )}
                
                {versionDetails.amount && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-32">Amount:</span>
                    <span className="font-semibold text-green-700">
                      ${parseFloat(versionDetails.amount).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {versionDetails.effectiveDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-32">Effective Date:</span>
                    <span className="text-gray-700">{formatDate(versionDetails.effectiveDate)}</span>
                  </div>
                )}
                
                {/* Approval/Rejection Info */}
                {action === 'approved' && versionDetails.approvedByFinance && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-32">Approved By:</span>
                    <span className="text-gray-900">{versionDetails.approvedByFinance.name}</span>
                  </div>
                )}
                
                {action === 'rejected' && versionDetails.rejectedBy && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-32">Rejected By:</span>
                    <span className="text-red-600">{versionDetails.rejectedBy.name}</span>
                  </div>
                )}
                
                {/* Remarks */}
                {versionDetails.financeRemarkInternal && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-500 w-32">Finance Remark:</span>
                    <span className="text-gray-700 italic">"{versionDetails.financeRemarkInternal}"</span>
                  </div>
                )}
                
                {versionDetails.clientRemark && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-500 w-32">Client Comment:</span>
                    <span className="text-gray-700 italic">"{versionDetails.clientRemark}"</span>
                  </div>
                )}
              </>
            )}
            
            {remarks && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-32">Remarks:</span>
                <span className="text-gray-700 italic">"{remarks}"</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // User Management activities
    const performedByName = getUserDisplay(performedBy, details?.email);
    const performedByRole = performedBy?.role;
    
    switch (action) {
      case 'login':
        return (
          <span>
            <span className="font-medium text-gray-900">{performedByName}</span>
            {details?.email && performedByName !== details.email && (
              <span className="text-gray-600 text-sm ml-1">({details.email})</span>
            )}
            {' '}logged in successfully
          </span>
        );
      case 'login_failed':
        return <span className="text-red-600">login failed for <span className="font-medium">{details?.email || 'unknown'}</span> - {details?.reason || 'invalid credentials'}</span>;
      case 'logout':
        return (
          <span>
            <span className="font-medium text-gray-900">{performedByName}</span>
            {details?.email && performedByName !== details.email && (
              <span className="text-gray-600 text-sm ml-1">({details.email})</span>
            )}
            {' '}logged out
          </span>
        );
      case 'user_created':
        return (
          <div className="space-y-1">
            <div>
              <span className="font-medium text-blue-700">{performedByName}</span>
              {performedByRole && <span className="text-gray-500"> ({performedByRole})</span>}
              {!performedBy && details?.email && (
                <span className="text-gray-600 text-sm ml-1">({details.email})</span>
              )}
              {' '}created new user
            </div>
            <div className="pl-4 border-l-2 border-blue-200 space-y-0.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">Name:</span>
                <strong className="text-gray-900">{details?.userName}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">Email:</span>
                <span className="text-gray-700">{details?.userEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">Role:</span>
                <RoleBadge role={details?.assignedRole} size="xs" />
              </div>
            </div>
          </div>
        );
      case 'role_changed':
        return (
          <div className="space-y-1">
            <div>
              <span className="font-medium text-purple-700">{performedByName}</span>
              {performedByRole && <span className="text-gray-500"> ({performedByRole})</span>}
              {' '}changed role for <strong>{targetUser?.name || 'user'}</strong>
            </div>
            <div className="pl-4 border-l-2 border-purple-200 space-y-0.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">From:</span>
                <RoleBadge role={details?.fromRole} size="xs" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">To:</span>
                <RoleBadge role={details?.toRole} size="xs" />
              </div>
              {targetUser?.email && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-24">User Email:</span>
                  <span className="text-gray-700">{targetUser.email}</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'user_disabled':
        return <span className="text-orange-600"><span className="font-medium">{performedByName}</span> disabled user <strong>{details?.userName}</strong></span>;
      case 'user_enabled':
        return <span className="text-green-600"><span className="font-medium">{performedByName}</span> enabled user <strong>{details?.userName}</strong></span>;
      case 'user_deleted':
        return <span className="text-red-600"><span className="font-medium">{performedByName}</span> deleted user <strong>{details?.userName}</strong></span>;
      case 'user_updated':
        return <span><span className="font-medium">{performedByName}</span> updated user <strong>{details?.userName || targetUser?.name}</strong></span>;
      case 'invite_sent':
      case 'invite_resent':
        return <span><span className="font-medium">{performedByName}</span> sent invite to <strong>{details?.email}</strong></span>;
      case 'password_changed':
        return <span><span className="font-medium">{performedByName}</span> changed password ({details?.type === 'initial_setup' ? 'initial setup' : 'reset'})</span>;
      case 'password_reset':
        return <span><span className="font-medium">{performedByName}</span> requested password reset</span>;
      case 'workflow_updated':
        return <span><span className="font-medium">{performedByName}</span> updated workflow <strong>{details?.workflowName}</strong></span>;
      case 'permission_updated':
        return (
          <div className="space-y-1">
            <div>
              <span className="font-medium text-purple-700">{performedByName}</span>
              {performedByRole && <span className="text-gray-500"> ({performedByRole})</span>}
              {!performedBy && details?.email && (
                <span className="text-gray-600 text-sm ml-1">({details.email})</span>
              )}
              {' '}updated permissions
            </div>
            <div className="pl-4 border-l-2 border-purple-200 space-y-0.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-24">For Role:</span>
                <RoleBadge role={details?.role} size="xs" />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <span>
            <span className="font-medium text-gray-900">{performedByName}</span>
            {!performedBy && details?.email && (
              <span className="text-gray-600 text-sm ml-1">({details.email})</span>
            )}
            {' '}{action.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  if (authLoading || (loading && logs.length === 0)) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System-Wide Activity Logs</h2>
          <p className="text-gray-600 mt-1">Complete audit trail of all platform activities - users, contracts, workflows, and system changes</p>
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

      {/* Comprehensive Stats Cards */}
      {stats && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Today's Activity Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Overall Stats */}
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-2xl font-bold text-blue-700">{stats.overview?.todayLogs || 0}</div>
              <div className="text-xs text-slate-600">Total Today</div>
            </div>
            
            {/* User Activity Stats */}
            <div className="card bg-gradient-to-br from-green-50 to-green-100">
              <div className="text-2xl font-bold text-green-700">{stats.userActivity?.loginCount || 0}</div>
              <div className="text-xs text-slate-600">Logins</div>
            </div>
            <div className="card bg-gradient-to-br from-red-50 to-red-100">
              <div className="text-2xl font-bold text-red-700">{stats.userActivity?.failedLogins || 0}</div>
              <div className="text-xs text-slate-600">Failed Logins</div>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="text-2xl font-bold text-purple-700">{stats.userActivity?.userChanges || 0}</div>
              <div className="text-xs text-slate-600">User Changes</div>
            </div>
            
            {/* Contract Activity Stats */}
            <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100">
              <div className="text-2xl font-bold text-indigo-700">{stats.contractActivity?.contractsCreated || 0}</div>
              <div className="text-xs text-slate-600">Created</div>
            </div>
            <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100">
              <div className="text-2xl font-bold text-emerald-700">{stats.contractActivity?.contractsApproved || 0}</div>
              <div className="text-xs text-slate-600">Approved</div>
            </div>
            <div className="card bg-gradient-to-br from-rose-50 to-rose-100">
              <div className="text-2xl font-bold text-rose-700">{stats.contractActivity?.contractsRejected || 0}</div>
              <div className="text-xs text-slate-600">Rejected</div>
            </div>
            <div className="card bg-gradient-to-br from-amber-50 to-amber-100">
              <div className="text-2xl font-bold text-amber-700">{stats.contractActivity?.contractsAmended || 0}</div>
              <div className="text-xs text-slate-600">Amended</div>
            </div>
          </div>
          
          {/* Total Platform Stats */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="card bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-slate-700">{stats.overview?.totalSystemLogs || 0}</div>
                  <div className="text-xs text-slate-600">Total User Activities</div>
                </div>
                <FiUserCheck className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <div className="card bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-slate-700">{stats.overview?.totalAuditLogs || 0}</div>
                  <div className="text-xs text-slate-600">Total Contract Activities</div>
                </div>
                <FiFileText className="h-8 w-8 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Filters */}
      {showFilters && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Filter Activities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* Resource Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
              <select
                className="input-field"
                value={filters.resourceType}
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              >
                <option value="">All Activities</option>
                <option value="User">User Management</option>
                <option value="Contract">Contract Activities</option>
              </select>
            </div>
            
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                className="input-field"
                placeholder="Search by name, email, contract #..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
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
                <optgroup label="Contract Lifecycle">
                  <option value="created">Contract Created</option>
                  <option value="updated">Contract Updated</option>
                  <option value="submitted">Contract Submitted</option>
                  <option value="approved">Contract Approved</option>
                  <option value="rejected">Contract Rejected</option>
                  <option value="amended">Contract Amended</option>
                  <option value="viewed">Contract Viewed</option>
                </optgroup>
                <optgroup label="System">
                  <option value="workflow_updated">Workflow Updated</option>
                  <option value="permission_updated">Permission Updated</option>
                </optgroup>
              </select>
            </div>
            
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
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
              className="btn-secondary"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {logs.length === 0 ? (
        <EmptyState
          icon={FiActivity}
          title="No activities found"
          description="Platform activities will appear here. Try adjusting your filters."
        />
      ) : (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Activity Timeline ({pagination.total} total activities)
            </h3>
            <div className="text-xs text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}
            </div>
          </div>
          
          <div className="flow-root">
            <ul className="space-y-6">
              {logs.map((log, idx) => {
                const actionDisplay = getActionDisplay(log.action);
                const ActionIcon = actionDisplay.icon;
                const userName = log.performedBy?.name || log.details?.email || log.details?.userName || 'System';
                const userRole = log.performedBy?.role || log.roleAtTime;

                return (
                  <li key={log._id} className="relative">
                    <div className={`
                      rounded-lg border-2 transition-all hover:shadow-md
                      ${log.resourceType === 'Contract' 
                        ? 'border-blue-200 bg-blue-50/50' 
                        : 'border-gray-200 bg-white'
                      }
                    `}>
                      <div className="p-4">
                        {/* Header with Icon and Action */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`
                            flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center
                            ${log.resourceType === 'Contract' ? 'bg-blue-100' : 'bg-gray-100'}
                          `}>
                            <ActionIcon className={`h-5 w-5 ${actionDisplay.color}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-sm font-semibold ${actionDisplay.color}`}>
                                {actionDisplay.label}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {log.resourceType || 'User'}
                              </span>
                              {userRole && (
                                <RoleBadge role={userRole} size="xs" />
                              )}
                              {!log.success && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                  Failed
                                </span>
                              )}
                            </div>
                            
                            {/* User Info */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <span className="font-medium text-gray-900">{userName}</span>
                              {log.performedBy?.email && (
                                <span className="text-xs text-gray-500">({log.performedBy.email})</span>
                              )}
                            </div>
                            
                            {/* Timestamp and IP */}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <FiClock className="h-3 w-3" />
                                {formatDate(log.createdAt, true)}
                              </span>
                              {log.ipAddress && log.ipAddress !== 'unknown' && (
                                <span>IP: {log.ipAddress}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Activity Details */}
                        <div className="ml-13 text-sm text-gray-800">
                          {renderLogDetails(log)}
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
                Page {pagination.page} of {pagination.pages} ({pagination.total} total activities)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-3">
                  {pagination.page}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
