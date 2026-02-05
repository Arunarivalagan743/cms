const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  contractVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContractVersion',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'submitted', 'approved', 'rejected', 'amended', 'cancelled'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roleAtTime: {
    type: String,
    enum: ['super_admin', 'legal', 'finance', 'client'],
    required: true
  },
  remarks: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only createdAt, immutable
});

// Prevent updates and deletes at model level
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs cannot be deleted');
});

// Index for efficient queries
auditLogSchema.index({ contract: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
