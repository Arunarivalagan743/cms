const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  // System roles cannot be deleted
  isSystem: {
    type: Boolean,
    default: false,
  },
  // Whether this role can be assigned to users
  isActive: {
    type: Boolean,
    default: true,
  },
  // Color for UI display
  color: {
    type: String,
    default: 'gray',
    enum: ['blue', 'green', 'purple', 'amber', 'red', 'gray', 'teal', 'indigo', 'pink', 'orange'],
  },
  // Default permissions for new users with this role
  defaultPermissions: {
    canCreateContract: { type: Boolean, default: false },
    canEditDraft: { type: Boolean, default: false },
    canEditSubmitted: { type: Boolean, default: false },
    canDeleteContract: { type: Boolean, default: false },
    canSubmitContract: { type: Boolean, default: false },
    canApproveContract: { type: Boolean, default: false },
    canRejectContract: { type: Boolean, default: false },
    canSendRemarksToClient: { type: Boolean, default: false },
    canViewAllContracts: { type: Boolean, default: false },
    canViewOwnContracts: { type: Boolean, default: true },
    canManageUsers: { type: Boolean, default: false },
    canAssignRoles: { type: Boolean, default: false },
    canViewAuditLogs: { type: Boolean, default: false },
    canViewSystemLogs: { type: Boolean, default: false },
    canConfigureWorkflow: { type: Boolean, default: false },
    canConfigurePermissions: { type: Boolean, default: false },
    canViewDashboard: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: false },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for quick lookups
// Note: name field already has unique index from schema definition
roleSchema.index({ isActive: 1 });

module.exports = mongoose.model('Role', roleSchema);
