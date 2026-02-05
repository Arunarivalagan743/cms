const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getClients,
  resendInvite,
  setPassword,
  verifyInviteToken,
  forgotPassword,
  resetPassword
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ============ PUBLIC ROUTES (No Auth Required) ============

// Verify invite token
router.get('/verify-token/:token', verifyInviteToken);

// Set password via invite link
router.post(
  '/set-password/:token',
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required')
  ],
  validate,
  setPassword
);

// Forgot password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Please provide a valid email')],
  validate,
  forgotPassword
);

// Reset password
router.post(
  '/reset-password/:token',
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required')
  ],
  validate,
  resetPassword
);

// ============ PROTECTED ROUTES (Auth Required) ============

// Get all clients (for Legal users to select in contract creation)
router.get('/clients', protect, authorize('legal', 'super_admin'), getClients);

// Super Admin only routes
router.get('/', protect, authorize('super_admin'), getUsers);
router.get('/:id', protect, authorize('super_admin'), getUser);

router.post(
  '/',
  protect,
  authorize('super_admin'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('role').isIn(['super_admin', 'legal', 'finance', 'client']).withMessage('Invalid role')
  ],
  validate,
  createUser
);

// Resend invite email
router.post('/:id/resend-invite', protect, authorize('super_admin'), resendInvite);

router.put(
  '/:id',
  protect,
  authorize('super_admin'),
  [
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('role').optional().isIn(['super_admin', 'legal', 'finance', 'client']).withMessage('Invalid role')
  ],
  validate,
  updateUser
);

router.delete('/:id', protect, authorize('super_admin'), deleteUser);

module.exports = router;
