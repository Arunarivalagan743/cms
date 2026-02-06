const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Contract = require('./models/Contract');
const ContractVersion = require('./models/ContractVersion');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const WorkflowConfig = require('./models/WorkflowConfig');
const RolePermission = require('./models/RolePermission');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // ============================================
    // STEP 1: Clear ALL existing data
    // ============================================
    console.log('\n🗑️  Clearing all existing data...');
    await User.deleteMany({});
    await Contract.deleteMany({});
    await ContractVersion.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    // SystemLog is protected and cannot be deleted (audit trail)
    await WorkflowConfig.deleteMany({});
    await RolePermission.deleteMany({});
    console.log('✓ All collections cleared (except SystemLog - protected)');

    // ============================================
    // STEP 1.5: Create Role Permissions
    // ============================================
    console.log('\n🔐 Creating role permissions...');
    
    await RolePermission.insertMany([
      {
        role: 'super_admin',
        permissions: {
          canCreateContract: true,
          canEditDraft: true,
          canEditSubmitted: true,
          canDeleteContract: true,
          canSubmitContract: true,
          canApproveContract: true,
          canRejectContract: true,
          canAmendContract: true,
          canCancelContract: true,
          canSendRemarksToClient: true,
          canViewAllContracts: true,
          canViewOwnContracts: true,
          canManageUsers: true,
          canAssignRoles: true,
          canViewAuditLogs: true,
          canViewSystemLogs: true,
          canConfigureWorkflow: true,
          canConfigurePermissions: true,
          canViewDashboard: true,
          canViewReports: true,
        },
        description: 'Full system access',
      },
      {
        role: 'legal',
        permissions: {
          canCreateContract: true,
          canEditDraft: true,
          canEditSubmitted: false,
          canDeleteContract: false,
          canSubmitContract: true,
          canApproveContract: false,
          canRejectContract: false,
          canAmendContract: true,
          canCancelContract: true,
          canSendRemarksToClient: true,
          canViewAllContracts: false,
          canViewOwnContracts: true,
          canManageUsers: false,
          canAssignRoles: false,
          canViewAuditLogs: false,
          canViewSystemLogs: false,
          canConfigureWorkflow: false,
          canConfigurePermissions: false,
          canViewDashboard: true,
          canViewReports: false,
        },
        description: 'Create and manage contracts',
      },
      {
        role: 'finance',
        permissions: {
          canCreateContract: false,
          canEditDraft: false,
          canEditSubmitted: false,
          canDeleteContract: false,
          canSubmitContract: false,
          canApproveContract: true,
          canRejectContract: true,
          canAmendContract: false,
          canCancelContract: false,
          canSendRemarksToClient: true,
          canViewAllContracts: true,
          canViewOwnContracts: true,
          canManageUsers: false,
          canAssignRoles: false,
          canViewAuditLogs: false,
          canViewSystemLogs: false,
          canConfigureWorkflow: false,
          canConfigurePermissions: false,
          canViewDashboard: true,
          canViewReports: true,
        },
        description: 'Review and approve contracts',
      },
      {
        role: 'client',
        permissions: {
          canCreateContract: false,
          canEditDraft: false,
          canEditSubmitted: false,
          canDeleteContract: false,
          canSubmitContract: false,
          canApproveContract: true,
          canRejectContract: true,
          canAmendContract: false,
          canCancelContract: false,
          canSendRemarksToClient: false,
          canViewAllContracts: false,
          canViewOwnContracts: true,
          canManageUsers: false,
          canAssignRoles: false,
          canViewAuditLogs: false,
          canViewSystemLogs: false,
          canConfigureWorkflow: false,
          canConfigurePermissions: false,
          canViewDashboard: true,
          canViewReports: false,
        },
        description: 'View and approve assigned contracts',
      },
    ]);
    console.log('✓ Role permissions created for all roles');

    // ============================================
    // STEP 2: Create Professional Users
    // ============================================
    console.log('\n👥 Creating users...');
    
    const superAdmin = await User.create({
      name: 'Arun Arivalagan',
      email: 'arunarivalagan774@gmail.com',
      password: 'Admin@123',
      role: 'super_admin',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Super Admin: ${superAdmin.name} (${superAdmin.email})`);

    const financeUser = await User.create({
      name: 'Arun MSV',
      email: 'arunmsv777@gmail.com',
      password: 'Finance@123',
      role: 'finance',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Finance User: ${financeUser.name} (${financeUser.email})`);

    const client = await User.create({
      name: 'La Patisserie',
      email: 'lapatisseriex@gmail.com',
      password: 'Client@123',
      role: 'client',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Client: ${client.name} (${client.email})`);

    const legalUser = await User.create({
      name: 'Legal User',
      email: 'legal@signora.com',
      password: 'Legal@123',
      role: 'legal',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Legal User: ${legalUser.name} (${legalUser.email})`);

    // ============================================
    // STEP 3: Create Contracts with Various Statuses
    // ============================================
    console.log('\n📄 Creating contracts with various statuses...');

    // CONTRACT 1: ACTIVE - Fully approved contract
    const contract1 = await Contract.create({
      contractNumber: 'CON-000001',
      client: client._id,
      createdBy: legalUser._id
    });

    const version1_1 = await ContractVersion.create({
      contract: contract1._id,
      versionNumber: 1,
      contractName: 'Pastry Equipment Supply Agreement',
      clientEmail: client.email,
      effectiveDate: new Date('2026-03-01'),
      amount: 75000,
      status: 'active',
      isCurrent: true,
      submittedAt: new Date('2026-01-10T09:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-12T14:30:00'),
      approvedByClient: client._id,
      clientApprovedAt: new Date('2026-01-15T11:00:00'),
      createdBy: legalUser._id
    });
    contract1.currentVersionId = version1_1._id;
    await contract1.save();
    console.log(`✓ ${contract1.contractNumber}: ${version1_1.contractName} - ACTIVE ✅`);

    // CONTRACT 2: PENDING FINANCE - Awaiting finance approval
    const contract2 = await Contract.create({
      contractNumber: 'CON-000002',
      client: client._id,
      createdBy: legalUser._id
    });

    const version2_1 = await ContractVersion.create({
      contract: contract2._id,
      versionNumber: 1,
      contractName: 'Kitchen Renovation Services Agreement',
      clientEmail: client.email,
      effectiveDate: new Date('2026-04-01'),
      amount: 120000,
      status: 'pending_finance',
      isCurrent: true,
      submittedAt: new Date('2026-02-01T10:00:00'),
      createdBy: legalUser._id
    });
    contract2.currentVersionId = version2_1._id;
    await contract2.save();
    console.log(`✓ ${contract2.contractNumber}: ${version2_1.contractName} - PENDING FINANCE ⏳`);

    // CONTRACT 3: PENDING CLIENT - Finance approved, awaiting client
    const contract3 = await Contract.create({
      contractNumber: 'CON-000003',
      client: client._id,
      createdBy: legalUser._id
    });

    const version3_1 = await ContractVersion.create({
      contract: contract3._id,
      versionNumber: 1,
      contractName: 'Ingredient Supply Contract',
      clientEmail: client.email,
      effectiveDate: new Date('2026-03-15'),
      amount: 45000,
      status: 'pending_client',
      isCurrent: true,
      submittedAt: new Date('2026-01-25T09:30:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-28T16:00:00'),
      createdBy: legalUser._id
    });
    contract3.currentVersionId = version3_1._id;
    await contract3.save();
    console.log(`✓ ${contract3.contractNumber}: ${version3_1.contractName} - PENDING CLIENT ⏳`);

    // CONTRACT 4: REJECTED BY FINANCE - Version 1 rejected, Version 2 pending
    const contract4 = await Contract.create({
      contractNumber: 'CON-000004',
      client: client._id,
      createdBy: legalUser._id
    });

    // Version 1 - Rejected by Finance
    const version4_1 = await ContractVersion.create({
      contract: contract4._id,
      versionNumber: 1,
      contractName: 'Staff Training Program Agreement',
      clientEmail: client.email,
      effectiveDate: new Date('2026-05-01'),
      amount: 85000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2026-01-05T10:00:00'),
      rejectedBy: financeUser._id,
      rejectedAt: new Date('2026-01-08T15:30:00'),
      rejectionRemarks: 'Budget allocation exceeds quarterly limit. Please reduce training scope or phase the program.',
      createdBy: legalUser._id
    });

    // Version 2 - Amended and pending finance
    const version4_2 = await ContractVersion.create({
      contract: contract4._id,
      versionNumber: 2,
      contractName: 'Staff Training Program Agreement (Revised)',
      clientEmail: client.email,
      effectiveDate: new Date('2026-05-15'),
      amount: 55000,
      status: 'pending_finance',
      isCurrent: true,
      submittedAt: new Date('2026-01-15T11:00:00'),
      createdBy: legalUser._id
    });
    contract4.currentVersionId = version4_2._id;
    await contract4.save();
    console.log(`✓ ${contract4.contractNumber}: ${version4_2.contractName} - V1 FINANCE REJECTED, V2 PENDING 🔄`);

    // CONTRACT 5: REJECTED BY CLIENT - Version 1 rejected, Version 2 active
    const contract5 = await Contract.create({
      contractNumber: 'CON-000005',
      client: client._id,
      createdBy: legalUser._id
    });

    // Version 1 - Rejected by Client
    const version5_1 = await ContractVersion.create({
      contract: contract5._id,
      versionNumber: 1,
      contractName: 'Delivery Services Agreement',
      clientEmail: client.email,
      effectiveDate: new Date('2026-02-01'),
      amount: 35000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2025-12-15T09:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2025-12-18T14:00:00'),
      rejectedBy: client._id,
      rejectedAt: new Date('2025-12-22T10:30:00'),
      rejectionRemarks: 'Delivery schedule does not meet our peak hours requirement. Need flexible timing options.',
      createdBy: legalUser._id
    });

    // Version 2 - Approved and Active
    const version5_2 = await ContractVersion.create({
      contract: contract5._id,
      versionNumber: 2,
      contractName: 'Delivery Services Agreement (Amended)',
      clientEmail: client.email,
      effectiveDate: new Date('2026-02-15'),
      amount: 38000,
      status: 'active',
      isCurrent: true,
      submittedAt: new Date('2025-12-28T10:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2025-12-30T11:00:00'),
      approvedByClient: client._id,
      clientApprovedAt: new Date('2026-01-03T15:00:00'),
      createdBy: legalUser._id
    });
    contract5.currentVersionId = version5_2._id;
    await contract5.save();
    console.log(`✓ ${contract5.contractNumber}: ${version5_2.contractName} - V1 CLIENT REJECTED, V2 ACTIVE ✅`);

    // CONTRACT 6: CANCELLED - Client cancelled after approval
    const contract6 = await Contract.create({
      contractNumber: 'CON-000006',
      client: client._id,
      createdBy: legalUser._id
    });

    const version6_1 = await ContractVersion.create({
      contract: contract6._id,
      versionNumber: 1,
      contractName: 'Marketing Partnership Agreement',
      clientEmail: client.email,
      effectiveDate: new Date('2026-06-01'),
      amount: 28000,
      status: 'cancelled',
      isCurrent: true,
      submittedAt: new Date('2026-01-20T09:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-22T13:00:00'),
      approvedByClient: client._id,
      clientApprovedAt: new Date('2026-01-25T10:00:00'),
      cancelledBy: client._id,
      cancelledAt: new Date('2026-01-30T14:00:00'),
      cancellationRemarks: 'Business strategy changed. Postponing marketing initiatives to next quarter.',
      createdBy: legalUser._id
    });
    contract6.currentVersionId = version6_1._id;
    await contract6.save();
    console.log(`✓ ${contract6.contractNumber}: ${version6_1.contractName} - CANCELLED ❌`);

    // CONTRACT 7: DRAFT - Not yet submitted
    const contract7 = await Contract.create({
      contractNumber: 'CON-000007',
      client: client._id,
      createdBy: legalUser._id
    });

    const version7_1 = await ContractVersion.create({
      contract: contract7._id,
      versionNumber: 1,
      contractName: 'Catering Services Framework Agreement',
      clientEmail: client.email,
      effectiveDate: new Date('2026-07-01'),
      amount: 150000,
      status: 'draft',
      isCurrent: true,
      createdBy: legalUser._id
    });
    contract7.currentVersionId = version7_1._id;
    await contract7.save();
    console.log(`✓ ${contract7.contractNumber}: ${version7_1.contractName} - DRAFT 📝`);

    // CONTRACT 8: MULTIPLE REJECTIONS - Complex workflow
    const contract8 = await Contract.create({
      contractNumber: 'CON-000008',
      client: client._id,
      createdBy: legalUser._id
    });

    // Version 1 - Rejected by Finance
    const version8_1 = await ContractVersion.create({
      contract: contract8._id,
      versionNumber: 1,
      contractName: 'Annual Maintenance Contract',
      clientEmail: client.email,
      effectiveDate: new Date('2026-04-01'),
      amount: 95000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2025-12-01T09:00:00'),
      rejectedBy: financeUser._id,
      rejectedAt: new Date('2025-12-05T14:00:00'),
      rejectionRemarks: 'Payment terms need adjustment. Suggest quarterly payments instead of annual.',
      createdBy: legalUser._id
    });

    // Version 2 - Rejected by Client
    const version8_2 = await ContractVersion.create({
      contract: contract8._id,
      versionNumber: 2,
      contractName: 'Annual Maintenance Contract (Revised)',
      clientEmail: client.email,
      effectiveDate: new Date('2026-04-15'),
      amount: 90000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2025-12-10T10:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2025-12-12T15:00:00'),
      rejectedBy: client._id,
      rejectedAt: new Date('2025-12-18T11:00:00'),
      rejectionRemarks: 'Service coverage hours insufficient. Need 24/7 support during peak season.',
      createdBy: legalUser._id
    });

    // Version 3 - Pending Client approval
    const version8_3 = await ContractVersion.create({
      contract: contract8._id,
      versionNumber: 3,
      contractName: 'Annual Maintenance Contract (Final)',
      clientEmail: client.email,
      effectiveDate: new Date('2026-05-01'),
      amount: 105000,
      status: 'pending_client',
      isCurrent: true,
      submittedAt: new Date('2025-12-28T09:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-02T14:30:00'),
      createdBy: legalUser._id
    });
    contract8.currentVersionId = version8_3._id;
    await contract8.save();
    console.log(`✓ ${contract8.contractNumber}: ${version8_3.contractName} - V1 FIN REJ, V2 CLIENT REJ, V3 PENDING 🔄`);

    // CONTRACT 9: FINANCE REJECTION WITH INTERNAL/CLIENT REMARKS - Shows new Finance remarks workflow
    const contract9 = await Contract.create({
      contractNumber: 'CON-000009',
      client: client._id,
      createdBy: legalUser._id
    });

    // Version 1 - Finance rejected WITH client-facing remarks
    const version9_1 = await ContractVersion.create({
      contract: contract9._id,
      versionNumber: 1,
      contractName: 'Premium Catering Equipment Lease',
      clientEmail: client.email,
      effectiveDate: new Date('2026-06-01'),
      amount: 180000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2026-01-18T09:00:00'),
      rejectedBy: financeUser._id,
      rejectedAt: new Date('2026-01-20T14:00:00'),
      financeRemarkInternal: 'GST registration number invalid (TIN mismatch). Tax ID format incorrect. Amount exceeds approved vendor credit limit of 150000.',
      financeRemarkClient: 'Financial documentation requires revision. Please verify tax registration details and review payment terms.',
      rejectionRemarks: 'GST registration number invalid (TIN mismatch). Tax ID format incorrect.',
      createdBy: legalUser._id
    });

    // Version 2 - Finance rejected WITHOUT client-facing remarks (Legal can send later)
    const version9_2 = await ContractVersion.create({
      contract: contract9._id,
      versionNumber: 2,
      contractName: 'Premium Catering Equipment Lease (Revised)',
      clientEmail: client.email,
      effectiveDate: new Date('2026-06-15'),
      amount: 145000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2026-01-25T10:00:00'),
      rejectedBy: financeUser._id,
      rejectedAt: new Date('2026-01-28T15:30:00'),
      financeRemarkInternal: 'Payment schedule conflicts with Q2 budget allocation. Need to split into bi-annual payments.',
      financeRemarkClient: null, // Finance chose NOT to send to client - Legal can send later
      rejectionRemarks: 'Payment schedule conflicts with Q2 budget allocation.',
      createdBy: legalUser._id
    });

    // Version 3 - Currently pending finance
    const version9_3 = await ContractVersion.create({
      contract: contract9._id,
      versionNumber: 3,
      contractName: 'Premium Catering Equipment Lease (Final)',
      clientEmail: client.email,
      effectiveDate: new Date('2026-07-01'),
      amount: 142000,
      status: 'pending_finance',
      isCurrent: true,
      submittedAt: new Date('2026-02-01T09:00:00'),
      createdBy: legalUser._id
    });
    contract9.currentVersionId = version9_3._id;
    await contract9.save();
    console.log(`✓ ${contract9.contractNumber}: ${version9_3.contractName} - V1 FIN REJ (sent to client), V2 FIN REJ (no client msg), V3 PENDING 📝`);

    // CONTRACT 10: CLIENT REJECTION - Shows client remark workflow
    const contract10 = await Contract.create({
      contractNumber: 'CON-000010',
      client: client._id,
      createdBy: legalUser._id
    });

    // Version 1 - Client rejected
    const version10_1 = await ContractVersion.create({
      contract: contract10._id,
      versionNumber: 1,
      contractName: 'Exclusive Bakery Partnership Agreement',
      clientEmail: client.email,
      effectiveDate: new Date('2026-08-01'),
      amount: 250000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2026-01-10T09:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-12T14:00:00'),
      rejectedBy: client._id,
      rejectedAt: new Date('2026-01-15T16:00:00'),
      clientRemark: 'Exclusivity clause too restrictive. We need flexibility to source from alternative suppliers during peak seasons.',
      rejectionRemarks: 'Exclusivity clause too restrictive.',
      createdBy: legalUser._id
    });

    // Version 2 - Currently pending client
    const version10_2 = await ContractVersion.create({
      contract: contract10._id,
      versionNumber: 2,
      contractName: 'Exclusive Bakery Partnership Agreement (Amended)',
      clientEmail: client.email,
      effectiveDate: new Date('2026-08-15'),
      amount: 245000,
      status: 'pending_client',
      isCurrent: true,
      submittedAt: new Date('2026-01-20T10:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-22T11:00:00'),
      createdBy: legalUser._id
    });
    contract10.currentVersionId = version10_2._id;
    await contract10.save();
    console.log(`✓ ${contract10.contractNumber}: ${version10_2.contractName} - V1 CLIENT REJECTED, V2 PENDING CLIENT ⏳`);

    // ============================================
    // STEP 4: Create Audit Logs
    // ============================================
    console.log('\n📋 Creating audit trail...');

    // Audit logs for all contracts
    const auditLogs = [
      // Contract 1 - Full approval
      { contract: contract1._id, contractVersion: version1_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-10T08:00:00') },
      { contract: contract1._id, contractVersion: version1_1._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-10T09:00:00') },
      { contract: contract1._id, contractVersion: version1_1._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2026-01-12T14:30:00') },
      { contract: contract1._id, contractVersion: version1_1._id, action: 'approved', performedBy: client._id, roleAtTime: 'client', metadata: { approver: 'client' }, createdAt: new Date('2026-01-15T11:00:00') },
      
      // Contract 2 - Pending finance
      { contract: contract2._id, contractVersion: version2_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-02-01T09:00:00') },
      { contract: contract2._id, contractVersion: version2_1._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-02-01T10:00:00') },
      
      // Contract 3 - Pending client
      { contract: contract3._id, contractVersion: version3_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-25T09:00:00') },
      { contract: contract3._id, contractVersion: version3_1._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-25T09:30:00') },
      { contract: contract3._id, contractVersion: version3_1._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2026-01-28T16:00:00') },
      
      // Contract 4 - Finance rejected, amended
      { contract: contract4._id, contractVersion: version4_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-05T09:00:00') },
      { contract: contract4._id, contractVersion: version4_1._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-05T10:00:00') },
      { contract: contract4._id, contractVersion: version4_1._id, action: 'rejected', performedBy: financeUser._id, roleAtTime: 'finance', remarks: version4_1.rejectionRemarks, createdAt: new Date('2026-01-08T15:30:00') },
      { contract: contract4._id, contractVersion: version4_2._id, action: 'amended', performedBy: superAdmin._id, roleAtTime: 'super_admin', metadata: { previousVersion: 1, newVersion: 2 }, createdAt: new Date('2026-01-15T10:00:00') },
      { contract: contract4._id, contractVersion: version4_2._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-15T11:00:00') },
      
      // Contract 5 - Client rejected, amended, approved
      { contract: contract5._id, contractVersion: version5_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2025-12-15T08:00:00') },
      { contract: contract5._id, contractVersion: version5_1._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2025-12-15T09:00:00') },
      { contract: contract5._id, contractVersion: version5_1._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2025-12-18T14:00:00') },
      { contract: contract5._id, contractVersion: version5_1._id, action: 'rejected', performedBy: client._id, roleAtTime: 'client', remarks: version5_1.rejectionRemarks, createdAt: new Date('2025-12-22T10:30:00') },
      { contract: contract5._id, contractVersion: version5_2._id, action: 'amended', performedBy: superAdmin._id, roleAtTime: 'super_admin', metadata: { previousVersion: 1, newVersion: 2 }, createdAt: new Date('2025-12-28T09:00:00') },
      { contract: contract5._id, contractVersion: version5_2._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2025-12-28T10:00:00') },
      { contract: contract5._id, contractVersion: version5_2._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2025-12-30T11:00:00') },
      { contract: contract5._id, contractVersion: version5_2._id, action: 'approved', performedBy: client._id, roleAtTime: 'client', metadata: { approver: 'client' }, createdAt: new Date('2026-01-03T15:00:00') },
      
      // Contract 6 - Cancelled
      { contract: contract6._id, contractVersion: version6_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-20T08:00:00') },
      { contract: contract6._id, contractVersion: version6_1._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-01-20T09:00:00') },
      { contract: contract6._id, contractVersion: version6_1._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2026-01-22T13:00:00') },
      { contract: contract6._id, contractVersion: version6_1._id, action: 'approved', performedBy: client._id, roleAtTime: 'client', metadata: { approver: 'client' }, createdAt: new Date('2026-01-25T10:00:00') },
      { contract: contract6._id, contractVersion: version6_1._id, action: 'cancelled', performedBy: client._id, roleAtTime: 'client', remarks: version6_1.cancellationRemarks, createdAt: new Date('2026-01-30T14:00:00') },
      
      // Contract 7 - Draft
      { contract: contract7._id, contractVersion: version7_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2026-02-03T10:00:00') },
      
      // Contract 8 - Multiple rejections
      { contract: contract8._id, contractVersion: version8_1._id, action: 'created', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2025-12-01T08:00:00') },
      { contract: contract8._id, contractVersion: version8_1._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2025-12-01T09:00:00') },
      { contract: contract8._id, contractVersion: version8_1._id, action: 'rejected', performedBy: financeUser._id, roleAtTime: 'finance', remarks: version8_1.rejectionRemarks, createdAt: new Date('2025-12-05T14:00:00') },
      { contract: contract8._id, contractVersion: version8_2._id, action: 'amended', performedBy: superAdmin._id, roleAtTime: 'super_admin', metadata: { previousVersion: 1, newVersion: 2 }, createdAt: new Date('2025-12-10T09:00:00') },
      { contract: contract8._id, contractVersion: version8_2._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2025-12-10T10:00:00') },
      { contract: contract8._id, contractVersion: version8_2._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2025-12-12T15:00:00') },
      { contract: contract8._id, contractVersion: version8_2._id, action: 'rejected', performedBy: client._id, roleAtTime: 'client', remarks: version8_2.rejectionRemarks, createdAt: new Date('2025-12-18T11:00:00') },
      { contract: contract8._id, contractVersion: version8_3._id, action: 'amended', performedBy: superAdmin._id, roleAtTime: 'super_admin', metadata: { previousVersion: 2, newVersion: 3 }, createdAt: new Date('2025-12-28T08:00:00') },
      { contract: contract8._id, contractVersion: version8_3._id, action: 'submitted', performedBy: superAdmin._id, roleAtTime: 'super_admin', createdAt: new Date('2025-12-28T09:00:00') },
      { contract: contract8._id, contractVersion: version8_3._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2026-01-02T14:30:00') },
      
      // Contract 9 - Finance rejections with/without client remarks
      { contract: contract9._id, contractVersion: version9_1._id, action: 'created', performedBy: legalUser._id, roleAtTime: 'legal', createdAt: new Date('2026-01-18T08:00:00') },
      { contract: contract9._id, contractVersion: version9_1._id, action: 'submitted', performedBy: legalUser._id, roleAtTime: 'legal', createdAt: new Date('2026-01-18T09:00:00') },
      { contract: contract9._id, contractVersion: version9_1._id, action: 'rejected', performedBy: financeUser._id, roleAtTime: 'finance', remarks: version9_1.financeRemarkInternal, metadata: { sentToClient: true, clientRemarks: version9_1.financeRemarkClient }, createdAt: new Date('2026-01-20T14:00:00') },
      { contract: contract9._id, contractVersion: version9_2._id, action: 'amended', performedBy: legalUser._id, roleAtTime: 'legal', metadata: { previousVersion: 1, newVersion: 2 }, createdAt: new Date('2026-01-25T09:00:00') },
      { contract: contract9._id, contractVersion: version9_2._id, action: 'submitted', performedBy: legalUser._id, roleAtTime: 'legal', createdAt: new Date('2026-01-25T10:00:00') },
      { contract: contract9._id, contractVersion: version9_2._id, action: 'rejected', performedBy: financeUser._id, roleAtTime: 'finance', remarks: version9_2.financeRemarkInternal, metadata: { sentToClient: false }, createdAt: new Date('2026-01-28T15:30:00') },
      { contract: contract9._id, contractVersion: version9_3._id, action: 'amended', performedBy: legalUser._id, roleAtTime: 'legal', metadata: { previousVersion: 2, newVersion: 3 }, createdAt: new Date('2026-02-01T08:00:00') },
      { contract: contract9._id, contractVersion: version9_3._id, action: 'submitted', performedBy: legalUser._id, roleAtTime: 'legal', createdAt: new Date('2026-02-01T09:00:00') },
      
      // Contract 10 - Client rejection workflow
      { contract: contract10._id, contractVersion: version10_1._id, action: 'created', performedBy: legalUser._id, roleAtTime: 'legal', createdAt: new Date('2026-01-10T08:00:00') },
      { contract: contract10._id, contractVersion: version10_1._id, action: 'submitted', performedBy: legalUser._id, roleAtTime: 'legal', createdAt: new Date('2026-01-10T09:00:00') },
      { contract: contract10._id, contractVersion: version10_1._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2026-01-12T14:00:00') },
      { contract: contract10._id, contractVersion: version10_1._id, action: 'rejected', performedBy: client._id, roleAtTime: 'client', remarks: version10_1.clientRemark, createdAt: new Date('2026-01-15T16:00:00') },
      { contract: contract10._id, contractVersion: version10_2._id, action: 'amended', performedBy: legalUser._id, roleAtTime: 'legal', metadata: { previousVersion: 1, newVersion: 2 }, createdAt: new Date('2026-01-20T09:00:00') },
      { contract: contract10._id, contractVersion: version10_2._id, action: 'submitted', performedBy: legalUser._id, roleAtTime: 'legal', createdAt: new Date('2026-01-20T10:00:00') },
      { contract: contract10._id, contractVersion: version10_2._id, action: 'approved', performedBy: financeUser._id, roleAtTime: 'finance', metadata: { approver: 'finance' }, createdAt: new Date('2026-01-22T11:00:00') },
    ];

    await AuditLog.insertMany(auditLogs);
    console.log('✓ Audit logs created for all contracts');

    // ============================================
    // STEP 5: Create Notifications
    // ============================================
    console.log('\n🔔 Creating notifications...');

    await Notification.insertMany([
      // Pending finance notification
      { user: financeUser._id, type: 'submission', title: 'New Contract for Review', message: `Contract "${version2_1.contractName}" requires your approval.`, contract: contract2._id, isRead: false },
      { user: financeUser._id, type: 'submission', title: 'Amended Contract for Review', message: `Contract "${version4_2.contractName}" has been amended and requires your approval.`, contract: contract4._id, isRead: false },
      { user: financeUser._id, type: 'submission', title: 'Amended Contract for Review', message: `Contract "${version9_3.contractName}" (Version 3) requires your approval.`, contract: contract9._id, isRead: false },
      
      // Pending client notification
      { user: client._id, type: 'approval', title: 'Contract Pending Your Approval', message: `Contract "${version3_1.contractName}" is awaiting your approval.`, contract: contract3._id, isRead: false },
      { user: client._id, type: 'approval', title: 'Contract Pending Your Approval', message: `Contract "${version8_3.contractName}" (Version 3) is awaiting your approval.`, contract: contract8._id, isRead: false },
      { user: client._id, type: 'approval', title: 'Contract Pending Your Approval', message: `Contract "${version10_2.contractName}" (Version 2) is awaiting your approval.`, contract: contract10._id, isRead: false },
      
      // Approved notifications
      { user: superAdmin._id, type: 'approval', title: 'Contract Fully Approved', message: `Contract "${version1_1.contractName}" is now active.`, contract: contract1._id, isRead: true, createdAt: new Date('2026-01-15T11:05:00') },
      { user: superAdmin._id, type: 'approval', title: 'Contract Fully Approved', message: `Contract "${version5_2.contractName}" is now active.`, contract: contract5._id, isRead: true, createdAt: new Date('2026-01-03T15:05:00') },
      
      // Rejection notifications - Finance
      { user: legalUser._id, type: 'rejection', title: 'Contract Rejected by Finance', message: `Contract "${version4_1.contractName}" was rejected. Reason: ${version4_1.rejectionRemarks}`, contract: contract4._id, isRead: true, createdAt: new Date('2026-01-08T15:35:00') },
      { user: legalUser._id, type: 'rejection', title: 'Contract Rejected by Finance', message: `Contract "${version9_1.contractName}" was rejected. Internal: ${version9_1.financeRemarkInternal}`, contract: contract9._id, isRead: true, createdAt: new Date('2026-01-20T14:05:00') },
      { user: client._id, type: 'rejection', title: 'Contract Returned for Revision', message: `Contract "${version9_1.contractName}" requires revision: ${version9_1.financeRemarkClient}`, contract: contract9._id, isRead: true, createdAt: new Date('2026-01-20T14:05:00') },
      { user: legalUser._id, type: 'rejection', title: 'Contract Rejected by Finance', message: `Contract "${version9_2.contractName}" was rejected. Internal: ${version9_2.financeRemarkInternal}`, contract: contract9._id, isRead: false, createdAt: new Date('2026-01-28T15:35:00') },
      
      // Rejection notifications - Client
      { user: legalUser._id, type: 'rejection', title: 'Contract Rejected by Client', message: `Contract "${version5_1.contractName}" was rejected. Reason: ${version5_1.rejectionRemarks}`, contract: contract5._id, isRead: true, createdAt: new Date('2025-12-22T10:35:00') },
      { user: legalUser._id, type: 'rejection', title: 'Contract Rejected by Client', message: `Contract "${version10_1.contractName}" was rejected. Client remark: ${version10_1.clientRemark}`, contract: contract10._id, isRead: false, createdAt: new Date('2026-01-15T16:05:00') },
      
      // Cancellation notification
      { user: superAdmin._id, type: 'cancellation', title: 'Contract Cancelled', message: `Contract "${version6_1.contractName}" has been cancelled by the client.`, contract: contract6._id, isRead: false },
      { user: legalUser._id, type: 'cancellation', title: 'Contract Cancelled', message: `Contract "${version6_1.contractName}" has been cancelled.`, contract: contract6._id, isRead: false },
    ]);
    console.log('✓ Notifications created');

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));

    console.log('\n📊 SUMMARY:');
    console.log(`   Users: 4 (1 Super Admin, 1 Finance, 1 Legal, 1 Client)`);
    console.log(`   Contracts: 10 (with various statuses)`);
    console.log(`   Contract Versions: 16 total`);
    console.log(`   Audit Logs: ${auditLogs.length} entries`);
    console.log(`   Notifications: 18`);

    console.log('\n' + '='.repeat(60));
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('='.repeat(60));
    
    console.log('\n1️⃣  SUPER ADMIN:');
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: Admin@123`);
    
    console.log('\n2️⃣  FINANCE USER:');
    console.log(`   Name: ${financeUser.name}`);
    console.log(`   Email: ${financeUser.email}`);
    console.log(`   Password: Finance@123`);
    
    console.log('\n3️⃣  LEGAL USER:');
    console.log(`   Name: ${legalUser.name}`);
    console.log(`   Email: ${legalUser.email}`);
    console.log(`   Password: Legal@123`);
    
    console.log('\n4️⃣  CLIENT:');
    console.log(`   Name: ${client.name}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Password: Client@123`);

    console.log('\n' + '='.repeat(60));
    console.log('📋 CONTRACT STATUS OVERVIEW:');
    console.log('='.repeat(60));
    console.log('\n✅ CON-000001: ACTIVE - Pastry Equipment (Fully Approved)');
    console.log('⏳ CON-000002: PENDING FINANCE - Kitchen Renovation');
    console.log('⏳ CON-000003: PENDING CLIENT - Ingredient Supply');
    console.log('🔄 CON-000004: V1 REJECTED by Finance → V2 PENDING FINANCE');
    console.log('✅ CON-000005: V1 REJECTED by Client → V2 ACTIVE');
    console.log('❌ CON-000006: CANCELLED by Client');
    console.log('📝 CON-000007: DRAFT - Catering Services');
    console.log('🔄 CON-000008: V1 FIN REJ → V2 CLIENT REJ → V3 PENDING CLIENT');
    console.log('📝 CON-000009: V1 FIN REJ (sent to client) → V2 FIN REJ (no client msg) → V3 PENDING FINANCE');
    console.log('⏳ CON-000010: V1 CLIENT REJ → V2 PENDING CLIENT');

    console.log('\n' + '='.repeat(60));
    console.log('✨ Ready for production use!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
