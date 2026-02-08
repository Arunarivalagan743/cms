const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'legal'
  },
  // Track role history for viewing past activities
  previousRoles: [{
    role: {
      type: String,
      lowercase: true,
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isActive: {
    type: Boolean,
    default: false // Account inactive until password is set
  },
  isPasswordSet: {
    type: Boolean,
    default: false
  },
  inviteToken: {
    type: String,
    select: false
  },
  inviteTokenExpire: {
    type: Date,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  // Only hash password if it exists and has been modified
  if (!this.password || !this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Database indexes for faster queries
// Note: Composite index { role: 1, isActive: 1 } covers queries on just 'role' as well (left-prefix rule)
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Generate invite token for new user to set password
userSchema.methods.generateInviteToken = function() {
  // Generate random token
  const inviteToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to inviteToken field
  this.inviteToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex');

  // Set expire - 7 days
  this.inviteTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000;

  return inviteToken;
};

// Generate password reset token
userSchema.methods.generateResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire - 1 hour
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
