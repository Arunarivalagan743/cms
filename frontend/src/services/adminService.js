import api from './api';

// ==================== WORKFLOW CONFIGURATION ====================
// Note: Workflows are IMMUTABLE - no update/delete, only create new versions

export const getWorkflows = async () => {
  const response = await api.get('/admin/workflows');
  return response.data.data;
};

export const getActiveWorkflow = async () => {
  const response = await api.get('/admin/workflows/active');
  return response.data.data;
};

export const getDefaultWorkflow = async () => {
  const response = await api.get('/admin/workflows/default');
  return response.data.data;
};

export const getWorkflowById = async (id) => {
  const response = await api.get(`/admin/workflows/${id}`);
  return response.data.data;
};

// Create new workflow version (this is the ONLY way to change workflows)
export const createWorkflowVersion = async (workflowData) => {
  const response = await api.post('/admin/workflows', workflowData);
  return response.data.data;
};

// Legacy alias - kept for backward compatibility
export const createWorkflow = createWorkflowVersion;

// ==================== ROLE PERMISSIONS ====================

export const getPermissions = async () => {
  const response = await api.get('/admin/permissions');
  return response.data.data;
};

export const updatePermissions = async (role, permissionsData) => {
  const response = await api.put(`/admin/permissions/${role}`, permissionsData);
  return response.data.data;
};

// ==================== SYSTEM LOGS ====================

export const getSystemLogs = async (params = {}) => {
  const response = await api.get('/admin/system-logs', { params });
  return response.data;
};

export const getSystemLogStats = async () => {
  const response = await api.get('/admin/system-logs/stats');
  return response.data.data;
};
