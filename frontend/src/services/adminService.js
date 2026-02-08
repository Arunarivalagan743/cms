import api from './api';

// ==================== WORKFLOW CONFIGURATION ====================
// Note: Workflows are IMMUTABLE - no update/delete, only create new versions

export const getWorkflows = async () => {
  const response = await api.get('/admin/workflows');
  return response.data.data;
};

// Get all available workflows for contract creation (accessible to all users)
export const getAvailableWorkflows = async () => {
  const response = await api.get('/admin/workflows/available');
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

// ==================== COMPREHENSIVE SYSTEM-WIDE ACTIVITY LOGS ====================

// Get comprehensive system-wide logs (SystemLog + AuditLog combined)
export const getComprehensiveSystemLogs = async (params = {}) => {
  const response = await api.get('/admin/system-logs/comprehensive', { params });
  return response.data;
};

// Get comprehensive system-wide statistics
export const getComprehensiveStats = async () => {
  const response = await api.get('/admin/system-logs/comprehensive-stats');
  return response.data.data;
};

// ==================== ROLE MANAGEMENT ====================

// Get all roles (for role management UI)
export const getRoles = async () => {
  const response = await api.get('/admin/roles');
  return response.data.data;
};

// Get active roles (for dropdowns in workflow and user creation)
export const getActiveRoles = async () => {
  const response = await api.get('/admin/roles/active');
  return response.data.data;
};

// Create new custom role
export const createRole = async (roleData) => {
  const response = await api.post('/admin/roles', roleData);
  return response.data.data;
};

// Update existing role
export const updateRole = async (id, roleData) => {
  const response = await api.put(`/admin/roles/${id}`, roleData);
  return response.data.data;
};

// Delete (deactivate) custom role
export const deleteRole = async (id) => {
  const response = await api.delete(`/admin/roles/${id}`);
  return response.data.data;
};

// ==================== AUDIT LOGS ====================

// Get user audit logs with detailed activity tracking (legacy)
export const getUserAuditLogs = async (userId) => {
  const response = await api.get(`/admin/audit-logs?userId=${userId}`);
  return response.data.data;
};

// ==================== AUDIT TRAIL (Comprehensive) ====================

// Get complete audit trail (admin view - all append-only logs)
export const getAuditTrail = async (params = {}) => {
  const response = await api.get('/admin/audit-trail', { params });
  return response.data;
};

// Get audit trail statistics
export const getAuditTrailStats = async () => {
  const response = await api.get('/admin/audit-trail/stats');
  return response.data.data;
};

// Get user-specific audit trail
export const getUserAuditTrail = async (userId, params = {}) => {
  const response = await api.get(`/admin/audit-trail/user/${userId}`, { params });
  return response.data;
};

// Get role-specific audit trail
export const getRoleAuditTrail = async (role, params = {}) => {
  const response = await api.get(`/admin/audit-trail/role/${role}`, { params });
  return response.data;
};

// Get my own audit logs (any authenticated user)
export const getMyAuditLogs = async (params = {}) => {
  const response = await api.get('/admin/audit-trail/my-logs', { params });
  return response.data;
};
