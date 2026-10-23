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

const TEST_PORT = 5127;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runAdminSudoAndRecycleBinTests() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC ADMIN SUDO MODE, TIMED BAN & RECYCLE BIN TEST SUITE');
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

    // Helper to generate JWT
    const signToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: '1h' });

    // Clean up any existing test artifacts
    await User.deleteMany({
      email: {
        $in: [
          'test_superadmin@gymsync.com',
          'test_subadmin@gymsync.com',
          'test_victim@gymsync.com'
        ]
      }
    });

    // Seed test accounts with known password
    const superAdmin = await User.create({
      name: 'Test SuperAdmin',
      email: 'test_superadmin@gymsync.com',
      password: 'SuperPassword123!',
      role: 'SuperAdmin',
      isEmailVerified: true,
      accountStatus: 'Active'
    });

    const subAdmin = await User.create({
      name: 'Test SubAdmin',
      email: 'test_subadmin@gymsync.com',
      password: 'SubAdminPass123!',
      role: 'Admin',
      isEmailVerified: true,
      accountStatus: 'Active'
    });

    const targetUser = await User.create({
      name: 'Test Target User',
      email: 'test_victim@gymsync.com',
      password: 'TargetUserPass123!',
      role: 'User',
      isEmailVerified: true,
      accountStatus: 'Active'
    });

    const superAdminToken = signToken(superAdmin._id);
    const subAdminToken = signToken(subAdmin._id);
    const targetUserToken = signToken(targetUser._id);

    console.log('\n--- 1. ADMIN SUDO MODE PASSWORD VERIFICATION ---');

    // 1A: Attempt role change without password
    const resNoPass = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ role: 'FitnessInstructor' })
    });
    assert(resNoPass.status === 401, 'Rejects role change when admin password is missing (401)');

    // 1B: Attempt role change with wrong password
    const resWrongPass = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ role: 'FitnessInstructor', adminPassword: 'IncorrectPassword' })
    });
    assert(resWrongPass.status === 401, 'Rejects role change when admin password is incorrect (401)');

    // 1C: Successful role change with valid admin password
    const resValidPass = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ role: 'FitnessInstructor', adminPassword: 'SuperPassword123!' })
    });
    const validData = await resValidPass.json();
    assert(resValidPass.status === 200 && validData.user?.role === 'FitnessInstructor', 'Allows role change with verified admin password (200)');

    console.log('\n--- 2. PRIVILEGE ESCALATION & HIERARCHY GUARDS ---');

    // 2A: SubAdmin cannot promote someone to SuperAdmin
    const resPromoteSuper = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${subAdminToken}`
      },
      body: JSON.stringify({ role: 'SuperAdmin', adminPassword: 'SubAdminPass123!' })
    });
    assert(resPromoteSuper.status === 403, 'SubAdmin forbidden from promoting user to SuperAdmin (403)');

    // 2B: SubAdmin cannot demote or ban SuperAdmin
    const resDemoteSuper = await fetch(`${BASE_URL}/api/admin/users/${superAdmin._id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${subAdminToken}`
      },
      body: JSON.stringify({ role: 'User', adminPassword: 'SubAdminPass123!' })
    });
    assert(resDemoteSuper.status === 403, 'SubAdmin forbidden from demoting SuperAdmin (403)');

    // 2C: Admin cannot self-demote
    const resSelfDemote = await fetch(`${BASE_URL}/api/admin/users/${superAdmin._id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ role: 'User', adminPassword: 'SuperPassword123!' })
    });
    assert(resSelfDemote.status === 400, 'Rejects self-demotion to protect administrative access (400)');

    console.log('\n--- 3. TIMED BAN SYSTEM & AUTO-EXPIRATION ---');

    // 3A: Timed ban requires admin password
    const resBanNoPass = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/ban`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ duration: '24h', reason: 'Violation of policy' })
    });
    assert(resBanNoPass.status === 401, 'Rejects ban action without admin password (401)');

    // 3B: Successfully ban with duration 24h
    const resBanSuccess = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/ban`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ duration: '24h', reason: 'Spam activity', adminPassword: 'SuperPassword123!' })
    });
    const banData = await resBanSuccess.json();
    assert(resBanSuccess.status === 200 && banData.user?.isBanned === true && banData.user?.bannedUntil, 'User banned with 24h duration timestamp (200)');

    // 3C: While banned, user login should be rejected with 403
    const resBannedLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_victim@gymsync.com', password: 'TargetUserPass123!' })
    });
    assert(resBannedLogin.status === 403, 'Banned user blocked from logging in (403)');

    // 3D: Simulate ban expiration by setting bannedUntil into the past
    await User.findByIdAndUpdate(targetUser._id, {
      bannedUntil: new Date(Date.now() - 60 * 1000) // 1 minute ago
    });

    // 3E: User logs in again -> server auto-lifts expired ban!
    const resUnbanLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_victim@gymsync.com', password: 'TargetUserPass123!' })
    });
    const unbanData = await resUnbanLogin.json();
    const refreshedTargetUser = await User.findById(targetUser._id);
    assert(
      resUnbanLogin.status === 200 &&
      refreshedTargetUser.isBanned === false &&
      refreshedTargetUser.bannedUntil === null,
      'Expired timed ban automatically lifted upon login (200)'
    );

    console.log('\n--- 4. SOFT DELETE & 15-DAY RECYCLE BIN GRACE PERIOD ---');

    // 4A: Soft delete requires admin password
    const resDelNoPass = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({})
    });
    assert(resDelNoPass.status === 401, 'Soft delete rejected without admin password (401)');

    // 4B: Admin soft-deletes user with valid admin password
    const resDelSuccess = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ adminPassword: 'SuperPassword123!' })
    });
    assert(resDelSuccess.status === 200, 'Soft delete accepted with admin password (200)');

    const softDeletedDoc = await User.findById(targetUser._id);
    assert(
      softDeletedDoc.isDeleted === true &&
      softDeletedDoc.accountStatus === 'Deleted' &&
      softDeletedDoc.deletionScheduledPermanentAt > new Date(),
      'User marked isDeleted: true with 15-day grace period in DB'
    );

    // 4C: Active users list excludes soft-deleted user
    const resActiveUsers = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const activeUsers = await resActiveUsers.json();
    const foundInActive = activeUsers.some(u => String(u._id) === String(targetUser._id));
    assert(!foundInActive, 'Active users view filters out soft-deleted accounts');

    // 4D: Recycle Bin view includes soft-deleted user
    const resRecycleBin = await fetch(`${BASE_URL}/api/admin/users?view=recycle_bin`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const recycleBinUsers = await resRecycleBin.json();
    const foundInRecycleBin = recycleBinUsers.some(u => String(u._id) === String(targetUser._id));
    assert(foundInRecycleBin, 'Recycle Bin view returns soft-deleted accounts');

    // 4E: User attempts login while in Recycle Bin -> returns requiresRestore: true
    const resPendingLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_victim@gymsync.com', password: 'TargetUserPass123!' })
    });
    const pendingData = await resPendingLogin.json();
    assert(
      resPendingLogin.status === 200 &&
      pendingData.requiresRestore === true &&
      pendingData.daysRemaining >= 14,
      'Login detects Recycle Bin state and prompts for restoration with days remaining'
    );

    // 4F: User self-restores via /api/auth/restore-self
    const resSelfRestore = await fetch(`${BASE_URL}/api/auth/restore-self`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_victim@gymsync.com', password: 'TargetUserPass123!' })
    });
    const restoreData = await resSelfRestore.json();
    assert(
      resSelfRestore.status === 200 &&
      restoreData.token &&
      restoreData.email === 'test_victim@gymsync.com',
      'User self-restores from Recycle Bin and receives authentication session (200)'
    );

    const restoredDoc = await User.findById(targetUser._id);
    assert(restoredDoc.isDeleted === false && restoredDoc.accountStatus === 'Active', 'DB record restored to active state');

    // 4G: Test Admin Restore endpoint (/api/admin/users/:id/restore)
    // Soft delete again
    await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ adminPassword: 'SuperPassword123!' })
    });

    // Admin restore without password -> 401
    const resAdminRestoreNoPass = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/restore`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({})
    });
    assert(resAdminRestoreNoPass.status === 401, 'Admin restore rejected without admin password (401)');

    // Admin restore with valid password -> 200
    const resAdminRestore = await fetch(`${BASE_URL}/api/admin/users/${targetUser._id}/restore`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ adminPassword: 'SuperPassword123!' })
    });
    assert(resAdminRestore.status === 200, 'Admin successfully restores user account with password (200)');

    console.log('\n--- 5. USER DEACTIVATION & AUTO-REACTIVATION ---');

    // 5A: User deactivates account
    const resDeactivate = await fetch(`${BASE_URL}/api/users/deactivate`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${targetUserToken}` }
    });
    assert(resDeactivate.status === 200, 'User deactivates own account (200)');

    const deactivatedDoc = await User.findById(targetUser._id);
    assert(deactivatedDoc.isDeactivated === true && deactivatedDoc.accountStatus === 'Deactivated', 'User marked isDeactivated: true in DB');

    // 5B: User logs in -> automatically reactivates account
    const resReactivateLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_victim@gymsync.com', password: 'TargetUserPass123!' })
    });
    const reactivateData = await resReactivateLogin.json();
    const reactivatedDoc = await User.findById(targetUser._id);
    assert(
      resReactivateLogin.status === 200 &&
      reactivateData.token &&
      reactivatedDoc.isDeactivated === false &&
      reactivatedDoc.accountStatus === 'Active',
      'Logging in automatically reactivates deactivated account (200)'
    );

    console.log('\n--- CLEANUP ---');
    await User.deleteMany({
      email: {
        $in: [
          'test_superadmin@gymsync.com',
          'test_subadmin@gymsync.com',
          'test_victim@gymsync.com'
        ]
      }
    });
    console.log('🧹 Cleaned up test database records.');

    console.log('\n===============================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

runAdminSudoAndRecycleBinTests();
