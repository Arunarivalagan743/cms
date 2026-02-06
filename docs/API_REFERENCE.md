# API Reference

## 🌐 Base Configuration

```
Base URL: http://localhost:5000/api
Content-Type: application/json
Authentication: Bearer Token (JWT)
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "count": 10,        // For list endpoints
  "message": "..."    // For action confirmations
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...]     // For validation errors
}
```

---

## 🔐 Authentication Endpoints

### POST `/api/auth/login`

Authenticate user and receive JWT token.

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f3c456789...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "legal",
    "isActive": true
  },
  "permissions": {
    "canCreateContract": true,
    "canEditDraft": true,
    "canSubmitContract": true,
    "canViewOwnContracts": true,
    "canViewDashboard": true
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Side Effects:**
- Creates SystemLog entry for `login` action
- Failed attempts create `login_failed` SystemLog

---

### GET `/api/auth/me`

Get current authenticated user.

**Access:** Private (All authenticated users)

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f3c456789...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "legal",
    "isActive": true,
    "createdAt": "2024-03-15T10:00:00Z"
  },
  "permissions": {
    "canCreateContract": true,
    ...
  }
}
```

---

### POST `/api/auth/logout`

Logout current user.

**Access:** Private (All authenticated users)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects:**
- Creates SystemLog entry for `logout` action

---

## 👥 User Management Endpoints

### GET `/api/users`

Get all users (admin only).

**Access:** Private (Super Admin)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role: `legal`, `finance`, `client`, `super_admin` |
| `isActive` | boolean | Filter by active status |

**Success Response (200):**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "65f3c456789...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "legal",
      "isActive": true,
      "isPasswordSet": true,
      "previousRoles": [
        { "role": "client", "changedAt": "2024-01-15T00:00:00Z" }
      ],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET `/api/users/clients`

Get all clients (for contract creation dropdown).

**Access:** Private (Legal, Super Admin)

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "65f3c456789...",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "role": "client",
      "isActive": true
    }
  ]
}
```

---

### POST `/api/users`

Create new user (sends invite email).

**Access:** Private (Super Admin)

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "finance"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "65f3c456789...",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "finance",
    "isActive": true,
    "isPasswordSet": false,
    "inviteToken": "abc123...",
    "inviteTokenExpires": "2024-03-22T10:00:00Z"
  },
  "message": "Invite email sent"
}
```

**Side Effects:**
- Sends invitation email with password setup link
- Creates SystemLog entry for `user_created`

---

### PUT `/api/users/:id`

Update user details.

**Access:** Private (Super Admin)

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "role": "legal"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f3c456789...",
    "name": "Jane Smith Updated",
    "role": "legal",
    "previousRoles": [
      { "role": "finance", "changedAt": "2024-03-15T10:00:00Z" }
    ]
  }
}
```

**Side Effects (if role changed):**
- Adds previous role to `previousRoles` array
- Creates SystemLog entry for `role_changed`

---

### POST `/api/users/set-password/:token`

Set password for new user (via invite link).

**Access:** Public

**URL Parameter:** `token` - Invite token from email

**Request Body:**
```json
{
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password set successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST `/api/users/forgot-password`

Request password reset email.

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### POST `/api/users/reset-password/:token`

Reset password using token.

**Access:** Public

**Request Body:**
```json
{
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 📄 Contract Endpoints

### GET `/api/contracts`

Get all contracts (filtered by role).

**Access:** Private (All authenticated users)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `draft`, `pending_finance`, `pending_client`, `active`, `rejected`, `cancelled` |

**Role-Based Filtering:**
| Role | Sees |
|------|------|
| Legal | Own created contracts |
| Finance | All contracts |
| Client | Contracts assigned to them |
| Super Admin | All contracts |

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "65f3c456789...",
      "contractNumber": "CMS-202403-0001",
      "client": {
        "_id": "65f3c123...",
        "name": "Acme Corp",
        "email": "contact@acme.com"
      },
      "createdBy": {
        "_id": "65f3c789...",
        "name": "Alice Smith"
      },
      "currentVersion": 1,
      "workflowId": "65f3c999...",
      "workflowVersion": 1,
      "currentStep": 2,
      "createdAt": "2024-03-15T10:00:00Z",
      "currentVersion": {
        "_id": "65f3c888...",
        "versionNumber": 1,
        "contractName": "Service Agreement - Acme Corp",
        "clientEmail": "contact@acme.com",
        "effectiveDate": "2024-04-01T00:00:00Z",
        "amount": 50000,
        "status": "pending_finance",
        "isCurrent": true
      }
    }
  ]
}
```

---

### GET `/api/contracts/:id`

Get single contract with all versions.

**Access:** Private (All authenticated users - with access check)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f3c456789...",
    "contractNumber": "CMS-202403-0001",
    "client": { ... },
    "createdBy": { ... },
    "versions": [
      {
        "_id": "65f3c888...",
        "versionNumber": 2,
        "status": "pending_finance",
        "isCurrent": true,
        "createdBy": { "name": "Alice Smith" },
        "createdAt": "2024-03-16T10:00:00Z"
      },
      {
        "_id": "65f3c777...",
        "versionNumber": 1,
        "status": "rejected",
        "isCurrent": false,
        "rejectedBy": { "name": "Bob Johnson" },
        "financeRemarkInternal": "Budget exceeds limit",
        "financeRemarkClient": "Please revise amount",
        "createdAt": "2024-03-15T10:00:00Z"
      }
    ]
  }
}
```

---

### POST `/api/contracts`

Create new contract.

**Access:** Private (Legal - `canCreateContract` permission)

**Request Body:**
```json
{
  "contractName": "Service Agreement - Acme Corp",
  "client": "65f3c123...",  // Client user ID
  "clientEmail": "contact@acme.com",
  "effectiveDate": "2024-04-01",
  "amount": 50000
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| `contractName` | Required, not empty |
| `client` | Required, valid user ID |
| `effectiveDate` | Required, ISO8601 date format |
| `amount` | Required, numeric |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "contract": {
      "_id": "65f3c456...",
      "contractNumber": "CMS-202403-0001",
      "client": "65f3c123...",
      "createdBy": "65f3c789...",
      "workflowId": "65f3c999...",
      "workflowVersion": 1,
      "currentStep": 1
    },
    "version": {
      "_id": "65f3c888...",
      "versionNumber": 1,
      "contractName": "Service Agreement - Acme Corp",
      "status": "draft",
      "isCurrent": true
    }
  }
}
```

**Side Effects:**
- Creates AuditLog entry for `created` action
- Locks current workflow version to contract

---

### PUT `/api/contracts/:id`

Update draft contract.

**Access:** Private (Legal - `canEditDraft` permission)

**Request Body:**
```json
{
  "contractName": "Updated Service Agreement",
  "amount": 55000
}
```

**Validation:**
- Contract must be in `draft` status
- User must be the creator

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f3c888...",
    "contractName": "Updated Service Agreement",
    "amount": 55000,
    "status": "draft"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Only draft contracts can be edited"
}
```

---

### POST `/api/contracts/:id/submit`

Submit contract for finance review.

**Access:** Private (Legal - `canSubmitContract` permission)

**Validation:**
- Contract must be in `draft` status
- User must be the creator

**Success Response (200):**
```json
{
  "success": true,
  "message": "Contract submitted for finance review",
  "data": {
    "status": "pending_finance"
  }
}
```

**Side Effects:**
- Status changes to `pending_finance`
- Creates AuditLog entry for `submitted`
- Sends notifications to all Finance users

---

### POST `/api/contracts/:id/approve`

Approve contract (Finance or Client).

**Access:** Private (Finance/Client - `canApproveContract` permission)

**Behavior by Role:**

| Current Status | Actor | New Status | Side Effects |
|----------------|-------|------------|--------------|
| `pending_finance` | Finance | `pending_client` | Notify Client |
| `pending_client` | Client | `active` | Notify Legal |

**Success Response (200) - Finance:**
```json
{
  "success": true,
  "message": "Contract approved by finance, pending client approval",
  "data": {
    "status": "pending_client",
    "approvedByFinance": "65f3c456...",
    "financeApprovedAt": "2024-03-16T10:00:00Z"
  }
}
```

**Success Response (200) - Client:**
```json
{
  "success": true,
  "message": "Contract approved and is now active",
  "data": {
    "status": "active",
    "approvedByClient": "65f3c789...",
    "clientApprovedAt": "2024-03-17T10:00:00Z"
  }
}
```

**Error Response (403) - Conflict of Interest:**
```json
{
  "success": false,
  "message": "Conflict of interest: You cannot approve a contract you created"
}
```

---

### POST `/api/contracts/:id/reject`

Reject contract with remarks.

**Access:** Private (Finance/Client - `canRejectContract` permission)

**Request Body (Finance):**
```json
{
  "remarks": "Primary feedback",
  "remarksInternal": "Detailed internal notes for legal team",
  "remarksClient": "Sanitized message for client"
}
```

**Request Body (Client):**
```json
{
  "remarks": "Rejection reason"
}
```

**Validation:**
- `remarks` is required (cannot be empty)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Contract rejected",
  "data": {
    "status": "rejected",
    "rejectedBy": "65f3c456...",
    "rejectedAt": "2024-03-16T10:00:00Z",
    "financeRemarkInternal": "Budget exceeds approved Q4 allocation",
    "financeRemarkClient": "Please revise the contract amount"
  }
}
```

**Side Effects:**
- Status changes to `rejected`
- Finance: Dual notifications (internal to Legal, sanitized to Client)
- Client: Notification to Legal
- Creates AuditLog entry for `rejected`

---

### POST `/api/contracts/:id/amend`

Create amendment for rejected contract.

**Access:** Private (Legal - `canAmendContract` permission)

**Request Body:**
```json
{
  "contractName": "Service Agreement - Acme Corp (Revised)",
  "amount": 45000,
  "effectiveDate": "2024-04-15"
}
```

**Validation:**
- Contract must be in `rejected` status
- User must be the original creator

**Success Response (201):**
```json
{
  "success": true,
  "message": "Amendment created successfully",
  "data": {
    "_id": "65f3c999...",
    "versionNumber": 2,
    "contractName": "Service Agreement - Acme Corp (Revised)",
    "amount": 45000,
    "status": "draft",
    "isCurrent": true
  }
}
```

**Side Effects:**
- Previous version: `isCurrent = false`
- New version created with `status = draft`
- Contract `currentVersion` incremented
- Creates AuditLog entry for `amended`

---

### POST `/api/contracts/:id/cancel`

Cancel contract.

**Access:** Private (Client/Super Admin - `canCancelContract` permission)

**Request Body:**
```json
{
  "reason": "Business circumstances have changed"
}
```

**Validation:**
- Contract must be in `pending_client` or `rejected` status
- Client can only cancel contracts assigned to them

**Success Response (200):**
```json
{
  "success": true,
  "message": "Contract cancelled successfully",
  "data": {
    "status": "cancelled",
    "clientRemark": "Business circumstances have changed"
  }
}
```

---

### GET `/api/contracts/:id/versions`

Get all versions of a contract.

**Access:** Private (All authenticated users - with access check)

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "versionNumber": 2,
      "status": "pending_finance",
      "isCurrent": true,
      "createdBy": { "name": "Alice" }
    },
    {
      "versionNumber": 1,
      "status": "rejected",
      "isCurrent": false,
      "rejectedBy": { "name": "Bob" }
    }
  ]
}
```

---

### GET `/api/contracts/:id/audit`

Get contract audit trail.

**Access:** Private (`canViewAuditLogs` permission)

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "65f3c111...",
      "action": "created",
      "userId": { "name": "Alice Smith", "email": "alice@company.com" },
      "roleAtTime": "legal",
      "metadata": { "contractName": "Service Agreement", "amount": 50000 },
      "createdAt": "2024-03-15T10:00:00Z"
    },
    {
      "_id": "65f3c222...",
      "action": "submitted",
      "userId": { "name": "Alice Smith" },
      "roleAtTime": "legal",
      "createdAt": "2024-03-15T12:00:00Z"
    }
  ]
}
```

---

## 📊 Dashboard Endpoints

### GET `/api/dashboard/stats`

Get dashboard statistics.

**Access:** Private (All authenticated users)

**Response (Super Admin/Finance):**
```json
{
  "success": true,
  "data": {
    "totalContracts": 50,
    "draftContracts": 5,
    "pendingFinanceContracts": 8,
    "pendingClientContracts": 12,
    "activeContracts": 20,
    "rejectedContracts": 5
  }
}
```

**Response (Legal):**
```json
{
  "success": true,
  "data": {
    "totalContracts": 15,       // Only their contracts
    "draftContracts": 2,
    "pendingFinanceContracts": 3,
    "pendingClientContracts": 5,
    "activeContracts": 4,
    "rejectedContracts": 1
  }
}
```

---

### GET `/api/dashboard/pending`

Get contracts pending approval.

**Access:** Private (All authenticated users - filtered by role)

---

### GET `/api/dashboard/active`

Get active contracts.

**Access:** Private (All authenticated users - filtered by role)

---

## 🔔 Notification Endpoints

### GET `/api/notifications`

Get user's notifications.

**Access:** Private (All authenticated users)

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "65f3c111...",
      "type": "contract_submitted",
      "title": "Contract Submitted for Review",
      "message": "Contract 'Service Agreement' has been submitted by Alice",
      "isRead": false,
      "relatedContract": "65f3c456...",
      "createdAt": "2024-03-15T12:00:00Z"
    }
  ]
}
```

---

### PUT `/api/notifications/:id/read`

Mark notification as read.

**Access:** Private (All authenticated users)

---

### PUT `/api/notifications/read-all`

Mark all notifications as read.

**Access:** Private (All authenticated users)

---

## 🛡️ Admin Endpoints

### GET `/api/admin/system-logs`

Get system activity logs.

**Access:** Private (Super Admin - `canViewSystemLogs` permission)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `action` | string | Filter by action type |

---

### GET `/api/admin/role-permissions`

Get all role permissions.

**Access:** Private (Super Admin - `canConfigurePermissions` permission)

---

### PUT `/api/admin/role-permissions/:role`

Update permissions for a role.

**Access:** Private (Super Admin - `canConfigurePermissions` permission)

**Request Body:**
```json
{
  "permissions": {
    "canCreateContract": true,
    "canEditDraft": true,
    "canViewReports": false
  }
}
```

---

### GET `/api/admin/workflow`

Get workflow configuration.

**Access:** Private (Super Admin - `canConfigureWorkflow` permission)

---

### PUT `/api/admin/workflow`

Update workflow configuration.

**Access:** Private (Super Admin - `canConfigureWorkflow` permission)

---

## ❤️ Health Check

### GET `/api/health`

Check server status.

**Access:** Public

**Response:**
```json
{
  "success": true,
  "message": "Server is running"
}
```

---

## 🔑 HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (invalid/expired token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## 🌐 CORS Configuration

```javascript
// Allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
];

// Credentials included
credentials: true
```
