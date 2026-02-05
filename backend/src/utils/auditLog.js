const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 */
const createAuditLog = async ({ contractId, contractVersionId, action, userId, role, remarks = null, metadata = {} }) => {
  try {
    const auditLog = await AuditLog.create({
      contract: contractId,
      contractVersion: contractVersionId,
      action,
      performedBy: userId,
      roleAtTime: role,
      remarks,
      metadata
    });
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
};

/**
 * Get audit logs for a contract
 */
const getContractAuditLogs = async (contractId) => {
  return AuditLog.find({ contract: contractId })
    .populate('performedBy', 'name email')
    .populate('contractVersion', 'versionNumber')
    .sort({ createdAt: -1 });
};

module.exports = {
  createAuditLog,
  getContractAuditLogs
};
