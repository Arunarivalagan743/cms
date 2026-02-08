import api from './api';

// Get dashboard stats
export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data?.data || {};
};

// Get pending approvals (optional type filter: 'finance' or 'client')
export const getPendingApprovals = async (type) => {
  const params = type ? { type } : {};
  const response = await api.get('/dashboard/pending', { params });
  return response.data?.data || [];
};

// Get active contracts
export const getActiveContracts = async () => {
  const response = await api.get('/dashboard/active');
  return response.data?.data || [];
};

// Get rejected contracts (optional rejectedByRole filter: 'finance' or 'client')
export const getRejectedContracts = async (rejectedByRole) => {
  const params = rejectedByRole ? { rejectedByRole } : {};
  const response = await api.get('/dashboard/rejected', { params });
  return response.data?.data || [];
};

// Get recent activity
export const getRecentActivity = async (limit = 10) => {
  const response = await api.get('/dashboard/recent-activity', { params: { limit } });
  return response.data?.data || [];
};

// Get users breakdown (admin only)
export const getUsersBreakdown = async (params = {}) => {
  const response = await api.get('/dashboard/users-breakdown', { params });
  return response.data?.data || [];
};

// Get system audit logs
export const getSystemAuditLogs = async () => {
  const response = await api.get('/dashboard/audit-logs');
  return response.data?.data || [];
};
