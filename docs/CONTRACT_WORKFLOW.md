# Contract Workflow & State Machine

## 🔄 Workflow Overview

This document explains the complete contract lifecycle from creation to completion, including all possible state transitions and business rules.

---

## 📊 Contract Status State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CONTRACT LIFECYCLE STATE MACHINE                        │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────┐
                                    │  START   │
                                    └────┬─────┘
                                         │
                                         │ Legal creates contract
                                         ▼
                              ┌──────────────────────┐
                              │       DRAFT          │
                              │                      │
                              │  • Can be edited     │
                              │  • Can be deleted    │
                              │  • Not visible to    │
                              │    Finance/Client    │
                              └──────────┬───────────┘
                                         │
                                         │ Legal submits
                                         ▼
                              ┌──────────────────────┐
                              │   PENDING_FINANCE    │
                              │                      │
                              │  • Finance reviews   │
                              │  • Cannot be edited  │
                              │  • Legal sees status │
                              └──────────┬───────────┘
                                         │
                        ┌────────────────┴────────────────┐
                        │                                 │
                        │ Finance approves                │ Finance rejects
                        ▼                                 ▼
              ┌──────────────────────┐         ┌──────────────────────┐
              │   PENDING_CLIENT     │         │      REJECTED        │
              │                      │         │                      │
              │  • Client reviews    │         │  • Legal can amend   │
              │  • Cannot be edited  │         │  • Client can cancel │
              │  • Finance sees      │         │  • Shows remarks     │
              │    approval status   │         │                      │
              └──────────┬───────────┘         └──────────┬───────────┘
                         │                                │
        ┌────────────────┼────────────────┐               │
        │                │                │               │ Legal amends
        │                │                │               │ (Creates new version)
        │ Client         │ Client         │ Client        │
        │ approves       │ rejects        │ cancels       │
        ▼                ▼                ▼               │
 ┌────────────┐   ┌────────────┐   ┌────────────┐        │
 │   ACTIVE   │   │  REJECTED  │   │  CANCELLED │        │
 │            │   │            │   │            │        │
 │  CONTRACT  │   │  Needs     │   │   FINAL    │        │
 │  IN FORCE  │   │  Amendment │   │   STATE    │        │
 │            │   │            │   │            │        │
 └────────────┘   └─────┬──────┘   └────────────┘        │
       │                │                                 │
       │                └─────────────────────────────────┘
       │
       ▼
  ┌────────────┐
  │    END     │
  │  (Success) │
  └────────────┘
```

---

## 🎯 Status Definitions

| Status | Description | Who Can See | Actions Available |
|--------|-------------|-------------|-------------------|
| `draft` | Initial state, contract being prepared | Legal (creator) | Edit, Delete, Submit |
| `pending_finance` | Waiting for Finance review | Legal, Finance, Admin | Finance: Approve/Reject |
| `pending_client` | Finance approved, awaiting Client | All parties | Client: Approve/Reject/Cancel |
| `rejected` | Finance or Client rejected | Legal, Admin | Legal: Amend; Client: Cancel |
| `active` | Fully approved and in effect | All parties | Read-only |
| `cancelled` | Client withdrew the contract | All parties | None (terminal) |

---

## 🏗️ Workflow Configuration (3-Stage Approval)

```javascript
// WorkflowConfig schema
{
  name: 'Standard Approval Workflow',
  description: 'Default 3-stage approval: Legal → Finance → Client',
  version: 1,
  isActive: true,
  steps: [
    { 
      order: 1, 
      name: 'Legal Submission', 
      role: 'legal', 
      action: 'submit', 
      canSkip: false, 
      isActive: true 
    },
    { 
      order: 2, 
      name: 'Finance Review', 
      role: 'finance', 
      action: 'approve', 
      canSkip: false, 
      isActive: true 
    },
    { 
      order: 3, 
      name: 'Client Approval', 
      role: 'client', 
      action: 'final_approve', 
      canSkip: false, 
      isActive: true 
    }
  ]
}
```

---

## 🔒 Workflow Locking Mechanism

### The Problem

What happens when:
1. Admin creates Contract A with Workflow v1
2. Contract A is in `pending_finance`
3. Admin modifies workflow to v2
4. Finance tries to approve Contract A?

### The Solution: Workflow Snapshot

```javascript
// When contract is created, lock the workflow version
const contract = await Contract.create({
  client,
  createdBy: req.user._id,
  workflowId: activeWorkflow._id,      // Reference to workflow
  workflowVersion: activeWorkflow.version,  // Snapshot version
  currentStep: 1
});
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW LOCKING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Time T1: Contract Created
┌──────────────────┐         ┌──────────────────┐
│    Contract A    │ ──────▶ │  Workflow v1     │
│  workflowId: W1  │ copies  │  (3 stages)      │
│  workflowVersion:1│ version│                  │
└──────────────────┘         └──────────────────┘

Time T2: Admin Updates Workflow
┌──────────────────┐         ┌──────────────────┐
│    Contract A    │         │  Workflow v2     │
│  workflowId: W1  │         │  (Modified)      │
│  workflowVersion:1│ still  │                  │
│                  │ locked! │                  │
└──────────────────┘         └──────────────────┘

Time T3: New Contract Created
┌──────────────────┐         ┌──────────────────┐
│    Contract B    │ ──────▶ │  Workflow v2     │
│  workflowId: W1  │ uses    │  (New version)   │
│  workflowVersion:2│ new    │                  │
└──────────────────┘         └──────────────────┘
```

**Benefits:**
- In-progress contracts don't break when workflow changes
- Audit trail shows which workflow version was used
- New contracts automatically use latest workflow

---

## 📝 Version Management

### ContractVersion Lifecycle

```javascript
// Version 1 created (draft)
{
  contract: contractId,
  versionNumber: 1,
  status: 'draft',
  isCurrent: true
}

// Version 1 submitted → pending_finance → rejected
{
  contract: contractId,
  versionNumber: 1,
  status: 'rejected',
  isCurrent: true,
  rejectedBy: financeUserId,
  financeRemarkInternal: 'Budget exceeds approved limit',
  financeRemarkClient: 'Please revise the amount'
}

// Legal creates amendment → Version 2
{
  contract: contractId,
  versionNumber: 1,
  status: 'rejected',
  isCurrent: false  // ← No longer current
}

{
  contract: contractId,
  versionNumber: 2,
  status: 'draft',
  isCurrent: true   // ← New current version
}
```

### Amendment Flow

```
Original Contract (v1)
        │
        │ Rejected by Finance/Client
        ▼
┌───────────────────┐
│ LEGAL AMENDS:     │
│ 1. v1.isCurrent   │──▶ false
│ 2. Create v2      │──▶ draft
│ 3. Update contract│──▶ currentVersion: 2
└───────────────────┘
        │
        │ v2 goes through same workflow
        ▼
  Submit → Finance → Client → Active
```

---

## 🛡️ Business Rules & Validations

### 1. Draft Editing Rules

```javascript
// Only drafts can be edited
if (currentVersion.status !== 'draft') {
  return res.status(400).json({
    message: 'Only draft contracts can be edited'
  });
}

// Only creator can edit
if (contract.createdBy.toString() !== req.user._id.toString()) {
  return res.status(403).json({
    message: 'Not authorized to edit this contract'
  });
}
```

### 2. Submission Rules

```javascript
// Only drafts can be submitted
if (currentVersion.status !== 'draft') {
  return res.status(400).json({
    message: 'Only draft contracts can be submitted'
  });
}

// Only creator can submit
if (contract.createdBy.toString() !== req.user._id.toString()) {
  return res.status(403).json({
    message: 'Not authorized to submit this contract'
  });
}
```

### 3. Approval Rules

```javascript
// Finance can only approve pending_finance
if (req.user.role === 'finance') {
  if (currentVersion.status !== 'pending_finance') {
    return res.status(400).json({
      message: 'Contract is not pending finance review'
    });
  }
  
  // Conflict of Interest check
  if (contract.createdBy.toString() === req.user._id.toString()) {
    return res.status(403).json({
      message: 'Conflict of interest: You cannot approve a contract you created'
    });
  }
}

// Client can only approve pending_client
if (req.user.role === 'client') {
  if (currentVersion.status !== 'pending_client') {
    return res.status(400).json({
      message: 'Contract is not pending client approval'
    });
  }
  
  // Client must be assigned to this contract
  if (contract.client.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: 'Not authorized to approve this contract'
    });
  }
}
```

### 4. Rejection Rules

```javascript
// Remarks are MANDATORY for rejection
if (!remarks || remarks.trim() === '') {
  return res.status(400).json({
    message: 'Rejection remarks are required'
  });
}

// Finance rejection: dual remarks system
if (req.user.role === 'finance') {
  currentVersion.financeRemarkInternal = remarksInternal || remarks;
  currentVersion.financeRemarkClient = remarksClient || remarks;
}

// Client rejection
if (req.user.role === 'client') {
  currentVersion.clientRemark = remarks;
}
```

### 5. Amendment Rules

```javascript
// Only rejected contracts can be amended
if (currentVersion.status !== 'rejected') {
  return res.status(400).json({
    message: 'Only rejected contracts can be amended'
  });
}

// Only original creator can amend
if (contract.createdBy.toString() !== req.user._id.toString()) {
  return res.status(403).json({
    message: 'Not authorized to amend this contract'
  });
}
```

### 6. Cancellation Rules

```javascript
// Can only cancel when pending_client or rejected
const allowedStatuses = ['pending_client', 'rejected'];
if (!allowedStatuses.includes(currentVersion.status)) {
  return res.status(400).json({
    message: `Contract can only be cancelled when status is: ${allowedStatuses.join(', ')}`
  });
}

// Only assigned client or super_admin can cancel
if (req.user.role === 'client') {
  if (contract.client.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: 'Not authorized to cancel this contract'
    });
  }
}
```

---

## 🔔 Notification Flow

### Notification Matrix

| Event | Triggered By | Notified |
|-------|--------------|----------|
| Contract Submitted | Legal | All Finance users |
| Finance Approved | Finance | Assigned Client, Legal |
| Finance Rejected | Finance | Legal (internal), Client (sanitized) |
| Client Approved | Client | Legal |
| Client Rejected | Client | Legal |
| Contract Cancelled | Client | Legal |

### Notification Implementation

```javascript
// Example: Notify Finance when contract submitted
await notifyFinanceOfSubmission(contract, currentVersion);

// Example: Dual notification on Finance rejection
await notifyLegalOfRejection(contract, currentVersion, internalRemarks);
await notifyClientOfFinanceRejection(contract, currentVersion, clientRemarks);
```

---

## 🚨 Conflict of Interest Prevention

### Scenario: Legal → Finance Promotion

```
Timeline:
1. Alice (Legal) creates Contract X
2. Alice gets promoted to Finance
3. Contract X is pending_finance review
4. Alice attempts to approve Contract X
5. System blocks: "Conflict of interest"
```

### Implementation

```javascript
// In approveContract controller
if (req.user.role === 'finance') {
  if (contract.createdBy.toString() === req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Conflict of interest: You cannot approve a contract you created'
    });
  }
}

// In rejectContract controller
if (req.user.role === 'finance') {
  if (contract.createdBy.toString() === req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Conflict of interest: You cannot reject a contract you created'
    });
  }
}
```

---

## 📊 Super Admin Override Behavior

Super Admin can act as any role, but system determines effective role:

```javascript
// Determine effective role based on contract status
const effectiveRole = req.user.role === 'super_admin' 
  ? (currentVersion.status === 'pending_finance' ? 'finance' : 
     currentVersion.status === 'pending_client' ? 'client' : null)
  : req.user.role;
```

| Contract Status | Super Admin Acts As |
|-----------------|---------------------|
| `pending_finance` | Finance |
| `pending_client` | Client |
| `draft` | N/A (only Legal can submit) |
| `rejected` | N/A (only Legal can amend) |

---

## 🎯 Complete Workflow Example

```
┌─────────────────────────────────────────────────────────────────────┐
│                   HAPPY PATH: CONTRACT APPROVAL                      │
└─────────────────────────────────────────────────────────────────────┘

Day 1: Legal Team
├── Alice (Legal) creates contract
│   └── Status: draft
│   └── Version: 1
│   └── Audit: "Contract created by alice@company.com"
│
├── Alice edits contract details
│   └── Audit: "Contract updated by alice@company.com"
│
└── Alice submits for review
    └── Status: pending_finance
    └── Audit: "Contract submitted by alice@company.com"
    └── Notification: Finance team notified

Day 2: Finance Team
└── Bob (Finance) reviews and approves
    └── Status: pending_client
    └── Audit: "Contract approved by bob@company.com (Finance)"
    └── Notification: Client notified

Day 3: Client
└── Carol (Client) reviews and approves
    └── Status: active
    └── Audit: "Contract approved by carol@client.com (Client)"
    └── Notification: Legal notified of activation

RESULT: Contract is now ACTIVE 🎉

─────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────┐
│                   REJECTION PATH: AMENDMENT NEEDED                   │
└─────────────────────────────────────────────────────────────────────┘

Day 1-2: Same as above until Finance review

Day 2: Finance Team
└── Bob (Finance) rejects contract
    └── Status: rejected
    └── Remarks Internal: "Budget exceeds Q4 allocation by 15%"
    └── Remarks Client: "Please revise the contract amount"
    └── Notification: Legal + Client notified (different messages)

Day 3: Legal Team
└── Alice (Legal) creates amendment
    └── Version 1: isCurrent = false
    └── Version 2: isCurrent = true, status = draft
    └── Audit: "Amendment created by alice@company.com"
    └── Alice submits again → Workflow restarts

RESULT: New version goes through approval workflow
```
