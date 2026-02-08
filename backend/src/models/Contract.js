const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    unique: true,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentVersion: {
    type: Number,
    default: 1
  },
  // WORKFLOW LOCKING: Store workflow at creation time
  // These are locked when contract is created and NEVER change
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowConfig',
    // Not required for backward compatibility with existing contracts
    default: null
  },
  workflowVersion: {
    type: Number,
    // Not required for backward compatibility with existing contracts
    default: null
  },
  // Current step in the workflow (1-based index)
  // Step 1 = draft/legal submission
  // Step 2 = finance review  
  // Step 3 = client approval
  // Step > totalSteps = contract is active
  currentStep: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Database indexes for faster queries
contractSchema.index({ client: 1 });
contractSchema.index({ createdBy: 1 });
contractSchema.index({ createdAt: -1 });
// contractNumber already has unique: true, no need for separate index
contractSchema.index({ client: 1, createdAt: -1 });
contractSchema.index({ createdBy: 1, createdAt: -1 });

// Auto-generate contract number before validation
contractSchema.pre('validate', async function() {
  if (this.isNew && !this.contractNumber) {
    const count = await mongoose.model('Contract').countDocuments();
    this.contractNumber = `CON-${String(count + 1).padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('Contract', contractSchema);
