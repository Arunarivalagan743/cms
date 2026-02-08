import React, { useState, useEffect, useCallback } from 'react';
import {
  FiActivity,
  FiFilter,
  FiRefreshCw,
  FiLogIn,
  FiLogOut,
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
  FiSend,
  FiRepeat,
  FiBell,
  FiEye,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiUserPlus,
  FiUserMinus,
  FiUserCheck,
  FiSearch,
  FiCalendar,
} from 'react-icons/fi';
import { getMyAuditLogs } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

// Action config mapping for display
const actionConfig = {
  // Auth
  login: { icon: FiLogIn, color: 'text-green-600', label: 'Login' },
  login_success: { icon: FiLogIn, color: 'text-green-600', label: 'Login Success' },
  login_failed: { icon: FiAlertTriangle, color: 'text-red-600', label: 'Login Failed' },
  logout: { icon: FiLogOut, color: 'text-slate-500', label: 'Logout' },
  password_reset: { icon: FiMail, color: 'text-blue-600', label: 'Password Reset' },
  password_changed: { icon: FiShield, color: 'text-green-600', label: 'Password Changed' },

  // User
  user_created: { icon: FiUserPlus, color: 'text-blue-600', label: 'User Created' },
  user_updated: { icon: FiEdit, color: 'text-amber-600', label: 'User Updated' },
  user_deleted: { icon: FiUserMinus, color: 'text-red-600', label: 'User Deleted' },
  user_disabled: { icon: FiUserMinus, color: 'text-orange-600', label: 'User Disabled' },
  user_enabled: { icon: FiUserCheck, color: 'text-green-600', label: 'User Enabled' },
  role_assigned: { icon: FiShield, color: 'text-purple-600', label: 'Role Assigned' },
  role_removed: { icon: FiShield, color: 'text-red-600', label: 'Role Removed' },
  role_changed: { icon: FiShield, color: 'text-purple-600', label: 'Role Changed' },
  invite_sent: { icon: FiMail, color: 'text-blue-600', label: 'Invite Sent' },
  invite_resent: { icon: FiMail, color: 'text-blue-600', label: 'Invite Resent' },

  // Contract lifecycle
  contract_created: { icon: FiFileText, color: 'text-blue-600', label: 'Contract Created' },
  contract_updated: { icon: FiEdit, color: 'text-amber-600', label: 'Contract Updated' },
  contract_submitted: { icon: FiSend, color: 'text-indigo-600', label: 'Contract Submitted' },
  contract_approved_finance: { icon: FiCheckCircle, color: 'text-green-600', label: 'Finance Approved' },
  contract_rejected_finance: { icon: FiXCircle, color: 'text-red-600', label: 'Finance Rejected' },
  contract_approved_client: { icon: FiCheckCircle, color: 'text-green-600', label: 'Client Approved' },
  contract_rejected_client: { icon: FiXCircle, color: 'text-red-600', label: 'Client Rejected' },
  contract_amended: { icon: FiRepeat, color: 'text-purple-600', label: 'Contract Amended' },
  contract_activated: { icon: FiCheckCircle, color: 'text-green-600', label: 'Contract Activated' },
  contract_viewed: { icon: FiEye, color: 'text-blue-500', label: 'Contract Viewed' },
  contract_viewed_client: { icon: FiEye, color: 'text-blue-500', label: 'Contract Viewed' },
  contract_opened_review: { icon: FiEye, color: 'text-blue-500', label: 'Opened for Review' },
  contract_forwarded_client: { icon: FiSend, color: 'text-indigo-600', label: 'Forwarded to Client' },
  finance_remarks_added: { icon: FiBell, color: 'text-amber-600', label: 'Finance Remarks' },
  client_remarks_added: { icon: FiBell, color: 'text-amber-600', label: 'Client Remarks' },
  status_changed: { icon: FiRepeat, color: 'text-indigo-600', label: 'Status Changed' },
  version_incremented: { icon: FiRepeat, color: 'text-purple-600', label: 'Version Incremented' },

  // Legacy
  created: { icon: FiFileText, color: 'text-blue-600', label: 'Contract Created' },
  updated: { icon: FiEdit, color: 'text-amber-600', label: 'Contract Updated' },
  submitted: { icon: FiSend, color: 'text-indigo-600', label: 'Contract Submitted' },
  approved: { icon: FiCheckCircle, color: 'text-green-600', label: 'Contract Approved' },
  rejected: { icon: FiXCircle, color: 'text-red-600', label: 'Contract Rejected' },
  amended: { icon: FiRepeat, color: 'text-purple-600', label: 'Contract Amended' },
  viewed: { icon: FiEye, color: 'text-blue-500', label: 'Contract Viewed' },
  sent_remarks_to_client: { icon: FiSend, color: 'text-indigo-600', label: 'Remarks Sent' },

  // System
  workflow_updated: { icon: FiSettings, color: 'text-indigo-600', label: 'Workflow Updated' },
  workflow_created: { icon: FiSettings, color: 'text-indigo-600', label: 'Workflow Created' },
  workflow_activated: { icon: FiSettings, color: 'text-green-600', label: 'Workflow Activated' },
  workflow_deactivated: { icon: FiSettings, color: 'text-slate-600', label: 'Workflow Deactivated' },
  permission_updated: { icon: FiShield, color: 'text-purple-600', label: 'Permission Updated' },
  notification_sent: { icon: FiBell, color: 'text-blue-500', label: 'Notification Sent' },
  audit_viewed: { icon: FiEye, color: 'text-slate-500', label: 'Audit Viewed' },
};

const getActionInfo = (action) => {
  return actionConfig[action] || { icon: FiActivity, color: 'text-slate-500', label: action };
};

export default function MyActivity() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filters.action) params.action = filters.action;
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getMyAuditLogs(params);
      setLogs(response.data || []);
      setPagination({
        page: response.pagination?.page || 1,
        totalPages: response.pagination?.pages || 1,
        total: response.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ action: '', search: '', startDate: '', endDate: '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Collect available actions from loaded logs for the filter dropdown
  const availableActions = [...new Set(logs.map(l => l.action))].sort();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FiActivity className="text-indigo-600" />
              My Activity
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Your activity log — all actions you&apos;ve performed on the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                hasActiveFilters
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FiFilter size={14} />
              Filters
              {hasActiveFilters && (
                <span className="bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </button>
            <button
              onClick={() => fetchLogs(pagination.page)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FiRefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">Total Activities</p>
            <p className="text-lg font-semibold text-slate-900">{pagination.total}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">Current Role</p>
            <p className="text-lg font-semibold text-indigo-600 capitalize">{user?.role?.replace('_', ' ') || 'N/A'}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">This Page</p>
            <p className="text-lg font-semibold text-slate-900">{logs.length} entries</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">Page</p>
            <p className="text-lg font-semibold text-slate-900">{pagination.page} / {pagination.totalPages}</p>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search remarks..."
                  className="input-field pl-8 text-sm"
                />
              </div>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Actions</option>
                {availableActions.map(action => (
                  <option key={action} value={action}>
                    {getActionInfo(action).label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
              <div className="relative">
                <FiCalendar className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="input-field pl-8 text-sm"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
              <div className="relative">
                <FiCalendar className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="input-field pl-8 text-sm"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FiActivity}
          title="No activity logs found"
          description={hasActiveFilters ? 'Try adjusting your filters' : 'Your activity will appear here as you use the platform'}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Contract</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionInfo = getActionInfo(log.action);
                  const ActionIcon = actionInfo.icon;
                  const isExpanded = expandedRow === log._id;

                  return (
                    <React.Fragment key={log._id}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-indigo-50/50' : ''
                        }`}
                        onClick={() => setExpandedRow(isExpanded ? null : log._id)}
                      >
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <FiChevronUp size={14} className="text-slate-400" />
                          ) : (
                            <FiChevronDown size={14} className="text-slate-400" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ActionIcon className={actionInfo.color} size={16} />
                            <span className="font-medium text-slate-900">{actionInfo.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {log.contract ? (
                            <div className="flex items-center gap-1">
                              <FiFileText className="text-slate-400" size={13} />
                              <span className="text-slate-700 text-xs">
                                {log.contract?.contractNumber || log.contract?._id?.substring(0, 8) || '—'}
                              </span>
                              {log.contractVersion && (
                                <span className="text-xs text-slate-400 ml-1">v{log.contractVersion?.versionNumber || log.contractVersion}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                            {log.roleAtTime?.replace('_', ' ') || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <FiClock size={12} />
                            {formatDate(log.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-600 text-xs truncate block max-w-[200px]">
                            {log.remarks || '—'}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr className="bg-indigo-50/30">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="text-slate-500 font-medium mb-1">Action Details</p>
                                <p className="text-slate-800">{actionInfo.label}</p>
                                <p className="text-slate-400 font-mono mt-0.5">{log.action}</p>
                              </div>

                              {log.contract && (
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">Contract Info</p>
                                  <p className="text-slate-800">{log.contract?.contractNumber || 'N/A'}</p>
                                  {log.contractVersion && (
                                    <p className="text-slate-500 mt-0.5">Version: {log.contractVersion?.versionNumber || '—'}</p>
                                  )}
                                  {log.contractVersion?.contractName && (
                                    <p className="text-slate-500 mt-0.5">Name: {log.contractVersion.contractName}</p>
                                  )}
                                  {log.contractVersion?.status && (
                                    <div className="mt-1"><StatusBadge status={log.contractVersion.status} /></div>
                                  )}
                                </div>
                              )}

                              {log.remarks && (
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">Remarks</p>
                                  <p className="text-slate-800">{log.remarks}</p>
                                </div>
                              )}

                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="text-slate-500 font-medium mb-1">Metadata</p>
                                  <pre className="bg-white border border-slate-200 rounded p-2 text-xs text-slate-700 overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.ipAddress && (
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">IP Address</p>
                                  <p className="text-slate-800 font-mono">{log.ipAddress}</p>
                                </div>
                              )}

                              {log.success !== undefined && (
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">Success</p>
                                  <StatusBadge status={log.success ? 'active' : 'failed'} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded text-xs font-medium ${
                        pagination.page === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer notice */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <FiShield className="text-blue-600 mt-0.5 flex-shrink-0" size={14} />
        <p className="text-xs text-blue-700">
          This log shows all actions you have performed on the platform. Audit logs are immutable and cannot be modified or deleted.
        </p>
      </div>
    </div>
  );
}
