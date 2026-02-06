const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['super_admin', 'legal', 'finance', 'client'],
    required: true,
    unique: true,
  },
  permissions: {
    // Contract permissions
    canCreateContract: { type: Boolean, default: false },
    canEditDraft: { type: Boolean, default: false },
    canEditSubmitted: { type: Boolean, default: false },
    canDeleteContract: { type: Boolean, default: false },
    canSubmitContract: { type: Boolean, default: false },
    canApproveContract: { type: Boolean, default: false },
    canRejectContract: { type: Boolean, default: false },
    canAmendContract: { type: Boolean, default: false },
    canCancelContract: { type: Boolean, default: false },
    canSendRemarksToClient: { type: Boolean, default: false },
    canViewAllContracts: { type: Boolean, default: false },
    canViewOwnContracts: { type: Boolean, default: true },
    
    // User permissions
    canManageUsers: { type: Boolean, default: false },
    canAssignRoles: { type: Boolean, default: false },
    
    // System permissions
    canViewAuditLogs: { type: Boolean, default: false },
    canViewSystemLogs: { type: Boolean, default: false },
    canConfigureWorkflow: { type: Boolean, default: false },
    canConfigurePermissions: { type: Boolean, default: false },
    
    // Dashboard
    canViewDashboard: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: false },
  },
  description: {
    type: String,
    default: '',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for fast role lookups
rolePermissionSchema.index({ role: 1 });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
