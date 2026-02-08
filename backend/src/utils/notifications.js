const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Create notification for specific user
 */
const createNotification = async ({ userId, type, title, message, contractId }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      contract: contractId
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Notify all users with a specific role
 */
const notifyUsersByRole = async ({ role, type, title, message, contractId }) => {
  try {
    const users = await User.find({ role, isActive: true });
    const notifications = await Promise.all(
      users.map(user => createNotification({
        userId: user._id,
        type,
        title,
        message,
        contractId
      }))
    );
    return notifications.filter(n => n !== null);
  } catch (error) {
    console.error('Error notifying users by role:', error);
    return [];
  }
};

/**
 * Notify Finance Reviewers about new submission
 */
const notifyFinanceOfSubmission = async (contract, contractVersion) => {
  // Notify both finance and senior_finance users
  const financeNotifications = await notifyUsersByRole({
    role: 'finance',
    type: 'submission',
    title: 'New Contract for Review',
    message: `Contract "${contractVersion.contractName}" has been submitted for finance review.`,
    contractId: contract._id
  });
  const seniorFinanceNotifications = await notifyUsersByRole({
    role: 'senior_finance',
    type: 'submission',
    title: 'New Contract for Review',
    message: `Contract "${contractVersion.contractName}" has been submitted for finance review.`,
    contractId: contract._id
  });
  return [...financeNotifications, ...seniorFinanceNotifications];
};

/**
 * Notify Client about pending approval
 */
const notifyClientOfPendingApproval = async (contract, contractVersion) => {
  return createNotification({
    userId: contract.client,
    type: 'approval',
    title: 'Contract Pending Your Approval',
    message: `Contract "${contractVersion.contractName}" is awaiting your approval.`,
    contractId: contract._id
  });
};

/**
 * Notify Legal User of rejection
 */
const notifyLegalOfRejection = async (contract, contractVersion, remarks) => {
  return createNotification({
    userId: contract.createdBy,
    type: 'rejection',
    title: 'Contract Rejected',
    message: `Contract "${contractVersion.contractName}" has been rejected. Remarks: ${remarks}`,
    contractId: contract._id
  });
};

/**
 * Notify Legal User of final approval
 */
const notifyLegalOfApproval = async (contract, contractVersion) => {
  return createNotification({
    userId: contract.createdBy,
    type: 'approval',
    title: 'Contract Approved',
    message: `Contract "${contractVersion.contractName}" has been fully approved and is now active.`,
    contractId: contract._id
  });
};

/**
 * Notify Client when Finance approves their contract (moving to pending_client)
 */
const notifyClientOfFinanceApproval = async (contract, contractVersion) => {
  return createNotification({
    userId: contract.client,
    type: 'approval',
    title: 'Contract Approved by Finance',
    message: `Contract "${contractVersion.contractName}" has been approved by Finance and is now pending your approval.`,
    contractId: contract._id
  });
};

/**
 * Notify Client when Finance rejects the contract
 */
const notifyClientOfFinanceRejection = async (contract, contractVersion, remarks) => {
  return createNotification({
    userId: contract.client,
    type: 'rejection',
    title: 'Contract Rejected by Finance',
    message: `Contract "${contractVersion.contractName}" has been rejected by Finance. ${remarks ? 'Remarks: ' + remarks : ''}`,
    contractId: contract._id
  });
};

/**
 * Notify Legal when Client approves the contract
 */
const notifyLegalOfClientApproval = async (contract, contractVersion) => {
  return createNotification({
    userId: contract.createdBy,
    type: 'approval',
    title: 'Contract Approved by Client',
    message: `Contract "${contractVersion.contractName}" has been approved by the client and is now active.`,
    contractId: contract._id
  });
};

/**
 * Notify Legal when Client rejects the contract
 */
const notifyLegalOfClientRejection = async (contract, contractVersion, remarks) => {
  return createNotification({
    userId: contract.createdBy,
    type: 'rejection',
    title: 'Contract Rejected by Client',
    message: `Contract "${contractVersion.contractName}" has been rejected by the client. ${remarks ? 'Remarks: ' + remarks : ''}`,
    contractId: contract._id
  });
};

/**
 * Notify Legal User that their contract has been submitted successfully (confirmation)
 */
const notifyLegalOfSubmission = async (contract, contractVersion) => {
  return createNotification({
    userId: contract.createdBy,
    type: 'submission',
    title: 'Contract Submitted',
    message: `Your contract "${contractVersion.contractName}" has been submitted for review.`,
    contractId: contract._id
  });
};

/**
 * Notify Legal User that Finance has approved (contract moves to pending_client)
 */
const notifyLegalOfFinanceApproval = async (contract, contractVersion) => {
  return createNotification({
    userId: contract.createdBy,
    type: 'approval',
    title: 'Contract Approved by Finance',
    message: `Contract "${contractVersion.contractName}" has been approved by Finance and is now pending client approval.`,
    contractId: contract._id
  });
};

/**
 * Notify Client that the contract is now active (confirmation after their approval)
 */
const notifyClientOfActivation = async (contract, contractVersion) => {
  return createNotification({
    userId: contract.client,
    type: 'approval',
    title: 'Contract Activated',
    message: `Contract "${contractVersion.contractName}" is now active following your approval.`,
    contractId: contract._id
  });
};

/**
 * Notify Super Admin about workflow configuration changes
 */
const notifyAdminOfWorkflowChange = async (workflowName) => {
  return notifyUsersByRole({
    role: 'super_admin',
    type: 'submission',
    title: 'Workflow Configuration Updated',
    message: `Workflow "${workflowName}" has been created or updated.`,
    contractId: null
  });
};

/**
 * Notify Super Admin about role permission changes
 */
const notifyAdminOfPermissionChange = async (role) => {
  return notifyUsersByRole({
    role: 'super_admin',
    type: 'submission',
    title: 'Role Permissions Updated',
    message: `Permissions for role "${role}" have been updated.`,
    contractId: null
  });
};

module.exports = {
  createNotification,
  notifyUsersByRole,
  notifyFinanceOfSubmission,
  notifyClientOfPendingApproval,
  notifyLegalOfRejection,
  notifyLegalOfApproval,
  notifyClientOfFinanceApproval,
  notifyClientOfFinanceRejection,
  notifyLegalOfClientApproval,
  notifyLegalOfClientRejection,
  notifyLegalOfSubmission,
  notifyLegalOfFinanceApproval,
  notifyClientOfActivation,
  notifyAdminOfWorkflowChange,
  notifyAdminOfPermissionChange
};
