const User = require('../models/User');
const crypto = require('crypto');
const { sendInviteEmail, sendResetPasswordEmail } = require('../utils/email');
const { createSystemLog } = require('../utils/systemLog');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Super Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Super Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('previousRoles.changedBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user (Admin creates user - sends invite email)
// @route   POST /api/users
// @access  Private/Super Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user without password (will be set by user)
    const user = await User.create({
      name,
      email,
      role,
      isActive: false,
      isPasswordSet: false
    });

    // Generate invite token
    const inviteToken = user.generateInviteToken();
    await user.save();

    // Send invite email
    const emailResult = await sendInviteEmail(user, inviteToken);

    // Log user creation
    await createSystemLog({
      action: 'user_created',
      performedBy: req.user._id,
      targetUser: user._id,
      details: {
        userName: user.name,
        userEmail: user.email,
        assignedRole: user.role,
      },
      req,
    });

    // Log invite sent
    await createSystemLog({
      action: 'invite_sent',
      performedBy: req.user._id,
      targetUser: user._id,
      details: { email: user.email, emailSent: emailResult.success },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully. Invite email sent.',
      emailSent: emailResult.success,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isPasswordSet: user.isPasswordSet
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend invite email
// @route   POST /api/users/:id/resend-invite
// @access  Private/Super Admin
exports.resendInvite = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isPasswordSet) {
      return res.status(400).json({
        success: false,
        message: 'User has already set their password'
      });
    }

    // Generate new invite token
    const inviteToken = user.generateInviteToken();
    await user.save();

    // Send invite email
    const emailResult = await sendInviteEmail(user, inviteToken);

    // Log invite resent
    await createSystemLog({
      action: 'invite_resent',
      performedBy: req.user._id,
      targetUser: user._id,
      details: { email: user.email, emailSent: emailResult.success },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Invite email resent successfully',
      emailSent: emailResult.success
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set password (User sets their own password via invite link)
// @route   POST /api/users/set-password/:token
// @access  Public
exports.setPassword = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;

    // Validate passwords
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Hash the token from URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user with valid invite token
    const user = await User.findOne({
      inviteToken: hashedToken,
      inviteTokenExpire: { $gt: Date.now() }
    }).select('+inviteToken +inviteTokenExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invite link'
      });
    }

    // Set password and activate account
    user.password = password;
    user.isPasswordSet = true;
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteTokenExpire = undefined;

    await user.save();

    // Log password set
    await createSystemLog({
      action: 'password_changed',
      performedBy: user._id,
      targetUser: user._id,
      details: {
        type: 'initial_setup',
        email: user.email,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Password set successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify invite token (Check if token is valid)
// @route   GET /api/users/verify-token/:token
// @access  Public
exports.verifyInviteToken = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      inviteToken: hashedToken,
      inviteTokenExpire: { $gt: Date.now() }
    }).select('+inviteToken +inviteTokenExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid or expired invite link'
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email'
      });
    }

    if (!user.isPasswordSet) {
      return res.status(400).json({
        success: false,
        message: 'Please use the invite link to set your password first'
      });
    }

    // Generate reset token
    const resetToken = user.generateResetPasswordToken();
    await user.save();

    // Send reset email
    const emailResult = await sendResetPasswordEmail(user, resetToken);

    // Log password reset request
    await createSystemLog({
      action: 'password_reset',
      performedBy: user._id,
      targetUser: user._id,
      details: {
        type: 'reset_requested',
        email: user.email,
        emailSent: emailResult.success,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      emailSent: emailResult.success
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/users/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Log password reset completed
    await createSystemLog({
      action: 'password_changed',
      performedBy: user._id,
      targetUser: user._id,
      details: {
        type: 'reset_completed',
        email: user.email,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Super Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Track changes for logging
    const changes = {};
    const oldRole = user.role;

    // Update fields
    if (name && name !== user.name) {
      changes.name = { from: user.name, to: name };
      user.name = name;
    }
    if (email && email !== user.email) {
      changes.email = { from: user.email, to: email };
      user.email = email;
    }
    if (role && role !== user.role) {
      changes.role = { from: user.role, to: role };
      // Save previous role to history before changing
      if (!user.previousRoles) {
        user.previousRoles = [];
      }
      user.previousRoles.push({
        role: user.role,
        changedAt: new Date(),
        changedBy: req.user._id
      });
      user.role = role;
    }
    if (isActive !== undefined && isActive !== user.isActive) {
      changes.isActive = { from: user.isActive, to: isActive };
      user.isActive = isActive;
    }

    await user.save();

    // Log user update
    await createSystemLog({
      action: 'user_updated',
      performedBy: req.user._id,
      targetUser: user._id,
      details: {
        userName: user.name,
        changes,
      },
      req,
    });

    // Log role change separately if role changed
    if (changes.role) {
      await createSystemLog({
        action: 'role_changed',
        performedBy: req.user._id,
        targetUser: user._id,
        details: {
          userName: user.name,
          fromRole: oldRole,
          toRole: role,
        },
        req,
      });
    }

    // Log enable/disable separately
    if (changes.isActive) {
      await createSystemLog({
        action: isActive ? 'user_enabled' : 'user_disabled',
        performedBy: req.user._id,
        targetUser: user._id,
        details: {
          userName: user.name,
          userEmail: user.email,
        },
        req,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Super Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete - deactivate instead of removing
    user.isActive = false;
    await user.save();

    // Log user deletion/deactivation
    await createSystemLog({
      action: 'user_deleted',
      performedBy: req.user._id,
      targetUser: user._id,
      details: {
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all clients (for dropdown in contract creation)
// @route   GET /api/users/clients
// @access  Private/Legal
exports.getClients = async (req, res, next) => {
  try {
    const clients = await User.find({ role: 'client' }).select('name email isActive isPasswordSet');

    res.status(200).json({
      success: true,
      data: clients
    });
  } catch (error) {
    next(error);
  }
};
