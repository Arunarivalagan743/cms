# Database Models & Schema Design

## 📊 Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│      User       │         │   WorkflowConfig │
├─────────────────┤         ├─────────────────┤
│ _id             │         │ _id             │
│ name            │         │ name            │
│ email           │         │ description     │
│ password (hash) │         │ version         │
│ role            │         │ steps[]         │
│ previousRoles[] │         │ isActive        │
│ isActive        │         │ createdBy ──────┼──┐
│ isPasswordSet   │         └─────────────────┘  │
│ inviteToken     │◀─────────────────────────────┘
│ resetToken      │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐         ┌─────────────────┐
│    Contract     │         │ RolePermission  │
├─────────────────┤         ├─────────────────┤
│ _id             │         │ _id             │
│ contractNumber  │         │ role (unique)   │
│ client ─────────┼──┐      │ permissions{}   │
│ createdBy ──────┼──┤      │ updatedBy ──────┼──┐
│ currentVersion  │  │      └─────────────────┘  │
│ workflowId      │  │                           │
│ workflowVersion │  └───────────────────────────┘
│ currentStep     │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│ ContractVersion │
├─────────────────┤
│ _id             │
│ contract ───────┼──▶ Contract._id
│ versionNumber   │
│ contractName    │
│ clientEmail     │
│ effectiveDate   │
│ amount          │
│ status          │
│ financeRemark*  │
│ clientRemark    │
│ rejectedBy      │
│ approvedByFin.  │
│ approvedByCli.  │
│ isCurrent       │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐         ┌─────────────────┐
│    AuditLog     │         │   Notification  │
├─────────────────┤         ├─────────────────┤
│ _id             │         │ _id             │
│ contract        │         │ user ───────────┼──▶ User._id
│ contractVersion │         │ type            │
│ action          │         │ title           │
│ performedBy     │         │ message         │
│ roleAtTime      │         │ contract        │
│ remarks         │         │ isRead          │
│ metadata        │         └─────────────────┘
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│   SystemLog     │
├─────────────────┤
│ _id             │
│ action          │
│ performedBy     │
│ targetUser      │
│ details         │
│ ipAddress       │
│ userAgent       │
│ success         │
│ createdAt       │
└─────────────────┘
```

---

## 👤 User Model (`models/User.js`)

### Schema Definition

```javascript
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false  // Never include in queries by default
  },
  role: {
    type: String,
    enum: ['super_admin', 'legal', 'finance', 'senior_finance', 'client'],
    default: 'legal'
  },
  previousRoles: [{
    role: { type: String, enum: ['super_admin', 'legal', 'finance', 'senior_finance', 'client'] },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  isActive: {
    type: Boolean,
    default: false  // Inactive until password is set
  },
  isPasswordSet: {
    type: Boolean,
    default: false
  },
  inviteToken: { type: String, select: false },
  inviteTokenExpire: { type: Date, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false }
}, {
  timestamps: true  // Adds createdAt, updatedAt
});
```

### Key Features

#### 1. Password Hashing (Pre-save Hook)
```javascript
userSchema.pre('save', async function() {
  if (!this.password || !this.isModified('password')) {
    return;  // Skip if password not changed
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
```

**Why bcrypt?**
- **Salt**: Unique per password, prevents rainbow table attacks
- **Cost Factor (10)**: Takes ~100ms to hash, slows brute force
- **One-way**: Cannot reverse hash to get password

#### 2. JWT Token Generation
```javascript
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },  // Payload
    process.env.JWT_SECRET,              // Secret key
    { expiresIn: process.env.JWT_EXPIRE } // Options
  );
};
```

**Token Payload Contains:**
- `id`: User's MongoDB ObjectId
- `role`: Current role at time of login
- `iat`: Issued at timestamp (auto)
- `exp`: Expiration timestamp (auto)

#### 3. Password Comparison
```javascript
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
```

#### 4. Invite Token Generation
```javascript
userSchema.methods.generateInviteToken = function() {
  const inviteToken = crypto.randomBytes(32).toString('hex');

  // Store HASHED token in database
  this.inviteToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex');

  this.inviteTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  return inviteToken;  // Return UNHASHED token for email
};
```

**Why Hash the Token?**
- If database is compromised, attacker can't use stored tokens
- Only user with email has the unhashed version

### Indexes

```javascript
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
```

**Why These Indexes?**
- Queries like `User.find({ role: 'finance', isActive: true })` are common
- Without index: Full collection scan (O(n))
- With index: B-tree lookup (O(log n))

---

## 📄 Contract Model (`models/Contract.js`)

### Schema Definition

```javascript
const contractSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    unique: true,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentVersion: {
    type: Number,
    default: 1
  },
  // WORKFLOW LOCKING
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowConfig',
    default: null
  },
  workflowVersion: {
    type: Number,
    default: null
  },
  currentStep: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});
```

### Auto-Generated Contract Number

```javascript
contractSchema.pre('validate', async function() {
  if (this.isNew && !this.contractNumber) {
    const count = await mongoose.model('Contract').countDocuments();
    this.contractNumber = `CON-${String(count + 1).padStart(6, '0')}`;
  }
});
```

**Generated Format:** `CON-000001`, `CON-000002`, etc.

**Why Pre-validate?**
- Runs before validation, so required check passes
- `isNew` ensures only new documents get number
- `countDocuments()` gives next available number

### Workflow Locking Explained

```javascript
workflowId: { type: ObjectId, ref: 'WorkflowConfig' },
workflowVersion: { type: Number }
```

**Problem:** Admin changes workflow while contract is in progress
**Solution:** Store workflow reference at contract creation time

```javascript
// In createContract controller:
const activeWorkflow = await WorkflowConfig.findOne({ isActive: true });

const contract = await Contract.create({
  // ...
  workflowId: activeWorkflow._id,       // Lock to this workflow
  workflowVersion: activeWorkflow.version
});
```

**Benefits:**
- Contract uses workflow that existed when created
- Future workflow changes don't affect in-progress contracts
- Audit trail shows which workflow version was used

---

## 📋 ContractVersion Model (`models/ContractVersion.js`)

### Schema Definition

```javascript
const contractVersionSchema = new mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  contractName: {
    type: String,
    required: [true, 'Contract name is required'],
    trim: true
  },
  clientEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  effectiveDate: {
    type: Date,
    required: [true, 'Effective date is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['draft', 'pending_finance', 'pending_client', 'active', 'rejected', 'cancelled'],
    default: 'draft'
  },
  // DUAL REJECTION REMARKS
  financeRemarkInternal: { type: String, default: null },
  financeRemarkClient: { type: String, default: null },
  clientRemark: { type: String, default: null },
  rejectionRemarks: { type: String, default: null },  // Legacy
  
  // TRACKING
  rejectedBy: { type: ObjectId, ref: 'User', default: null },
  rejectedAt: { type: Date, default: null },
  approvedByFinance: { type: ObjectId, ref: 'User', default: null },
  financeApprovedAt: { type: Date, default: null },
  approvedByClient: { type: ObjectId, ref: 'User', default: null },
  clientApprovedAt: { type: Date, default: null },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  isCurrent: { type: Boolean, default: true }
}, {
  timestamps: true
});
```

### Status State Machine

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    ▼                                                 │
┌────────┐     ┌────────────────┐     ┌─────────────────┐     ┌──────┴───┐
│ draft  │────▶│pending_finance │────▶│ pending_client  │────▶│  active  │
└────────┘     └───────┬────────┘     └────────┬────────┘     └──────────┘
                       │                       │
                       ▼                       ▼
                 ┌──────────┐           ┌──────────┐
                 │ rejected │◀──────────│ rejected │
                 └────┬─────┘           └──────────┘
                      │
                      │ amend
                      ▼
                 ┌────────┐
                 │ draft  │  (new version)
                 └────────┘
```

### Dual Remarks System

```javascript
// When Finance rejects:
currentVersion.financeRemarkInternal = "Budget exceeds Q2 allocation by 15%";
currentVersion.financeRemarkClient = "Contract amount needs revision";

// When displaying:
if (user.role === 'client') {
  show(version.financeRemarkClient);  // Sanitized message
} else {
  show(version.financeRemarkInternal);  // Full details
}
```

**Why Dual Remarks?**
- Internal remarks may contain sensitive financial analysis
- Client should see actionable feedback, not internal notes
- Maintains professional communication

### Indexes

```javascript
// Uniqueness: One version number per contract
contractVersionSchema.index({ contract: 1, versionNumber: 1 }, { unique: true });

// Query: Get current version of a contract
contractVersionSchema.index({ contract: 1, isCurrent: 1 });

// Query: Get all contracts with specific status
contractVersionSchema.index({ status: 1, isCurrent: 1 });

// Query: Contracts approved by specific user
contractVersionSchema.index({ approvedByFinance: 1 });
contractVersionSchema.index({ approvedByClient: 1 });
```

---

## 📝 AuditLog Model (`models/AuditLog.js`)

### Schema Definition

```javascript
const auditLogSchema = new mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  contractVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContractVersion',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'submitted', 'approved', 'rejected', 'amended', 'cancelled'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roleAtTime: {
    type: String,
    enum: ['super_admin', 'legal', 'finance', 'client'],
    required: true
  },
  remarks: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }  // Only createdAt
});
```

### Immutability Enforcement

```javascript
// Block updates
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

// Block deletes
auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs cannot be deleted');
});
```

**Why Immutable?**
- **Compliance**: Regulations require tamper-proof audit trails
- **Trust**: Proves actions happened as recorded
- **Forensics**: Investigate disputes with reliable data

### roleAtTime Field

```javascript
roleAtTime: { type: String, required: true }
```

**Why Store Role at Time of Action?**
- User may get promoted (Legal → Finance)
- Audit should show what role they had when they acted
- "John approved as Finance" not "John (now Super Admin) approved"

### Sample Audit Entry

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "contract": "507f1f77bcf86cd799439012",
  "contractVersion": "507f1f77bcf86cd799439013",
  "action": "approved",
  "performedBy": "507f1f77bcf86cd799439014",
  "roleAtTime": "finance",
  "remarks": "Finance approval granted",
  "metadata": {},
  "createdAt": "2026-02-05T10:30:00.000Z"
}
```

---

## 🔔 Notification Model (`models/Notification.js`)

```javascript
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['submission', 'approval', 'rejection', 'amendment', 'cancellation'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for user's notifications sorted by time
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
```

---

## ⚙️ WorkflowConfig Model (`models/WorkflowConfig.js`)

```javascript
const workflowStepSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ['legal', 'finance', 'senior_finance', 'client', 'super_admin'],
    required: true
  },
  action: {
    type: String,
    enum: ['submit', 'approve', 'final_approve'],
    default: 'approve'
  },
  canSkip: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
});

const workflowConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  version: { type: Number, required: true, default: 1 },
  steps: [workflowStepSchema],
  isActive: { type: Boolean, default: false },
  createdBy: { type: ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// IMMUTABILITY
workflowConfigSchema.pre('findOneAndUpdate', function() {
  throw new Error('Workflows are immutable. Create a new version instead.');
});

workflowConfigSchema.pre('deleteOne', function() {
  throw new Error('Workflows cannot be deleted for audit integrity.');
});
```

### Default Workflow Structure

```json
{
  "name": "Standard Approval Workflow",
  "description": "Legal → Finance → Client",
  "version": 1,
  "isActive": true,
  "steps": [
    { "order": 1, "name": "Legal Submission", "role": "legal", "action": "submit" },
    { "order": 2, "name": "Finance Review", "role": "finance", "action": "approve" },
    { "order": 3, "name": "Client Approval", "role": "client", "action": "final_approve" }
  ]
}
```

---

## 🔐 RolePermission Model (`models/RolePermission.js`)

```javascript
const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['super_admin', 'legal', 'finance', 'client'],
    required: true,
    unique: true
  },
  permissions: {
    // Contract Operations
    canCreateContract: { type: Boolean, default: false },
    canEditDraft: { type: Boolean, default: false },
    canEditSubmitted: { type: Boolean, default: false },
    canDeleteContract: { type: Boolean, default: false },
    canSubmitContract: { type: Boolean, default: false },
    canApproveContract: { type: Boolean, default: false },
    canRejectContract: { type: Boolean, default: false },
    canAmendContract: { type: Boolean, default: false },
    canCancelContract: { type: Boolean, default: false },
    
    // Visibility
    canViewAllContracts: { type: Boolean, default: false },
    canViewOwnContracts: { type: Boolean, default: true },
    
    // Administration
    canManageUsers: { type: Boolean, default: false },
    canAssignRoles: { type: Boolean, default: false },
    canViewAuditLogs: { type: Boolean, default: false },
    canViewSystemLogs: { type: Boolean, default: false },
    canConfigureWorkflow: { type: Boolean, default: false },
    canConfigurePermissions: { type: Boolean, default: false },
    
    // Dashboard
    canViewDashboard: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: false }
  },
  description: { type: String, default: '' },
  updatedBy: { type: ObjectId, ref: 'User' }
}, {
  timestamps: true
});
```

### Default Permission Matrix

| Permission | Super Admin | Legal | Finance | Client |
|------------|-------------|-------|---------|--------|
| canCreateContract | ✅ | ✅ | ❌ | ❌ |
| canEditDraft | ✅ | ✅ | ❌ | ❌ |
| canSubmitContract | ✅ | ✅ | ❌ | ❌ |
| canApproveContract | ✅ | ❌ | ✅ | ✅ |
| canRejectContract | ✅ | ❌ | ✅ | ✅ |
| canAmendContract | ✅ | ✅ | ❌ | ❌ |
| canViewAllContracts | ✅ | ❌ | ✅ | ❌ |
| canManageUsers | ✅ | ❌ | ❌ | ❌ |
| canViewAuditLogs | ✅ | ❌ | ❌ | ❌ |
| canConfigureWorkflow | ✅ | ❌ | ❌ | ❌ |

---

## 📊 SystemLog Model (`models/SystemLog.js`)

```javascript
const systemLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'login', 'login_failed', 'logout',
      'user_created', 'user_updated', 'user_deleted',
      'user_disabled', 'user_enabled', 'role_changed',
      'password_reset', 'password_changed',
      'invite_sent', 'invite_resent',
      'workflow_updated', 'permission_updated',
      'system_config_changed'
    ],
    required: true
  },
  performedBy: { type: ObjectId, ref: 'User', default: null },
  targetUser: { type: ObjectId, ref: 'User', default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  success: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Immutability
systemLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('System logs cannot be modified');
});
systemLogSchema.pre('deleteMany', function() {
  throw new Error('System logs cannot be deleted');
});
```

---

## 🔄 Data Relationships Summary

| Parent | Child | Type | Foreign Key |
|--------|-------|------|-------------|
| User | Contract | 1:N | `contract.client`, `contract.createdBy` |
| Contract | ContractVersion | 1:N | `version.contract` |
| Contract | AuditLog | 1:N | `audit.contract` |
| ContractVersion | AuditLog | 1:N | `audit.contractVersion` |
| User | Notification | 1:N | `notification.user` |
| User | AuditLog | 1:N | `audit.performedBy` |
| User | SystemLog | 1:N | `systemLog.performedBy` |

---

## 🎯 Query Optimization Tips

1. **Always use indexes for frequent queries**
2. **Use `.select()` to limit returned fields**
3. **Use `.lean()` for read-only operations (60% faster)**
4. **Populate only needed fields**: `.populate('user', 'name email')`
5. **Use aggregation for complex reports**

```javascript
// Bad
const contracts = await Contract.find({ status: 'active' });

// Good
const contracts = await Contract.find({ status: 'active' })
  .select('contractNumber contractName amount')
  .lean();
```
