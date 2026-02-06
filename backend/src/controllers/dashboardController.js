const Contract = require('../models/Contract');
const ContractVersion = require('../models/ContractVersion');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    let stats = {};
    const userRole = req.user.role;

    if (userRole === 'super_admin') {
      // Super Admin sees everything - use aggregation for single query
      const [contractStats, totalContracts] = await Promise.all([
        ContractVersion.aggregate([
          { $match: { isCurrent: true } },
          { $group: { 
            _id: '$status', 
            count: { $sum: 1 } 
          }}
        ]),
        Contract.countDocuments()
      ]);

      const statusCounts = {};
      contractStats.forEach(s => { statusCounts[s._id] = s.count; });

      stats = {
        totalContracts,
        activeContracts: statusCounts.active || 0,
        pendingContracts: (statusCounts.pending_finance || 0) + (statusCounts.pending_client || 0),
        rejectedContracts: statusCounts.rejected || 0,
        draftContracts: statusCounts.draft || 0
      };

    } else if (userRole === 'legal') {
      // Legal sees their own contracts - use aggregation
      const contractIds = await Contract.find({ createdBy: req.user._id }).distinct('_id');
      
      const [contractStats] = await Promise.all([
        ContractVersion.aggregate([
          { $match: { contract: { $in: contractIds }, isCurrent: true } },
          { $group: { 
            _id: '$status', 
            count: { $sum: 1 } 
          }}
        ])
      ]);

      const statusCounts = {};
      contractStats.forEach(s => { statusCounts[s._id] = s.count; });

      stats = {
        totalContracts: contractIds.length,
        activeContracts: statusCounts.active || 0,
        pendingContracts: (statusCounts.pending_finance || 0) + (statusCounts.pending_client || 0),
        rejectedContracts: statusCounts.rejected || 0,
        draftContracts: statusCounts.draft || 0
      };

    } else if (userRole === 'finance') {
      // Finance sees contracts pending their review - parallel queries
      const [pendingFinance, approvedByMe, totalActive] = await Promise.all([
        ContractVersion.countDocuments({ status: 'pending_finance', isCurrent: true }),
        ContractVersion.countDocuments({ approvedByFinance: req.user._id }),
        ContractVersion.countDocuments({ status: 'active', isCurrent: true })
      ]);

      stats = {
        pendingReview: pendingFinance,
        approvedByMe,
        totalActive
      };

      // If user was previously Legal, also show their created contracts
      const previousRoles = req.user.previousRoles?.map(pr => pr.role) || [];
      if (previousRoles.includes('legal')) {
        const createdContractIds = await Contract.find({ createdBy: req.user._id }).distinct('_id');
        const activeFromCreated = await ContractVersion.countDocuments({
          contract: { $in: createdContractIds },
          status: 'active',
          isCurrent: true
        });
        
        stats.previousRoleStats = {
          previousRole: 'legal',
          contractsCreated: createdContractIds.length,
          activeFromCreated
        };
      }

    } else if (userRole === 'client') {
      // Client sees only their contracts - use aggregation
      const contractIds = await Contract.find({ client: req.user._id }).distinct('_id');

      const contractStats = await ContractVersion.aggregate([
        { $match: { contract: { $in: contractIds }, isCurrent: true } },
        { $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        }}
      ]);

      const statusCounts = {};
      contractStats.forEach(s => { statusCounts[s._id] = s.count; });

      stats = {
        totalContracts: contractIds.length,
        activeContracts: statusCounts.active || 0,
        pendingApproval: statusCounts.pending_client || 0,
        rejectedContracts: statusCounts.rejected || 0
      };
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending approvals
// @route   GET /api/dashboard/pending
// @access  Private
exports.getPendingApprovals = async (req, res, next) => {
  try {
    let pendingContracts = [];
    const userRole = req.user.role;

    if (userRole === 'super_admin') {
      // Super Admin sees all pending contracts
      const versions = await ContractVersion.find({ 
        status: { $in: ['pending_finance', 'pending_client'] }, 
        isCurrent: true 
      })
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
        versionNumber: v.versionNumber
      }));

    } else if (userRole === 'finance') {
      // Get contracts pending finance review
      const versions = await ContractVersion.find({ 
        status: 'pending_finance', 
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
        client: v.contract.client,
        createdBy: v.contract.createdBy,
        submittedAt: v.updatedAt,
        versionNumber: v.versionNumber
      }));

    } else if (userRole === 'client') {
      // Get contracts pending client approval (only assigned to this client)
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
        createdBy: v.contract.createdBy,
        financeApprovedAt: v.financeApprovedAt,
        versionNumber: v.versionNumber
      }));

    } else if (userRole === 'legal') {
      // Legal sees their submitted contracts that are pending
      const myContracts = await Contract.find({ createdBy: req.user._id });
      const contractIds = myContracts.map(c => c._id);

      const versions = await ContractVersion.find({ 
        contract: { $in: contractIds },
        status: { $in: ['pending_finance', 'pending_client'] }, 
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
        status: v.status,
        client: v.contract.client,
        versionNumber: v.versionNumber
      }));
    }

    res.status(200).json({
      success: true,
      count: pendingContracts.length,
      data: pendingContracts
    });
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
    // super_admin and finance see all active contracts (no contract filter needed)

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
      .sort({ clientApprovedAt: -1 });

    const activeContracts = versions.map(v => ({
      contractId: v.contract._id,
      contractNumber: v.contract.contractNumber,
      contractName: v.contractName,
      amount: v.amount,
      effectiveDate: v.effectiveDate,
      client: v.contract.client,
      createdBy: v.contract.createdBy,
      activatedAt: v.clientApprovedAt,
      versionNumber: v.versionNumber
    }));

    res.status(200).json({
      success: true,
      count: activeContracts.length,
      data: activeContracts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rejected contracts
// @route   GET /api/dashboard/rejected
// @access  Private
exports.getRejectedContracts = async (req, res, next) => {
  try {
    let query = {};
    
    if (req.user.role === 'client') {
      const myContracts = await Contract.find({ client: req.user._id });
      query.contract = { $in: myContracts.map(c => c._id) };
    } else if (req.user.role === 'legal') {
      const myContracts = await Contract.find({ createdBy: req.user._id });
      query.contract = { $in: myContracts.map(c => c._id) };
    }
    // super_admin and finance see all rejected contracts (no contract filter needed)

    query.status = 'rejected';
    query.isCurrent = true;

    const versions = await ContractVersion.find(query)
      .populate({
        path: 'contract',
        populate: [
          { path: 'client', select: 'name email' },
          { path: 'createdBy', select: 'name email' }
        ]
      })
      .populate('rejectedBy', 'name email')
      .sort({ rejectedAt: -1 });

    const rejectedContracts = versions.map(v => ({
      contractId: v.contract._id,
      contractNumber: v.contract.contractNumber,
      contractName: v.contractName,
      amount: v.amount,
      client: v.contract.client,
      rejectedBy: v.rejectedBy,
      rejectionRemarks: v.rejectionRemarks,
      financeRemarkInternal: v.financeRemarkInternal,
      financeRemarkClient: v.financeRemarkClient,
      clientRemark: v.clientRemark,
      rejectedAt: v.rejectedAt,
      versionNumber: v.versionNumber
    }));

    res.status(200).json({
      success: true,
      count: rejectedContracts.length,
      data: rejectedContracts
    });
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
