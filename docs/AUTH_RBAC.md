# Authentication & Role-Based Access Control (RBAC)

## 🔐 Authentication Overview

### Authentication Flow

```
┌─────────┐     POST /login      ┌─────────┐     Verify      ┌─────────┐
│ Client  │ ──────────────────▶  │ Backend │ ─────────────▶  │ MongoDB │
│         │  {email, password}   │         │   Find User     │         │
└─────────┘                      └────┬────┘                 └─────────┘
     ▲                                │
     │                                │ Compare hash
     │                                ▼
     │                          ┌───────────┐
     │    { token, user }       │  bcrypt   │
     └──────────────────────────│  compare  │
                                └───────────┘
```

---

## 🔑 JWT (JSON Web Token) Implementation

### Token Generation

```javascript
// models/User.js
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },  // Payload (claims)
    process.env.JWT_SECRET,              // Secret key
    { expiresIn: process.env.JWT_EXPIRE } // '7d'
  );
};
```

### Token Structure

```
Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6IjY1ZjNjNDU2Nzg5MGFiY2RlZjEyMzQ1NiIsInJvbGUiOiJsZWdhbCIsImlhdCI6MTcwNzEyMDAwMCwiZXhwIjoxNzA3NzI0ODAwfQ.
K7gHJK8_abc123signature
```

**Decoded Payload:**
```json
{
  "id": "65f3c4567890abcdef123456",
  "role": "legal",
  "iat": 1707120000,  // Issued at
  "exp": 1707724800   // Expires at
}
```

### Token Verification Flow

```javascript
// middleware/auth.js
exports.protect = async (req, res, next) => {
  // 1. Extract token from header
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // 3. Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find user and attach to request
    req.user = await User.findById(decoded.id);

    // 5. Check if user still exists and is active
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or deactivated'
      });
    }

    // 6. Load dynamic permissions from database
    const rolePermission = await RolePermission.findOne({ role: req.user.role });
    req.userPermissions = rolePermission?.permissions || {};

    next();
  } catch (error) {
    // Token expired or invalid
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};
```

---

## 🔒 Password Security

### Hashing with bcrypt

```javascript
// Pre-save middleware in User model
userSchema.pre('save', async function() {
  if (!this.password || !this.isModified('password')) {
    return;  // Skip if password unchanged
  }
  
  // Generate salt (random string)
  const salt = await bcrypt.genSalt(10);
  
  // Hash password with salt
  this.password = await bcrypt.hash(this.password, salt);
});
```

**Why bcrypt?**

| Security Feature | Explanation |
|-----------------|-------------|
| **Salting** | Each password gets unique random salt |
| **Cost Factor** | 10 rounds = 2^10 iterations (~100ms) |
| **One-way** | Cannot reverse hash to get password |
| **Rainbow Table Resistant** | Salt makes precomputed tables useless |

### Password Comparison

```javascript
// User model method
userSchema.methods.matchPassword = async function(enteredPassword) {
  // bcrypt extracts salt from stored hash and compares
  return await bcrypt.compare(enteredPassword, this.password);
};

// Usage in login controller
const user = await User.findOne({ email }).select('+password');
const isMatch = await user.matchPassword(enteredPassword);

if (!isMatch) {
  // Log failed attempt
  await createSystemLog({ action: 'login_failed', ... });
  return res.status(401).json({ message: 'Invalid credentials' });
}
```

---

## 👥 Role-Based Access Control (RBAC)

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPER_ADMIN                              │
│  Full system access - User management, config, all contracts    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    LEGAL      │     │   FINANCE     │     │    CLIENT     │
│ Create/Submit │     │ Review/Approve│     │ Final Approve │
│   Contracts   │     │  at Stage 2   │     │  at Stage 3   │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Static Role Authorization

```javascript
// middleware/auth.js
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

// Usage in routes
router.post('/contracts', protect, authorize('legal'), createContract);
```

### Dynamic Permission-Based Authorization

```javascript
// middleware/auth.js
exports.checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.userPermissions || {};
    
    // User needs ANY of the required permissions
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

// Check if user has ALL permissions
exports.checkAllPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.userPermissions || {};
    
    const hasAllPermissions = requiredPermissions.every(
      perm => userPermissions[perm] === true
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'You do not have all required permissions'
      });
    }
    next();
  };
};
```

**Usage in Routes:**

```javascript
// Any permission grants access
router.post('/:id/approve', 
  checkPermission('canApproveContract'), 
  approveContract
);

// Multiple permissions checked
router.put('/:id', 
  checkPermission('canEditDraft', 'canEditSubmitted'),  // Either
  updateContract
);
```

---

## 🛡️ Permission Matrix

### Default Permissions by Role

```javascript
// Stored in RolePermission collection
const permissionDefaults = {
  super_admin: {
    canCreateContract: true,
    canEditDraft: true,
    canEditSubmitted: true,
    canDeleteContract: true,
    canSubmitContract: true,
    canApproveContract: true,
    canRejectContract: true,
    canAmendContract: true,
    canCancelContract: true,
    canViewAllContracts: true,
    canViewOwnContracts: true,
    canManageUsers: true,
    canAssignRoles: true,
    canViewAuditLogs: true,
    canViewSystemLogs: true,
    canConfigureWorkflow: true,
    canConfigurePermissions: true,
    canViewDashboard: true,
    canViewReports: true
  },
  legal: {
    canCreateContract: true,
    canEditDraft: true,
    canSubmitContract: true,
    canAmendContract: true,
    canViewOwnContracts: true,
    canViewAuditLogs: true,
    canViewDashboard: true
  },
  finance: {
    canApproveContract: true,
    canRejectContract: true,
    canViewAllContracts: true,
    canViewAuditLogs: true,
    canViewDashboard: true
  },
  client: {
    canApproveContract: true,
    canRejectContract: true,
    canCancelContract: true,
    canViewOwnContracts: true,
    canViewDashboard: true
  }
};
```

---

## 🔄 Permission Loading at Runtime

### How Permissions Flow

```
1. User logs in
   │
   ▼
2. Token issued with user ID
   │
   ▼
3. Request arrives at protected route
   │
   ▼
4. protect() middleware:
   ├── Verifies token
   ├── Finds user by ID
   └── Loads permissions from RolePermission collection
   │
   ▼
5. checkPermission() middleware:
   └── Checks req.userPermissions against required permissions
   │
   ▼
6. Controller executes if authorized
```

### Why Database-Stored Permissions?

| Approach | Pros | Cons |
|----------|------|------|
| **Hardcoded** | Simple, fast | Requires deployment to change |
| **Database** | Dynamic, admin-controlled | Extra DB query per request |

**Our Choice:** Database-stored because:
- Admin can modify without developer
- Changes take effect immediately
- Audit trail of permission changes
- Different environments can have different configs

### Permission Caching Strategy

```javascript
// In protect middleware
const rolePermission = await RolePermission.findOne({ role: req.user.role });
req.userPermissions = rolePermission?.permissions || {};
```

**Current:** Fresh query per request (consistent but adds latency)

**Optimization Option:** Redis cache with TTL

```javascript
// Future optimization
const cacheKey = `permissions:${req.user.role}`;
let permissions = await redis.get(cacheKey);

if (!permissions) {
  const rolePermission = await RolePermission.findOne({ role });
  permissions = rolePermission?.permissions || {};
  await redis.setex(cacheKey, 300, JSON.stringify(permissions)); // 5 min TTL
}

req.userPermissions = permissions;
```

---

## 🚫 Conflict of Interest Prevention

### Self-Approval Block

```javascript
// In approveContract controller
if (req.user.role === 'finance') {
  // Prevent approving own contract
  if (contract.createdBy.toString() === req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Conflict of interest: You cannot approve a contract you created'
    });
  }
}
```

### Why This Matters

**Scenario:** Legal user gets promoted to Finance
```
1. Alice (Legal) creates Contract A
2. Alice gets promoted to Finance
3. Contract A is pending_finance
4. Without check: Alice could approve her own contract!
5. With check: Alice blocked from approving
```

**Enforcement Points:**
- Approve endpoint
- Reject endpoint
- Business rule in controller (not just permissions)

---

## 📱 Frontend Permission Integration

### AuthContext Permission Helpers

```javascript
// context/AuthContext.jsx
const AuthProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(defaultPermissions);

  // Check single permission
  const hasPermission = useCallback((permissionKey) => {
    return permissions[permissionKey] === true;
  }, [permissions]);

  // Check if ANY permission granted (OR logic)
  const hasAnyPermission = useCallback((...permissionKeys) => {
    return permissionKeys.some(key => permissions[key] === true);
  }, [permissions]);

  // Check if ALL permissions granted (AND logic)
  const hasAllPermissions = useCallback((...permissionKeys) => {
    return permissionKeys.every(key => permissions[key] === true);
  }, [permissions]);

  // Refresh permissions from server
  const refreshPermissions = async () => {
    const response = await getCurrentUser();
    if (response.permissions) {
      setPermissions({ ...defaultPermissions, ...response.permissions });
    }
  };

  return (
    <AuthContext.Provider value={{
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Usage in Components

```jsx
// Conditional rendering based on permission
function ContractActions({ contract }) {
  const { hasPermission, isLegal } = useAuth();

  return (
    <div>
      {hasPermission('canEditDraft') && contract.status === 'draft' && (
        <button onClick={handleEdit}>Edit</button>
      )}
      
      {hasPermission('canApproveContract') && (
        <button onClick={handleApprove}>Approve</button>
      )}
      
      {hasPermission('canAmendContract') && contract.status === 'rejected' && (
        <button onClick={handleAmend}>Create Amendment</button>
      )}
    </div>
  );
}
```

### Protected Route Component

```jsx
// components/ProtectedRoute.jsx
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Usage in App.jsx
<Route path="/users" element={
  <ProtectedRoute requiredPermission="canManageUsers">
    <UserManagement />
  </ProtectedRoute>
} />
```

---

## 🔐 Token Storage Security

### Current Implementation

```javascript
// Frontend stores token in localStorage
localStorage.setItem('token', token);
```

### Security Considerations

| Storage | XSS Vulnerable | CSRF Vulnerable | Persistence |
|---------|---------------|-----------------|-------------|
| localStorage | Yes | No | Permanent |
| sessionStorage | Yes | No | Tab only |
| httpOnly Cookie | No | Yes (mitigated) | Configurable |

### Recommended Improvements

1. **Short-lived Access Tokens** (15 min)
2. **Refresh Tokens** in httpOnly cookies
3. **Token Rotation** on refresh

```javascript
// Example improved flow
// Backend sets httpOnly cookie
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Short access token in response body
res.json({ accessToken, expiresIn: 900 });  // 15 min
```

---

## 📝 Login Flow Diagram

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Frontend  │                    │   Backend   │                    │   MongoDB   │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │  POST /api/auth/login            │                                  │
       │  { email, password }             │                                  │
       │────────────────────────────────▶ │                                  │
       │                                  │  findOne({ email })              │
       │                                  │────────────────────────────────▶ │
       │                                  │                                  │
       │                                  │  User document                   │
       │                                  │◀──────────────────────────────── │
       │                                  │                                  │
       │                                  │  bcrypt.compare(password, hash) │
       │                                  │──────────┐                       │
       │                                  │          │                       │
       │                                  │◀─────────┘                       │
       │                                  │                                  │
       │                                  │  Load RolePermission             │
       │                                  │────────────────────────────────▶ │
       │                                  │                                  │
       │                                  │  Permission document             │
       │                                  │◀──────────────────────────────── │
       │                                  │                                  │
       │                                  │  jwt.sign({ id, role })          │
       │                                  │──────────┐                       │
       │                                  │          │                       │
       │                                  │◀─────────┘                       │
       │                                  │                                  │
       │  { token, user, permissions }    │                                  │
       │◀──────────────────────────────── │                                  │
       │                                  │                                  │
       │  Store token in localStorage     │                                  │
       │──────────┐                       │                                  │
       │          │                       │                                  │
       │◀─────────┘                       │                                  │
       │                                  │                                  │
       │  Redirect to /dashboard          │                                  │
       │                                  │                                  │
```

---

## 🎯 Security Best Practices Summary

| Practice | Implementation |
|----------|---------------|
| Password Hashing | bcrypt with salt factor 10 |
| Token Expiration | 7 days (configurable) |
| Active Check | Verify `isActive` on each request |
| Permission Refresh | Load from DB on each request |
| Conflict of Interest | Block self-approval in controller |
| Token in Header | Bearer token in Authorization header |
| Error Messages | Generic "Invalid credentials" for auth failures |
