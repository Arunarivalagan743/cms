const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getContracts,
  getContract,
  createContract,
  updateContract,
  submitContract,
  approveContract,
  rejectContract,
  createAmendment,
  cancelContract,
  getContractVersions,
  getContractAudit
} = require('../controllers/contractController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(protect);

// Get all contracts (filtered by role)
router.get('/', getContracts);

// Get single contract
router.get('/:id', getContract);

// Get contract versions
router.get('/:id/versions', getContractVersions);

// Get contract audit trail (Super Admin only)
router.get('/:id/audit', authorize('super_admin'), getContractAudit);
router.get('/:id/audit-logs', authorize('super_admin'), getContractAudit);

// Create contract (Legal only)
router.post(
  '/',
  authorize('legal'),
  [
    body('contractName').notEmpty().withMessage('Contract name is required'),
    body('client').notEmpty().withMessage('Client is required'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date is required'),
    body('amount').isNumeric().withMessage('Amount must be a number')
  ],
  validate,
  createContract
);

// Update draft contract (Legal only)
router.put(
  '/:id',
  authorize('legal'),
  [
    body('contractName').optional().notEmpty().withMessage('Contract name cannot be empty'),
    body('effectiveDate').optional().isISO8601().withMessage('Valid effective date is required'),
    body('amount').optional().isNumeric().withMessage('Amount must be a number')
  ],
  validate,
  updateContract
);

// Submit contract for review (Legal only)
router.post('/:id/submit', authorize('legal'), submitContract);

// Approve contract (Finance or Client)
router.post('/:id/approve', authorize('finance', 'client'), approveContract);

// Reject contract (Finance or Client)
router.post(
  '/:id/reject',
  authorize('finance', 'client'),
  [
    // Accept either 'remarks', 'remarksInternal', or 'remarksClient' for rejection
    body('remarks').optional().notEmpty().withMessage('Rejection remarks cannot be empty'),
    body('remarksInternal').optional().notEmpty().withMessage('Internal remarks cannot be empty'),
    body('remarksClient').optional().notEmpty().withMessage('Client remarks cannot be empty'),
  ],
  // Custom validation middleware to ensure at least one remarks field is provided
  (req, res, next) => {
    const { remarks, remarksInternal, remarksClient } = req.body;
    if (!remarks && !remarksInternal && !remarksClient) {
      return res.status(400).json({
        success: false,
        message: 'Rejection remarks are required'
      });
    }
    // If remarksInternal/remarksClient provided but not remarks, set remarks
    if (!remarks && (remarksInternal || remarksClient)) {
      req.body.remarks = remarksInternal || remarksClient;
    }
    next();
  },
  rejectContract
);

// Create amendment (Legal only)
router.post(
  '/:id/amend',
  authorize('legal'),
  [
    body('contractName').optional().notEmpty().withMessage('Contract name cannot be empty'),
    body('effectiveDate').optional().isISO8601().withMessage('Valid effective date is required'),
    body('amount').optional().isNumeric().withMessage('Amount must be a number')
  ],
  validate,
  createAmendment
);

// Cancel contract (Client or Super Admin only)
router.post('/:id/cancel', authorize('client', 'super_admin'), cancelContract);

module.exports = router;
