# CMS API Endpoints Documentation

## Base URL
```
http://localhost:5000/api
```

---

## 🔐 Authentication Endpoints (`/api/auth`)

### 1. Login
- **POST** `/api/auth/login`
- **Access**: Public
- **Body**: 
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### 2. Get Current User
- **GET** `/api/auth/me`
- **Access**: Private (All authenticated users)
- **Headers**: `Authorization: Bearer <token>`

### 3. Logout
- **POST** `/api/auth/logout`
- **Access**: Private (All authenticated users)

---

## 👥 User Management Endpoints (`/api/users`)

### Public Routes (No Auth Required)

#### 1. Verify Invite Token
- **GET** `/api/users/verify-token/:token`
- **Access**: Public

#### 2. Set Password (First Time)
- **POST** `/api/users/set-password/:token`
- **Access**: Public
- **Body**:
  ```json
  {
    "password": "newpassword",
    "confirmPassword": "newpassword"
  }
  ```

#### 3. Forgot Password
- **POST** `/api/users/forgot-password`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```

#### 4. Reset Password
- **POST** `/api/users/reset-password/:token`
- **Access**: Public
- **Body**:
  ```json
  {
    "password": "newpassword",
    "confirmPassword": "newpassword"
  }
  ```

### Protected Routes

#### 5. Get All Clients (For Contract Creation)
- **GET** `/api/users/clients`
- **Access**: Private (Legal, Super Admin)
- **Returns**: All users with role 'client'

#### 6. Get All Users
- **GET** `/api/users`
- **Access**: Private (Super Admin only)
- **Query Params**: `?role=client&isActive=true`

#### 7. Get Single User
- **GET** `/api/users/:id`
- **Access**: Private (Super Admin only)

#### 8. Create User
- **POST** `/api/users`
- **Access**: Private (Super Admin only)
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "client|legal|finance|super_admin"
  }
  ```

#### 9. Resend Invite Email
- **POST** `/api/users/:id/resend-invite`
- **Access**: Private (Super Admin only)

#### 10. Update User
- **PUT** `/api/users/:id`
- **Access**: Private (Super Admin only)
- **Body**:
  ```json
  {
    "name": "Updated Name",
    "email": "updated@example.com",
    "role": "client"
  }
  ```

#### 11. Delete User
- **DELETE** `/api/users/:id`
- **Access**: Private (Super Admin only)

---

## 📄 Contract Endpoints (`/api/contracts`)

### 1. Get All Contracts
- **GET** `/api/contracts`
- **Access**: Private (All authenticated users - filtered by role)
- **Query Params**: `?status=active`
- **Role-based filtering**:
  - Client: Only their assigned contracts
  - Legal: Only contracts they created
  - Finance/Super Admin: All contracts

### 2. Get Single Contract
- **GET** `/api/contracts/:id`
- **Access**: Private (All authenticated users - role-based access)

### 3. Get Contract Versions
- **GET** `/api/contracts/:id/versions`
- **Access**: Private (All authenticated users)

### 4. Get Contract Audit Trail
- **GET** `/api/contracts/:id/audit`
- **GET** `/api/contracts/:id/audit-logs`
- **Access**: Private (Super Admin only)

### 5. Create Contract
- **POST** `/api/contracts`
- **Access**: Private (Legal only)
- **Body**:
  ```json
  {
    "contractName": "Service Agreement",
    "client": "client_user_id",
    "effectiveDate": "2026-03-01",
    "amount": 50000
  }
  ```

### 6. Update Draft Contract
- **PUT** `/api/contracts/:id`
- **Access**: Private (Legal only)
- **Body**:
  ```json
  {
    "contractName": "Updated Name",
    "effectiveDate": "2026-03-15",
    "amount": 55000
  }
  ```

### 7. Submit Contract for Review
- **POST** `/api/contracts/:id/submit`
- **Access**: Private (Legal only)

### 8. Approve Contract
- **POST** `/api/contracts/:id/approve`
- **Access**: Private (Finance or Client - depending on status)

### 9. Reject Contract
- **POST** `/api/contracts/:id/reject`
- **Access**: Private (Finance or Client)
- **Body**:
  ```json
  {
    "remarks": "Reason for rejection"
  }
  ```

### 10. Create Amendment
- **POST** `/api/contracts/:id/amend`
- **Access**: Private (Legal only)
- **Body**:
  ```json
  {
    "contractName": "Updated Contract Name",
    "effectiveDate": "2026-04-01",
    "amount": 60000
  }
  ```

---

## 📊 Dashboard Endpoints (`/api/dashboard`)

### 1. Get Dashboard Statistics
- **GET** `/api/dashboard/stats`
- **Access**: Private (All authenticated users)
- **Returns**: Role-based statistics
  - **Super Admin**: 
    ```json
    {
      "totalContracts": 50,
      "activeContracts": 30,
      "pendingContracts": 10,
      "rejectedContracts": 5,
      "draftContracts": 5
    }
    ```
  - **Legal**: Their own contract stats
  - **Finance**: Contracts pending their review
  - **Client**: Their own contract stats

### 2. Get Pending Approvals
- **GET** `/api/dashboard/pending`
- **Access**: Private (All authenticated users - filtered by role)

### 3. Get Active Contracts
- **GET** `/api/dashboard/active`
- **Access**: Private (All authenticated users - filtered by role)

### 4. Get Rejected Contracts
- **GET** `/api/dashboard/rejected`
- **Access**: Private (All authenticated users - filtered by role)

### 5. Get System Audit Logs
- **GET** `/api/dashboard/audit-logs`
- **Access**: Private (Super Admin only)
- **Query Params**: `?page=1&limit=20`

---

## 🔔 Notification Endpoints (`/api/notifications`)

### 1. Get All Notifications
- **GET** `/api/notifications`
- **Access**: Private (All authenticated users)

### 2. Mark Notification as Read
- **PUT** `/api/notifications/:id/read`
- **Access**: Private (All authenticated users)

### 3. Mark All Notifications as Read
- **PUT** `/api/notifications/read-all`
- **Access**: Private (All authenticated users)

---

## 🏥 Health Check

### Server Health
- **GET** `/api/health`
- **Access**: Public
- **Returns**:
  ```json
  {
    "success": true,
    "message": "Server is running"
  }
  ```

---

## 🔑 User Roles & Permissions

### Role Hierarchy:
1. **super_admin**: Full system access
2. **legal**: Create and manage contracts
3. **finance**: Review and approve contracts (finance stage)
4. **client**: View and approve assigned contracts (client stage)

### Role-Based Access:
- **Super Admin**: All endpoints
- **Legal**: Create/update/submit contracts, view clients
- **Finance**: Approve/reject contracts at finance stage
- **Client**: Approve/reject their assigned contracts

---

## 📝 Contract Workflow

1. **Draft** → Legal creates contract
2. **Pending Finance** → Legal submits for review
3. **Pending Client** → Finance approves
4. **Active** → Client approves
5. **Rejected** → Finance/Client rejects (goes back to Legal)

---

## ⚠️ Common Response Formats

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description"
}
```

### Validation Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

---

## 🔒 Authentication Headers

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

Token is obtained from `/api/auth/login` response.

---

## 🌐 CORS Configuration

Allowed Origins:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:5174`
