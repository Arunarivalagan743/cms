const Contract = require('../models/Contract');
const ContractVersion = require('../models/ContractVersion');
const WorkflowConfig = require('../models/WorkflowConfig');
const RolePermission = require('../models/RolePermission');
const { createAuditLog, getContractAuditLogs } = require('../utils/auditLog');
const {
  notifyFinanceOfSubmission,
  notifyClientOfPendingApproval,
  notifyLegalOfRejection,
  notifyLegalOfApproval,
  notifyClientOfFinanceApproval,
  notifyClientOfFinanceRejection,
  notifyLegalOfClientApproval,
  notifyLegalOfClientRejection,
  notifyLegalOfSubmission,
  notifyLegalOfFinanceApproval,
  notifyClientOfActivation
} = require('../utils/notifications');

// Helper function to get user permissions from database
const getUserPermissions = async (role) => {
  const rolePermission = await RolePermission.findOne({ role });
  if (rolePermission) {
    return rolePermission.permissions;
  }
  // Return default permissions if not found
  return {
    canCreateContract: false,
    canEditDraft: false,
    canEditSubmitted: false,
    canDeleteContract: false,
    canSubmitContract: false,
    canApproveContract: false,
    canRejectContract: false,
    canAmendContract: false,
    canViewAllContracts: false
  };
};

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
      .populate('workflowId', 'name steps')
      .sort({ createdAt: -1 });

    // Get current version for each contract
    const contractsWithVersions = await Promise.all(
      contracts.map(async (contract) => {
        const currentVersion = await ContractVersion.findOne({
          contract: contract._id,
          isCurrent: true
        })
          .populate('approvedByFinance', 'name email role')
          .populate('approvedByClient', 'name email role')
          .populate('rejectedBy', 'name email role');

        // Filter by status if provided
        if (status && currentVersion?.status !== status) {
          return null;
        }

        // Finance should NOT see contracts with Direct Client Workflow (no Finance step)
        if ((req.user.role === 'finance' || req.user.role === 'senior_finance')) {
          const workflow = contract.workflowId;
          if (workflow) {
            const hasFinanceStep = workflow.steps.some(s => s.isActive && (s.role === 'finance' || s.role === 'senior_finance'));
            if (!hasFinanceStep) {
              return null; // Skip Direct Client Workflow contracts
            }
          }
        }

        // Finance should NOT see draft contracts (only submitted ones)
        if ((req.user.role === 'finance' || req.user.role === 'senior_finance') && currentVersion?.status === 'draft') {
          return null;
        }

        // Client should NOT see draft or pending_finance contracts (only after finance approval)
        if (req.user.role === 'client' && (currentVersion?.status === 'draft' || currentVersion?.status === 'pending_finance')) {
          return null;
        }

        return {
          contractId: contract._id,
          contractNumber: contract.contractNumber,
          contractName: currentVersion?.contractName,
          amount: currentVersion?.amount,
          effectiveDate: currentVersion?.effectiveDate,
          status: currentVersion?.status,
          client: contract.client,
          createdBy: contract.createdBy,
          createdAt: contract.createdAt,
          updatedAt: currentVersion?.updatedAt,
          versionNumber: currentVersion?.versionNumber,
          approvedByFinance: currentVersion?.approvedByFinance,
          approvedByClient: currentVersion?.approvedByClient,
          rejectedBy: currentVersion?.rejectedBy,
          rejectionRemarks: currentVersion?.rejectionRemarks,
          financeRemarkInternal: currentVersion?.financeRemarkInternal,
          financeRemarkClient: currentVersion?.financeRemarkClient,
          clientRemark: currentVersion?.clientRemark,
          rejectedAt: currentVersion?.rejectedAt,
          activatedAt: currentVersion?.clientApprovedAt,
          submittedAt: currentVersion?.updatedAt,
          workflow: contract.workflowId ? { id: contract.workflowId._id, name: contract.workflowId.name } : null
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
      .populate('createdBy', 'name email')
      .populate('workflowId', 'name description steps');

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

    // Get all versions - sort by isCurrent first, then versionNumber descending
    const versions = await ContractVersion.find({ contract: contract._id })
      .populate('createdBy', 'name email')
      .populate('approvedByFinance', 'name email')
      .populate('approvedByClient', 'name email')
      .populate('rejectedBy', 'name email role')
      .sort({ isCurrent: -1, versionNumber: -1 });  // Current version always first

    // Log contract view activity
    const latestVersion = versions && versions.length > 0 ? versions[0] : null;
    if (latestVersion) {
      // Role-specific view actions
      let viewAction = 'contract_viewed';
      if (req.user.role === 'client') viewAction = 'contract_viewed_client';
      else if (req.user.role === 'finance') viewAction = 'contract_opened_review';

      await createAuditLog({
        contractId: contract._id,
        contractVersionId: latestVersion._id,
        action: viewAction,
        userId: req.user._id,
        role: req.user.role,
        remarks: `Viewed contract with ${versions.length} version(s)`,
        metadata: {
          contractNumber: contract.contractNumber,
          contractName: latestVersion.contractName,
          versionNumber: latestVersion.versionNumber,
          versionCount: versions.length,
          viewedBy: req.user.name,
          viewedByRole: req.user.role
        },
        req
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...contract.toObject(),
        versions,
        workflow: contract.workflowId ? {
          id: contract.workflowId._id,
          name: contract.workflowId.name,
          description: contract.workflowId.description,
          steps: contract.workflowId.steps.filter(s => s.isActive).map(s => ({
            order: s.order,
            name: s.name,
            role: s.role
          }))
        } : null
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
    const { contractName, client, clientEmail, effectiveDate, amount, workflowId } = req.body;

    // Get the workflow - either selected one or active one
    let selectedWorkflow;
    
    if (workflowId) {
      // User selected a specific workflow
      selectedWorkflow = await WorkflowConfig.findById(workflowId);
      if (!selectedWorkflow) {
        return res.status(400).json({
          success: false,
          message: 'Selected workflow not found'
        });
      }
    } else {
      // Use the currently active workflow
      selectedWorkflow = await WorkflowConfig.findOne({ isActive: true });
    }
    
    // If no workflow exists, create default one
    if (!selectedWorkflow) {
      selectedWorkflow = await WorkflowConfig.create({
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
      workflowId: selectedWorkflow._id,
      workflowVersion: selectedWorkflow.version,
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
      action: 'contract_created',
      userId: req.user._id,
      role: req.user.role,
      metadata: { contractName, amount },
      req
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
      action: 'contract_updated',
      userId: req.user._id,
      role: req.user.role,
      metadata: { contractName, clientEmail, effectiveDate, amount },
      req
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

    // Check the workflow to determine next step
    let nextStatus = 'pending_finance'; // Default
    let notifyFinance = true;
    let notifyClient = false;

    if (contract.workflowId) {
      const workflow = await WorkflowConfig.findById(contract.workflowId);
      if (workflow) {
        // Get active steps sorted by order
        const activeSteps = workflow.steps
          .filter(s => s.isActive)
          .sort((a, b) => a.order - b.order);
        
        // Find the step after Legal submission
        const hasFinanceStep = activeSteps.some(s => s.role === 'finance');
        const hasClientStep = activeSteps.some(s => s.role === 'client');
        
        if (!hasFinanceStep && hasClientStep) {
          // Direct to client workflow - skip finance
          nextStatus = 'pending_client';
          notifyFinance = false;
          notifyClient = true;
        }
      }
    }

    // Update status only (no new version on submit)
    currentVersion.status = nextStatus;
    currentVersion.submittedAt = new Date();
    await currentVersion.save();

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'contract_submitted',
      userId: req.user._id,
      role: req.user.role,
      remarks: `Submitted to ${nextStatus === 'pending_client' ? 'client' : 'finance'}`,
      req
    });

    // Also log status change
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'status_changed',
      userId: req.user._id,
      role: 'system',
      metadata: { from: 'draft', to: nextStatus },
      req
    });

    // Notify based on workflow
    if (notifyFinance) {
      await notifyFinanceOfSubmission(contract, currentVersion);
    }
    if (notifyClient) {
      await notifyClientOfPendingApproval(contract, currentVersion);
    }

    // Notify legal user (confirmation of their own submission)
    await notifyLegalOfSubmission(contract, currentVersion);

    const message = nextStatus === 'pending_client' 
      ? 'Contract submitted directly to client for approval'
      : 'Contract submitted for finance review';

    res.status(200).json({
      success: true,
      message,
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
    if (req.user.role === 'finance' || req.user.role === 'senior_finance') {
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

      // Update status only (no new version on approval)
      currentVersion.status = 'pending_client';
      currentVersion.approvedByFinance = req.user._id;
      currentVersion.financeApprovedAt = new Date();
      await currentVersion.save();

      // Notify client that Finance approved and it's pending their approval
      await notifyClientOfPendingApproval(contract, currentVersion);
      await notifyClientOfFinanceApproval(contract, currentVersion);

      // Notify legal user that Finance approved their contract
      await notifyLegalOfFinanceApproval(contract, currentVersion);

      // Create audit log
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'contract_approved_finance',
        userId: req.user._id,
        role: req.user.role,
        remarks: 'Finance approval granted',
        req
      });

      // Log status change
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'status_changed',
        userId: req.user._id,
        role: 'system',
        metadata: { from: 'pending_finance', to: 'pending_client' },
        req
      });

      // Log forwarding to client
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'contract_forwarded_client',
        userId: req.user._id,
        role: req.user.role,
        remarks: 'Contract forwarded to client after finance approval',
        req
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

      // Deactivate any previously active version of this contract
      // (Versioning Rule: Only one version may be Active at any given time)
      await ContractVersion.updateMany(
        { contract: contract._id, status: 'active', _id: { $ne: currentVersion._id } },
        { $set: { isCurrent: false } }
      );

      // Update status only (no new version on approval)
      currentVersion.status = 'active';
      currentVersion.approvedByClient = req.user._id;
      currentVersion.clientApprovedAt = new Date();
      await currentVersion.save();

      // Notify legal user that client approved
      await notifyLegalOfApproval(contract, currentVersion);
      await notifyLegalOfClientApproval(contract, currentVersion);

      // Notify client that the contract is now active (confirmation)
      await notifyClientOfActivation(contract, currentVersion);

      // Create audit log
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'contract_approved_client',
        userId: req.user._id,
        role: req.user.role,
        remarks: 'Client approval granted - Contract is now active',
        req
      });

      // Log contract activation
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'contract_activated',
        userId: req.user._id,
        role: req.user.role,
        remarks: 'Contract activated after client approval',
        req
      });

      // Log status change
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'status_changed',
        userId: req.user._id,
        role: 'system',
        metadata: { from: 'pending_client', to: 'active' },
        req
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
    if (req.user.role === 'finance' || req.user.role === 'senior_finance') {
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
    if (req.user.role === 'finance' || req.user.role === 'senior_finance') {
      const { remarksInternal, remarksClient } = req.body;
      currentVersion.financeRemarkInternal = remarksInternal || remarks;
      // Only store client remark if Finance chose to send it (not null/undefined)
      currentVersion.financeRemarkClient = remarksClient || null;
      currentVersion.rejectionRemarks = remarksInternal || remarks; // backward compatibility - store internal
    } else if (req.user.role === 'client') {
      currentVersion.clientRemark = remarks;
      currentVersion.rejectionRemarks = remarks; // backward compatibility
    }
    
    await currentVersion.save();

    // Notify legal user - send internal remarks for legal to see full details
    const isFinanceRole = req.user.role === 'finance' || req.user.role === 'senior_finance';
    const notificationRemarks = isFinanceRole 
      ? (req.body.remarksInternal || remarks) 
      : remarks;
    await notifyLegalOfRejection(contract, currentVersion, notificationRemarks);

    // Notify client if Finance rejected AND chose to send client message
    if (isFinanceRole) {
      const clientRemarks = req.body.remarksClient;
      // Only notify client if Finance explicitly chose to send a message
      if (clientRemarks) {
        await notifyClientOfFinanceRejection(contract, currentVersion, clientRemarks);
      }
    }

    // Notify legal if Client rejected
    if (req.user.role === 'client') {
      await notifyLegalOfClientRejection(contract, currentVersion, remarks);
    }

    // Create audit log with internal remarks
    const rejAction = isFinanceRole ? 'contract_rejected_finance' : 'contract_rejected_client';
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: rejAction,
      userId: req.user._id,
      role: req.user.role,
      remarks: notificationRemarks,
      req
    });

    // Log status change
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'status_changed',
      userId: req.user._id,
      role: 'system',
      metadata: { from: currentVersion.status === 'rejected' ? 'pending' : 'pending', to: 'rejected', rejectedBy: req.user.role },
      req
    });

    // Log remarks added
    if (isFinanceRole) {
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'finance_remarks_added',
        userId: req.user._id,
        role: req.user.role,
        remarks: notificationRemarks,
        req
      });
    } else if (req.user.role === 'client') {
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'client_remarks_added',
        userId: req.user._id,
        role: req.user.role,
        remarks,
        req
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contract rejected',
      data: currentVersion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create amendment from rejected contract
// @route   POST /api/contracts/:id/amend
// @access  Private/Legal
exports.amendContract = async (req, res, next) => {
  try {
    const { contractName, clientEmail, effectiveDate, amount } = req.body;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if user has permission to amend (canEditDraft allows creating amendments)
    const permissions = await getUserPermissions(req.user.role);
    if (!permissions.canEditDraft && !permissions.canEditSubmitted) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create amendments'
      });
    }

    // Check if user is the creator
    if (contract.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to amend this contract'
      });
    }

    // Get current version - try isCurrent first, then fall back to latest by versionNumber
    let currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // Fallback: if no isCurrent version (e.g. orphaned state), use the latest version
    if (!currentVersion) {
      currentVersion = await ContractVersion.findOne({
        contract: contract._id
      }).sort({ versionNumber: -1 });
    }

    if (!currentVersion) {
      return res.status(404).json({
        success: false,
        message: 'No contract version found'
      });
    }

    // Only rejected contracts can be amended
    if (currentVersion.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only rejected contracts can be amended'
      });
    }

    // Check if there is already a draft version from a prior failed amendment attempt
    const existingDraft = await ContractVersion.findOne({
      contract: contract._id,
      status: 'draft',
      versionNumber: { $gt: currentVersion.versionNumber }
    });

    if (existingDraft) {
      // Resume the previously created draft — update it with new data and mark current
      existingDraft.contractName = contractName || existingDraft.contractName;
      existingDraft.clientEmail = clientEmail || existingDraft.clientEmail;
      existingDraft.effectiveDate = effectiveDate || existingDraft.effectiveDate;
      existingDraft.amount = amount !== undefined ? amount : existingDraft.amount;
      existingDraft.isCurrent = true;
      await existingDraft.save();

      // Ensure the rejected version is not current
      if (currentVersion.isCurrent) {
        currentVersion.isCurrent = false;
        await currentVersion.save();
      }

      // Sync contract.currentVersion
      contract.currentVersion = existingDraft.versionNumber;
      await contract.save();

      // Audit log for resumed amendment
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: existingDraft._id,
        action: 'contract_amended',
        userId: req.user._id,
        role: req.user.role,
        metadata: {
          fromVersion: currentVersion.versionNumber,
          toVersion: existingDraft.versionNumber,
          resumed: true,
          changes: { contractName, clientEmail, effectiveDate, amount }
        },
        req
      });

      return res.status(201).json({
        success: true,
        message: 'Amendment created successfully. You can now edit and resubmit.',
        data: existingDraft
      });
    }

    // Mark current version as not current (making it immutable)
    currentVersion.isCurrent = false;
    await currentVersion.save();

    // Determine next version number from actual data (not the potentially stale contract.currentVersion)
    const latestVersion = await ContractVersion.findOne({ contract: contract._id })
      .sort({ versionNumber: -1 })
      .select('versionNumber');
    const newVersionNumber = (latestVersion ? latestVersion.versionNumber : contract.currentVersion) + 1;

    let newVersion;
    try {
      newVersion = await ContractVersion.create({
        contract: contract._id,
        versionNumber: newVersionNumber,
        contractName: contractName || currentVersion.contractName,
        clientEmail: clientEmail || currentVersion.clientEmail,
        effectiveDate: effectiveDate || currentVersion.effectiveDate,
        amount: amount !== undefined ? amount : currentVersion.amount,
        status: 'draft',
        createdBy: req.user._id,
        isCurrent: true
      });
    } catch (createError) {
      // Roll back: restore isCurrent on the rejected version so state isn't orphaned
      currentVersion.isCurrent = true;
      await currentVersion.save();
      throw createError;
    }

    // Update contract with new version number
    contract.currentVersion = newVersionNumber;
    await contract.save();

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: newVersion._id,
      action: 'contract_amended',
      userId: req.user._id,
      role: req.user.role,
      metadata: { 
        fromVersion: currentVersion.versionNumber,
        toVersion: newVersionNumber,
        changes: { contractName, clientEmail, effectiveDate, amount }
      },
      req
    });

    // Log version increment
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: newVersion._id,
      action: 'version_incremented',
      userId: req.user._id,
      role: 'system',
      metadata: { fromVersion: currentVersion.versionNumber, toVersion: newVersionNumber },
      req
    });

    // Log is_current change
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: newVersion._id,
      action: 'is_current_updated',
      userId: req.user._id,
      role: 'system',
      metadata: { oldCurrentVersion: currentVersion.versionNumber, newCurrentVersion: newVersionNumber },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Amendment created successfully. You can now edit and resubmit.',
      data: newVersion
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
      .populate('rejectedBy', 'name email role')
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
    const contract = await Contract.findById(req.params.id)
      .populate('client', '_id');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check access for clients - they can only see audit logs for their own contracts
    if (req.user.role === 'client' && contract.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view audit logs for this contract'
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

// @desc    Send rejection remarks to client (Legal can send Finance internal remarks to client)
// @route   POST /api/contracts/:id/send-to-client
// @access  Private/Legal, Super Admin
exports.sendRemarksToClient = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Get the current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });
    if (!currentVersion) {
      return res.status(404).json({
        success: false,
        message: 'Contract version not found'
      });
    }

    // Only allow if contract was rejected and has internal remarks but no client remarks
    if (currentVersion.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Can only send remarks for rejected contracts'
      });
    }

    if (!currentVersion.financeRemarkInternal) {
      return res.status(400).json({
        success: false,
        message: 'No internal remarks to send'
      });
    }

    if (currentVersion.financeRemarkClient) {
      return res.status(400).json({
        success: false,
        message: 'Client remarks already sent'
      });
    }

    const { remarksClient } = req.body;
    if (!remarksClient || !remarksClient.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Client remarks are required'
      });
    }

    // Update the version with client remarks
    currentVersion.financeRemarkClient = remarksClient;
    await currentVersion.save();

    // Notify client
    await notifyClientOfFinanceRejection(contract, currentVersion, remarksClient);

    // Create audit log
    await createAuditLog({
      contractId: contract._id,
      contractVersionId: currentVersion._id,
      action: 'sent_remarks_to_client',
      userId: req.user._id,
      role: req.user.role,
      remarks: `Sent remarks to client: ${remarksClient}`,
      metadata: {
        remarksClient: remarksClient
      },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Remarks sent to client successfully',
      data: contract
    });
  } catch (error) {
    next(error);
  }
};
