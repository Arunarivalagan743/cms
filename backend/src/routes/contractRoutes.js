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
  amendContract,
  getContractVersions,
  getContractAudit,
  sendRemarksToClient
} = require('../controllers/contractController');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(protect);

// Get all contracts (filtered by role)
router.get('/', getContracts);

// Get single contract
router.get('/:id', getContract);

// Get contract versions
router.get('/:id/versions', getContractVersions);

// Get contract audit trail (accessible to users who can view the contract)
// Super Admin, Legal (for their contracts), Finance, and Clients (for their contracts) can view audit logs
router.get('/:id/audit', authorize('super_admin', 'legal', 'finance', 'client'), getContractAudit);
router.get('/:id/audit-logs', authorize('super_admin', 'legal', 'finance', 'client'), getContractAudit);

// Create contract (requires canCreateContract permission)
router.post(
  '/',
  checkPermission('canCreateContract'),
  [
    body('contractName').notEmpty().withMessage('Contract name is required'),
    body('client').notEmpty().withMessage('Client is required'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date is required'),
    body('amount').isNumeric().withMessage('Amount must be a number')
  ],
  validate,
  createContract
);

// Update draft contract (requires canEditDraft or canEditSubmitted permission)
router.put(
  '/:id',
  checkPermission('canEditDraft', 'canEditSubmitted'),
  [
    body('contractName').optional().notEmpty().withMessage('Contract name cannot be empty'),
    body('effectiveDate').optional().isISO8601().withMessage('Valid effective date is required'),
    body('amount').optional().isNumeric().withMessage('Amount must be a number')
  ],
  validate,
  updateContract
);

// Submit contract for review (requires canSubmitContract permission)
router.post('/:id/submit', checkPermission('canSubmitContract'), submitContract);

// Approve contract (requires canApproveContract permission)
router.post('/:id/approve', checkPermission('canApproveContract'), approveContract);

// Reject contract (requires canRejectContract permission)
router.post(
  '/:id/reject',
  checkPermission('canRejectContract'),
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

// Create amendment from rejected contract (requires canEditDraft or canEditSubmitted permission)
// Legal users can create amendments since they create a new draft version
router.post(
  '/:id/amend',
  checkPermission('canEditDraft', 'canEditSubmitted'),
  [
    body('contractName').optional().notEmpty().withMessage('Contract name cannot be empty'),
    body('effectiveDate').optional().isISO8601().withMessage('Valid effective date is required'),
    body('amount').optional().isNumeric().withMessage('Amount must be a number')
  ],
  validate,
  amendContract
);

// Send rejection remarks to client (Legal only - when Finance didn't send to client)
router.post(
  '/:id/send-to-client',
  checkPermission('canSendRemarksToClient'),
  [
    body('remarksClient').notEmpty().withMessage('Client remarks are required')
  ],
  validate,
  sendRemarksToClient
);

module.exports = router;
