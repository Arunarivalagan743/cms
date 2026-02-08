const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    default: null
  },
  contractVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContractVersion',
    default: null
  },
  action: {
    type: String,
    enum: [
      // ===== Super Admin Actions =====
      'user_created',
      'user_updated',
      'user_deleted',
      'role_assigned',
      'role_removed',
      'permission_updated',
      'workflow_created',
      'workflow_updated',
      'workflow_activated',
      'workflow_deactivated',
      'system_config_updated',
      'audit_viewed',

      // ===== Legal User Actions =====
      'contract_created',
      'contract_updated',
      'draft_saved',
      'contract_deleted_draft',
      'contract_submitted',
      'contract_viewed',
      'contract_history_viewed',
      'version_viewed',
      'contract_amended',
      'amendment_submitted',
      'contract_resubmitted',
      'attachment_uploaded',
      'attachment_removed',
      'comment_added',

      // ===== Finance Reviewer Actions =====
      'contract_opened_review',
      'contract_reviewed',
      'contract_approved_finance',
      'contract_rejected_finance',
      'finance_remarks_added',
      'contract_forwarded_client',
      'approval_revoked',

      // ===== Client Actions =====
      'contract_viewed_client',
      'contract_reviewed_client',
      'contract_approved_client',
      'contract_rejected_client',
      'client_remarks_added',
      'contract_activated',
      'document_downloaded',

      // ===== Auth Actions (all roles) =====
      'login_success',
      'login_failed',
      'logout',
      'password_reset',

      // ===== System / Automatic Actions =====
      'status_changed',
      'version_incremented',
      'is_current_updated',
      'notification_sent',
      'notification_read',
      'access_denied',
      'permission_denied',
      'validation_failed',
      'workflow_violation',
      'concurrent_update_blocked',
      'session_expired',
      'token_expired',

      // ===== Legacy actions (backward compat) =====
      'created',
      'updated',
      'submitted',
      'approved',
      'rejected',
      'amended',
      'viewed',
      'sent_remarks_to_client',
    ],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null  // null for system/automatic actions or failed logins
  },
  roleAtTime: {
    type: String,
    required: true
  },
  remarks: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  success: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only createdAt, immutable (append-only)
});

// Prevent updates and deletes at model level (append-only audit trail)
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('deleteMany', function() {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs cannot be modified');
});

// Indexes for efficient queries
auditLogSchema.index({ contract: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ roleAtTime: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, roleAtTime: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
