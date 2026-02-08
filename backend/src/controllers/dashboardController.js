const Contract = require('../models/Contract');
const ContractVersion = require('../models/ContractVersion');
const AuditLog = require('../models/AuditLog');
const SystemLog = require('../models/SystemLog');
const User = require('../models/User');
const Notification = require('../models/Notification');
const WorkflowConfig = require('../models/WorkflowConfig');

// @desc    Get comprehensive dashboard statistics (role-specific)
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    let stats = {};
    const userRole = req.user.role;

    if (userRole === 'super_admin') {
      // ═══════════════════════════════════════════
      // SUPER ADMIN — sees everything
      // ═══════════════════════════════════════════
      const [
        contractStats,
        totalContracts,
        totalUsers,
        amendedCount,
        activeUsers,
        disabledUsers,
        usersByRole,
        activeWorkflow,
        recentAuditLogs,
        failedLogins,
        unreadNotifications,
        rejectedByFinanceCount,
        rejectedByClientCount,
        activePerClient
      ] = await Promise.all([
        ContractVersion.aggregate([
          { $match: { isCurrent: true } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Contract.countDocuments(),
        User.countDocuments(),
        ContractVersion.countDocuments({ versionNumber: { $gt: 1 }, isCurrent: true }),
        User.countDocuments({ isActive: true, isPasswordSet: true }),
        User.countDocuments({ isActive: false }),
        User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        WorkflowConfig.findOne({ isActive: true })
          .populate('createdBy', 'name email')
          .lean(),
        AuditLog.find()
          .populate('performedBy', 'name email role')
          .populate('contract', 'contractNumber')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        SystemLog.countDocuments({
          action: 'login_failed',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }),
        Notification.countDocuments({ isRead: false }),
        ContractVersion.aggregate([
          { $match: { status: 'rejected', isCurrent: true, rejectedBy: { $ne: null } } },
          { $lookup: { from: 'users', localField: 'rejectedBy', foreignField: '_id', as: 'rejector' } },
          { $unwind: '$rejector' },
          { $match: { 'rejector.role': { $in: ['finance', 'senior_finance'] } } },
          { $count: 'count' }
        ]),
        ContractVersion.aggregate([
          { $match: { status: 'rejected', isCurrent: true, rejectedBy: { $ne: null } } },
          { $lookup: { from: 'users', localField: 'rejectedBy', foreignField: '_id', as: 'rejector' } },
          { $unwind: '$rejector' },
          { $match: { 'rejector.role': 'client' } },
          { $count: 'count' }
        ]),
        ContractVersion.aggregate([
          { $match: { status: 'active', isCurrent: true } },
          { $lookup: { from: 'contracts', localField: 'contract', foreignField: '_id', as: 'contractDoc' } },
          { $unwind: '$contractDoc' },
          { $lookup: { from: 'users', localField: 'contractDoc.client', foreignField: '_id', as: 'clientDoc' } },
          { $unwind: '$clientDoc' },
          { $group: { _id: '$clientDoc.name', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      const statusCounts = {};
      contractStats.forEach(s => { statusCounts[s._id] = s.count; });

      const roleCounts = {};
      usersByRole.forEach(r => { roleCounts[r._id] = r.count; });

      const workflowStats = await Contract.aggregate([
        { $lookup: { from: 'workflowconfigs', localField: 'workflowId', foreignField: '_id', as: 'workflow' } },
        { $unwind: { path: '$workflow', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$workflow.name', count: { $sum: 1 }, workflowId: { $first: '$workflow._id' } } },
        { $sort: { count: -1 } }
      ]);

      stats = {
        pendingFinance: statusCounts.pending_finance || 0,
        pendingClient: statusCounts.pending_client || 0,
        totalPending: (statusCounts.pending_finance || 0) + (statusCounts.pending_client || 0),
        totalActive: statusCounts.active || 0,
        activePerClient: activePerClient.map(a => ({ clientName: a._id, count: a.count })),
        totalRejected: statusCounts.rejected || 0,
        rejectedByFinance: rejectedByFinanceCount[0]?.count || 0,
        rejectedByClient: rejectedByClientCount[0]?.count || 0,
        totalUsers,
        activeUsers,
        disabledUsers,
        usersByRole: roleCounts,
        workflowInfo: activeWorkflow ? {
          name: activeWorkflow.name,
          version: activeWorkflow.version,
          isActive: activeWorkflow.isActive,
          lastModifiedBy: activeWorkflow.createdBy?.name || 'System',
          stepsCount: activeWorkflow.steps?.length || 0
        } : null,
        recentAuditLogs: recentAuditLogs.map(log => ({
          _id: log._id,
          action: log.action,
          performedBy: log.performedBy,
          contract: log.contract,
          createdAt: log.createdAt,
          remarks: log.remarks
        })),
        failedLogins,
        unreadNotifications,
        totalContracts,
        draftContracts: statusCounts.draft || 0,
        amendedContracts: amendedCount,
        workflowStats: workflowStats.map(w => ({
          workflowName: w._id || 'No Workflow',
          workflowId: w.workflowId,
          count: w.count
        }))
      };

    } else if (userRole === 'legal') {
      // ═══════════════════════════════════════════
      // LEGAL — contract creator
      // ═══════════════════════════════════════════
      const contractIds = await Contract.find({ createdBy: req.user._id }).distinct('_id');

      const [
        contractStats,
        amendedCount,
        totalVersions,
        recentlyEdited,
        recentlyActivated,
        needsAmendment,
        unreadNotifications,
        rejectedByFinanceCount,
        rejectedByClientCount
      ] = await Promise.all([
        ContractVersion.aggregate([
          { $match: { contract: { $in: contractIds }, isCurrent: true } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        ContractVersion.countDocuments({ contract: { $in: contractIds }, versionNumber: { $gt: 1 }, isCurrent: true }),
        ContractVersion.countDocuments({ contract: { $in: contractIds } }),
        ContractVersion.find({ contract: { $in: contractIds }, status: 'draft', isCurrent: true })
          .populate({ path: 'contract', populate: { path: 'client', select: 'name email' } })
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean(),
        ContractVersion.find({ contract: { $in: contractIds }, status: 'active', isCurrent: true })
          .populate({ path: 'contract', populate: { path: 'client', select: 'name email' } })
          .sort({ clientApprovedAt: -1 })
          .limit(5)
          .lean(),
        ContractVersion.countDocuments({ contract: { $in: contractIds }, status: 'rejected', isCurrent: true }),
        Notification.countDocuments({ user: req.user._id, isRead: false }),
        ContractVersion.aggregate([
          { $match: { contract: { $in: contractIds }, status: 'rejected', isCurrent: true, rejectedBy: { $ne: null } } },
          { $lookup: { from: 'users', localField: 'rejectedBy', foreignField: '_id', as: 'rejector' } },
          { $unwind: '$rejector' },
          { $match: { 'rejector.role': { $in: ['finance', 'senior_finance'] } } },
          { $count: 'count' }
        ]),
        ContractVersion.aggregate([
          { $match: { contract: { $in: contractIds }, status: 'rejected', isCurrent: true, rejectedBy: { $ne: null } } },
          { $lookup: { from: 'users', localField: 'rejectedBy', foreignField: '_id', as: 'rejector' } },
          { $unwind: '$rejector' },
          { $match: { 'rejector.role': 'client' } },
          { $count: 'count' }
        ])
      ]);

      const statusCounts = {};
      contractStats.forEach(s => { statusCounts[s._id] = s.count; });

      const workflowStats = await Contract.aggregate([
        { $match: { createdBy: req.user._id } },
        { $lookup: { from: 'workflowconfigs', localField: 'workflowId', foreignField: '_id', as: 'workflow' } },
        { $unwind: { path: '$workflow', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$workflow.name', count: { $sum: 1 }, workflowId: { $first: '$workflow._id' } } },
        { $sort: { count: -1 } }
      ]);

      stats = {
        draftContracts: statusCounts.draft || 0,
        recentlyEdited: recentlyEdited.map(v => ({
          contractId: v.contract._id,
          contractNumber: v.contract.contractNumber,
          contractName: v.contractName,
          amount: v.amount,
          client: v.contract.client,
          updatedAt: v.updatedAt
        })),
        pendingFinance: statusCounts.pending_finance || 0,
        pendingClient: statusCounts.pending_client || 0,
        totalPending: (statusCounts.pending_finance || 0) + (statusCounts.pending_client || 0),
        activeContracts: statusCounts.active || 0,
        recentlyActivated: recentlyActivated.map(v => ({
          contractId: v.contract._id,
          contractNumber: v.contract.contractNumber,
          contractName: v.contractName,
          amount: v.amount,
          client: v.contract.client,
          activatedAt: v.clientApprovedAt
        })),
        totalRejected: statusCounts.rejected || 0,
        rejectedByFinance: rejectedByFinanceCount[0]?.count || 0,
        rejectedByClient: rejectedByClientCount[0]?.count || 0,
        needsAmendment,
        amendedContracts: amendedCount,
        totalVersions,
        unreadNotifications,
        totalContracts: contractIds.length,
        workflowStats: workflowStats.map(w => ({
          workflowName: w._id || 'No Workflow',
          workflowId: w.workflowId,
          count: w.count
        }))
      };

    } else if (userRole === 'finance') {
      // ═══════════════════════════════════════════
      // FINANCE — first reviewer
      // ═══════════════════════════════════════════
      const [
        pendingFinance,
        approvedByMe,
        totalActive,
        rejectedByMe,
        totalRejected,
        amendedCount,
        highValuePending,
        unreadNotifications
      ] = await Promise.all([
        ContractVersion.countDocuments({ status: 'pending_finance', isCurrent: true }),
        ContractVersion.countDocuments({ approvedByFinance: req.user._id }),
        ContractVersion.countDocuments({ status: 'active', isCurrent: true }),
        ContractVersion.countDocuments({ rejectedBy: req.user._id, status: 'rejected', isCurrent: true }),
        ContractVersion.countDocuments({ status: 'rejected', isCurrent: true }),
        ContractVersion.countDocuments({ versionNumber: { $gt: 1 }, isCurrent: true }),
        ContractVersion.countDocuments({
          status: 'pending_finance',
          isCurrent: true,
          amount: { $gte: 100000 }
        }),
        Notification.countDocuments({ user: req.user._id, isRead: false })
      ]);

      stats = {
        pendingReview: pendingFinance,
        highValuePending,
        approvedByMe,
        totalActive,
        rejectedByMe,
        totalRejected,
        amendedContracts: amendedCount,
        unreadNotifications
      };

      const workflowStats = await Contract.aggregate([
        { $lookup: { from: 'workflowconfigs', localField: 'workflowId', foreignField: '_id', as: 'workflow' } },
        { $unwind: { path: '$workflow', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'workflow.steps': { $elemMatch: { isActive: true, role: { $in: ['finance', 'senior_finance'] } } }
          }
        },
        { $group: { _id: '$workflow.name', count: { $sum: 1 }, workflowId: { $first: '$workflow._id' } } },
        { $sort: { count: -1 } }
      ]);

      stats.workflowStats = workflowStats.map(w => ({
        workflowName: w._id || 'No Workflow',
        workflowId: w.workflowId,
        count: w.count
      }));

      const previousRoles = req.user.previousRoles?.map(pr => pr.role) || [];
      if (previousRoles.includes('legal')) {
        const createdContractIds = await Contract.find({ createdBy: req.user._id }).distinct('_id');
        const activeFromCreated = await ContractVersion.countDocuments({
          contract: { $in: createdContractIds }, status: 'active', isCurrent: true
        });
        stats.previousRoleStats = {
          previousRole: 'legal',
          contractsCreated: createdContractIds.length,
          activeFromCreated
        };
      }

    } else if (userRole === 'client') {
      // ═══════════════════════════════════════════
      // CLIENT — final approver, sees only mapped contracts
      // ═══════════════════════════════════════════
      const contractIds = await Contract.find({ client: req.user._id }).distinct('_id');

      const [
        contractStats,
        recentlyApproved,
        unreadNotifications
      ] = await Promise.all([
        ContractVersion.aggregate([
          { $match: { contract: { $in: contractIds }, isCurrent: true } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        ContractVersion.find({
          contract: { $in: contractIds },
          status: 'active',
          approvedByClient: req.user._id,
          isCurrent: true
        })
          .populate({ path: 'contract', populate: { path: 'createdBy', select: 'name email' } })
          .sort({ clientApprovedAt: -1 })
          .limit(5)
          .lean(),
        Notification.countDocuments({ user: req.user._id, isRead: false })
      ]);

      const statusCounts = {};
      contractStats.forEach(s => { statusCounts[s._id] = s.count; });

      stats = {
        pendingApproval: statusCounts.pending_client || 0,
        activeContracts: statusCounts.active || 0,
        recentlyApproved: recentlyApproved.map(v => ({
          contractId: v.contract._id,
          contractNumber: v.contract.contractNumber,
          contractName: v.contractName,
          amount: v.amount,
          createdBy: v.contract.createdBy,
          approvedAt: v.clientApprovedAt
        })),
        rejectedContracts: statusCounts.rejected || 0,
        totalContracts: contractIds.length,
        unreadNotifications
      };
    }

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending approvals (with optional type filter)
// @route   GET /api/dashboard/pending
// @access  Private
exports.getPendingApprovals = async (req, res, next) => {
  try {
    let pendingContracts = [];
    const userRole = req.user.role;
    const { type } = req.query;

    let statusFilter = { $in: ['pending_finance', 'pending_client'] };
    if (type === 'finance') statusFilter = 'pending_finance';
    else if (type === 'client') statusFilter = 'pending_client';

    if (userRole === 'super_admin') {
      const versions = await ContractVersion.find({ status: statusFilter, isCurrent: true })
        .populate({
          path: 'contract',
          populate: [
            { path: 'client', select: 'name email' },
            { path: 'createdBy', select: 'name email' }
          ]
        })
        .sort({ updatedAt: -1 });

      pendingContracts = versions.map(v => ({
        contractId: v.contract._id,
        contractNumber: v.contract.contractNumber,
        contractName: v.contractName,
        amount: v.amount,
        effectiveDate: v.effectiveDate,
        status: v.status,
        client: v.contract.client,
        createdBy: v.contract.createdBy,
        submittedAt: v.updatedAt,
        createdAt: v.contract.createdAt,
        updatedAt: v.updatedAt,
        versionNumber: v.versionNumber
      }));

    } else if (userRole === 'finance') {
      const versions = await ContractVersion.find({ status: 'pending_finance', isCurrent: true })
        .populate({
          path: 'contract',
          populate: [
            { path: 'client', select: 'name email' },
            { path: 'createdBy', select: 'name email' }
          ]
        });

      pendingContracts = versions.map(v => ({
        contractId: v.contract._id,
        contractNumber: v.contract.contractNumber,
        contractName: v.contractName,
        amount: v.amount,
        effectiveDate: v.effectiveDate,
        status: v.status,
        client: v.contract.client,
        createdBy: v.contract.createdBy,
        submittedAt: v.updatedAt,
        createdAt: v.contract.createdAt,
        updatedAt: v.updatedAt,
        versionNumber: v.versionNumber
      }));

    } else if (userRole === 'client') {
      const myContracts = await Contract.find({ client: req.user._id });
      const contractIds = myContracts.map(c => c._id);

      const versions = await ContractVersion.find({
        contract: { $in: contractIds },
        status: 'pending_client',
        isCurrent: true
      })
        .populate({
          path: 'contract',
          populate: [
            { path: 'client', select: 'name email' },
            { path: 'createdBy', select: 'name email' }
          ]
        });

      pendingContracts = versions.map(v => ({
        contractId: v.contract._id,
        contractNumber: v.contract.contractNumber,
        contractName: v.contractName,
        amount: v.amount,
        effectiveDate: v.effectiveDate,
        status: v.status,
        client: v.contract.client,
        createdBy: v.contract.createdBy,
        financeApprovedAt: v.financeApprovedAt,
        createdAt: v.contract.createdAt,
        updatedAt: v.updatedAt,
        versionNumber: v.versionNumber
      }));

    } else if (userRole === 'legal') {
      const myContracts = await Contract.find({ createdBy: req.user._id });
      const contractIds = myContracts.map(c => c._id);

      const versions = await ContractVersion.find({
        contract: { $in: contractIds },
        status: statusFilter,
        isCurrent: true
      })
        .populate({
          path: 'contract',
          populate: { path: 'client', select: 'name email' }
        });

      pendingContracts = versions.map(v => ({
        contractId: v.contract._id,
        contractNumber: v.contract.contractNumber,
        contractName: v.contractName,
        amount: v.amount,
        effectiveDate: v.effectiveDate,
        status: v.status,
        client: v.contract.client,
        createdBy: v.contract.createdBy,
        createdAt: v.contract.createdAt,
        updatedAt: v.updatedAt,
        versionNumber: v.versionNumber
      }));
    }

    res.status(200).json({ success: true, count: pendingContracts.length, data: pendingContracts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active contracts
// @route   GET /api/dashboard/active
// @access  Private
exports.getActiveContracts = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'client') {
      const myContracts = await Contract.find({ client: req.user._id });
      query.contract = { $in: myContracts.map(c => c._id) };
    } else if (req.user.role === 'legal') {
      const myContracts = await Contract.find({ createdBy: req.user._id });
      query.contract = { $in: myContracts.map(c => c._id) };
    }

    query.status = 'active';
    query.isCurrent = true;

    const versions = await ContractVersion.find(query)
      .populate({
        path: 'contract',
        populate: [
          { path: 'client', select: 'name email' },
          { path: 'createdBy', select: 'name email' }
        ]
      })
      .populate('approvedByFinance', 'name email role')
      .populate('approvedByClient', 'name email role')
      .sort({ clientApprovedAt: -1 });

    const activeContracts = versions.map(v => ({
      contractId: v.contract._id,
      contractNumber: v.contract.contractNumber,
      contractName: v.contractName,
      amount: v.amount,
      effectiveDate: v.effectiveDate,
      status: v.status,
      client: v.contract.client,
      createdBy: v.contract.createdBy,
      activatedAt: v.clientApprovedAt,
      approvedByFinance: v.approvedByFinance,
      approvedByClient: v.approvedByClient,
      createdAt: v.contract.createdAt,
      updatedAt: v.updatedAt,
      versionNumber: v.versionNumber
    }));

    res.status(200).json({ success: true, count: activeContracts.length, data: activeContracts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rejected contracts (with optional rejectedByRole filter)
// @route   GET /api/dashboard/rejected
// @access  Private
exports.getRejectedContracts = async (req, res, next) => {
  try {
    let query = {};
    const { rejectedByRole } = req.query;

    if (req.user.role === 'client') {
      const myContracts = await Contract.find({ client: req.user._id });
      query.contract = { $in: myContracts.map(c => c._id) };
    } else if (req.user.role === 'legal') {
      const myContracts = await Contract.find({ createdBy: req.user._id });
      query.contract = { $in: myContracts.map(c => c._id) };
    }

    query.status = 'rejected';
    query.isCurrent = true;

    let versions = await ContractVersion.find(query)
      .populate({
        path: 'contract',
        populate: [
          { path: 'client', select: 'name email' },
          { path: 'createdBy', select: 'name email' }
        ]
      })
      .populate('rejectedBy', 'name email role')
      .sort({ rejectedAt: -1 });

    if (rejectedByRole) {
      const roleMatch = rejectedByRole === 'finance'
        ? ['finance', 'senior_finance']
        : [rejectedByRole];
      versions = versions.filter(v => v.rejectedBy && roleMatch.includes(v.rejectedBy.role));
    }

    const rejectedContracts = versions.map(v => ({
      contractId: v.contract._id,
      contractNumber: v.contract.contractNumber,
      contractName: v.contractName,
      amount: v.amount,
      effectiveDate: v.effectiveDate,
      status: v.status,
      client: v.contract.client,
      createdBy: v.contract.createdBy,
      rejectedBy: v.rejectedBy,
      rejectionRemarks: v.rejectionRemarks,
      financeRemarkInternal: v.financeRemarkInternal,
      financeRemarkClient: v.financeRemarkClient,
      clientRemark: v.clientRemark,
      rejectedAt: v.rejectedAt,
      createdAt: v.contract.createdAt,
      updatedAt: v.updatedAt,
      versionNumber: v.versionNumber
    }));

    res.status(200).json({ success: true, count: rejectedContracts.length, data: rejectedContracts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activity (audit logs) for current user or all (admin)
// @route   GET /api/dashboard/recent-activity
// @access  Private
exports.getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    let query = {};

    if (req.user.role !== 'super_admin') {
      query.performedBy = req.user._id;
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .populate('contract', 'contractNumber')
      .populate('contractVersion', 'versionNumber contractName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users grouped by role / status (Admin only)
// @route   GET /api/dashboard/users-breakdown
// @access  Private/Super Admin
exports.getUsersBreakdown = async (req, res, next) => {
  try {
    const { role, status } = req.query;
    let query = {};

    if (role) query.role = role;
    if (status === 'active') { query.isActive = true; query.isPasswordSet = true; }
    else if (status === 'disabled') { query.isActive = false; }
    else if (status === 'pending') { query.isActive = false; query.isPasswordSet = false; }

    const users = await User.find(query)
      .select('name email role isActive isPasswordSet createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system audit logs (Super Admin only)
// @route   GET /api/dashboard/audit-logs
// @access  Private/Super Admin
exports.getSystemAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const auditLogs = await AuditLog.find()
      .populate('contract', 'contractNumber')
      .populate('performedBy', 'name email')
      .populate('contractVersion', 'versionNumber contractName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments();

    res.status(200).json({
      success: true,
      count: auditLogs.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: auditLogs
    });
  } catch (error) {
    next(error);
  }
};
