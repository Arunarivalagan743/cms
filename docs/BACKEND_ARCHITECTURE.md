# Backend Architecture

## 📁 Directory Structure Explained

```
backend/src/
├── config/         # Configuration files
├── controllers/    # Business logic handlers
├── middleware/     # Request processing layers
├── models/         # MongoDB schemas
├── routes/         # API endpoint definitions
├── utils/          # Helper functions
├── server.js       # Application entry point
└── seed.js         # Database seeding script
```

---

## 🚀 Server Entry Point (`server.js`)

### What it Does
- Loads environment variables
- Connects to MongoDB
- Configures Express middleware
- Mounts all routes
- Starts HTTP server

### Code Walkthrough

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables from .env file
dotenv.config();

// Establish MongoDB connection
connectDB();

const app = express();

// MIDDLEWARE STACK (Order Matters!)
app.use(express.json());  // Parse JSON request bodies
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true  // Allow cookies/auth headers
}));

// ROUTE MOUNTING
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// GLOBAL ERROR HANDLER (Must be last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Why This Architecture?

1. **Separation of Concerns**: Each folder has a single responsibility
2. **Middleware Pipeline**: Request flows through auth → validation → controller
3. **Centralized Error Handling**: One place to catch all errors
4. **Environment Configuration**: Secrets stay out of code

---

## ⚙️ Database Configuration (`config/db.js`)

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);  // Exit process on DB failure
  }
};

module.exports = connectDB;
```

### Why Mongoose?
- **Schema Validation**: Enforce data structure at application level
- **Middleware Hooks**: Pre/post save operations
- **Query Building**: Chainable, readable queries
- **Population**: Join-like operations for references

---

## 🛡️ Middleware Layer

### 1. Authentication Middleware (`middleware/auth.js`)

#### `protect` - JWT Verification
```javascript
exports.protect = async (req, res, next) => {
  let token;

  // Extract token from "Bearer <token>" header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify JWT and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request object
    req.user = await User.findById(decoded.id);

    // Check if account is active
    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Load permissions from database
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
```

**Why This Design:**
- **Stateless**: No session storage needed
- **Self-contained**: Token contains user ID and role
- **Revocable**: Check `isActive` on every request
- **Dynamic Permissions**: Loaded fresh from database

#### `authorize` - Role-Based Access
```javascript
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized`
      });
    }
    next();
  };
};
```

**Usage Example:**
```javascript
router.post('/contracts', protect, authorize('legal'), createContract);
```

#### `checkPermission` - Permission-Based Access
```javascript
exports.checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.userPermissions || {};
    
    // Check if user has ANY of the required permissions
    const hasPermission = requiredPermissions.some(
      perm => userPermissions[perm] === true
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};
```

**Why Permission-Based Instead of Role-Based:**
- **Granular Control**: Specific actions vs broad roles
- **Dynamic**: Admin can modify without code changes
- **Flexible**: Role can have any combination of permissions

---

### 2. Validation Middleware (`middleware/validate.js`)

```javascript
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};
```

**Usage in Routes:**
```javascript
router.post('/',
  checkPermission('canCreateContract'),
  [
    body('contractName').notEmpty().withMessage('Contract name is required'),
    body('client').notEmpty().withMessage('Client is required'),
    body('effectiveDate').isISO8601().withMessage('Valid date required'),
    body('amount').isNumeric().withMessage('Amount must be a number')
  ],
  validate,  // Runs after validators
  createContract
);
```

---

### 3. Error Handler (`middleware/errorHandler.js`)

```javascript
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);  // Log for debugging

  // MONGOOSE BAD OBJECTID
  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  // MONGOOSE DUPLICATE KEY (Unique constraint violation)
  if (err.code === 11000) {
    error = { message: 'Duplicate field value entered', statusCode: 400 };
  }

  // MONGOOSE VALIDATION ERROR
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error'
  });
};
```

**Benefits:**
- **Consistent Response Format**: All errors look the same
- **Client-Friendly Messages**: Hide internal details
- **Categorized Handling**: Different errors get appropriate codes

---

## 🎮 Controller Pattern

### Structure of a Controller

```javascript
// @desc    Brief description of what this does
// @route   HTTP_METHOD /api/path
// @access  Public/Private/Role-specific
exports.functionName = async (req, res, next) => {
  try {
    // 1. Extract input from req.body, req.params, req.query
    // 2. Validate business rules
    // 3. Perform database operations
    // 4. Create audit logs if needed
    // 5. Send notifications if needed
    // 6. Return response
  } catch (error) {
    next(error);  // Pass to error handler
  }
};
```

### Example: Contract Approval Controller

```javascript
exports.approveContract = async (req, res, next) => {
  try {
    // STEP 1: Fetch contract
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // STEP 2: Get current version
    const currentVersion = await ContractVersion.findOne({
      contract: contract._id,
      isCurrent: true
    });

    // STEP 3: Role-based business logic
    if (req.user.role === 'finance') {
      // Finance approval logic
      if (currentVersion.status !== 'pending_finance') {
        return res.status(400).json({
          success: false,
          message: 'Contract is not pending finance review'
        });
      }

      // CONFLICT OF INTEREST CHECK
      if (contract.createdBy.toString() === req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Cannot approve contract you created'
        });
      }

      // Update status
      currentVersion.status = 'pending_client';
      currentVersion.approvedByFinance = req.user._id;
      currentVersion.financeApprovedAt = new Date();
      await currentVersion.save();

      // STEP 4: Create audit log
      await createAuditLog({
        contractId: contract._id,
        contractVersionId: currentVersion._id,
        action: 'approved',
        userId: req.user._id,
        role: req.user.role
      });

      // STEP 5: Send notifications
      await notifyClientOfPendingApproval(contract, currentVersion);

      // STEP 6: Return response
      return res.status(200).json({
        success: true,
        message: 'Contract approved by finance',
        data: currentVersion
      });
    }

    // Client approval logic follows similar pattern...
  } catch (error) {
    next(error);
  }
};
```

---

## 🗺️ Route Layer

### Route Registration Pattern

```javascript
const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(protect);

// GET /api/contracts
router.get('/', getContracts);

// POST /api/contracts
router.post('/', 
  checkPermission('canCreateContract'),
  [/* validators */],
  validate,
  createContract
);

// POST /api/contracts/:id/approve
router.post('/:id/approve', 
  checkPermission('canApproveContract'), 
  approveContract
);

module.exports = router;
```

---

## 🔧 Utility Functions

### Audit Log Utility (`utils/auditLog.js`)

```javascript
const createAuditLog = async ({ 
  contractId, 
  contractVersionId, 
  action, 
  userId, 
  role, 
  remarks = null, 
  metadata = {} 
}) => {
  try {
    await AuditLog.create({
      contract: contractId,
      contractVersion: contractVersionId,
      action,
      performedBy: userId,
      roleAtTime: role,  // Capture role at time of action
      remarks,
      metadata
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit failure shouldn't break main flow
  }
};
```

### Notification Utility (`utils/notifications.js`)

```javascript
const notifyFinanceOfSubmission = async (contract, version) => {
  // Find all active finance users
  const users = await User.find({ role: 'finance', isActive: true });
  
  // Create notification for each
  await Promise.all(users.map(user => 
    Notification.create({
      user: user._id,
      type: 'submission',
      title: 'New Contract for Review',
      message: `Contract "${version.contractName}" submitted for review`,
      contract: contract._id
    })
  ));
};
```

---

## 🔄 Request Lifecycle

```
Client Request
      │
      ▼
┌─────────────────┐
│  Express App    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CORS Handler   │  Allow/block origins
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Body Parser    │  Parse JSON
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Matcher  │  Find matching route
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  protect()      │  Verify JWT, load user
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│checkPermission()│  Check database permissions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validators     │  express-validator rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  validate()     │  Check validation results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │  Business logic
└────────┬────────┘
         │
         ├──── Success ───▶ res.json({ success: true, data })
         │
         └──── Error ────▶ next(error) ──▶ errorHandler
```

---

## 📊 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/cms

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRE=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=app-password
FROM_EMAIL=noreply@cms.com
FROM_NAME=CMS

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

---

## 🧪 Testing the API

### Using cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"legal@example.com","password":"Legal@123"}'

# Create Contract (with token)
curl -X POST http://localhost:5000/api/contracts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contractName": "Service Agreement",
    "client": "CLIENT_USER_ID",
    "effectiveDate": "2026-03-01",
    "amount": 50000
  }'
```

---

## 🎯 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Controllers throw to middleware | Centralized error handling |
| Permissions from database | Dynamic RBAC without deployment |
| Audit logs in utilities | Reusable, consistent logging |
| Async/await everywhere | Clean, readable async code |
| `next(error)` pattern | Express error handling convention |
