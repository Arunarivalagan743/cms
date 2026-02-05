import api from './api';

// Get dashboard stats
export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  // Backend returns { success, data: { stats } }
  return response.data?.data || {};
};

// Get pending approvals
export const getPendingApprovals = async () => {
  const response = await api.get('/dashboard/pending');
  return response.data?.data || [];
};

// Get active contracts
export const getActiveContracts = async () => {
  const response = await api.get('/dashboard/active');
  return response.data?.data || [];
};

// Get rejected contracts
export const getRejectedContracts = async () => {
  const response = await api.get('/dashboard/rejected');
  return response.data?.data || [];
};

// Get system audit logs
export const getSystemAuditLogs = async () => {
  const response = await api.get('/dashboard/audit-logs');
  return response.data?.data || [];
};
