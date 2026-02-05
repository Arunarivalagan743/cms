const User = require('../models/User');
const { createSystemLog } = require('../utils/systemLog');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Log failed login attempt
      await createSystemLog({
        action: 'login_failed',
        performedBy: null,
        details: { email, reason: 'User not found' },
        req,
        success: false,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has set their password
    if (!user.isPasswordSet) {
      await createSystemLog({
        action: 'login_failed',
        performedBy: user._id,
        details: { email, reason: 'Password not set' },
        req,
        success: false,
      });
      return res.status(401).json({
        success: false,
        message: 'Please set your password using the invite link sent to your email'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await createSystemLog({
        action: 'login_failed',
        performedBy: user._id,
        details: { email, reason: 'Invalid password' },
        req,
        success: false,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      await createSystemLog({
        action: 'login_failed',
        performedBy: user._id,
        details: { email, reason: 'Account deactivated' },
        req,
        success: false,
      });
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Please contact administrator.'
      });
    }

    // Log successful login
    await createSystemLog({
      action: 'login',
      performedBy: user._id,
      details: { email, role: user.role },
      req,
      success: true,
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  // Log logout
  if (req.user) {
    await createSystemLog({
      action: 'logout',
      performedBy: req.user._id,
      details: { email: req.user.email },
      req,
      success: true,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Helper function to get token and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};
