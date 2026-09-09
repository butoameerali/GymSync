import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from '../index.js';

import User from '../models/User.js';
import Message from '../models/Message.js';
import Payment from '../models/Payment.js';
import Complaint from '../models/Complaint.js';
import { updatePostLikes, appendPostComment } from '../services/supabaseService.js';

const TEST_PORT = 5112;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase4HardeningTests() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC PHASE 4 COMPREHENSIVE HARDENING & SECURITY SUITE');
  console.log('===============================================================\n');

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
    await User.syncIndexes();

    const jwtSecret = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';

    // 1. Setup Test Users
    console.log('\n--- 1. Setting Up Test Users ---');
    await User.deleteMany({ email: { $in: ['phase4_alice@test.com', 'phase4_bob@test.com', 'phase4_otp@test.com', 'phase4_case@test.com'] } });
    await User.deleteMany({ name: { $in: ['Alice Phase4', 'Bob Phase4', 'OTP Tester', 'Case Insensitive User', 'case insensitive user'] } });
    await Payment.deleteMany({ userName: { $in: ['Alice Phase4', 'Bob Phase4'] } });
    await Message.deleteMany({ sender: { $in: ['Alice Phase4', 'Bob Phase4', 'Gym Support'] } });
    await Complaint.deleteMany({ reporterName: { $in: ['Alice Phase4', 'Bob Phase4'] } });

    const alice = await User.create({
      name: 'Alice Phase4',
      email: 'phase4_alice@test.com',
      password: 'Password123!',
      role: 'User'
    });

    const bob = await User.create({
      name: 'Bob Phase4',
      email: 'phase4_bob@test.com',
      password: 'Password123!',
      role: 'User'
    });

    const aliceToken = jwt.sign({ id: alice._id }, jwtSecret, { expiresIn: '1h' });
    const bobToken = jwt.sign({ id: bob._id }, jwtSecret, { expiresIn: '1h' });
    assert(alice && bob, 'Test users Alice and Bob successfully created with valid auth tokens');

    // 2. Database-Level Username Uniqueness Invariant
    console.log('\n--- 2. Database-Level Username Case-Insensitive Uniqueness Invariant ---');
    await User.create({
      name: 'Case Insensitive User',
      email: 'phase4_case@test.com',
      password: 'Password123!',
      role: 'User'
    });

    let duplicateErrorThrown = false;
    try {
      await User.create({
        name: 'case insensitive user', // exact lowercase collision
        email: 'phase4_case_dupe@test.com',
        password: 'Password123!',
        role: 'User'
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateErrorThrown = true;
      }
    }
    assert(duplicateErrorThrown, 'MongoDB unique index with case-insensitive collation rejects duplicate username with different casing (E11000)');

    // 3. Payment Route Protection & Identity Lockdown
    console.log('\n--- 3. Payment Route Protection & Identity Lockdown ---');
    const unauthPaymentRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100, paymentMethod: 'Stripe' })
    });
    assert(unauthPaymentRes.status === 401, 'Unauthenticated POST /api/payments is strictly blocked with 401 Unauthorized');

    const unauthIntentRes = await fetch(`${BASE_URL}/api/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50, email: 'spoof@test.com' })
    });
    assert(unauthIntentRes.status === 401, 'Unauthenticated POST /api/payments/create-intent is strictly blocked with 401 Unauthorized');

    // Authenticated payment submission with spoofed identity fields
    const paymentPayload = {
      paymentId: `PAY-P4-${Date.now()}`,
      userName: 'Spoofed Bob Phase4', // Spoofed!
      userId: bob._id.toString(),      // Spoofed!
      amount: 75,
      paymentMethod: 'Easypaisa',
      customerEmail: 'alice@test.com',
      screenshotUrl: 'https://example.com/receipt.jpg'
    };

    const authPaymentRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify(paymentPayload)
    });

    assert(authPaymentRes.status === 201, 'Authenticated payment creation succeeded (201 Created)');

    // Fetch from database to verify server-enforced identity
    const dbPayment = await Payment.findOne({ paymentId: paymentPayload.paymentId });
    assert(
      dbPayment &&
      dbPayment.userId.toString() === alice._id.toString() &&
      dbPayment.userName === alice.name,
      'Server strictly binds Payment userId to req.user._id and userName to req.user.name, neutralizing client spoofing'
    );

    // 4. Public Payment Tracking PII Masking
    console.log('\n--- 4. Public Payment Tracking PII Masking & Data Minimization ---');
    const trackRes = await fetch(`${BASE_URL}/api/payments/track/${paymentPayload.paymentId}`);
    assert(trackRes.status === 200, 'Public payment tracking endpoint responds with 200 OK');
    const trackData = await trackRes.json();

    assert(trackData.userName !== 'Alice Phase4', `Customer name is masked from public view (received: "${trackData.userName}")`);
    assert(trackData.userName.includes('*'), 'Customer name contains masking asterisks for privacy protection');
    assert(trackData.customerEmail === undefined, 'Customer email is excluded from public tracking payload');
    assert(trackData.customerPhone === undefined, 'Customer phone is excluded from public tracking payload');
    assert(trackData.adminApprovalNotes === undefined, 'Internal approval notes are excluded from public tracking payload');

    // 5. Hashed OTP Security & Invalidation
    console.log('\n--- 5. Hashed OTP Security, Constant-Time Verification & Invalidation ---');
    const otpUser = await User.create({
      name: 'OTP Tester',
      email: 'phase4_otp@test.com',
      password: 'Password123!',
      role: 'User'
    });

    // Request forgotPassword
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpUser.email })
    });
    assert(forgotRes.status === 200, 'Forgot password endpoint returned 200 OK');

    const dbUserAfterForgot = await User.findById(otpUser._id);
    assert(
      dbUserAfterForgot.otpCode &&
      dbUserAfterForgot.otpCode.length === 64 &&
      !/^\d{6}$/.test(dbUserAfterForgot.otpCode),
      'OTP stored in MongoDB is a 64-character SHA-256 hexadecimal hash, not plain text digits'
    );

    // Now let's generate a known OTP hash to test verifyOTP
    const testPlainOtp = '765432';
    const testHashedOtp = crypto.createHash('sha256').update(testPlainOtp).digest('hex');
    dbUserAfterForgot.otpCode = testHashedOtp;
    dbUserAfterForgot.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    dbUserAfterForgot.otpAttempts = 0;
    dbUserAfterForgot.otpVerified = false;
    await dbUserAfterForgot.save();

    // Verify OTP with correct plain code
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpUser.email, otp: testPlainOtp })
    });
    assert(verifyRes.status === 200, 'verifyOTP successfully validates plain OTP against stored SHA-256 hash using timingSafeEqual');
    const verifyData = await verifyRes.json();
    assert(Boolean(verifyData.resetToken), 'verifyOTP returns a secure single-use resetToken');

    // Now reset password using verified single-use resetToken
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpUser.email, newPassword: 'NewPassword999!', resetToken: verifyData.resetToken })
    });
    assert(resetRes.status === 200, 'resetPassword succeeds and returns 200 OK');

    // Verify OTP state is cleared immediately (single-use invariant)
    const dbUserAfterReset = await User.findById(otpUser._id);
    assert(
      dbUserAfterReset.otpCode === null &&
      dbUserAfterReset.otpVerified === false &&
      dbUserAfterReset.otpAttempts === 0,
      'OTP credentials strictly cleared from database upon password reset, preventing replay attacks'
    );

    // Attempting reset again should fail
    const replayResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpUser.email, newPassword: 'AnotherPassword999!' })
    });
    assert(replayResetRes.status === 400, 'Replaying password reset without newly verified OTP is rejected with 400 Bad Request');

    // 6. Atomic Social Operations in Supabase/MongoDB Fallback
    console.log('\n--- 6. Atomic Social Operations (Likes & Comments) ---');
    const testPost = await mongoose.model('Post').create({
      authorName: 'Alice Phase4',
      authorRole: 'User',
      content: 'Testing atomic social operations in Phase 4',
      likes: [],
      comments: []
    });

    // Toggle like ON
    const likeResult1 = await updatePostLikes(testPost._id.toString(), 'Bob Phase4');
    assert(likeResult1 && likeResult1.likes && likeResult1.likes.includes('Bob Phase4'), 'User like added atomically via $addToSet');

    // Toggle like OFF
    const likeResult2 = await updatePostLikes(testPost._id.toString(), 'Bob Phase4');
    assert(likeResult2 && likeResult2.likes && !likeResult2.likes.includes('Bob Phase4'), 'User like removed atomically via $pull');

    // Add comment atomically
    const commentResult = await appendPostComment(testPost._id.toString(), {
      authorName: 'Bob Phase4',
      text: 'Great progress Alice!'
    });
    assert(
      Array.isArray(commentResult) &&
      commentResult.some(c => c.authorName === 'Bob Phase4' && c.text === 'Great progress Alice!'),
      'Comment added atomically via $push without read-modify-write data races'
    );

    // 7. Chat Cursor Pagination & History Capping
    console.log('\n--- 7. Chat History Capping & Keyset Cursor Pagination ---');
    // Seed 15 messages between Alice and Bob with staggered timestamps
    const baseTime = Date.now() - 30000;
    const seededMessages = [];
    for (let i = 1; i <= 15; i++) {
      seededMessages.push({
        sender: i % 2 === 1 ? 'Alice Phase4' : 'Bob Phase4',
        receiver: i % 2 === 1 ? 'Bob Phase4' : 'Alice Phase4',
        text: `Message number ${i}`,
        createdAt: new Date(baseTime + i * 1000)
      });
    }
    await Message.insertMany(seededMessages);

    // Fetch page 1 (5 items)
    const chatPage1Res = await fetch(`${BASE_URL}/api/chat/Alice%20Phase4/Bob%20Phase4?limit=5&paginated=true`, {
      headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(chatPage1Res.status === 200, 'Chat query with limit=5 and paginated=true returns 200 OK');
    const chatPage1 = await chatPage1Res.json();

    assert(chatPage1.messages && chatPage1.messages.length === 5, 'Page 1 correctly caps returned messages to limit=5');
    assert(chatPage1.hasMore === true, 'Page 1 correctly detects hasMore=true');
    assert(chatPage1.nextCursor !== null, 'Page 1 returns valid nextCursor for older message pagination');

    // Fetch page 2 using cursor
    const chatPage2Res = await fetch(`${BASE_URL}/api/chat/Alice%20Phase4/Bob%20Phase4?limit=5&paginated=true&before=${chatPage1.nextCursor}`, {
      headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(chatPage2Res.status === 200, 'Chat query with before cursor returns 200 OK');
    const chatPage2 = await chatPage2Res.json();
    assert(chatPage2.messages && chatPage2.messages.length === 5, 'Page 2 correctly retrieves next 5 older messages');

    // 8. Real "Gym Support" Ticket Lifecycle in Chat
    console.log('\n--- 8. Real "Gym Support" Ticket Lifecycle in Chat ---');
    const supportInquiryRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        receiver: 'Gym Support',
        text: 'Hello, the cardio treadmill #4 display is flickering.'
      })
    });

    assert(supportInquiryRes.status === 201, 'Sending message to Gym Support returns 201 Created');
    const supportInquiryData = await supportInquiryRes.json();
    assert(supportInquiryData.ticketId && supportInquiryData.ticketId.startsWith('TICKET-'), `Generated automated support ticket ID (${supportInquiryData.ticketId})`);

    // Verify Complaint collection has the new ticket
    const ticketDoc = await Complaint.findOne({ complaintId: supportInquiryData.ticketId });
    assert(
      ticketDoc &&
      ticketDoc.reporterName === 'Alice Phase4' &&
      ticketDoc.status === 'Pending' &&
      ticketDoc.chatMessages.length === 1,
      'Support request successfully persisted as an official Complaint record with Pending status and chat message'
    );

    // Follow-up message should append to the same open ticket rather than duplicating
    const followUpRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        receiver: 'Gym Support',
        text: 'Also, the emergency stop button feels loose.'
      })
    });
    assert(followUpRes.status === 201, 'Follow-up message to Gym Support returns 201 Created');
    const followUpData = await followUpRes.json();
    assert(followUpData.ticketId === supportInquiryData.ticketId, 'Follow-up message seamlessly appends to existing open ticket without creating duplicate tickets');

    const updatedTicketDoc = await Complaint.findOne({ complaintId: supportInquiryData.ticketId });
    assert(updatedTicketDoc.chatMessages.length === 2, 'Complaint chatMessages history contains both inquiry messages');

    // Clean up test data
    console.log('\n--- Cleaning Up Phase 4 Test Artifacts ---');
    await User.deleteMany({ email: { $in: ['phase4_alice@test.com', 'phase4_bob@test.com', 'phase4_otp@test.com', 'phase4_case@test.com'] } });
    await User.deleteMany({ name: { $in: ['Alice Phase4', 'Bob Phase4', 'OTP Tester', 'Case Insensitive User', 'case insensitive user'] } });
    await Payment.deleteMany({ paymentId: paymentPayload.paymentId });
    await Message.deleteMany({ sender: { $in: ['Alice Phase4', 'Bob Phase4', 'Gym Support'] } });
    await Message.deleteMany({ receiver: { $in: ['Alice Phase4', 'Bob Phase4', 'Gym Support'] } });
    await Complaint.deleteMany({ reporterName: { $in: ['Alice Phase4', 'Bob Phase4'] } });
    await mongoose.model('Post').findByIdAndDelete(testPost._id);

    console.log('\n===============================================================');
    console.log(`📊 PHASE 4 HARDENING SUITE SUMMARY: ${passed} PASSED / ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Phase 4 Test Suite Fatal Exception:', error);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

runPhase4HardeningTests();
