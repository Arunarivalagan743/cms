const WorkflowConfig = require('../models/WorkflowConfig');
const RolePermission = require('../models/RolePermission');
const SystemLog = require('../models/SystemLog');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const ContractVersion = require('../models/ContractVersion');
const { createSystemLog } = require('../utils/systemLog');
const { createAuditLog } = require('../utils/auditLog');
const { notifyAdminOfWorkflowChange, notifyAdminOfPermissionChange } = require('../utils/notifications');

// ==================== WORKFLOW CONFIGURATION ====================

// @desc    Get all workflow versions (history)
// @route   GET /api/admin/workflows
// @access  Super Admin only
exports.getWorkflows = async (req, res, next) => {
  try {
    const workflows = await WorkflowConfig.find()
      .populate('createdBy', 'name email')
      .sort({ version: -1, createdAt: -1 });

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently active workflow
// @route   GET /api/admin/workflows/active
// @access  Private (all authenticated users)
exports.getActiveWorkflow = async (req, res, next) => {
  try {
    let workflow = await WorkflowConfig.findOne({ isActive: true });

    // If no workflow exists, create default one
    if (!workflow) {
      workflow = await WorkflowConfig.create({
        name: 'Standard Approval Workflow',
        description: 'Default 3-stage approval: Legal → Finance → Client',
        version: 1,
        isActive: true,
        steps: [
          {
            order: 1,
            name: 'Legal Submission',
            role: 'legal',
            action: 'submit',
            canSkip: false,
            isActive: true,
          },
          {
            order: 2,
            name: 'Finance Review',
            role: 'finance',
            action: 'approve',
            canSkip: false,
            isActive: true,
          },
          {
            order: 3,
            name: 'Client Approval',
            role: 'client',
            action: 'final_approve',
            canSkip: false,
            isActive: true,
          },
        ],
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get workflow by ID (for contract reference)
// @route   GET /api/admin/workflows/:id
// @access  Private
exports.getWorkflowById = async (req, res, next) => {
  try {
    const workflow = await WorkflowConfig.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new workflow version (VERSIONING - never update existing)
// @route   POST /api/admin/workflows
// @access  Super Admin only
exports.createWorkflowVersion = async (req, res, next) => {
  try {
    const { name, description, steps } = req.body;

    // Get the latest version number
    const latestWorkflow = await WorkflowConfig.findOne().sort({ version: -1 });
    const newVersion = latestWorkflow ? latestWorkflow.version + 1 : 1;

    // Deactivate all existing workflows (using save, not update)
    const activeWorkflows = await WorkflowConfig.find({ isActive: true });
    for (const wf of activeWorkflows) {
      wf.isActive = false;
      await wf.save();
    }

    // Create new workflow version
    const workflow = await WorkflowConfig.create({
      name,
      description,
      version: newVersion,
      steps: steps.map((step, index) => ({
        ...step,
        order: index + 1,
      })),
      isActive: true,
      createdBy: req.user._id,
    });

    // Log workflow creation
    await createSystemLog({
      action: 'workflow_updated',
      performedBy: req.user._id,
      details: {
        workflowId: workflow._id,
        workflowName: workflow.name,
        version: workflow.version,
        action: 'created_new_version',
        stepsCount: workflow.steps.length,
      },
      req,
    });

    // Audit log for workflow_created
    await createAuditLog({
      action: 'workflow_created',
      userId: req.user._id,
      role: req.user.role,
      remarks: `Created workflow: ${workflow.name} v${workflow.version}`,
      metadata: { workflowId: workflow._id, workflowName: workflow.name, version: workflow.version, stepsCount: workflow.steps.length },
      req
    });

    // Audit log for workflow_activated
    await createAuditLog({
      action: 'workflow_activated',
      userId: req.user._id,
      role: req.user.role,
      remarks: `Activated workflow: ${workflow.name} v${workflow.version}`,
      metadata: { workflowId: workflow._id, workflowName: workflow.name, version: workflow.version },
      req
    });

    // Log old workflow deactivation
    if (latestWorkflow) {
      await createSystemLog({
        action: 'workflow_updated',
        performedBy: req.user._id,
        details: {
          workflowId: latestWorkflow._id,
          workflowName: latestWorkflow.name,
          version: latestWorkflow.version,
          action: 'deactivated',
        },
        req,
      });

      // Audit log for workflow_deactivated
      await createAuditLog({
        action: 'workflow_deactivated',
        userId: req.user._id,
        role: req.user.role,
        remarks: `Deactivated workflow: ${latestWorkflow.name} v${latestWorkflow.version}`,
        metadata: { workflowId: latestWorkflow._id, workflowName: latestWorkflow.name, version: latestWorkflow.version },
        req
      });
    }

    res.status(201).json({
      success: true,
      message: `Workflow v${newVersion} created and activated. Old workflows deactivated.`,
      data: workflow,
    });

    // Notify admins of workflow change (after response sent)
    notifyAdminOfWorkflowChange(workflow.name).catch(err => console.error('Workflow notification error:', err));
  } catch (error) {
    next(error);
  }
};

// @desc    Get default workflow (backward compatibility alias)
// @route   GET /api/admin/workflows/default
// @access  Private
exports.getDefaultWorkflow = async (req, res, next) => {
  return exports.getActiveWorkflow(req, res, next);
};

// ==================== ROLE PERMISSIONS ====================

// @desc    Get all role permissions
// @route   GET /api/admin/permissions
// @access  Super Admin only
exports.getPermissions = async (req, res, next) => {
  try {
    let permissions = await RolePermission.find()
      .populate('updatedBy', 'name email')
      .sort({ role: 1 });

    // If no permissions exist, create defaults
    if (permissions.length === 0) {
      const defaultPermissions = [
        {
          role: 'super_admin',
          permissions: {
            canCreateContract: false,
            canEditDraft: false,
            canEditSubmitted: false,
            canDeleteContract: false,
            canSubmitContract: false,
            canApproveContract: false,
            canRejectContract: false,
            canAmendContract: false,
            canViewAllContracts: true,
            canViewOwnContracts: true,
            canManageUsers: true,
            canAssignRoles: true,
            canViewAuditLogs: true,
            canViewSystemLogs: true,
            canConfigureWorkflow: true,
            canConfigurePermissions: true,
            canViewDashboard: true,
            canViewReports: true,
          },
          description: 'Manage users, configure workflows & permissions, view audit logs',
        },
        {
          role: 'legal',
          permissions: {
            canCreateContract: true,
            canEditDraft: true,
            canEditSubmitted: false,
            canDeleteContract: false,
            canSubmitContract: true,
            canApproveContract: false,
            canRejectContract: false,
            canAmendContract: true,
            canViewAllContracts: false,
            canViewOwnContracts: true,
            canManageUsers: false,
            canAssignRoles: false,
            canViewAuditLogs: false,
            canViewSystemLogs: false,
            canConfigureWorkflow: false,
            canConfigurePermissions: false,
            canViewDashboard: true,
            canViewReports: false,
          },
          description: 'Create and manage contracts',
        },
        {
          role: 'finance',
          permissions: {
            canCreateContract: false,
            canEditDraft: false,
            canEditSubmitted: false,
            canDeleteContract: false,
            canSubmitContract: false,
            canApproveContract: true,
            canRejectContract: true,
            canAmendContract: false,
            canViewAllContracts: true,
            canViewOwnContracts: true,
            canManageUsers: false,
            canAssignRoles: false,
            canViewAuditLogs: false,
            canViewSystemLogs: false,
            canConfigureWorkflow: false,
            canConfigurePermissions: false,
            canViewDashboard: true,
            canViewReports: true,
          },
          description: 'Review and approve contracts',
        },
        {
          role: 'client',
          permissions: {
            canCreateContract: false,
            canEditDraft: false,
            canEditSubmitted: false,
            canDeleteContract: false,
            canSubmitContract: false,
            canApproveContract: true,
            canRejectContract: true,
            canAmendContract: false,
            canViewAllContracts: false,
            canViewOwnContracts: true,
            canManageUsers: false,
            canAssignRoles: false,
            canViewAuditLogs: false,
            canViewSystemLogs: false,
            canConfigureWorkflow: false,
            canConfigurePermissions: false,
            canViewDashboard: true,
            canViewReports: false,
          },
          description: 'View and approve assigned contracts',
        },
      ];

      permissions = await RolePermission.insertMany(defaultPermissions);
    }

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update role permissions
// @route   PUT /api/admin/permissions/:role
// @access  Super Admin only
exports.updatePermissions = async (req, res, next) => {
  try {
    const { role } = req.params;
    const { permissions, description } = req.body;

    // Super Admin cannot have contract operation permissions (read-only + admin controls only)
    const SUPER_ADMIN_BLOCKED = [
      'canCreateContract',
      'canEditDraft',
      'canEditSubmitted',
      'canDeleteContract',
      'canSubmitContract',
      'canApproveContract',
      'canRejectContract',
      'canAmendContract',
    ];

    let sanitizedPermissions = permissions;
    if (role === 'super_admin' && permissions) {
      sanitizedPermissions = { ...permissions };
      for (const key of SUPER_ADMIN_BLOCKED) {
        if (key in sanitizedPermissions) {
          sanitizedPermissions[key] = false;
        }
      }
    }

    let rolePermission = await RolePermission.findOne({ role });

    const oldPermissions = rolePermission ? { ...rolePermission.permissions.toObject() } : null;

    if (!rolePermission) {
      rolePermission = new RolePermission({ role });
    }

    if (sanitizedPermissions) {
      rolePermission.permissions = { ...rolePermission.permissions.toObject(), ...sanitizedPermissions };
    }
    if (description !== undefined) {
      rolePermission.description = description;
    }
    rolePermission.updatedBy = req.user._id;

    await rolePermission.save();

    // Find changed permissions
    const changedPermissions = [];
    if (oldPermissions) {
      for (const [key, value] of Object.entries(sanitizedPermissions || {})) {
        if (oldPermissions[key] !== value) {
          changedPermissions.push({
            permission: key,
            from: oldPermissions[key],
            to: value,
          });
        }
      }
    }

    await createSystemLog({
      action: 'permission_updated',
      performedBy: req.user._id,
      details: {
        role,
        changedPermissions,
      },
      req,
    });

    // Audit log for permission_updated
    await createAuditLog({
      action: 'permission_updated',
      userId: req.user._id,
      role: req.user.role,
      remarks: `Updated permissions for role: ${role}`,
      metadata: { targetRole: role, changedPermissions },
      req
    });

    // Notify admins of permission change
    notifyAdminOfPermissionChange(role).catch(err => console.error('Permission notification error:', err));

    res.json({
      success: true,
      data: rolePermission,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SYSTEM ACTIVITY LOGS ====================

// @desc    Get comprehensive system-wide activity logs (SystemLog + AuditLog combined)
// @route   GET /api/admin/system-logs/comprehensive
// @access  Super Admin only
exports.getComprehensiveSystemLogs = async (req, res, next) => {
  try {
    const {
      action,
      resourceType, // 'User' or 'Contract'
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    // Query for SystemLogs (User management activities)
    const systemLogQuery = {};
    if (action && action !== 'all') {
      systemLogQuery.action = action;
    }
    if (startDate || endDate) {
      systemLogQuery.createdAt = {};
      if (startDate) systemLogQuery.createdAt.$gte = new Date(startDate);
      if (endDate) systemLogQuery.createdAt.$lte = new Date(endDate);
    }

    // Query for AuditLogs (Contract activities)
    const auditLogQuery = {};
    if (action && action !== 'all') {
      auditLogQuery.action = action;
    }
    if (startDate || endDate) {
      auditLogQuery.createdAt = {};
      if (startDate) auditLogQuery.createdAt.$gte = new Date(startDate);
      if (endDate) auditLogQuery.createdAt.$lte = new Date(endDate);
    }

    // Fetch both log types in parallel
    let [systemLogs, auditLogs] = await Promise.all([
      resourceType === 'Contract' ? [] : SystemLog.find(systemLogQuery)
        .populate('performedBy', 'name email role')
        .populate('targetUser', 'name email role')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2)
        .lean(),
      resourceType === 'User' ? [] : AuditLog.find(auditLogQuery)
        .populate('performedBy', 'name email role')
        .populate('contractVersion', 'versionNumber status contractName amount effectiveDate approvedByFinance approvedByClient rejectedBy financeRemarkInternal financeRemarkClient clientRemark')
        .populate('contract', 'contractNumber')
        .populate({
          path: 'contractVersion',
          populate: [
            { path: 'approvedByFinance', select: 'name email role' },
            { path: 'approvedByClient', select: 'name email role' },
            { path: 'rejectedBy', select: 'name email role' },
            { path: 'createdBy', select: 'name email role' }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2)
        .lean()
    ]);

    // Enhance SystemLogs with resourceType
    systemLogs = systemLogs.map(log => ({
      ...log,
      resourceType: 'User',
      _id: log._id.toString(),
      logType: 'system',
      success: log.success !== false // Preserve success field, default to true
    }));

    // Enhance AuditLogs with resourceType and contract details
    auditLogs = auditLogs.map(log => ({
      ...log,
      resourceType: 'Contract',
      _id: log._id.toString(),
      logType: 'audit',
      success: true, // AuditLogs are always successful actions (no failed state)
      contractNumber: log.contract?.contractNumber,
      versionDetails: log.contractVersion ? {
        versionNumber: log.contractVersion.versionNumber,
        status: log.contractVersion.status,
        contractName: log.contractVersion.contractName,
        amount: log.contractVersion.amount,
        effectiveDate: log.contractVersion.effectiveDate,
        approvedByFinance: log.contractVersion.approvedByFinance,
        approvedByClient: log.contractVersion.approvedByClient,
        rejectedBy: log.contractVersion.rejectedBy,
        createdBy: log.contractVersion.createdBy,
        financeRemarkInternal: log.contractVersion.financeRemarkInternal,
        financeRemarkClient: log.contractVersion.financeRemarkClient,
        clientRemark: log.contractVersion.clientRemark
      } : null
    }));

    // Combine and sort by date
    let combinedLogs = [...systemLogs, ...auditLogs].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      combinedLogs = combinedLogs.filter(log => {
        const performedByName = log.performedBy?.name?.toLowerCase() || '';
        const performedByEmail = log.performedBy?.email?.toLowerCase() || '';
        const action = log.action?.toLowerCase() || '';
        const contractNumber = log.contractNumber?.toLowerCase() || '';
        const contractName = log.versionDetails?.contractName?.toLowerCase() || '';
        const targetUserName = log.targetUser?.name?.toLowerCase() || '';
        const remarks = log.remarks?.toLowerCase() || '';
        
        return performedByName.includes(searchLower) ||
               performedByEmail.includes(searchLower) ||
               action.includes(searchLower) ||
               contractNumber.includes(searchLower) ||
               contractName.includes(searchLower) ||
               targetUserName.includes(searchLower) ||
               remarks.includes(searchLower);
      });
    }

    // Pagination
    const total = combinedLogs.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = combinedLogs.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive system activity statistics
// @route   GET /api/admin/system-logs/comprehensive-stats
// @access  Super Admin only
exports.getComprehensiveStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [      // SystemLog stats
      totalSystemLogs,
      todaySystemLogs,
      loginCount,
      failedLogins,
      userChanges,
      // AuditLog stats
      totalAuditLogs,
      todayAuditLogs,
      contractsCreated,
      contractsApproved,
      contractsRejected,
      contractsAmended,
      // Recent activity breakdown
      systemActivity,
      auditActivity,
    ] = await Promise.all([
      // SystemLog queries
      SystemLog.countDocuments(),
      SystemLog.countDocuments({ createdAt: { $gte: today } }),
      SystemLog.countDocuments({ action: 'login', createdAt: { $gte: today } }),
      SystemLog.countDocuments({ action: 'login_failed', createdAt: { $gte: today } }),
      SystemLog.countDocuments({
        action: { $in: ['user_created', 'user_updated', 'user_deleted', 'role_changed'] },
        createdAt: { $gte: today },
      }),
      // AuditLog queries
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.countDocuments({ action: 'created', createdAt: { $gte: today } }),
      AuditLog.countDocuments({ action: 'approved', createdAt: { $gte: today } }),
      AuditLog.countDocuments({ action: 'rejected', createdAt: { $gte: today } }),
      AuditLog.countDocuments({ action: 'amended', createdAt: { $gte: today } }),
      // Activity breakdowns
      SystemLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalLogs: totalSystemLogs + totalAuditLogs,
          todayLogs: todaySystemLogs + todayAuditLogs,
          totalSystemLogs,
          totalAuditLogs,
        },
        userActivity: {
          loginCount,
          failedLogins,
          userChanges,
        },
        contractActivity: {
          contractsCreated,
          contractsApproved,
          contractsRejected,
          contractsAmended,
        },
        activityBreakdown: {
          system: systemActivity,
          audit: auditActivity,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system activity logs
// @route   GET /api/admin/system-logs
// @access  Super Admin only
exports.getSystemLogs = async (req, res, next) => {
  try {
    const {
      action,
      performedBy,
      targetUser,
      startDate,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (action) {
      query.action = action;
    }
    if (performedBy) {
      query.performedBy = performedBy;
    }
    if (targetUser) {
      query.targetUser = targetUser;
    }
    if (startDate) {
      query.createdAt = {
        $gte: new Date(startDate)
      };
    }

    const total = await SystemLog.countDocuments(query);
    const logs = await SystemLog.find(query)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system log statistics
// @route   GET /api/admin/system-logs/stats
// @access  Super Admin only
exports.getSystemLogStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayLogs,
      loginCount,
      failedLogins,
      userChanges,
      recentActivity,
    ] = await Promise.all([
      SystemLog.countDocuments(),
      SystemLog.countDocuments({ createdAt: { $gte: today } }),
      SystemLog.countDocuments({ action: 'login', createdAt: { $gte: today } }),
      SystemLog.countDocuments({ action: 'login_failed', createdAt: { $gte: today } }),
      SystemLog.countDocuments({
        action: { $in: ['user_created', 'user_updated', 'user_deleted', 'role_changed'] },
        createdAt: { $gte: today },
      }),
      SystemLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalLogs,
        todayLogs,
        loginCount,
        failedLogins,
        userChanges,
        activityBreakdown: recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ROLE MANAGEMENT ====================

// @desc    Get all roles
// @route   GET /api/admin/roles
// @access  Super Admin only
exports.getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find()
      .populate('createdBy', 'name email')
      .sort({ isSystem: -1, displayName: 1 });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active roles for dropdown
// @route   GET /api/admin/roles/active
// @access  Private (all authenticated users)
exports.getActiveRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({ isActive: true })
      .select('name displayName color')
      .sort({ isSystem: -1, displayName: 1 });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new role
// @route   POST /api/admin/roles
// @access  Super Admin only
exports.createRole = async (req, res, next) => {
  try {
    const { name, displayName, description, color, defaultPermissions } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists',
      });
    }

    const role = await Role.create({
      name: name.toLowerCase(),
      displayName,
      description,
      color: color || 'gray',
      defaultPermissions: defaultPermissions || {},
      isSystem: false,
      isActive: true,
      createdBy: req.user._id,
    });

    // Also create RolePermission entry for this role
    await RolePermission.create({
      role: name.toLowerCase(),
      permissions: defaultPermissions || {},
      description: description || `Permissions for ${displayName}`,
    });

    // Log the action
    await createSystemLog({
      action: 'role_created',
      description: `Created new role: ${displayName}`,
      performedBy: req.user._id,
      affectedEntity: { type: 'Role', id: role._id },
      metadata: { roleName: name },
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a role
// @route   PUT /api/admin/roles/:id
// @access  Super Admin only
exports.updateRole = async (req, res, next) => {
  try {
    const { displayName, description, color, isActive, defaultPermissions } = req.body;

    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // System roles can only have limited updates
    if (role.isSystem) {
      // Only allow updating color and description for system roles
      role.color = color || role.color;
      role.description = description || role.description;
    } else {
      role.displayName = displayName || role.displayName;
      role.description = description || role.description;
      role.color = color || role.color;
      role.isActive = isActive !== undefined ? isActive : role.isActive;
      if (defaultPermissions) {
        role.defaultPermissions = defaultPermissions;
      }
    }

    await role.save();

    // Update RolePermission if permissions changed
    if (defaultPermissions) {
      await RolePermission.findOneAndUpdate(
        { role: role.name },
        { permissions: defaultPermissions },
        { upsert: true }
      );
    }

    await createSystemLog({
      action: 'role_updated',
      description: `Updated role: ${role.displayName}`,
      performedBy: req.user._id,
      affectedEntity: { type: 'Role', id: role._id },
    });

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a role (soft delete by deactivating)
// @route   DELETE /api/admin/roles/:id
// @access  Super Admin only
exports.deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system roles',
      });
    }

    // Soft delete - just deactivate
    role.isActive = false;
    await role.save();

    await createSystemLog({
      action: 'role_deleted',
      description: `Deactivated role: ${role.displayName}`,
      performedBy: req.user._id,
      affectedEntity: { type: 'Role', id: role._id },
    });

    res.json({
      success: true,
      message: 'Role deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== AUDIT LOG ROUTES ====================

// Role-to-actions mapping for filtering audit logs by role
const ROLE_AUDIT_ACTIONS = {
  super_admin: [
    'user_created', 'user_updated', 'user_deleted', 'role_assigned', 'role_removed',
    'permission_updated', 'workflow_created', 'workflow_updated', 'workflow_activated',
    'workflow_deactivated', 'system_config_updated', 'audit_viewed',
    'login_success', 'login_failed', 'logout', 'password_reset'
  ],
  legal: [
    'contract_created', 'contract_updated', 'draft_saved', 'contract_deleted_draft',
    'contract_submitted', 'contract_viewed', 'contract_history_viewed', 'version_viewed',
    'contract_amended', 'amendment_submitted', 'contract_resubmitted',
    'attachment_uploaded', 'attachment_removed', 'comment_added',
    'login_success', 'logout',
    // Legacy
    'created', 'updated', 'submitted', 'amended', 'viewed'
  ],
  finance: [
    'contract_opened_review', 'contract_reviewed', 'contract_approved_finance',
    'contract_rejected_finance', 'finance_remarks_added', 'contract_forwarded_client',
    'approval_revoked',
    'login_success', 'logout',
    // Legacy
    'approved', 'rejected', 'viewed'
  ],
  client: [
    'contract_viewed_client', 'contract_reviewed_client', 'contract_approved_client',
    'contract_rejected_client', 'client_remarks_added', 'contract_activated',
    'document_downloaded',
    'login_success', 'logout',
    // Legacy
    'approved', 'rejected', 'viewed'
  ],
  system: [
    'status_changed', 'version_incremented', 'is_current_updated',
    'notification_sent', 'notification_read', 'access_denied', 'permission_denied',
    'validation_failed', 'workflow_violation', 'concurrent_update_blocked',
    'session_expired', 'token_expired'
  ]
};

// @desc    Get complete audit trail (Admin view - all logs from AuditLog only)
// @route   GET /api/admin/audit-trail
// @access  Super Admin only
exports.getAuditTrail = async (req, res, next) => {
  try {
    const {
      action,
      role,
      userId,
      contractId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }
    if (role && role !== 'all') {
      // Filter by role-specific actions
      if (ROLE_AUDIT_ACTIONS[role]) {
        if (query.action) {
          // If both action and role specified, intersect
          query.action = { $in: [query.action].filter(a => ROLE_AUDIT_ACTIONS[role].includes(a)) };
        } else {
          query.$or = [
            { roleAtTime: role },
            { action: { $in: ROLE_AUDIT_ACTIONS[role] } }
          ];
        }
      } else {
        query.roleAtTime = role;
      }
    }
    if (userId) {
      query.performedBy = userId;
    }
    if (contractId) {
      query.contract = contractId;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role')
        .populate('contract', 'contractNumber')
        .populate('contractVersion', 'versionNumber contractName status amount effectiveDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Apply text search filter after populate (for name/email/contractNumber search)
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => {
        const fields = [
          log.performedBy?.name,
          log.performedBy?.email,
          log.action,
          log.roleAtTime,
          log.contract?.contractNumber,
          log.contractVersion?.contractName,
          log.remarks,
          JSON.stringify(log.metadata)
        ];
        return fields.some(f => f && f.toLowerCase().includes(searchLower));
      });
      total = logs.length;
    }

    // Log that admin viewed audit trail
    await createAuditLog({
      action: 'audit_viewed',
      userId: req.user._id,
      role: req.user.role,
      remarks: 'Viewed audit trail',
      metadata: { filters: { action, role, userId, contractId, startDate, endDate, search } },
      req
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit trail statistics
// @route   GET /api/admin/audit-trail/stats
// @access  Super Admin only
exports.getAuditTrailStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayLogs,
      roleBreakdown,
      actionBreakdown,
      contractLifecycle,
      authActivity
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.aggregate([
        { $group: { _id: '$roleAtTime', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      // Contract lifecycle counts
      AuditLog.aggregate([
        {
          $match: {
            action: {
              $in: [
                'contract_created', 'contract_submitted', 'contract_approved_finance',
                'contract_rejected_finance', 'contract_approved_client', 'contract_rejected_client',
                'contract_amended', 'contract_activated', 'status_changed',
                // Legacy
                'created', 'submitted', 'approved', 'rejected', 'amended'
              ]
            }
          }
        },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Auth activity
      AuditLog.aggregate([
        {
          $match: {
            action: { $in: ['login_success', 'login_failed', 'logout', 'password_reset'] },
            createdAt: { $gte: today }
          }
        },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalLogs,
          todayLogs,
        },
        roleBreakdown,
        actionBreakdown,
        contractLifecycle,
        authActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs for a specific user with role-mapped filtering
// @route   GET /api/admin/audit-trail/user/:userId
// @access  Super Admin, or own user
exports.getUserAuditTrail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Only super_admin can view other users' audit trails
    if (req.user.role !== 'super_admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user\'s audit trail'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total, user] = await Promise.all([
      AuditLog.find({ performedBy: userId })
        .populate('performedBy', 'name email role')
        .populate('contract', 'contractNumber')
        .populate('contractVersion', 'versionNumber contractName status amount effectiveDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments({ performedBy: userId }),
      require('../models/User').findById(userId).select('name email role').lean()
    ]);

    res.json({
      success: true,
      user,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get role-specific audit logs (mapped to role actions)
// @route   GET /api/admin/audit-trail/role/:role
// @access  Super Admin only
exports.getRoleAuditTrail = async (req, res, next) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const actions = ROLE_AUDIT_ACTIONS[role];
    if (!actions) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}. Valid roles: ${Object.keys(ROLE_AUDIT_ACTIONS).join(', ')}`
      });
    }

    const query = {
      $or: [
        { roleAtTime: role },
        { action: { $in: actions } }
      ]
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role')
        .populate('contract', 'contractNumber')
        .populate('contractVersion', 'versionNumber contractName status amount effectiveDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      role,
      expectedActions: actions,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my audit logs (current user's own activity)
// @route   GET /api/audit/my-logs
// @access  All authenticated users
exports.getMyAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, search, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query: logs performed by this user
    const query = {
      performedBy: req.user._id
    };

    // Optional filters
    if (action) query.action = action;
    if (search) {
      query.remarks = { $regex: search, $options: 'i' };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role')
        .populate('contract', 'contractNumber')
        .populate('contractVersion', 'versionNumber contractName status amount effectiveDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      role: req.user.role,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user audit logs (activity history) - legacy endpoint
// @route   GET /api/admin/audit-logs?userId=:userId
// @access  Super Admin only
exports.getUserAuditLogs = async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Get contract-related audit logs
    const auditLogs = await AuditLog.find({ performedBy: userId })
      .populate({
        path: 'contract',
        select: 'contractNumber',
      })
      .populate({
        path: 'contractVersion',
        select: 'versionNumber contractName amount effectiveDate status financeRemarkInternal financeRemarkClient clientRemark',
      })
      .populate('performedBy', 'name email role')
      .lean();

    // Get user management system logs
    const systemLogs = await SystemLog.find({ performedBy: userId })
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .lean();

    // Process contract audit logs
    const detailedContractLogs = await Promise.all(
      auditLogs.map(async (log) => {
        let versionDetails = null;
        
        if (log.contractVersion) {
          const version = await ContractVersion.findById(log.contractVersion._id)
            .populate('approvedByFinance', 'name email role')
            .populate('approvedByClient', 'name email role')
            .populate('rejectedBy', 'name email role')
            .lean();
          
          versionDetails = {
            versionNumber: version?.versionNumber,
            contractName: version?.contractName,
            amount: version?.amount,
            effectiveDate: version?.effectiveDate,
            status: version?.status,
            approvedByFinance: version?.approvedByFinance,
            approvedByClient: version?.approvedByClient,
            rejectedBy: version?.rejectedBy,
            financeRemarkInternal: version?.financeRemarkInternal,
            financeRemarkClient: version?.financeRemarkClient,
            clientRemark: version?.clientRemark,
          };
        }

        return {
          _id: log._id,
          action: log.action,
          contractNumber: log.contract?.contractNumber,
          contractId: log.contract?._id,
          performedBy: log.performedBy,
          roleAtTime: log.roleAtTime,
          remarks: log.remarks,
          metadata: log.metadata,
          createdAt: log.createdAt,
          versionDetails,
          resourceType: 'Contract',
        };
      })
    );

    // Process system logs (user management activities)
    const detailedSystemLogs = systemLogs.map((log) => {
      let remarks = null;
      
      // Create descriptive remarks based on action
      if (log.action === 'user_created' && log.details?.userName) {
        remarks = `Created user: ${log.details.userName} (${log.details.userEmail}) with role ${log.details.assignedRole}`;
      } else if (log.action === 'user_updated' && log.targetUser) {
        remarks = `Updated user: ${log.targetUser.name}`;
      } else if (log.action === 'user_deleted' && log.details?.userName) {
        remarks = `Deleted user: ${log.details.userName}`;
      } else if (log.action === 'role_changed' && log.details) {
        remarks = `Changed role from ${log.details.fromRole} to ${log.details.toRole}`;
      } else if (log.action === 'invite_sent' && log.details?.email) {
        remarks = `Sent invite to: ${log.details.email}`;
      } else if (log.action === 'permission_updated' && log.details?.role) {
        remarks = `Updated permissions for ${log.details.role} role`;
      }

      return {
        _id: log._id,
        action: log.action, // Keep original action name for frontend matching
        contractNumber: null,
        contractId: null,
        performedBy: log.performedBy,
        roleAtTime: log.performedBy?.role,
        remarks: remarks,
        metadata: log.details,
        details: log.details, // Include details for frontend
        targetUser: log.targetUser, // Include targetUser for frontend
        ipAddress: log.ipAddress,
        success: log.success,
        createdAt: log.createdAt,
        versionDetails: null,
        resourceType: 'User',
      };
    });

    // Combine and sort all logs by date
    const allLogs = [...detailedContractLogs, ...detailedSystemLogs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: allLogs.length,
      data: allLogs,
    });
  } catch (error) {
    next(error);
  }
};
