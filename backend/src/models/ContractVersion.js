const mongoose = require('mongoose');

const contractVersionSchema = new mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  contractName: {
    type: String,
    required: [true, 'Contract name is required'],
    trim: true
  },
  clientEmail: {
    type: String,
    required: [true, 'Client email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  effectiveDate: {
    type: Date,
    required: [true, 'Effective date is required']
  },
  amount: {
    type: Number,
    required: [true, 'Contract amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['draft', 'pending_finance', 'pending_client', 'active', 'rejected', 'cancelled'],
    default: 'draft'
  },
  // Finance rejection remarks
  financeRemarkInternal: {
    type: String,
    default: null
  },
  financeRemarkClient: {
    type: String,
    default: null
  },
  // Client rejection remark
  clientRemark: {
    type: String,
    default: null
  },
  // Legacy field for backward compatibility
  rejectionRemarks: {
    type: String,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  approvedByFinance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  financeApprovedAt: {
    type: Date,
    default: null
  },
  approvedByClient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  clientApprovedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isCurrent: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for contract + version uniqueness
contractVersionSchema.index({ contract: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('ContractVersion', contractVersionSchema);
