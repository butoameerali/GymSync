import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';

import app from '../index.js';
import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Complaint from '../models/Complaint.js';
import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import Broadcast from '../models/Broadcast.js';
import PaymentConfig from '../models/PaymentConfig.js';

const TEST_PORT = 5128;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase10Tests() {
  console.log('========================================================================');
  console.log('🛡️ GYMSYNC PHASE 10: MODERATION, COMPLAINTS & PAYMENT SECURITY SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  let server;

  try {
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`🚀 Test Server running at ${BASE_URL}\n`);
        resolve();
      });
    });

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    console.log(`📡 MongoDB Connected: ${mongoose.connection.name}`);

    const jwtSecret = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';
    const signToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: '1h' });

    // Clean up test data
    await User.deleteMany({ email: { $in: ['test_phase10_admin@gymsync.com', 'test_phase10_owner@gymsync.com', 'test_phase10_user@gymsync.com', 'test_phase10_reporter@gymsync.com'] } });
    await Gym.deleteMany({ name: 'Phase 10 Test Gym Facility' });
    await Complaint.deleteMany({ reportedEntityTitle: 'Phase 10 Test Complaint' });
    await Post.deleteMany({ content: 'Phase 10 Reported Post Content' });
    await Broadcast.deleteMany({ title: 'Phase 10 Emergency Alert' });

    // 1. Setup Users
    const adminPassword = 'AdminPassword123!';
    const adminUser = await User.create({
      name: 'Super Admin Phase 10',
      email: 'test_phase10_admin@gymsync.com',
      password: adminPassword,
      role: 'SuperAdmin'
    });
    const adminToken = signToken(adminUser._id);

    const ownerUser = await User.create({
      name: 'Gym Owner Phase 10',
      email: 'test_phase10_owner@gymsync.com',
      password: 'OwnerPassword123!',
      role: 'GymOwner'
    });
    const ownerToken = signToken(ownerUser._id);

    const regularUser = await User.create({
      name: 'Trainee Phase 10',
      email: 'test_phase10_user@gymsync.com',
      password: 'UserPassword123!',
      role: 'User'
    });
    const userToken = signToken(regularUser._id);

    const reporterUser = await User.create({
      name: 'Reporter Phase 10',
      email: 'test_phase10_reporter@gymsync.com',
      password: 'UserPassword123!',
      role: 'User'
    });
    const reporterToken = signToken(reporterUser._id);

    console.log('\n--- Test 1: Sudo-Mode Admin Password on Payment Configurations ---');
    // A: Attempt update without password
    const noPassRes = await fetch(`${BASE_URL}/api/payments/config/Easypaisa`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        accountNumber: '03001234567',
        bankDetails: 'GymSync Official'
      })
    });
    assert(noPassRes.status === 401, `Missing admin password rejected with 401 (got ${noPassRes.status})`);

    // B: Attempt update with wrong password
    const wrongPassRes = await fetch(`${BASE_URL}/api/payments/config/Easypaisa`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        accountNumber: '03001234567',
        bankDetails: 'GymSync Official',
        adminPassword: 'WrongPassword999!'
      })
    });
    assert(wrongPassRes.status === 401, `Incorrect admin password rejected with 401 (got ${wrongPassRes.status})`);

    // C: Update with valid admin password
    const validPassRes = await fetch(`${BASE_URL}/api/payments/config/Easypaisa`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        accountNumber: '03001234567',
        bankDetails: 'GymSync Official Receiving',
        notes: 'Please attach payment screenshot',
        adminPassword
      })
    });
    assert(validPassRes.status === 200, `Valid admin password accepted with 200 (got ${validPassRes.status})`);
    const savedConfig = await PaymentConfig.findOne({ method: 'Easypaisa' });
    assert(savedConfig && savedConfig.accountNumber === '03001234567', 'Payment config updated in database');

    console.log('\n--- Test 2: Gym Application Review & Rejection Reason ---');
    const testGym = await Gym.create({
      name: 'Phase 10 Test Gym Facility',
      ownerName: ownerUser.name,
      ownerEmail: ownerUser.email,
      location: 'Karachi, Sindh',
      monthlyFee: 50,
      approvalStatus: 'Pending'
    });

    const rejectionReasonText = 'Operating license could not be validated with city authorities.';
    const rejectRes = await fetch(`${BASE_URL}/api/admin/gyms/${testGym._id}/approval`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Rejected',
        rejectionReason: rejectionReasonText
      })
    });
    assert(rejectRes.status === 200, `Gym rejection endpoint returns 200 (got ${rejectRes.status})`);

    const updatedGym = await Gym.findById(testGym._id);
    assert(updatedGym.approvalStatus === 'Rejected', 'Gym approval status changed to Rejected');
    assert(updatedGym.rejectionReason === rejectionReasonText, 'rejectionReason persisted to Gym model');

    const ownerNotif = await Notification.findOne({ userId: ownerUser._id.toString(), message: new RegExp(rejectionReasonText, 'i') });
    assert(Boolean(ownerNotif), 'Notification with rejection explanation delivered to Gym Owner');

    console.log('\n--- Test 3: Complaint Filing, Admin Resolution & Ticket Reopening ---');
    // A: File Complaint
    const fileComplaintRes = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: 'Phase 10 Test Complaint',
        category: 'Billing',
        reportedEntityType: 'Billing',
        description: 'Double billed for current month membership transaction.'
      })
    });
    assert(fileComplaintRes.status === 201, `Complaint creation returns 201 (got ${fileComplaintRes.status})`);
    const complaintData = await fileComplaintRes.json();
    assert(Boolean(complaintData.complaintId && complaintData.complaintId.startsWith('CMP-')), `Atomic complaint ID issued: ${complaintData.complaintId}`);
    assert(complaintData.status === 'Pending', 'Initial complaint status is Pending');

    // B: Admin reviews and marks Resolved with resolution notes
    const resolutionNoteText = 'Verified billing logs. The duplicate charge has been credited back to your wallet.';
    const resolveRes = await fetch(`${BASE_URL}/api/complaints/${complaintData._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'Resolved',
        resolutionNotes: resolutionNoteText,
        moderatorName: adminUser.name
      })
    });
    assert(resolveRes.status === 200, `Admin resolution update returns 200 (got ${resolveRes.status})`);
    const resolvedDoc = await Complaint.findById(complaintData._id);
    assert(resolvedDoc.status === 'Resolved', 'Complaint status updated to Resolved');
    assert(resolvedDoc.resolutionNotes === resolutionNoteText, 'Resolution notes saved in database');

    // C: User reopens ticket
    const reopenReasonText = 'Credit not reflected in my local bank account yet.';
    const reopenRes = await fetch(`${BASE_URL}/api/complaints/${complaintData._id}/reopen`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        remarks: reopenReasonText
      })
    });
    assert(reopenRes.status === 200, `User reopen ticket returns 200 (got ${reopenRes.status})`);
    const reopenedDoc = await Complaint.findById(complaintData._id);
    assert(reopenedDoc.status === 'Reopened', 'Complaint status transitioned to Reopened');
    assert(reopenedDoc.reopenReason === reopenReasonText, 'Reopen remarks recorded on ticket');

    console.log('\n--- Test 4: Targeted Platform Notification Broadcast Center ---');
    const broadcastRes = await fetch(`${BASE_URL}/api/admin/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Phase 10 Emergency Alert',
        message: 'System upgrade scheduled for 2:00 AM tonight.',
        eventType: 'UrgentAlert',
        targetAudience: 'All Users'
      })
    });
    assert(broadcastRes.status === 201, `Broadcast dispatch returns 201 (got ${broadcastRes.status})`);

    const broadcastDoc = await Broadcast.findOne({ title: 'Phase 10 Emergency Alert' });
    assert(Boolean(broadcastDoc), 'Broadcast recorded in Broadcast collection');
    assert(broadcastDoc.recipientCount >= 1, `Recipient count tracked (${broadcastDoc.recipientCount})`);

    // Verify history endpoint
    const historyRes = await fetch(`${BASE_URL}/api/admin/broadcasts`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(historyRes.status === 200, `GET /api/admin/broadcasts returns 200 (got ${historyRes.status})`);
    const historyData = await historyRes.json();
    assert(Array.isArray(historyData) && historyData.length > 0, 'Broadcast history list returned');

    console.log('\n--- Test 5: Community Post Moderation with 2-Way Notifications ---');
    // Create test post
    const testPost = await Post.create({
      author: regularUser._id,
      authorName: regularUser.name,
      content: 'Phase 10 Reported Post Content',
      reportCount: 1,
      reportedBy: [{
        userId: reporterUser._id,
        userName: reporterUser.name,
        reason: 'Harassment',
        explanation: 'Inappropriate language used',
        reportedAt: new Date()
      }]
    });

    // Admin moderates post with 'delete' and guideline reason
    const removalReason = 'Violation of anti-harassment policy.';
    const moderateRes = await fetch(`${BASE_URL}/api/admin/posts/${testPost._id}/moderate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        action: 'delete',
        reason: removalReason
      })
    });
    assert(moderateRes.status === 200, `Post moderate action 'delete' returns 200 (got ${moderateRes.status})`);

    // Verify post moved to moderation hold or deleted
    const postInDb = await Post.findById(testPost._id);
    assert(postInDb === null || postInDb.isModerated === true, 'Offending post removed to moderation hold or deleted');

    // Verify 2-way notifications: author notified of removal + reason
    const authorNotif = await Notification.findOne({
      userId: regularUser._id.toString(),
      message: new RegExp(removalReason, 'i')
    });
    assert(Boolean(authorNotif), 'Author received notification with specific removal reason');

    // Verify reporter notified that action was taken
    const reporterNotif = await Notification.findOne({
      userId: reporterUser._id.toString(),
      message: /removed by moderation|removed the offending content/i
    });
    assert(Boolean(reporterNotif), 'Reporter received notification confirming content was removed');

    console.log('\n===============================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test execution error:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runPhase10Tests();
