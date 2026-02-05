const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// NOTE: No public registration endpoint
// Users are created by Super Admin and receive invite emails
// to set their own passwords

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

// Get current user
router.get('/me', protect, getMe);

// Logout
router.post('/logout', protect, logout);

module.exports = router;
