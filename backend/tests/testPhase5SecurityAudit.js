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
import Complaint from '../models/Complaint.js';
import MediaItem from '../models/MediaItem.js';
import WorkoutProgress from '../models/WorkoutProgress.js';
import Post from '../models/Post.js';
import { migrateLegacyComplaints } from '../controllers/complaintController.js';

const TEST_PORT = 5119;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase5SecurityAuditTests() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC PHASE 5 COMPREHENSIVE SECURITY & INTEGRITY SUITE');
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

    const jwtSecret = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';

    // 1. CORS Allowed Headers Check
    console.log('\n--- 1. CORS Insecure Headers Removal Audit ---');
    const preflightRes = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization, x-user-name, x-user-role'
      }
    });
    const allowHeaders = preflightRes.headers.get('access-control-allow-headers') || '';
    assert(
      !allowHeaders.includes('x-user-name') && !allowHeaders.includes('x-user-role'),
      `CORS headers strictly omit legacy x-user-name and x-user-role (received: "${allowHeaders}")`
    );

    // 2. Privilege Escalation / Self-Registration Role Lockdown
    console.log('\n--- 2. Self-Registration Role Lockdown ---');
    const testPrivilegedRoles = ['FitnessInstructor', 'GymTrainer', 'StoreManager', 'Admin', 'SuperAdmin', 'ComplaintModerator'];
    for (const role of testPrivilegedRoles) {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Attacker_${role}`,
          email: `attacker_${role.toLowerCase()}@test.com`,
          password: 'Password123!',
          role
        })
      });
      assert(res.status === 403, `Self-registering as privileged role '${role}' is strictly rejected with HTTP 403 Forbidden (got ${res.status})`);
    }

    // Allowed self-roles: User and GymOwner
    const allowedUserEmail = `phase5_user_${Date.now()}@test.com`;
    const allowedOwnerEmail = `phase5_owner_${Date.now()}@test.com`;
    const regUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Legit User ${Date.now()}`,
        email: allowedUserEmail,
        password: 'Password123!',
        role: 'User'
      })
    });
    assert(regUserRes.status === 201, `Legitimate self-registration as 'User' succeeds with HTTP 201 Created`);

    const regOwnerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Legit Owner ${Date.now()}`,
        email: allowedOwnerEmail,
        password: 'Password123!',
        role: 'GymOwner'
      })
    });
    assert(regOwnerRes.status === 201, `Legitimate self-registration as 'GymOwner' succeeds with HTTP 201 Created`);
    const ownerData = await regOwnerRes.json();
    assert(ownerData.role === 'GymOwner', `Registered account has role 'GymOwner'`);

    // 3. Anti-Account Enumeration in Forgot Password
    console.log('\n--- 3. Anti-Account Enumeration in Forgot Password ---');
    const nonExistentEmail = `nonexistent_${Date.now()}@example.com`;
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: nonExistentEmail })
    });
    assert(forgotRes.status === 200, `Non-existent email in forgot-password returns HTTP 200 OK (no 404 leakage)`);
    const forgotJson = await forgotRes.json();
    assert(
      forgotJson.message.toLowerCase().includes('if an account exists'),
      `Generic message returned: "${forgotJson.message}"`
    );

    // 4. Zero Legacy Fallback & Genuinely Single-Use Reset Token Lifecycle
    console.log('\n--- 4. Cryptographic Single-Use Reset Token Lifecycle ---');
    const resetUser = await User.create({
      name: `Reset User ${Date.now()}`,
      email: `resetuser_${Date.now()}@test.com`,
      password: 'InitialPassword123!',
      role: 'User'
    });

    const plainOtp = '123456';
    const hashedOtp = crypto.createHash('sha256').update(plainOtp).digest('hex');
    resetUser.otpCode = hashedOtp;
    resetUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    resetUser.otpAttempts = 0;
    resetUser.otpVerified = false;
    await resetUser.save();

    // Verify OTP with correct code
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetUser.email, otp: plainOtp })
    });
    assert(verifyRes.status === 200, `verify-otp succeeds with HTTP 200`);
    const verifyData = await verifyRes.json();
    assert(typeof verifyData.resetToken === 'string' && verifyData.resetToken.length === 64, `verify-otp issued a 64-char crypto resetToken`);

    // Test: OTP code must be wiped immediately on verify (re-verifying same OTP fails)
    const replayVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetUser.email, otp: plainOtp })
    });
    assert(replayVerifyRes.status === 400, `Replaying already verified OTP is rejected with HTTP 400 (OTP is genuinely single-use)`);

    // Test: Attempting resetPassword WITHOUT resetToken must fail (zero legacy fallback!)
    const noTokenResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetUser.email,
        newPassword: 'BrandNewPassword123!'
      })
    });
    assert(noTokenResetRes.status === 400, `Resetting password without resetToken is strictly rejected with HTTP 400 (zero legacy fallback)`);

    // Test: Attempting resetPassword with non-existent email returns uniform 400
    const nonExistentResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `fake_${Date.now()}@example.com`,
        newPassword: 'BrandNewPassword123!',
        resetToken: verifyData.resetToken
      })
    });
    assert(nonExistentResetRes.status === 400, `Non-existent user in resetPassword returns uniform HTTP 400 (no 404 leakage)`);

    // Consume resetToken to change password legitimately
    const resetPassRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetUser.email,
        newPassword: 'BrandNewPassword123!',
        resetToken: verifyData.resetToken
      })
    });
    assert(resetPassRes.status === 200, `reset-password succeeds with valid resetToken (HTTP 200)`);

    // Verify single-use invariant: replay with the same resetToken must fail
    const replayResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetUser.email,
        newPassword: 'AnotherPassword123!',
        resetToken: verifyData.resetToken
      })
    });
    assert(replayResetRes.status === 400, `Replaying expired/consumed resetToken is strictly rejected with HTTP 400 Bad Request`);

    // Verify user can now log in with the new password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetUser.email, password: 'BrandNewPassword123!' })
    });
    assert(loginRes.status === 200, `Login with new password succeeds (HTTP 200)`);
    const loginData = await loginRes.json();

    // 5. Authoritative Session Verification Endpoint: GET /api/auth/me
    console.log('\n--- 5. Session Verification Endpoint (GET /api/auth/me) ---');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    assert(meRes.status === 200, `GET /api/auth/me succeeds with HTTP 200`);
    const meData = await meRes.json();
    assert(meData.name === resetUser.name, `Authenticated user profile name matches (${meData.name})`);
    assert(meData.role === 'User', `Authenticated user role matches (${meData.role})`);
    assert(meData.password === undefined, `Password hash is strictly excluded from /api/auth/me response`);

    // 6. Media Item DELETE Authorization Audit (IDOR Prevention)
    console.log('\n--- 6. Media Item DELETE Ownership Authorization ---');
    const userB = await User.create({
      name: `Media Intruder ${Date.now()}`,
      email: `intruder_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'User'
    });
    const userBToken = jwt.sign({ id: userB._id }, jwtSecret, { expiresIn: '1h' });

    // User A owns a media item
    const mediaItemA = await MediaItem.create({
      fileName: 'user_a_private.jpg',
      originalName: 'private.jpg',
      storagePath: `avatars/${resetUser._id}/private.jpg`,
      publicUrl: `https://test.supabase.co/storage/v1/object/public/gymsync-media/avatars/${resetUser._id}/private.jpg`,
      sizeBytes: 1024,
      mimeType: 'image/jpeg',
      folder: 'avatars',
      ownerId: resetUser._id,
      uploadedBy: resetUser.name
    });

    // User B attempts to DELETE User A's media item
    const mediaDeleteIntruderRes = await fetch(`${BASE_URL}/api/media/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBToken}`
      },
      body: JSON.stringify({ filePath: mediaItemA.storagePath })
    });
    assert(mediaDeleteIntruderRes.status === 403, `User B attempting to delete User A media item rejected with HTTP 403 Forbidden (got ${mediaDeleteIntruderRes.status})`);

    // User A successfully deletes own media item
    const mediaDeleteOwnerRes = await fetch(`${BASE_URL}/api/media/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({ filePath: mediaItemA.storagePath })
    });
    assert(mediaDeleteOwnerRes.status === 200, `Media owner authorized to delete own file (HTTP 200)`);

    // 7. Complaint Data Integrity & Migration
    console.log('\n--- 7. Complaint reporterId Binding & Migration ---');
    const userAuthHeader = { 'Authorization': `Bearer ${loginData.token}` };

    // Create legacy complaint with null reporterId
    const legacyCmp = await Complaint.create({
      complaintId: `CMP-LEGACY-${Date.now()}`,
      reporterName: resetUser.name,
      reportedEntityType: 'Post',
      reportedEntityId: 'legacy_post_1',
      reason: 'Spam',
      description: 'Legacy unmigrated report'
    });
    assert(legacyCmp.reporterId === undefined || legacyCmp.reporterId === null, `Legacy complaint created without reporterId`);

    // Run migration
    const migResult = await migrateLegacyComplaints();
    const migratedCmp = await Complaint.findById(legacyCmp._id);
    assert(
      migratedCmp.reporterId && String(migratedCmp.reporterId) === String(resetUser._id),
      `migrateLegacyComplaints() successfully backfilled reporterId from reporterName: ${migratedCmp.reporterId}`
    );

    // Create new complaint via API
    const cmpRes = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...userAuthHeader },
      body: JSON.stringify({
        reportedEntityType: 'Post',
        reportedEntityId: 'post_test_audit',
        reportedEntityTitle: 'Audit Test Post',
        reason: 'Harassment',
        description: 'Audit test description verification'
      })
    });
    assert(cmpRes.status === 201, `Complaint creation succeeds with HTTP 201 Created`);
    const cmpData = await cmpRes.json();
    assert(
      cmpData.complaintId && /^CMP-[0-9A-Z]+-[0-9A-F]+$/.test(cmpData.complaintId),
      `Complaint ID follows entropy-backed collision-free pattern: ${cmpData.complaintId}`
    );
    assert(
      cmpData.reporterId === String(loginData._id),
      `Complaint is permanently bound to reporterId: ${cmpData.reporterId}`
    );

    // User B attempts to post chat to User A's complaint
    const cmpChatIntruderRes = await fetch(`${BASE_URL}/api/complaints/${cmpData._id}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBToken}`
      },
      body: JSON.stringify({ text: 'Unauthorized chat attempt' })
    });
    assert(cmpChatIntruderRes.status === 403, `Unauthorized user chat to complaint ticket strictly rejected with HTTP 403 Forbidden`);

    // 8. Real Public Profile User Stats Calculation
    console.log('\n--- 8. Real Server-Side User Profile Stats Calculation ---');
    // Seed workout and post for resetUser
    await WorkoutProgress.create({
      userId: resetUser._id,
      userName: resetUser.name,
      planName: 'Strength Builder',
      completedExercises: ['bench-press', 'squat'],
      date: new Date()
    });
    await Post.create({
      author: resetUser._id,
      authorId: resetUser._id,
      authorName: resetUser.name,
      content: 'Awesome workout today!',
      mediaType: 'image'
    });

    const userStatsRes = await fetch(`${BASE_URL}/api/users/${resetUser.name}`);
    assert(userStatsRes.status === 200, `GET /api/users/:name returned HTTP 200`);
    const statsData = await userStatsRes.json();
    assert(statsData.workoutCount >= 1, `Real workoutCount computed from database: ${statsData.workoutCount}`);
    assert(statsData.postCount >= 1, `Real postCount computed from database: ${statsData.postCount}`);
    assert(statsData.points >= 15, `Real points dynamically calculated (${statsData.points})`);
    assert(statsData.streak >= 1, `Real streak dynamically calculated (${statsData.streak})`);

    // Clean up created test data
    await User.deleteMany({ email: { $in: [allowedUserEmail, allowedOwnerEmail, resetUser.email, userB.email] } });
    await Complaint.deleteMany({ complaintId: { $in: [cmpData.complaintId, legacyCmp.complaintId] } });
    await WorkoutProgress.deleteMany({ userId: resetUser._id });
    await Post.deleteMany({ authorName: resetUser.name });

  } catch (err) {
    console.error('Fatal error during test execution:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise(res => server.close(res));
      console.log('🛑 Test server stopped.');
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📡 MongoDB connection closed.');
    }
  }

  console.log('\n===============================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase5SecurityAuditTests();
