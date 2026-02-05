const SystemLog = require('../models/SystemLog');

/**
 * Create a system activity log entry
 * @param {Object} logData - Log entry data
 * @param {string} logData.action - Action type
 * @param {ObjectId} logData.performedBy - User who performed the action
 * @param {ObjectId} logData.targetUser - User affected by the action (optional)
 * @param {Object} logData.details - Additional details
 * @param {Object} logData.req - Express request object for IP/User Agent
 * @param {boolean} logData.success - Whether action was successful
 */
const createSystemLog = async ({
  action,
  performedBy = null,
  targetUser = null,
  details = {},
  req = null,
  success = true,
}) => {
  try {
    const logEntry = {
      action,
      performedBy,
      targetUser,
      details,
      success,
    };

    // Extract IP and User Agent from request
    if (req) {
      logEntry.ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      logEntry.userAgent = req.get('User-Agent') || 'unknown';
    }

    await SystemLog.create(logEntry);
  } catch (error) {
    console.error('Failed to create system log:', error);
    // Don't throw - logging should not break the main flow
  }
};

module.exports = { createSystemLog };
