const express = require('express');
const router = express.Router();
const {
  getWorkflows,
  getDefaultWorkflow,
  getActiveWorkflow,
  getWorkflowById,
  createWorkflowVersion,
  getPermissions,
  updatePermissions,
  getSystemLogs,
  getSystemLogStats,
  getComprehensiveSystemLogs,
  getComprehensiveStats,
  getRoles,
  getActiveRoles,
  createRole,
  updateRole,
  deleteRole,
  getUserAuditLogs,
  getAuditTrail,
  getAuditTrailStats,
  getUserAuditTrail,
  getRoleAuditTrail,
  getMyAuditLogs,
} = require('../controllers/adminController');
const { protect, authorize, checkPermission } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ==================== WORKFLOW ROUTES ====================

// Get all available workflows for contract creation (accessible to all authenticated users)
router.get('/workflows/available', getWorkflows);

// Get default/active workflow (accessible to all authenticated users for reference)
router.get('/workflows/default', getDefaultWorkflow);
router.get('/workflows/active', getActiveWorkflow);

// Get specific workflow by ID (for contract reference)
router.get('/workflows/:id', getWorkflowById);

// Workflow configuration (requires canConfigureWorkflow permission)
router.get('/workflows', checkPermission('canConfigureWorkflow'), getWorkflows);

// Create new workflow version (POST only - updates are done by creating new versions)
router.post('/workflows', checkPermission('canConfigureWorkflow'), createWorkflowVersion);

// Note: PUT and DELETE are intentionally removed - workflows are immutable
// To change a workflow, create a new version using POST

// ==================== PERMISSION ROUTES ====================

router.get('/permissions', checkPermission('canConfigurePermissions'), getPermissions);
router.put('/permissions/:role', checkPermission('canConfigurePermissions'), updatePermissions);

// ==================== SYSTEM LOG ROUTES ====================

// Comprehensive system-wide activity logs (SystemLog + AuditLog combined)
router.get('/system-logs/comprehensive', checkPermission('canViewSystemLogs'), getComprehensiveSystemLogs);
router.get('/system-logs/comprehensive-stats', checkPermission('canViewSystemLogs'), getComprehensiveStats);

// Legacy system logs (user management only)
router.get('/system-logs', checkPermission('canViewSystemLogs'), getSystemLogs);
router.get('/system-logs/stats', checkPermission('canViewSystemLogs'), getSystemLogStats);

// ==================== AUDIT TRAIL ROUTES (New Comprehensive) ====================

// Complete audit trail (Admin view - append-only, all actions)
router.get('/audit-trail', authorize('super_admin'), getAuditTrail);
router.get('/audit-trail/stats', authorize('super_admin'), getAuditTrailStats);

// User-specific audit trail
router.get('/audit-trail/user/:userId', authorize('super_admin'), getUserAuditTrail);

// Role-specific audit trail (shows actions mapped to a specific role)
router.get('/audit-trail/role/:role', authorize('super_admin'), getRoleAuditTrail);

// My own audit logs (accessible to all authenticated users)
router.get('/audit-trail/my-logs', getMyAuditLogs);

// Legacy audit logs endpoint
router.get('/audit-logs', authorize('super_admin'), getUserAuditLogs);

// ==================== ROLE ROUTES ====================

// Get all roles (for role management UI)
router.get('/roles', checkPermission('canConfigurePermissions'), getRoles);

// Get active roles (for dropdowns in workflow and user creation)
router.get('/roles/active', getActiveRoles);

// Create new custom role
router.post('/roles', checkPermission('canConfigurePermissions'), createRole);

// Update existing role
router.put('/roles/:id', checkPermission('canConfigurePermissions'), updateRole);

// Delete (deactivate) custom role
router.delete('/roles/:id', checkPermission('canConfigurePermissions'), deleteRole);

module.exports = router;
