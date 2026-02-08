const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getPendingApprovals,
  getActiveContracts,
  getRejectedContracts,
  getRecentActivity,
  getUsersBreakdown,
  getSystemAuditLogs
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/pending', getPendingApprovals);
router.get('/active', getActiveContracts);
router.get('/rejected', getRejectedContracts);
router.get('/recent-activity', getRecentActivity);
router.get('/users-breakdown', authorize('super_admin'), getUsersBreakdown);
router.get('/audit-logs', authorize('super_admin'), getSystemAuditLogs);

module.exports = router;
