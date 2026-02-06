# Audit Logging & System Monitoring

## 📊 Overview

The system implements two types of logging:
1. **AuditLog** - Contract-specific action tracking (business audit trail)
2. **SystemLog** - System-wide activity logging (security/operational)

Both are designed as **append-only, immutable** logs.

---

## 🔒 Immutability Enforcement

### Why Immutable Logs?

| Requirement | Reason |
|------------|--------|
| **Compliance** | Audit trails must be tamper-proof for legal/regulatory compliance |
| **Forensics** | Unchanged logs allow accurate incident investigation |
| **Accountability** | Users cannot modify or delete evidence of their actions |
| **Trust** | Stakeholders can trust the audit record |

### Mongoose Pre-Hooks Implementation

```javascript
// models/AuditLog.js
const auditLogSchema = new mongoose.Schema({
  // ... fields ...
});

// Prevent updates - logs are write-once
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs cannot be modified');
});

// Prevent deletions - logs are permanent
auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('deleteMany', function() {
  throw new Error('Audit logs cannot be deleted');
});
```

### Enforcement at All Levels

```
                    ┌───────────────────┐
                    │   Application     │
                    │   (Controllers)   │
                    └─────────┬─────────┘
                              │
                              │ Never call update/delete
                              ▼
                    ┌───────────────────┐
                    │   Mongoose ODM    │
                    │   (Pre-hooks)     │ ← Throws error on attempt
                    └─────────┬─────────┘
                              │
                              │ Create only
                              ▼
                    ┌───────────────────┐
                    │    MongoDB        │
                    │   Collection      │
                    └───────────────────┘
```

---

## 📋 AuditLog Schema

### Full Schema Definition

```javascript
const auditLogSchema = new mongoose.Schema({
  // Reference to the contract
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true,
    index: true  // Fast lookups by contract
  },
  
  // Reference to specific version
  contractVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContractVersion'
  },
  
  // What action was performed
  action: {
    type: String,
    required: true,
    enum: [
      'created',        // Contract/version created
      'updated',        // Draft edited
      'submitted',      // Submitted for review
      'approved',       // Finance/Client approved
      'rejected',       // Finance/Client rejected
      'amended',        // Amendment created
      'cancelled',      // Contract cancelled
      'deleted'         // Contract deleted
    ]
  },
  
  // Who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // CRITICAL: Role at the time of action (not current role)
  roleAtTime: {
    type: String,
    required: true
  },
  
  // Optional remarks (rejection reasons, etc.)
  remarks: String,
  
  // Additional context (changes made, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Automatic timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

### Why `roleAtTime`?

**Problem:** User roles can change. If we only store `userId`, we lose context.

**Scenario:**
```
Day 1: Alice (Legal) creates contract
Day 5: Alice promoted to Finance
Day 10: Audit query shows "Alice approved contract"

Question: Did Alice violate conflict of interest?
Without roleAtTime: Cannot determine
With roleAtTime: Check Alice's role when action occurred
```

**Solution:**
```javascript
// utils/auditLog.js
exports.createAuditLog = async ({
  contractId,
  contractVersionId,
  action,
  userId,
  role,        // Role passed from req.user.role
  remarks,
  metadata
}) => {
  const auditLog = await AuditLog.create({
    contractId,
    contractVersionId,
    action,
    userId,
    roleAtTime: role,  // Captured at action time
    remarks,
    metadata
  });
  return auditLog;
};
```

---

## 📝 AuditLog Actions Explained

### Action: `created`

```javascript
// Triggered when: New contract is created
await createAuditLog({
  contractId: contract._id,
  contractVersionId: contractVersion._id,
  action: 'created',
  userId: req.user._id,
  role: req.user.role,
  metadata: { contractName, amount }
});

// Sample log entry:
{
  contractId: "65f3c456...",
  action: "created",
  userId: "65f3c123...",
  roleAtTime: "legal",
  metadata: {
    contractName: "Service Agreement - Acme Corp",
    amount: 50000
  },
  createdAt: "2024-03-15T10:30:00Z"
}
```

### Action: `updated`

```javascript
// Triggered when: Draft contract is edited
await createAuditLog({
  contractId: contract._id,
  contractVersionId: currentVersion._id,
  action: 'updated',
  userId: req.user._id,
  role: req.user.role,
  metadata: { contractName, clientEmail, effectiveDate, amount }
});

// Sample log entry:
{
  contractId: "65f3c456...",
  action: "updated",
  roleAtTime: "legal",
  metadata: {
    contractName: "Service Agreement - Acme Corp (Revised)",
    amount: 45000  // Changed from 50000
  },
  createdAt: "2024-03-15T14:00:00Z"
}
```

### Action: `submitted`

```javascript
// Triggered when: Legal submits contract for review
await createAuditLog({
  contractId: contract._id,
  contractVersionId: currentVersion._id,
  action: 'submitted',
  userId: req.user._id,
  role: req.user.role
});
```

### Action: `approved`

```javascript
// Triggered when: Finance or Client approves
await createAuditLog({
  contractId: contract._id,
  contractVersionId: currentVersion._id,
  action: 'approved',
  userId: req.user._id,
  role: req.user.role,
  remarks: req.user.role === 'super_admin' 
    ? 'Super Admin (Finance) approval granted' 
    : 'Finance approval granted'
});
```

### Action: `rejected`

```javascript
// Triggered when: Finance or Client rejects
await createAuditLog({
  contractId: contract._id,
  contractVersionId: currentVersion._id,
  action: 'rejected',
  userId: req.user._id,
  role: req.user.role,
  remarks: notificationRemarks  // Internal remarks stored
});
```

### Action: `amended`

```javascript
// Triggered when: Legal creates amendment for rejected contract
await createAuditLog({
  contractId: contract._id,
  contractVersionId: newVersion._id,
  action: 'amended',
  userId: req.user._id,
  role: req.user.role,
  metadata: { 
    previousVersion: currentVersion.versionNumber, 
    newVersion: newVersionNumber 
  }
});
```

### Action: `cancelled`

```javascript
// Triggered when: Client cancels contract
await createAuditLog({
  contractId: contract._id,
  contractVersionId: currentVersion._id,
  action: 'cancelled',
  userId: req.user._id,
  role: req.user.role,
  remarks: reason || 'Contract cancelled'
});
```

---

## 📊 SystemLog Schema

### Full Schema Definition

```javascript
const systemLogSchema = new mongoose.Schema({
  // Who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // Optional - some system events have no user
  },
  
  // What category of action
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'login_failed',
      'password_changed',
      'password_reset_requested',
      'user_created',
      'user_updated',
      'user_deactivated',
      'role_changed',
      'permission_updated',
      'workflow_updated',
      'system_config_changed'
    ]
  },
  
  // Target entity (if applicable)
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // IP address for security tracking
  ipAddress: String,
  
  // Browser/client info
  userAgent: String,
  
  // Additional details
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Automatic timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true  // Fast time-range queries
  }
});

// Same immutability enforcement
systemLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('System logs cannot be modified');
});
// ... other pre-hooks
```

---

## 📝 SystemLog Actions Explained

### Authentication Events

```javascript
// Successful login
await createSystemLog({
  action: 'login',
  userId: user._id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  details: { email: user.email }
});

// Failed login (no userId - user may not exist)
await createSystemLog({
  action: 'login_failed',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  details: { attemptedEmail: email }
});

// Password change
await createSystemLog({
  action: 'password_changed',
  userId: user._id,
  ipAddress: req.ip,
  details: { method: 'user_initiated' }
});
```

### User Management Events

```javascript
// New user created (via invite)
await createSystemLog({
  action: 'user_created',
  userId: adminUser._id,      // Admin who created
  targetUserId: newUser._id,   // User who was created
  details: { 
    email: newUser.email, 
    role: newUser.role,
    inviteMethod: 'email'
  }
});

// Role changed
await createSystemLog({
  action: 'role_changed',
  userId: adminUser._id,
  targetUserId: targetUser._id,
  details: { 
    previousRole: 'legal', 
    newRole: 'finance' 
  }
});
```

### Configuration Events

```javascript
// Workflow updated
await createSystemLog({
  action: 'workflow_updated',
  userId: adminUser._id,
  details: { 
    workflowId: workflow._id,
    changes: ['steps modified', 'version incremented']
  }
});

// Permission updated
await createSystemLog({
  action: 'permission_updated',
  userId: adminUser._id,
  details: { 
    role: 'finance',
    permissionsChanged: ['canApproveContract', 'canViewReports']
  }
});
```

---

## 🔍 Querying Audit Logs

### Get Contract Audit Trail

```javascript
// utils/auditLog.js
exports.getContractAuditLogs = async (contractId) => {
  const logs = await AuditLog.find({ contractId })
    .populate('userId', 'name email')
    .populate('contractVersionId', 'versionNumber status')
    .sort({ createdAt: 1 });  // Chronological order
  
  return logs;
};
```

### API Endpoint

```javascript
// GET /api/contracts/:id/audit
exports.getContractAudit = async (req, res, next) => {
  const contract = await Contract.findById(req.params.id);
  
  if (!contract) {
    return res.status(404).json({
      success: false,
      message: 'Contract not found'
    });
  }

  const auditLogs = await getContractAuditLogs(contract._id);

  res.status(200).json({
    success: true,
    count: auditLogs.length,
    data: auditLogs
  });
};
```

### Sample Audit Response

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "65f3c456...",
      "contractId": "65f3c123...",
      "action": "created",
      "userId": {
        "_id": "65f3c789...",
        "name": "Alice Smith",
        "email": "alice@company.com"
      },
      "roleAtTime": "legal",
      "metadata": { "contractName": "Service Agreement", "amount": 50000 },
      "createdAt": "2024-03-15T10:00:00Z"
    },
    {
      "_id": "65f3c457...",
      "action": "submitted",
      "userId": { "name": "Alice Smith" },
      "roleAtTime": "legal",
      "createdAt": "2024-03-15T12:00:00Z"
    },
    {
      "_id": "65f3c458...",
      "action": "approved",
      "userId": { "name": "Bob Johnson" },
      "roleAtTime": "finance",
      "remarks": "Finance approval granted",
      "createdAt": "2024-03-16T09:00:00Z"
    },
    {
      "_id": "65f3c459...",
      "action": "approved",
      "userId": { "name": "Carol Williams" },
      "roleAtTime": "client",
      "remarks": "Client approval granted - Contract is now active",
      "createdAt": "2024-03-17T14:00:00Z"
    }
  ]
}
```

---

## 📈 System Logs Dashboard

### Query Patterns

```javascript
// Recent login failures (security monitoring)
const failedLogins = await SystemLog.find({ 
  action: 'login_failed',
  createdAt: { $gte: last24Hours }
}).sort({ createdAt: -1 });

// User activity
const userActivity = await SystemLog.find({
  userId: targetUserId,
  createdAt: { 
    $gte: startDate, 
    $lte: endDate 
  }
}).sort({ createdAt: -1 });

// Admin actions
const adminActions = await SystemLog.find({
  action: { 
    $in: ['user_created', 'role_changed', 'permission_updated', 'workflow_updated'] 
  }
}).populate('userId targetUserId').sort({ createdAt: -1 });
```

---

## 🔐 Security Considerations

### What We Log

| Category | Information | Purpose |
|----------|-------------|---------|
| **Authentication** | Login/logout times, IP, user agent | Detect unauthorized access |
| **Authorization** | Permission changes, role updates | Audit privilege escalation |
| **Contract Actions** | All state changes with actor | Business audit trail |
| **Configuration** | Workflow/permission changes | Compliance |

### What We DON'T Log

| Excluded | Reason |
|----------|--------|
| Passwords | Security risk |
| Full request bodies | Privacy, storage |
| Read-only queries | Noise, performance |

### Log Retention Considerations

```javascript
// For production, consider TTL index for SystemLogs
// (But AuditLogs should be retained indefinitely for compliance)

systemLogSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 365 * 24 * 60 * 60  // 1 year
});
```

---

## 📊 Audit Log Visualization (Frontend)

```jsx
// ContractDetails.jsx - Audit Timeline Component
{auditLogs.map((log, index) => (
  <div key={log._id} className="flex gap-4 pb-4 border-l-2 border-gray-200 pl-4">
    <div className={`w-3 h-3 rounded-full mt-1.5 -ml-5 ${
      log.action === 'approved' ? 'bg-green-500' :
      log.action === 'rejected' ? 'bg-red-500' :
      log.action === 'created' ? 'bg-blue-500' :
      'bg-gray-400'
    }`} />
    <div>
      <p className="font-medium">
        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
      </p>
      <p className="text-sm text-gray-600">
        by {log.userId?.name} ({log.roleAtTime})
      </p>
      {log.remarks && (
        <p className="text-sm italic text-gray-500">"{log.remarks}"</p>
      )}
      <p className="text-xs text-gray-400">
        {new Date(log.createdAt).toLocaleString()}
      </p>
    </div>
  </div>
))}
```

---

## 🎯 Best Practices Summary

| Practice | Implementation |
|----------|---------------|
| **Immutable storage** | Pre-hooks block update/delete |
| **Capture role at time** | `roleAtTime` field preserves context |
| **Comprehensive actions** | All state changes logged |
| **Structured metadata** | JSON `metadata` field for flexibility |
| **Indexed queries** | Indexes on `contractId`, `createdAt` |
| **Populated references** | User/version details included in queries |
| **Chronological display** | `sort({ createdAt: 1 })` for timeline |
