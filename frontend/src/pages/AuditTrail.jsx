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
  FiBell,
  FiEye,
  FiDownload,
  FiUpload,
  FiMessageSquare,
  FiUser,
  FiLock,
  FiZap,
  FiSlash,
  FiArrowRight,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import {
  getAuditTrail,
  getAuditTrailStats,
  getRoleAuditTrail,
  getUserAuditTrail,
} from '../services/adminService';
import { getUsers } from '../services/userService';
import { formatDate } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import RoleBadge from '../components/RoleBadge';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

// ============= Complete Action Configuration for ALL audit actions =============
const actionConfig = {
  // Super Admin Actions
  user_created: { icon: FiUserPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'User Created', category: 'Admin' },
  user_updated: { icon: FiEdit, color: 'text-amber-600', bg: 'bg-amber-100', label: 'User Updated', category: 'Admin' },
  user_deleted: { icon: FiUserMinus, color: 'text-red-600', bg: 'bg-red-100', label: 'User Deleted', category: 'Admin' },
  role_assigned: { icon: FiShield, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Role Assigned', category: 'Admin' },
  role_removed: { icon: FiShield, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Role Removed', category: 'Admin' },
  permission_updated: { icon: FiShield, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Permission Updated', category: 'Admin' },
  workflow_created: { icon: FiSettings, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Workflow Created', category: 'Admin' },
  workflow_updated: { icon: FiSettings, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Workflow Updated', category: 'Admin' },
  workflow_activated: { icon: FiZap, color: 'text-green-600', bg: 'bg-green-100', label: 'Workflow Activated', category: 'Admin' },
  workflow_deactivated: { icon: FiSlash, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Workflow Deactivated', category: 'Admin' },
  system_config_updated: { icon: FiSettings, color: 'text-slate-600', bg: 'bg-slate-100', label: 'System Config Updated', category: 'Admin' },
  audit_viewed: { icon: FiEye, color: 'text-slate-500', bg: 'bg-slate-100', label: 'Audit Viewed', category: 'Admin' },

  // Legal Actions
  contract_created: { icon: FiFileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Contract Created', category: 'Legal' },
  contract_updated: { icon: FiEdit, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Contract Updated', category: 'Legal' },
  draft_saved: { icon: FiFileText, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Draft Saved', category: 'Legal' },
  contract_deleted_draft: { icon: FiUserMinus, color: 'text-red-600', bg: 'bg-red-100', label: 'Draft Deleted', category: 'Legal' },
  contract_submitted: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Contract Submitted', category: 'Legal' },
  contract_viewed: { icon: FiEye, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Contract Viewed', category: 'Legal' },
  contract_history_viewed: { icon: FiEye, color: 'text-slate-500', bg: 'bg-slate-100', label: 'History Viewed', category: 'Legal' },
  version_viewed: { icon: FiEye, color: 'text-slate-500', bg: 'bg-slate-100', label: 'Version Viewed', category: 'Legal' },
  contract_amended: { icon: FiRepeat, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Contract Amended', category: 'Legal' },
  amendment_submitted: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Amendment Submitted', category: 'Legal' },
  contract_resubmitted: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Contract Resubmitted', category: 'Legal' },
  attachment_uploaded: { icon: FiUpload, color: 'text-green-600', bg: 'bg-green-100', label: 'Attachment Uploaded', category: 'Legal' },
  attachment_removed: { icon: FiUserMinus, color: 'text-red-600', bg: 'bg-red-100', label: 'Attachment Removed', category: 'Legal' },
  comment_added: { icon: FiMessageSquare, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Comment Added', category: 'Legal' },

  // Finance Actions
  contract_opened_review: { icon: FiEye, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Opened for Review', category: 'Finance' },
  contract_reviewed: { icon: FiCheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Contract Reviewed', category: 'Finance' },
  contract_approved_finance: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Finance Approved', category: 'Finance' },
  contract_rejected_finance: { icon: FiXCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Finance Rejected', category: 'Finance' },
  finance_remarks_added: { icon: FiMessageSquare, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Finance Remarks', category: 'Finance' },
  contract_forwarded_client: { icon: FiArrowRight, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Forwarded to Client', category: 'Finance' },
  approval_revoked: { icon: FiXCircle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Approval Revoked', category: 'Finance' },

  // Client Actions
  contract_viewed_client: { icon: FiEye, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Client Viewed', category: 'Client' },
  contract_reviewed_client: { icon: FiCheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Client Reviewed', category: 'Client' },
  contract_approved_client: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Client Approved', category: 'Client' },
  contract_rejected_client: { icon: FiXCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Client Rejected', category: 'Client' },
  client_remarks_added: { icon: FiMessageSquare, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Client Remarks', category: 'Client' },
  contract_activated: { icon: FiZap, color: 'text-green-600', bg: 'bg-green-100', label: 'Contract Activated', category: 'Client' },
  document_downloaded: { icon: FiDownload, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Document Downloaded', category: 'Client' },

  // Auth Actions
  login_success: { icon: FiLogIn, color: 'text-green-600', bg: 'bg-green-100', label: 'Login Success', category: 'Auth' },
  login_failed: { icon: FiAlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Login Failed', category: 'Auth' },
  logout: { icon: FiLogOut, color: 'text-slate-500', bg: 'bg-slate-100', label: 'Logout', category: 'Auth' },
  password_reset: { icon: FiLock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Password Reset', category: 'Auth' },

  // System Actions
  status_changed: { icon: FiArrowRight, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Status Changed', category: 'System' },
  version_incremented: { icon: FiRepeat, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Version Incremented', category: 'System' },
  is_current_updated: { icon: FiEdit, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Current Version Updated', category: 'System' },
  notification_sent: { icon: FiBell, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Notification Sent', category: 'System' },
  notification_read: { icon: FiBell, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Notification Read', category: 'System' },
  access_denied: { icon: FiSlash, color: 'text-red-600', bg: 'bg-red-100', label: 'Access Denied', category: 'System' },
  permission_denied: { icon: FiShield, color: 'text-red-600', bg: 'bg-red-100', label: 'Permission Denied', category: 'System' },
  validation_failed: { icon: FiAlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Validation Failed', category: 'System' },
  workflow_violation: { icon: FiAlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Workflow Violation', category: 'System' },
  concurrent_update_blocked: { icon: FiSlash, color: 'text-red-600', bg: 'bg-red-100', label: 'Concurrent Update Blocked', category: 'System' },
  session_expired: { icon: FiClock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Session Expired', category: 'System' },
  token_expired: { icon: FiClock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Token Expired', category: 'System' },

  // Legacy Actions
  created: { icon: FiFileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Contract Created', category: 'Legacy' },
  updated: { icon: FiEdit, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Contract Updated', category: 'Legacy' },
  submitted: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Contract Submitted', category: 'Legacy' },
  approved: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Contract Approved', category: 'Legacy' },
  rejected: { icon: FiXCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Contract Rejected', category: 'Legacy' },
  amended: { icon: FiRepeat, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Contract Amended', category: 'Legacy' },
  viewed: { icon: FiEye, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Contract Viewed', category: 'Legacy' },
  sent_remarks_to_client: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Remarks Sent to Client', category: 'Legacy' },
};

// Category colors
const categoryColors = {
  Admin: 'bg-purple-100 text-purple-700',
  Legal: 'bg-blue-100 text-blue-700',
  Finance: 'bg-green-100 text-green-700',
  Client: 'bg-amber-100 text-amber-700',
  Auth: 'bg-slate-100 text-slate-700',
  System: 'bg-indigo-100 text-indigo-700',
  Legacy: 'bg-gray-100 text-gray-600',
};

const AuditTrail = () => {
  const { loading: authLoading, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    action: '',
    role: '',
    userId: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'super_admin', 'legal', 'finance', 'client', 'system'

  useEffect(() => {
    if (authLoading || !user) return;
    fetchUsers();
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user, pagination.page, filters, activeTab]);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'all') {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...filters,
        };
        Object.keys(params).forEach(key => {
          if (!params[key]) delete params[key];
        });

        const [logsResponse, statsData] = await Promise.all([
          getAuditTrail(params),
          getAuditTrailStats(),
        ]);

        setLogs(logsResponse.data || []);
        setPagination(logsResponse.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
        setStats(statsData);
      } else if (['super_admin', 'legal', 'finance', 'client', 'system'].includes(activeTab)) {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        };
        Object.keys(params).forEach(key => {
          if (!params[key]) delete params[key];
        });

        const [roleResponse, statsData] = await Promise.all([
          getRoleAuditTrail(activeTab, params),
          getAuditTrailStats(),
        ]);

        setLogs(roleResponse.data || []);
        setPagination(roleResponse.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
        setStats(statsData);
      } else if (activeTab.startsWith('user_')) {
        const userId = activeTab.replace('user_', '');
        const params = { page: pagination.page, limit: pagination.limit };
        const [userResponse, statsData] = await Promise.all([
          getUserAuditTrail(userId, params),
          getAuditTrailStats(),
        ]);
        setLogs(userResponse.data || []);
        setPagination(userResponse.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ action: '', role: '', userId: '', search: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionDisplay = (action) => {
    return actionConfig[action] || {
      icon: FiActivity,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      label: action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
      category: 'Unknown',
    };
  };

  const renderLogDetails = (log) => {
    const { action, performedBy, contract, contractVersion, remarks, metadata, roleAtTime, ipAddress } = log;

    return (
      <div className="space-y-2 text-sm">
        {/* Performed By */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-28 flex-shrink-0">Performed By:</span>
          <span className="font-medium text-gray-900">{performedBy?.name || 'System'}</span>
          {performedBy?.email && <span className="text-gray-500 text-xs">({performedBy.email})</span>}
        </div>

        {/* Role */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 w-28 flex-shrink-0">Role:</span>
          <RoleBadge role={roleAtTime} size="xs" />
        </div>

        {/* Contract Info (if exists) */}
        {contract && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Contract #:</span>
            <span className="font-mono text-gray-900">{contract.contractNumber || 'N/A'}</span>
          </div>
        )}

        {/* Version Info */}
        {contractVersion && (
          <>
            {contractVersion.contractName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-28 flex-shrink-0">Contract Name:</span>
                <span className="font-medium text-gray-900">{contractVersion.contractName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-28 flex-shrink-0">Version:</span>
              <span className="font-mono text-gray-700">v{contractVersion.versionNumber}</span>
            </div>
            {contractVersion.status && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-28 flex-shrink-0">Status:</span>
                <StatusBadge status={contractVersion.status} size="xs" />
              </div>
            )}
            {contractVersion.amount && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-28 flex-shrink-0">Amount:</span>
                <span className="font-semibold text-green-700">
                  ${parseFloat(contractVersion.amount).toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}

        {/* Remarks */}
        {remarks && (
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Remarks:</span>
            <span className="text-gray-700 italic">"{remarks}"</span>
          </div>
        )}

        {/* Metadata */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="mt-2">
            <span className="text-gray-500 text-xs font-medium">Metadata:</span>
            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto max-h-32">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* IP Address */}
        {ipAddress && ipAddress !== 'unknown' && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">IP Address:</span>
            <span className="text-gray-600 text-xs font-mono">{ipAddress}</span>
          </div>
        )}
      </div>
    );
  };

  if (authLoading || (loading && logs.length === 0 && !stats)) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
          <p className="text-gray-600 mt-1">
            Append-only audit trail of all contract, user, and system actions. Logs cannot be edited or deleted.
          </p>
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
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Audit Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-2xl font-bold text-blue-700">{stats.overview?.totalLogs || 0}</div>
              <div className="text-xs text-slate-600">Total Audit Logs</div>
            </div>
            <div className="card bg-gradient-to-br from-green-50 to-green-100">
              <div className="text-2xl font-bold text-green-700">{stats.overview?.todayLogs || 0}</div>
              <div className="text-xs text-slate-600">Today's Logs</div>
            </div>

            {/* Role breakdown */}
            {stats.roleBreakdown?.slice(0, 2).map((r) => (
              <div key={r._id} className="card bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="text-2xl font-bold text-purple-700">{r.count}</div>
                <div className="text-xs text-slate-600 capitalize">{r._id?.replace('_', ' ') || 'Unknown'} Logs</div>
              </div>
            ))}
          </div>

          {/* Contract Lifecycle Stats */}
          {stats.contractLifecycle?.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Contract Lifecycle</h4>
              <div className="flex flex-wrap gap-2">
                {stats.contractLifecycle.map((item) => {
                  const display = getActionDisplay(item._id);
                  return (
                    <span
                      key={item._id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${display.bg} ${display.color}`}
                    >
                      {display.label}: {item.count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Role Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 overflow-x-auto pb-px" aria-label="Tabs">
          {[
            { key: 'all', label: 'All Logs', icon: FiActivity },
            { key: 'super_admin', label: 'Admin', icon: FiShield },
            { key: 'legal', label: 'Legal', icon: FiFileText },
            { key: 'finance', label: 'Finance', icon: FiCheckCircle },
            { key: 'client', label: 'Client', icon: FiUser },
            { key: 'system', label: 'System', icon: FiSettings },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      {showFilters && activeTab === 'all' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Filter Audit Logs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="input-field"
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="legal">Legal</option>
                <option value="finance">Finance</option>
                <option value="client">Client</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <select
                className="input-field"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                className="input-field"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                <optgroup label="Contract Lifecycle">
                  <option value="contract_created">Contract Created</option>
                  <option value="contract_updated">Contract Updated</option>
                  <option value="contract_submitted">Contract Submitted</option>
                  <option value="contract_approved_finance">Finance Approved</option>
                  <option value="contract_rejected_finance">Finance Rejected</option>
                  <option value="contract_approved_client">Client Approved</option>
                  <option value="contract_rejected_client">Client Rejected</option>
                  <option value="contract_amended">Contract Amended</option>
                  <option value="contract_activated">Contract Activated</option>
                  <option value="status_changed">Status Changed</option>
                </optgroup>
                <optgroup label="Admin Actions">
                  <option value="user_created">User Created</option>
                  <option value="user_updated">User Updated</option>
                  <option value="user_deleted">User Deleted</option>
                  <option value="role_assigned">Role Assigned</option>
                  <option value="permission_updated">Permission Updated</option>
                  <option value="workflow_created">Workflow Created</option>
                </optgroup>
                <optgroup label="Auth">
                  <option value="login_success">Login Success</option>
                  <option value="login_failed">Login Failed</option>
                  <option value="logout">Logout</option>
                  <option value="password_reset">Password Reset</option>
                </optgroup>
                <optgroup label="System">
                  <option value="version_incremented">Version Incremented</option>
                  <option value="access_denied">Access Denied</option>
                  <option value="permission_denied">Permission Denied</option>
                </optgroup>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                className="input-field"
                placeholder="Name, email, contract#..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
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
            <button onClick={clearFilters} className="btn-secondary">Clear All Filters</button>
          </div>
        </div>
      )}

      {/* Audit Log Table / Timeline */}
      {loading && logs.length === 0 ? (
        <LoadingSpinner size="lg" className="py-8" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FiActivity}
          title="No audit logs found"
          description="Audit logs will appear here as actions are performed in the system. Try adjusting your filters."
        />
      ) : (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Audit Log Entries ({pagination.total} total)
              {activeTab !== 'all' && (
                <span className="ml-2 text-xs text-gray-500">
                  — Filtered by: <span className="capitalize font-medium">{activeTab.replace('_', ' ')}</span>
                </span>
              )}
            </h3>
            <div className="text-xs text-gray-500">
              {pagination.total > 0 && (
                <>Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</>
              )}
            </div>
          </div>

          {/* Table view */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => {
                  const actionDisplay = getActionDisplay(log.action);
                  const ActionIcon = actionDisplay.icon;
                  const isExpanded = expandedLog === log._id;

                  return (
                    <>
                      <tr
                        key={log._id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          !log.success ? 'bg-red-50/50' : ''
                        }`}
                        onClick={() => setExpandedLog(isExpanded ? null : log._id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <FiClock className="h-3 w-3 text-gray-400" />
                            {formatDate(log.createdAt, true)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${actionDisplay.bg}`}>
                              <ActionIcon className={`h-3.5 w-3.5 ${actionDisplay.color}`} />
                            </div>
                            <div>
                              <span className={`text-xs font-semibold ${actionDisplay.color}`}>
                                {actionDisplay.label}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block ml-1 ${categoryColors[actionDisplay.category] || 'bg-gray-100 text-gray-600'}`}>
                                {actionDisplay.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {log.performedBy?.name || 'System'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.performedBy?.email || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <RoleBadge role={log.roleAtTime} size="xs" />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.contract ? (
                            <div>
                              <span className="font-mono text-xs text-gray-900">
                                {log.contract.contractNumber}
                              </span>
                              {log.contractVersion && (
                                <span className="text-xs text-gray-500 ml-1">
                                  v{log.contractVersion.versionNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="text-xs text-gray-600 line-clamp-2">
                            {log.remarks || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${log._id}-details`}>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50 border-l-4 border-primary-500">
                            {renderLogDetails(log)}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total logs)
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
                <span className="text-sm text-gray-600 px-3">{pagination.page}</span>
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

      {/* Immutability Notice */}
      <div className="card bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <FiShield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-800">Append-Only Audit Trail</h4>
            <p className="text-xs text-amber-700 mt-1">
              These audit logs are immutable. They cannot be edited, modified, or deleted.
              Each entry records the action, user ID, role, timestamp, remarks/metadata, and contract ID + version (if applicable).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
