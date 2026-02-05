const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RolePermission = require('../models/RolePermission');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Load user's permissions from database
    const rolePermission = await RolePermission.findOne({ role: req.user.role });
    req.userPermissions = rolePermission ? rolePermission.permissions : {};

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check specific permissions from database
exports.checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.userPermissions || {};
    
    // Check if user has ANY of the required permissions
    const hasPermission = requiredPermissions.some(perm => userPermissions[perm] === true);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Check if user has ALL specified permissions
exports.checkAllPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.userPermissions || {};
    
    // Check if user has ALL of the required permissions
    const hasAllPermissions = requiredPermissions.every(perm => userPermissions[perm] === true);
    
    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'You do not have all required permissions to perform this action'
      });
    }
    next();
  };
};
