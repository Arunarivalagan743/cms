const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Contract = require('./models/Contract');
const ContractVersion = require('./models/ContractVersion');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');

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
    console.log('✓ All collections cleared');

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

    const legalUser = await User.create({
      name: 'Sarah Johnson',
      email: 'sarah.johnson@legalteam.com',
      password: 'Legal@123',
      role: 'legal',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Legal User: ${legalUser.name} (${legalUser.email})`);

    const financeUser = await User.create({
      name: 'Arun MSV',
      email: 'arunmsv777@gmail.com',
      password: 'Finance@123',
      role: 'finance',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Finance User: ${financeUser.name} (${financeUser.email})`);

    const client1 = await User.create({
      name: 'A Patisserie',
      email: 'apatisseriex@gmail.com',
      password: 'Client@123',
      role: 'client',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Client: ${client1.name} (${client1.email})`);

    const client2 = await User.create({
      name: 'TechCorp Solutions Ltd',
      email: 'procurement@techcorp.com',
      password: 'Client@123',
      role: 'client',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Client: ${client2.name} (${client2.email})`);

    const client3 = await User.create({
      name: 'Global Logistics Inc',
      email: 'contracts@globallogistics.com',
      password: 'Client@123',
      role: 'client',
      isActive: true,
      isPasswordSet: true
    });
    console.log(`✓ Client: ${client3.name} (${client3.email})`);

    // ============================================
    // STEP 3: Create Professional Contracts
    // ============================================
    console.log('\n📄 Creating contracts with proper versioning...');

    // Contract 1: Active contract with full approval workflow
    const contract1 = await Contract.create({
      contractNumber: 'CON-000001',
      client: client1._id,
      createdBy: legalUser._id
    });

    const version1_1 = await ContractVersion.create({
      contract: contract1._id,
      versionNumber: 1,
      contractName: 'Bakery Equipment Supply Agreement',
      clientEmail: client1.email,
      effectiveDate: new Date('2026-03-01'),
      amount: 45000,
      status: 'active',
      isCurrent: true,
      submittedAt: new Date('2026-01-15T09:30:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-16T14:20:00'),
      approvedByClient: client1._id,
      clientApprovedAt: new Date('2026-01-20T11:45:00'),
      createdBy: legalUser._id
    });
    contract1.currentVersionId = version1_1._id;
    await contract1.save();
    console.log(`✓ Contract ${contract1.contractNumber}: ${version1_1.contractName} - ACTIVE`);

    // Contract 2: Active contract (amended once)
    const contract2 = await Contract.create({
      contractNumber: 'CON-000002',
      client: client2._id,
      createdBy: legalUser._id
    });

    // Version 1 (rejected)
    const version2_1 = await ContractVersion.create({
      contract: contract2._id,
      versionNumber: 1,
      contractName: 'IT Services and Software Licensing Agreement',
      clientEmail: client2.email,
      effectiveDate: new Date('2026-02-15'),
      amount: 125000,
      status: 'rejected',
      isCurrent: false,
      submittedAt: new Date('2026-01-18T10:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-19T15:30:00'),
      rejectedBy: client2._id,
      rejectedAt: new Date('2026-01-22T09:15:00'),
      rejectionRemarks: 'Need to reduce the licensing fees and extend payment terms to 60 days',
      createdBy: legalUser._id
    });

    // Version 2 (active - amended)
    const version2_2 = await ContractVersion.create({
      contract: contract2._id,
      versionNumber: 2,
      contractName: 'IT Services and Software Licensing Agreement (Amended)',
      clientEmail: client2.email,
      effectiveDate: new Date('2026-02-15'),
      amount: 98000,
      status: 'active',
      isCurrent: true,
      submittedAt: new Date('2026-01-25T11:00:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-01-26T10:45:00'),
      approvedByClient: client2._id,
      clientApprovedAt: new Date('2026-01-28T16:20:00'),
      createdBy: legalUser._id
    });
    contract2.currentVersionId = version2_2._id;
    await contract2.save();
    console.log(`✓ Contract ${contract2.contractNumber}: ${version2_2.contractName} - ACTIVE (v2)`);

    // Contract 3: Pending client approval
    const contract3 = await Contract.create({
      contractNumber: 'CON-000003',
      client: client3._id,
      createdBy: legalUser._id
    });

    const version3_1 = await ContractVersion.create({
      contract: contract3._id,
      versionNumber: 1,
      contractName: 'Logistics and Warehousing Services Agreement',
      clientEmail: client3.email,
      effectiveDate: new Date('2026-04-01'),
      amount: 250000,
      status: 'pending_client',
      isCurrent: true,
      submittedAt: new Date('2026-02-01T08:30:00'),
      approvedByFinance: financeUser._id,
      financeApprovedAt: new Date('2026-02-03T13:15:00'),
      createdBy: legalUser._id
    });
    contract3.currentVersionId = version3_1._id;
    await contract3.save();
    console.log(`✓ Contract ${contract3.contractNumber}: ${version3_1.contractName} - PENDING CLIENT`);

    // Contract 4: Pending finance approval
    const contract4 = await Contract.create({
      contractNumber: 'CON-000004',
      client: client1._id,
      createdBy: legalUser._id
    });

    const version4_1 = await ContractVersion.create({
      contract: contract4._id,
      versionNumber: 1,
      contractName: 'Commercial Kitchen Maintenance Service Agreement',
      clientEmail: client1.email,
      effectiveDate: new Date('2026-05-01'),
      amount: 18000,
      status: 'pending_finance',
      isCurrent: true,
      submittedAt: new Date('2026-02-04T09:00:00'),
      createdBy: legalUser._id
    });
    contract4.currentVersionId = version4_1._id;
    await contract4.save();
    console.log(`✓ Contract ${contract4.contractNumber}: ${version4_1.contractName} - PENDING FINANCE`);

    // Contract 5: Draft
    const contract5 = await Contract.create({
      contractNumber: 'CON-000005',
      client: client2._id,
      createdBy: legalUser._id
    });

    const version5_1 = await ContractVersion.create({
      contract: contract5._id,
      versionNumber: 1,
      contractName: 'Cloud Infrastructure Services Agreement',
      clientEmail: client2.email,
      effectiveDate: new Date('2026-06-01'),
      amount: 180000,
      status: 'draft',
      isCurrent: true,
      createdBy: legalUser._id
    });
    contract5.currentVersionId = version5_1._id;
    await contract5.save();
    console.log(`✓ Contract ${contract5.contractNumber}: ${version5_1.contractName} - DRAFT`);

    // Contract 6: Rejected (needs amendment)
    const contract6 = await Contract.create({
      contractNumber: 'CON-000006',
      client: client3._id,
      createdBy: legalUser._id
    });

    const version6_1 = await ContractVersion.create({
      contract: contract6._id,
      versionNumber: 1,
      contractName: 'International Shipping Services Agreement',
      clientEmail: client3.email,
      effectiveDate: new Date('2026-03-15'),
      amount: 320000,
      status: 'rejected',
      isCurrent: true,
      submittedAt: new Date('2026-01-28T10:00:00'),
      rejectedBy: financeUser._id,
      rejectedAt: new Date('2026-01-30T14:30:00'),
      rejectionRemarks: 'The insurance coverage terms need to be clarified. Also, please add force majeure clauses for international shipping delays.',
      createdBy: legalUser._id
    });
    contract6.currentVersionId = version6_1._id;
    await contract6.save();
    console.log(`✓ Contract ${contract6.contractNumber}: ${version6_1.contractName} - REJECTED`);

    // ============================================
    // STEP 4: Create Audit Logs
    // ============================================
    console.log('\n📋 Creating audit trail...');

    // Audit logs for Contract 1
    await AuditLog.create([
      {
        contract: contract1._id,
        contractVersion: version1_1._id,
        action: 'created',
        performedBy: legalUser._id,
        roleAtTime: 'legal',
        metadata: { contractName: version1_1.contractName, amount: version1_1.amount }
      },
      {
        contract: contract1._id,
        contractVersion: version1_1._id,
        action: 'submitted',
        performedBy: legalUser._id,
        roleAtTime: 'legal',
        createdAt: new Date('2026-01-15T09:30:00')
      },
      {
        contract: contract1._id,
        contractVersion: version1_1._id,
        action: 'approved',
        performedBy: financeUser._id,
        roleAtTime: 'finance',
        metadata: { approver: 'finance' },
        createdAt: new Date('2026-01-16T14:20:00')
      },
      {
        contract: contract1._id,
        contractVersion: version1_1._id,
        action: 'approved',
        performedBy: client1._id,
        roleAtTime: 'client',
        metadata: { approver: 'client' },
        createdAt: new Date('2026-01-20T11:45:00')
      }
    ]);

    // Audit logs for Contract 2 (with amendment)
    await AuditLog.create([
      {
        contract: contract2._id,
        contractVersion: version2_1._id,
        action: 'created',
        performedBy: legalUser._id,
        roleAtTime: 'legal',
        metadata: { contractName: version2_1.contractName, amount: version2_1.amount }
      },
      {
        contract: contract2._id,
        contractVersion: version2_1._id,
        action: 'submitted',
        performedBy: legalUser._id,
        roleAtTime: 'legal',
        createdAt: new Date('2026-01-18T10:00:00')
      },
      {
        contract: contract2._id,
        contractVersion: version2_1._id,
        action: 'approved',
        performedBy: financeUser._id,
        roleAtTime: 'finance',
        metadata: { approver: 'finance' },
        createdAt: new Date('2026-01-19T15:30:00')
      },
      {
        contract: contract2._id,
        contractVersion: version2_1._id,
        action: 'rejected',
        performedBy: client2._id,
        roleAtTime: 'client',
        remarks: version2_1.rejectionRemarks,
        createdAt: new Date('2026-01-22T09:15:00')
      },
      {
        contract: contract2._id,
        contractVersion: version2_2._id,
        action: 'amended',
        performedBy: legalUser._id,
        roleAtTime: 'legal',
        metadata: { previousVersion: 1, newVersion: 2, contractName: version2_2.contractName, amount: version2_2.amount },
        createdAt: new Date('2026-01-25T11:00:00')
      },
      {
        contract: contract2._id,
        contractVersion: version2_2._id,
        action: 'submitted',
        performedBy: legalUser._id,
        roleAtTime: 'legal',
        createdAt: new Date('2026-01-25T11:00:00')
      },
      {
        contract: contract2._id,
        contractVersion: version2_2._id,
        action: 'approved',
        performedBy: financeUser._id,
        roleAtTime: 'finance',
        metadata: { approver: 'finance' },
        createdAt: new Date('2026-01-26T10:45:00')
      },
      {
        contract: contract2._id,
        contractVersion: version2_2._id,
        action: 'approved',
        performedBy: client2._id,
        roleAtTime: 'client',
        metadata: { approver: 'client' },
        createdAt: new Date('2026-01-28T16:20:00')
      }
    ]);

    console.log('✓ Audit logs created for all contracts');

    // ============================================
    // STEP 5: Create Notifications
    // ============================================
    console.log('\n🔔 Creating notifications...');

    // Notification for client3 - pending approval
    await Notification.create({
      user: client3._id,
      type: 'approval',
      title: 'Contract Pending Your Approval',
      message: `Contract "${version3_1.contractName}" is awaiting your approval.`,
      contract: contract3._id,
      isRead: false
    });

    // Notification for finance - pending review
    await Notification.create({
      user: financeUser._id,
      type: 'submission',
      title: 'New Contract for Review',
      message: `Contract "${version4_1.contractName}" has been submitted for finance review.`,
      contract: contract4._id,
      isRead: false
    });

    // Notification for legal - contract rejected
    await Notification.create({
      user: legalUser._id,
      type: 'rejection',
      title: 'Contract Rejected',
      message: `Contract "${version6_1.contractName}" has been rejected. Remarks: ${version6_1.rejectionRemarks}`,
      contract: contract6._id,
      isRead: false
    });

    // Read notification for legal - contract approved
    await Notification.create({
      user: legalUser._id,
      type: 'approval',
      title: 'Contract Approved',
      message: `Contract "${version1_1.contractName}" has been fully approved and is now active.`,
      contract: contract1._id,
      isRead: true,
      createdAt: new Date('2026-01-20T11:50:00')
    });

    console.log('✓ Notifications created');

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));

    console.log('\n📊 SUMMARY:');
    console.log(`   Users: 6 (1 Super Admin, 1 Legal, 1 Finance, 3 Clients)`);
    console.log(`   Contracts: 6 (with various statuses)`);
    console.log(`   Contract Versions: 7 (including 1 amendment)`);
    console.log(`   Audit Logs: Multiple entries tracking all actions`);
    console.log(`   Notifications: 4 (2 unread, 2 read)`);

    console.log('\n' + '='.repeat(60));
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('='.repeat(60));
    
    console.log('\n1️⃣  SUPER ADMIN:');
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: Admin@123`);
    
    console.log('\n2️⃣  LEGAL USER:');
    console.log(`   Name: ${legalUser.name}`);
    console.log(`   Email: ${legalUser.email}`);
    console.log(`   Password: Legal@123`);
    
    console.log('\n3️⃣  FINANCE USER:');
    console.log(`   Name: ${financeUser.name}`);
    console.log(`   Email: ${financeUser.email}`);
    console.log(`   Password: Finance@123`);
    
    console.log('\n4️⃣  CLIENT 1:');
    console.log(`   Name: ${client1.name}`);
    console.log(`   Email: ${client1.email}`);
    console.log(`   Password: Client@123`);
    
    console.log('\n5️⃣  CLIENT 2:');
    console.log(`   Name: ${client2.name}`);
    console.log(`   Email: ${client2.email}`);
    console.log(`   Password: Client@123`);
    
    console.log('\n6️⃣  CLIENT 3:');
    console.log(`   Name: ${client3.name}`);
    console.log(`   Email: ${client3.email}`);
    console.log(`   Password: Client@123`);

    console.log('\n' + '='.repeat(60));
    console.log('📋 CONTRACT STATUS:');
    console.log('='.repeat(60));
    console.log('\n✅ CON-000001: ACTIVE (Bakery Equipment)');
    console.log('✅ CON-000002: ACTIVE v2 (IT Services - Amended)');
    console.log('⏳ CON-000003: PENDING CLIENT (Logistics)');
    console.log('⏳ CON-000004: PENDING FINANCE (Kitchen Maintenance)');
    console.log('📝 CON-000005: DRAFT (Cloud Infrastructure)');
    console.log('❌ CON-000006: REJECTED (International Shipping)');

    console.log('\n' + '='.repeat(60));
    console.log('✨ Ready to test the complete workflow!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
