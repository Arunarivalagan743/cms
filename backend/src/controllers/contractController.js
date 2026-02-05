const Contract = require('../models/Contract');
const ContractVersion = require('../models/ContractVersion');
const WorkflowConfig = require('../models/WorkflowConfig');
const { createAuditLog, getContractAuditLogs } = require('../utils/auditLog');
const {
  notifyFinanceOfSubmission,
  notifyClientOfPendingApproval,
  notifyLegalOfRejection,
  notifyLegalOfApproval,
  notifyClientOfFinanceApproval,
  notifyClientOfFinanceRejection,
  notifyLegalOfClientApproval,
  notifyLegalOfClientRejection
} = require('../utils/notifications');

// @desc    Get all contracts (filtered by role)
// @route   GET /api/contracts
// @access  Private
exports.getContracts = async (req, res, next) => {
  try {
    const { status } = req.query;
    let contracts;

    // Build base query based on role
    let query = {};

    // Get user's previous roles
    const previousRoles = req.user.previousRoles?.map(pr => pr.role) || [];
    const allRoles = [req.user.role, ...previousRoles];

    if (req.user.role === 'client') {
      // Clients can only see contracts assigned to them
      query.client = req.user._id;
    } else if (req.user.role === 'legal') {
      // Legal users see contracts they created
      query.createdBy = req.user._id;
    } else if (req.user.role === 'finance' || req.user.role === 'senior_finance') {
      // Finance sees all contracts, but if they were previously Legal,
      // they can also see a "My Previous Work" section
      if (previousRoles.includes('legal')) {
        // Finance user who was previously Legal - can see all + their created ones
        // No filter needed, they see all as Finance
      }
      // Finance and Super Admin can see all contracts - no query filter
    }
    // Super Admin can see all contracts

    // Special case: If user was previously Legal and is now Finance/Client,
    // also show contracts they created when they were Legal
    if (req.user.role !== 'legal' && previousRoles.includes('legal')) {
      // Include contracts they created in the past
      query = {
        $or: [
          query.client ? { client: query.client } : {},
          { createdBy: req.user._id }
        ].filter(q => Object.keys(q).length > 0)
      };
      
      // If query.$or is empty or has only empty objects, reset query
      if (!query.$or || query.$or.length === 0) {
        query = {};
      }
    }

    contracts = await Contract.find(query)
      .populate('client', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Get current version for each contract
    const contractsWithVersions = await Promise.all(
      contracts.map(async (contract) => {
        const currentVersion = await ContractVersion.findOne({
          contract: contract._id,
          isCurrent: true
        });

        // Filter by status if provided
        if (status && currentVersion?.status !== status) {
          return null;
        }

        return {
          ...contract.toObject(),
          currentVersion
        };
      })
    );

    // Remove nulls (filtered out by status)
    const filteredContracts = contractsWithVersions.filter(c => c !== null);

    res.status(200).json({
      success: true,
      count: filteredContracts.length,
      data: filteredContracts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single contract with all versions
// @route   GET /api/contracts/:id
// @access  Private
exports.getContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('client', 'name email')
      .populate('createdBy', 'name email');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check access based on role
    if (req.user.role === 'client' && contract.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this contract'
      });
    }

    // Get all versions
    const versions = await ContractVersion.find({ contract: contract._id })
      .populate('createdBy', 'name email')
      .populate('approvedByFinance', 'name email')
      .populate('approvedByClient', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ versionNumber: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...contract.toObject(),
        versions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new contract
// @route   POST /api/contracts
// @access  Private/Legal
exports.createContract = async (req, res, next) => {
  try {
    const { contractName, client, clientEmail, effectiveDate, amount } = req.body;

    // Get the currently active workflow - LOCK IT to this contract
    let activeWorkflow = await WorkflowConfig.findOne({ isActive: true });
    
    // If no workflow exists, create default one
    if (!activeWorkflow) {
      activeWorkflow = await WorkflowConfig.create({
        name: 'Standard Approval Workflow',
        description: 'Default 3-stage approval: Legal → Finance → Client',
        version: 1,
        isActive: true,
        steps: [
          { order: 1, name: 'Legal Submission', role: 'legal', action: 'submit', canSkip: false, isActive: true },
          { order: 2, name: 'Finance Review', role: 'finance', action: 'approve', canSkip: false, isActive: true },
          { order: 3, name: 'Client Approval', role: 'client', action: 'final_approve', canSkip: false, isActive: true },
        ],
      });
    }

    // Create contract with LOCKED workflow reference
    const contract = await Contract.create({
      client,
      createdBy: req.user._id,
      workflowId: activeWorkflow._id,
      workflowVersion: activeWorkflow.version,
      currentStep: 1  // Start at first step (Legal submission)
    });

    // Create initial version (draft)
    const contractVersion = await ContractVersion.create({
      contract: contract._id,
      versionNumber: 1,
      contractName,
      clientEmail,
      effectiveDate,
      amount,
      status: 'draft',
      createdBy: req.user._id,
      isCurrent: true
    });

    // Update contract with current version
    contract.currentVersion = 1;
    await contract.save();

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: contractVersion._id,
      action: 'created',
      userId: req.user._id,
      role: req.user.role,
      metadata: { contractName, amount }
    });

    res.status(201).json({
      success: true,
      data: {
        contract,
        version: contractVersion
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update draft contract
// @route   PUT /api/contracts/:id
// @access  Private/Legal
exports.updateContract = async (req, res, next) => {
  try {
    const { contractName, clientEmail, effectiveDate, amount } = req.body;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if user is the creator
    if (contract.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this contract'
      });
    }

    // Get current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // Only draft contracts can be edited
    if (currentVersion.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft contracts can be edited'
      });
    }

    // Update version
    if (contractName) currentVersion.contractName = contractName;
    if (clientEmail) currentVersion.clientEmail = clientEmail;
    if (effectiveDate) currentVersion.effectiveDate = effectiveDate;
    if (amount) currentVersion.amount = amount;

    await currentVersion.save();

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'updated',
      userId: req.user._id,
      role: req.user.role,
      metadata: { contractName, clientEmail, effectiveDate, amount }
    });

    res.status(200).json({
      success: true,
      data: currentVersion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit contract for review
// @route   POST /api/contracts/:id/submit
// @access  Private/Legal
exports.submitContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if user is the creator
    if (contract.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this contract'
      });
    }

    // Get current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // Only draft contracts can be submitted
    if (currentVersion.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft contracts can be submitted'
      });
    }

    // Update status to pending finance review
    currentVersion.status = 'pending_finance';
    await currentVersion.save();

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'submitted',
      userId: req.user._id,
      role: req.user.role
    });

    // Notify finance reviewers
    await notifyFinanceOfSubmission(contract, currentVersion);

    res.status(200).json({
      success: true,
      message: 'Contract submitted for finance review',
      data: currentVersion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve contract (Finance or Client)
// @route   POST /api/contracts/:id/approve
// @access  Private/Finance/Client
exports.approveContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Get current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // Validate based on role and status
    if (req.user.role === 'finance') {
      if (currentVersion.status !== 'pending_finance') {
        return res.status(400).json({
          success: false,
          message: 'Contract is not pending finance review'
        });
      }

      // SECURITY: Prevent self-approval (conflict of interest)
      // If user was previously Legal and created this contract, they cannot approve it
      if (contract.createdBy.toString() === req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Conflict of interest: You cannot approve a contract you created'
        });
      }

      // Finance approves -> move to pending client
      currentVersion.status = 'pending_client';
      currentVersion.approvedByFinance = req.user._id;
      currentVersion.financeApprovedAt = new Date();
      await currentVersion.save();

      // Notify client that Finance approved and it's pending their approval
      await notifyClientOfPendingApproval(contract, currentVersion);
      await notifyClientOfFinanceApproval(contract, currentVersion);

      // Create audit log
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'approved',
        userId: req.user._id,
        role: req.user.role,
        remarks: 'Finance approval granted'
      });

      res.status(200).json({
        success: true,
        message: 'Contract approved by finance, pending client approval',
        data: currentVersion
      });

    } else if (req.user.role === 'client') {
      // Check if this client is assigned to this contract
      if (contract.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to approve this contract'
        });
      }

      if (currentVersion.status !== 'pending_client') {
        return res.status(400).json({
          success: false,
          message: 'Contract is not pending client approval'
        });
      }

      // Client approves -> contract becomes active
      currentVersion.status = 'active';
      currentVersion.approvedByClient = req.user._id;
      currentVersion.clientApprovedAt = new Date();
      await currentVersion.save();

      // Notify legal user that client approved
      await notifyLegalOfApproval(contract, currentVersion);
      await notifyLegalOfClientApproval(contract, currentVersion);

      // Create audit log
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'approved',
        userId: req.user._id,
        role: req.user.role,
        remarks: 'Client approval granted - Contract is now active'
      });

      res.status(200).json({
        success: true,
        message: 'Contract approved and is now active',
        data: currentVersion
      });

    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve contracts'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reject contract (Finance or Client)
// @route   POST /api/contracts/:id/reject
// @access  Private/Finance/Client
exports.rejectContract = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    // Remarks are mandatory for rejection
    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection remarks are required'
      });
    }

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Get current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // Validate based on role and status
    if (req.user.role === 'finance') {
      if (currentVersion.status !== 'pending_finance') {
        return res.status(400).json({
          success: false,
          message: 'Contract is not pending finance review'
        });
      }

      // SECURITY: Prevent self-rejection (conflict of interest)
      // If user was previously Legal and created this contract, they cannot reject it
      if (contract.createdBy.toString() === req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Conflict of interest: You cannot reject a contract you created'
        });
      }
    } else if (req.user.role === 'client') {
      if (contract.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to reject this contract'
        });
      }

      if (currentVersion.status !== 'pending_client') {
        return res.status(400).json({
          success: false,
          message: 'Contract is not pending client approval'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject contracts'
      });
    }

    // Reject the contract
    currentVersion.status = 'rejected';
    currentVersion.rejectedBy = req.user._id;
    currentVersion.rejectedAt = new Date();
    
    // Store remarks based on who is rejecting
    if (req.user.role === 'finance') {
      // Finance provides both internal and client-facing remarks
      const { remarksInternal, remarksClient } = req.body;
      currentVersion.financeRemarkInternal = remarksInternal || remarks;
      currentVersion.financeRemarkClient = remarksClient || remarks;
      currentVersion.rejectionRemarks = remarksInternal || remarks; // backward compatibility - store internal
    } else if (req.user.role === 'client') {
      currentVersion.clientRemark = remarks;
      currentVersion.rejectionRemarks = remarks; // backward compatibility
    }
    
    await currentVersion.save();

    // Notify legal user - send internal remarks for legal to see full details
    const notificationRemarks = req.user.role === 'finance' 
      ? (req.body.remarksInternal || remarks) 
      : remarks;
    await notifyLegalOfRejection(contract, currentVersion, notificationRemarks);

    // Notify client if Finance rejected (so they know the contract is on hold)
    if (req.user.role === 'finance') {
      const clientRemarks = req.body.remarksClient || remarks;
      await notifyClientOfFinanceRejection(contract, currentVersion, clientRemarks);
    }

    // Notify legal if Client rejected
    if (req.user.role === 'client') {
      await notifyLegalOfClientRejection(contract, currentVersion, remarks);
    }

    // Create audit log with internal remarks
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'rejected',
      userId: req.user._id,
      role: req.user.role,
      remarks: notificationRemarks
    });

    res.status(200).json({
      success: true,
      message: 'Contract rejected',
      data: currentVersion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create amendment for rejected contract
// @route   POST /api/contracts/:id/amend
// @access  Private/Legal
exports.createAmendment = async (req, res, next) => {
  try {
    const { contractName, clientEmail, effectiveDate, amount } = req.body;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if user is the creator
    if (contract.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to amend this contract'
      });
    }

    // Get current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // Only rejected contracts can be amended
    if (currentVersion.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only rejected contracts can be amended'
      });
    }

    // Mark current version as not current
    currentVersion.isCurrent = false;
    await currentVersion.save();

    // Create new version
    const newVersionNumber = contract.currentVersion + 1;
    const newVersion = await ContractVersion.create({
      contract: contract._id,
      versionNumber: newVersionNumber,
      contractName: contractName || currentVersion.contractName,
      clientEmail: clientEmail || currentVersion.clientEmail,
      effectiveDate: effectiveDate || currentVersion.effectiveDate,
      amount: amount || currentVersion.amount,
      status: 'draft',
      createdBy: req.user._id,
      isCurrent: true
    });

    // Update contract
    contract.currentVersion = newVersionNumber;
    await contract.save();

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: newVersion._id,
      action: 'amended',
      userId: req.user._id,
      role: req.user.role,
      metadata: { previousVersion: currentVersion.versionNumber, newVersion: newVersionNumber }
    });

    res.status(201).json({
      success: true,
      message: 'Amendment created successfully',
      data: newVersion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel contract
// @route   POST /api/contracts/:id/cancel
// @access  Private/Client/Super Admin
exports.cancelContract = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Only client (assigned to contract) or super_admin can cancel
    if (req.user.role === 'client') {
      if (contract.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to cancel this contract'
        });
      }
    } else if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only client or admin can cancel contracts'
      });
    }

    // Get current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // Can only cancel when status is pending_client or rejected
    const allowedStatuses = ['pending_client', 'rejected'];
    if (!allowedStatuses.includes(currentVersion.status)) {
      return res.status(400).json({
        success: false,
        message: `Contract can only be cancelled when status is: ${allowedStatuses.join(', ')}. Current status: ${currentVersion.status}`
      });
    }

    // Cancel the contract
    currentVersion.status = 'cancelled';
    currentVersion.clientRemark = reason || 'Contract cancelled';
    await currentVersion.save();

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'cancelled',
      userId: req.user._id,
      role: req.user.role,
      remarks: reason || 'Contract cancelled'
    });

    res.status(200).json({
      success: true,
      message: 'Contract cancelled successfully',
      data: currentVersion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contract versions
// @route   GET /api/contracts/:id/versions
// @access  Private
exports.getContractVersions = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check access based on role
    if (req.user.role === 'client' && contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this contract'
      });
    }

    const versions = await ContractVersion.find({ contract: contract._id })
      .populate('createdBy', 'name email')
      .populate('approvedByFinance', 'name email')
      .populate('approvedByClient', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ versionNumber: -1 });

    res.status(200).json({
      success: true,
      count: versions.length,
      data: versions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contract audit trail
// @route   GET /api/contracts/:id/audit
// @access  Private/Super Admin
exports.getContractAudit = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    const auditLogs = await getContractAuditLogs(contract._id);

    res.status(200).json({
      success: true,
      count: auditLogs.length,
      data: auditLogs
    });
  } catch (error) {
    next(error);
  }
};
