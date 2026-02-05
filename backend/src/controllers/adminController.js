const WorkflowConfig = require('../models/WorkflowConfig');
const RolePermission = require('../models/RolePermission');
const SystemLog = require('../models/SystemLog');
const { createSystemLog } = require('../utils/systemLog');

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
    }

    res.status(201).json({
      success: true,
      message: `Workflow v${newVersion} created and activated. Old workflows deactivated.`,
      data: workflow,
    });
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
            canCreateContract: true,
            canEditDraft: true,
            canEditSubmitted: true,
            canDeleteContract: true,
            canSubmitContract: true,
            canApproveContract: true,
            canRejectContract: true,
            canAmendContract: true,
            canCancelContract: true,
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
          description: 'Full system access',
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
            canCancelContract: true,
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
            canCancelContract: false,
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
            canCancelContract: false,
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

    let rolePermission = await RolePermission.findOne({ role });

    const oldPermissions = rolePermission ? { ...rolePermission.permissions.toObject() } : null;

    if (!rolePermission) {
      rolePermission = new RolePermission({ role });
    }

    if (permissions) {
      rolePermission.permissions = { ...rolePermission.permissions.toObject(), ...permissions };
    }
    if (description !== undefined) {
      rolePermission.description = description;
    }
    rolePermission.updatedBy = req.user._id;

    await rolePermission.save();

    // Find changed permissions
    const changedPermissions = [];
    if (oldPermissions) {
      for (const [key, value] of Object.entries(permissions || {})) {
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

    res.json({
      success: true,
      data: rolePermission,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SYSTEM ACTIVITY LOGS ====================

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
      endDate,
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
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
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
