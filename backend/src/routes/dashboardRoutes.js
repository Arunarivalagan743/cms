const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getPendingApprovals,
  getActiveContracts,
  getRejectedContracts,
  getSystemAuditLogs
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/pending', getPendingApprovals);
router.get('/active', getActiveContracts);
router.get('/rejected', getRejectedContracts);
router.get('/audit-logs', authorize('super_admin'), getSystemAuditLogs);

module.exports = router;
