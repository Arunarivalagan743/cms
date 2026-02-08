const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry (append-only)
 * Supports both contract-related and non-contract actions (login, user mgmt, system, etc.)
 */
const createAuditLog = async ({
  contractId = null,
  contractVersionId = null,
  action,
  userId = null,
  role = 'system',
  remarks = null,
  metadata = {},
  req = null,
  success = true
}) => {
  try {
    const logEntry = {
      action,
      performedBy: userId,
      roleAtTime: role,
      remarks,
      metadata,
      success
    };

    // Only set contract fields if provided
    if (contractId) logEntry.contract = contractId;
    if (contractVersionId) logEntry.contractVersion = contractVersionId;

    // Extract IP and User Agent from request
    if (req) {
      logEntry.ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      logEntry.userAgent = req.get('User-Agent') || 'unknown';
    }

    const auditLog = await AuditLog.create(logEntry);
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
};

/**
 * Get audit logs for a specific contract
 */
const getContractAuditLogs = async (contractId) => {
  return AuditLog.find({ contract: contractId })
    .populate('performedBy', 'name email role')
    .populate('contractVersion', 'versionNumber')
    .sort({ createdAt: -1 });
};

/**
 * Get audit logs for a specific user (all their activity)
 */
const getUserAuditLogs = async (userId, options = {}) => {
  const query = { performedBy: userId };
  if (options.role) query.roleAtTime = options.role;

  return AuditLog.find(query)
    .populate('performedBy', 'name email role')
    .populate('contract', 'contractNumber')
    .populate('contractVersion', 'versionNumber contractName status')
    .sort({ createdAt: -1 })
    .limit(options.limit || 500);
};

/**
 * Get audit logs filtered by role
 */
const getAuditLogsByRole = async (role, options = {}) => {
  const query = { roleAtTime: role };
  
  if (options.action) query.action = options.action;
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
    if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
  }

  return AuditLog.find(query)
    .populate('performedBy', 'name email role')
    .populate('contract', 'contractNumber')
    .populate('contractVersion', 'versionNumber contractName status')
    .sort({ createdAt: -1 })
    .limit(options.limit || 500);
};

/**
 * Get all audit logs (admin view) with filtering and pagination
 */
const getAllAuditLogs = async (options = {}) => {
  const query = {};
  
  if (options.action) query.action = options.action;
  if (options.role) query.roleAtTime = options.role;
  if (options.userId) query.performedBy = options.userId;
  if (options.contractId) query.contract = options.contractId;
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
    if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
  }

  if (options.search) {
    // Search will be applied after populate
  }

  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .populate('contract', 'contractNumber')
      .populate('contractVersion', 'versionNumber contractName status amount effectiveDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  createAuditLog,
  getContractAuditLogs,
  getUserAuditLogs,
  getAuditLogsByRole,
  getAllAuditLogs
};
