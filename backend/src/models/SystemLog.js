const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'login',
      'login_failed',
      'logout',
      'user_created',
      'user_updated',
      'user_deleted',
      'user_disabled',
      'user_enabled',
      'role_changed',
      'password_reset',
      'password_changed',
      'invite_sent',
      'invite_resent',
      'workflow_updated',
      'permission_updated',
      'system_config_changed'
    ],
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for failed logins
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  success: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Prevent modification of system logs (append-only)
systemLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('System logs cannot be modified');
});

systemLogSchema.pre('findOneAndDelete', function() {
  throw new Error('System logs cannot be deleted');
});

systemLogSchema.pre('deleteOne', function() {
  throw new Error('System logs cannot be deleted');
});

systemLogSchema.pre('deleteMany', function() {
  throw new Error('System logs cannot be deleted');
});

// Indexes for efficient querying
systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ action: 1, createdAt: -1 });
systemLogSchema.index({ performedBy: 1, createdAt: -1 });
systemLogSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
