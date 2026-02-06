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

router.get('/system-logs', checkPermission('canViewSystemLogs'), getSystemLogs);
router.get('/system-logs/stats', checkPermission('canViewSystemLogs'), getSystemLogStats);

module.exports = router;
