const mongoose = require('mongoose');

const workflowStepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  action: {
    type: String,
    enum: ['submit', 'approve', 'review', 'final_approve'],
    default: 'approve',
  },
  canSkip: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const workflowConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  version: {
    type: Number,
    required: true,
    default: 1,
  },
  steps: [workflowStepSchema],
  isActive: {
    type: Boolean,
    default: false, // Only one can be active at a time
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// IMMUTABILITY: Block updates to existing workflows
workflowConfigSchema.pre('findOneAndUpdate', function() {
  throw new Error('Workflows are immutable. Create a new version instead.');
});

// Block deletes
workflowConfigSchema.pre('deleteOne', function() {
  throw new Error('Workflows cannot be deleted for audit integrity.');
});

workflowConfigSchema.pre('findOneAndDelete', function() {
  throw new Error('Workflows cannot be deleted for audit integrity.');
});

// Index for quick lookup
workflowConfigSchema.index({ isActive: 1 });
workflowConfigSchema.index({ version: -1 });

module.exports = mongoose.model('WorkflowConfig', workflowConfigSchema);
