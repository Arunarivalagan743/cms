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
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ==================== WORKFLOW ROUTES ====================

// Get default/active workflow (accessible to all authenticated users for reference)
router.get('/workflows/default', getDefaultWorkflow);
router.get('/workflows/active', getActiveWorkflow);

// Get specific workflow by ID (for contract reference)
router.get('/workflows/:id', getWorkflowById);

// Super Admin only routes
router.get('/workflows', authorize('super_admin'), getWorkflows);

// Create new workflow version (POST only - updates are done by creating new versions)
router.post('/workflows', authorize('super_admin'), createWorkflowVersion);

// Note: PUT and DELETE are intentionally removed - workflows are immutable
// To change a workflow, create a new version using POST

// ==================== PERMISSION ROUTES ====================

router.get('/permissions', authorize('super_admin'), getPermissions);
router.put('/permissions/:role', authorize('super_admin'), updatePermissions);

// ==================== SYSTEM LOG ROUTES ====================

router.get('/system-logs', authorize('super_admin'), getSystemLogs);
router.get('/system-logs/stats', authorize('super_admin'), getSystemLogStats);

module.exports = router;
