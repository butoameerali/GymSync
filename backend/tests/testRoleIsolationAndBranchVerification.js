import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';

import app from '../index.js';
import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Organization from '../models/Organization.js';
import VerificationDocument from '../models/VerificationDocument.js';
import VerificationApplication from '../models/VerificationApplication.js';
import Session from '../models/Session.js';
import { encryptBuffer, decryptBuffer, hashToken, generateSecureOtp } from '../utils/cryptoUtils.js';

const TEST_PORT = 5129;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runRoleIsolationAndBranchVerificationTests() {
  console.log('======================================================================');
  console.log('🛡️ GYMSYNC ROLE ISOLATION, VERIFICATION & SECURITY TEST SUITE');
  console.log('======================================================================\n');

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
    console.log(`📡 MongoDB Connected: ${mongoose.connection.name}\n`);

    const jwtSecret = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';

    // Cleanup any lingering test records
    await User.deleteMany({ email: { $regex: /@isolation-test\.com$/ } });
    await Gym.deleteMany({ name: { $regex: /Isolation Test/ } });
    await Organization.deleteMany({ name: { $regex: /Isolation Org/ } });

    // =========================================================================
    // SECTION 1: SIGNUP EMAIL OTP & 3-ATTEMPT LOCKOUT ENFORCEMENT
    // =========================================================================
    console.log('--- 1. SIGNUP EMAIL OTP & ATTEMPT LOCKOUT ---');

    const testUserEmail = 'athlete_1@isolation-test.com';
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Athlete One',
        email: testUserEmail,
        password: 'Password123!',
        role: 'user'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Public user registration returns HTTP 201');
    assert(regData.requiresEmailVerification === true, 'Registration flags requiresEmailVerification: true');
    assert(regData.isEmailVerified === false, 'Registration creates account with isEmailVerified: false');

    const createdUser = await User.findOne({ email: testUserEmail });
    assert(createdUser && createdUser.otpPurpose === 'signup', 'Database records otpPurpose === "signup"');
    assert(createdUser.otpCode && createdUser.otpCode.length === 64, 'OTP code is securely hashed with SHA-256');

    // Attempt 1: Incorrect OTP
    const wrong1Res = await fetch(`${BASE_URL}/api/auth/verify-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, otp: '000000' })
    });
    const wrong1Data = await wrong1Res.json();
    assert(wrong1Res.status === 400 && wrong1Data.attemptsRemaining === 2, 'Invalid OTP attempt 1 returns HTTP 400 with attemptsRemaining: 2');

    // Attempt 2: Incorrect OTP
    const wrong2Res = await fetch(`${BASE_URL}/api/auth/verify-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, otp: '111111' })
    });
    const wrong2Data = await wrong2Res.json();
    assert(wrong2Res.status === 400 && wrong2Data.attemptsRemaining === 1, 'Invalid OTP attempt 2 returns HTTP 400 with attemptsRemaining: 1');

    // Attempt 3: Incorrect OTP -> Lockout & Invalidation
    const wrong3Res = await fetch(`${BASE_URL}/api/auth/verify-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, otp: '222222' })
    });
    const wrong3Data = await wrong3Res.json();
    assert(wrong3Res.status === 429, '3rd invalid OTP attempt triggers HTTP 429 lockout');

    const lockedUser = await User.findOne({ email: testUserEmail });
    assert(!lockedUser.otpCode, 'OTP code is invalidated and cleared in database after 3 failed attempts');

    // Resend OTP (simulating cooldown expiry)
    await User.updateOne({ email: testUserEmail }, {
      lastOtpSentAt: new Date(Date.now() - 65 * 1000),
      otpLastSentAt: new Date(Date.now() - 65 * 1000)
    });
    const resendRes = await fetch(`${BASE_URL}/api/auth/resend-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail })
    });
    assert(resendRes.status === 200, 'Resending signup OTP succeeds with fresh security code');

    // Seed known OTP to simulate email reception
    const validOtp = '654321';
    const validHash = crypto.createHash('sha256').update(validOtp).digest('hex');
    await User.updateOne({ email: testUserEmail }, {
      otpCode: validHash,
      otpAttempts: 0,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const verifySuccessRes = await fetch(`${BASE_URL}/api/auth/verify-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, otp: validOtp })
    });
    const verifySuccessData = await verifySuccessRes.json();
    assert(verifySuccessRes.status === 200, 'Submitting correct OTP returns HTTP 200');
    assert(verifySuccessData.isEmailVerified === true, 'Response confirms isEmailVerified: true');
    assert(verifySuccessData.token, 'Session JWT token issued upon successful verification');

    // =========================================================================
    // SECTION 2: PRIVILEGED REGISTRATION PROTECTION & STORE MANAGER PROVISIONING
    // =========================================================================
    console.log('\n--- 2. PRIVILEGED REGISTRATION & ROLE ISOLATION ---');

    // Attempting to self-register as StoreManager or Admin via public API
    const exploitRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker User',
        email: 'hacker@isolation-test.com',
        password: 'Password123!',
        role: 'Admin'
      })
    });
    assert(exploitRegRes.status === 403, 'Public registration payload requesting "Admin" role is rejected with HTTP 403 Forbidden');

    // Create an authorized Admin account
    const adminUser = await User.create({
      name: 'Super Admin Officer',
      email: 'admin_officer@isolation-test.com',
      password: 'Password123!',
      role: 'SuperAdmin',
      isEmailVerified: true
    });
    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, jwtSecret, { expiresIn: '1d' });

    // Provision StoreManager through authorized admin endpoint
    const storeManagerEmail = 'storemanager@isolation-test.com';
    const provRes = await fetch(`${BASE_URL}/api/admin/store-managers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Store Manager Alpha',
        email: storeManagerEmail,
        password: 'ManagerPassword123!'
      })
    });
    const provData = await provRes.json();
    assert(provRes.status === 201, 'Authorized Admin successfully provisions StoreManager via POST /api/admin/store-managers');

    const smUser = await User.findOne({ email: storeManagerEmail });
    assert(smUser && smUser.role === 'StoreManager', 'Provisioned user has role: "StoreManager"');
    assert(String(smUser.invitedBy) === String(adminUser._id), 'Audit trail links invitedBy to Admin who provisioned account');

    // StoreManager attempting to access admin-only endpoints
    const smToken = jwt.sign({ id: smUser._id, role: smUser.role }, jwtSecret, { expiresIn: '1d' });
    const smExploitRes = await fetch(`${BASE_URL}/api/admin/store-managers`, {
      headers: { 'Authorization': `Bearer ${smToken}` }
    });
    assert(smExploitRes.status === 403, 'StoreManager attempting to call admin provisioning endpoint is blocked with HTTP 403');

    // =========================================================================
    // SECTION 3: COMPANY & MULTI-BRANCH STRUCTURE FOR GYM OWNER
    // =========================================================================
    console.log('\n--- 3. MULTI-BRANCH & AES-256-GCM VERIFICATION APPLICATION ---');

    const ownerEmail = 'gymowner@isolation-test.com';
    const gymOwner = await User.create({
      name: 'Enterprise Gym Owner',
      email: ownerEmail,
      password: 'OwnerPassword123!',
      role: 'GymOwner',
      isEmailVerified: true
    });
    const ownerToken = jwt.sign({ id: gymOwner._id, role: gymOwner.role }, jwtSecret, { expiresIn: '1d' });

    // GymOwner creates multi-branch draft 1
    const branch1Res = await fetch(`${BASE_URL}/api/gym-verification/branch/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        branchName: 'Isolation Test - Gulshan Branch',
        gymType: 'Unisex Fitness Center',
        address: 'Plot 45, Main University Road',
        city: 'Karachi',
        country: 'Pakistan',
        coordinates: { lat: 24.9207, lng: 67.0911 },
        applicant: {
          legalOwnerName: 'Enterprise Gym Owner',
          cnicOrPassport: '42101-9988776-1',
          applicantRole: 'Owner',
          phone: '+92 300 1112233',
          email: ownerEmail
        }
      })
    });
    const branch1Data = await branch1Res.json();
    assert(branch1Res.status === 200, 'GymOwner successfully saves Branch 1 draft');
    const branch1Id = branch1Data.branch._id;
    assert(branch1Data.branch.approvalStatus === 'Draft', 'Branch 1 initialized with approvalStatus: "Draft"');

    // GymOwner creates multi-branch draft 2 (same owner, different location)
    const branch2Res = await fetch(`${BASE_URL}/api/gym-verification/branch/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        branchName: 'Isolation Test - DHA Branch',
        gymType: 'CrossFit Box & Functional Fitness',
        address: 'Commercial Street 12, DHA Phase 6',
        city: 'Karachi',
        country: 'Pakistan',
        coordinates: { lat: 24.8107, lng: 67.0511 }
      })
    });
    const branch2Data = await branch2Res.json();
    assert(branch2Res.status === 200, 'GymOwner successfully saves Branch 2 draft under same owner profile');
    const branch2Id = branch2Data.branch._id;

    // Verify GET /api/gym-verification/branches returns both branches
    const listBranchesRes = await fetch(`${BASE_URL}/api/gym-verification/branches`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const listBranchesData = await listBranchesRes.json();
    assert(listBranchesData.branches.length === 2, 'GET /api/gym-verification/branches returns both branches for single owner');

    // =========================================================================
    // SECTION 4: AES-256-GCM ENCRYPTED EVIDENCE STORAGE & PREVIEW
    // =========================================================================
    console.log('\n--- 4. AES-256-GCM ENCRYPTED EVIDENCE STORAGE ---');

    // Create a mock document and encrypt it
    const originalText = 'OFFICIAL_COMMERCIAL_LICENSE_DOCUMENT_AUTHENTICATED';
    const originalBuffer = Buffer.from(originalText, 'utf8');

    // Upload document via endpoint simulation
    const docUploadRes = await fetch(`${BASE_URL}/api/gym-verification/branch/${branch1Id}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        // Use multipart form boundary
      },
      body: (() => {
        const boundary = '----WebKitFormBoundaryIsolationTest';
        const body = [
          `--${boundary}`,
          'Content-Disposition: form-data; name="documentType"',
          '',
          'BUSINESS_REGISTRATION',
          `--${boundary}`,
          'Content-Disposition: form-data; name="documentLabel"',
          '',
          'Commercial Business License',
          `--${boundary}`,
          'Content-Disposition: form-data; name="documentNumber"',
          '',
          'NTN-99881122',
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="license.pdf"',
          'Content-Type: application/pdf',
          '',
          originalText,
          `--${boundary}--`
        ].join('\r\n');
        return body;
      })(),
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryIsolationTest'
      }
    });

    assert(docUploadRes.status === 200, 'Document upload to /api/gym-verification/branch/:id/upload succeeds');
    const docUploadData = await docUploadRes.json();
    const uploadedDocId = docUploadData.document?._id || (docUploadData.application?.documents?.[0]?.document);

    // Verify on-disk file is encrypted and does NOT contain raw plain text
    const docDoc = await VerificationDocument.findById(uploadedDocId);
    assert(docDoc && docDoc.iv && docDoc.authTag, 'VerificationDocument stores cryptographic IV and AuthTag');
    const encryptedFileContent = fs.readFileSync(docDoc.filePath);
    assert(!encryptedFileContent.includes(originalText), 'Raw on-disk storage file is authenticated ciphertext with NO plain text leak');

    // Decrypted download test: Authorized Owner receives plaintext
    const dlOwnerRes = await fetch(`${BASE_URL}/api/gym-verification/document/${uploadedDocId}`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const dlOwnerText = await dlOwnerRes.text();
    assert(dlOwnerText === originalText, 'Owner can decrypt and stream original document with verified integrity');

    // Decrypted download test: Unauthorized user blocked
    const otherUser = await User.create({
      name: 'Unrelated User',
      email: 'unrelated@isolation-test.com',
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true
    });
    const otherToken = jwt.sign({ id: otherUser._id, role: otherUser.role }, jwtSecret, { expiresIn: '1d' });
    const dlBlockedRes = await fetch(`${BASE_URL}/api/gym-verification/document/${uploadedDocId}`, {
      headers: { 'Authorization': `Bearer ${otherToken}` }
    });
    assert(dlBlockedRes.status === 403, 'Unauthorized user attempting to access private verification doc receives HTTP 403 Forbidden');

    // Decrypted download test: Admin reviewer can inspect
    const dlAdminRes = await fetch(`${BASE_URL}/api/gym-verification/document/${uploadedDocId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const dlAdminText = await dlAdminRes.text();
    assert(dlAdminText === originalText, 'Privileged Admin reviewer can decrypt and inspect verification document');

    // =========================================================================
    // SECTION 5: SUBMISSION, ADMIN REVIEW & PUBLIC LISTING ISOLATION
    // =========================================================================
    console.log('\n--- 5. ADMIN VERIFICATION REVIEW & PUBLIC DISCOVERY ISOLATION ---');

    // Attempt Submission without mandatory CNIC and Signboard
    const prematureSubmitRes = await fetch(`${BASE_URL}/api/gym-verification/branch/${branch1Id}/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const prematureData = await prematureSubmitRes.json();
    assert(prematureSubmitRes.status === 400 && prematureData.missingRequirements?.length > 0, 'Submission blocked with HTTP 400 when mandatory documents are missing');

    // Upload remaining required documents: CNIC & Entrance Signboard
    for (const docType of ['CNIC', 'EntranceSignboard']) {
      const boundary = '----WebKitFormBoundaryIsolationTest' + docType;
      await fetch(`${BASE_URL}/api/gym-verification/branch/${branch1Id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ownerToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: [
          `--${boundary}`,
          'Content-Disposition: form-data; name="documentType"',
          '',
          docType,
          `--${boundary}`,
          'Content-Disposition: form-data; name="documentLabel"',
          '',
          `${docType} Evidence`,
          `--${boundary}`,
          `Content-Disposition: form-data; name="file"; filename="${docType}.pdf"`,
          'Content-Type: application/pdf',
          '',
          `CONTENT_FOR_${docType}`,
          `--${boundary}--`
        ].join('\r\n')
      });
    }

    // Submit Branch 1 with all mandatory documents attached
    const submitRes = await fetch(`${BASE_URL}/api/gym-verification/branch/${branch1Id}/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 200, 'Branch 1 submitted for verification successfully');
    assert(submitData.referenceId && submitData.referenceId.startsWith('GS-APP-') || submitData.referenceId?.startsWith('GS-VER-'), 'Submission generates official referenceId');

    // Admin Verification Queue
    const queueRes = await fetch(`${BASE_URL}/api/gym-verification/admin/queue`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const queueData = await queueRes.json();
    const appList = Array.isArray(queueData) ? queueData : (queueData.applications || []);
    const queuedApp = appList.find(a => String(a.branch?._id || a.branch) === String(branch1Id));
    assert(Boolean(queuedApp), 'Submitted Branch 1 appears in Admin Verification Queue');

    // Admin Review: APPROVE Branch 1
    const reviewRes = await fetch(`${BASE_URL}/api/gym-verification/admin/review/${queuedApp._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        action: 'APPROVE',
        notes: 'Premises license and physical address verified against commercial register.'
      })
    });
    const reviewData = await reviewRes.json();
    assert(reviewRes.status === 200, 'Admin approves Branch 1');

    const updatedBranch1 = await Gym.findById(branch1Id);
    assert(updatedBranch1.approvalStatus === 'Approved', 'Branch 1 approvalStatus transitions to "Approved"');

    const branch2InDb = await Gym.findById(branch2Id);
    assert(branch2InDb.approvalStatus === 'Draft', 'Branch 2 remains "Draft" (approving one branch does NOT approve others)');

    // Public gym listing: ONLY Approved branches are displayed
    const publicGymsRes = await fetch(`${BASE_URL}/api/gyms`);
    const publicGyms = await publicGymsRes.json();
    const hasBranch1 = publicGyms.some(g => String(g._id) === String(branch1Id));
    const hasBranch2 = publicGyms.some(g => String(g._id) === String(branch2Id));
    assert(hasBranch1 === true, 'Approved Branch 1 is visible in public discovery listings');
    assert(hasBranch2 === false, 'Unapproved Branch 2 is STRICTLY HIDDEN from public discovery listings');

    // IDOR Protection: Public visitor cannot view unapproved branch directly
    const directBranch2Res = await fetch(`${BASE_URL}/api/gyms/${branch2Id}`);
    assert(directBranch2Res.status === 404 || directBranch2Res.status === 403, 'Direct access to unapproved branch by unauthorized visitor is blocked with HTTP 404/403');

    // =========================================================================
    // SECTION 6: SESSION TRACKING, REVOCATION & 2FA TOGGLE
    // =========================================================================
    console.log('\n--- 6. SESSION TRACKING, REVOCATION & 2FA TOGGLE ---');

    // Login user to generate tracked session
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (GymSync Test Agent)'
      },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'Password123!'
      })
    });
    const loginData = await loginRes.json();
    const userSessionToken = loginData.token;

    // View recognized sessions
    const sessionsRes = await fetch(`${BASE_URL}/api/auth/sessions`, {
      headers: { 'Authorization': `Bearer ${userSessionToken}` }
    });
    const sessionsData = await sessionsRes.json();
    assert(sessionsData.sessions.length >= 1, 'GET /api/auth/sessions lists recognized active sessions');
    const currentSession = sessionsData.sessions.find(s => s.isCurrent);
    assert(Boolean(currentSession), 'Current session is recognized and flagged with isCurrent: true');

    // Revoke the session
    const revokeRes = await fetch(`${BASE_URL}/api/auth/sessions/${currentSession._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userSessionToken}` }
    });
    assert(revokeRes.status === 200, 'DELETE /api/auth/sessions/:id revokes targeted session');

    // Attempt request using revoked session token
    const afterRevokeRes = await fetch(`${BASE_URL}/api/auth/sessions`, {
      headers: { 'Authorization': `Bearer ${userSessionToken}` }
    });
    assert(afterRevokeRes.status === 401, 'Request using revoked session token is immediately rejected with HTTP 401');

    // 2FA Toggle validation
    const freshLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'Password123!' })
    });
    const freshData = await freshLoginRes.json();
    const freshToken = freshData.token;

    const enable2FaRes = await fetch(`${BASE_URL}/api/auth/two-factor`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshToken}`
      },
      body: JSON.stringify({ enabled: true })
    });
    const enable2FaData = await enable2FaRes.json();
    assert(enable2FaData.twoFactorEnabled === true, 'PUT /api/auth/two-factor enables 2FA for account');

    // Privileged role cannot disable mandatory 2FA
    const adminDisable2FaRes = await fetch(`${BASE_URL}/api/auth/two-factor`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ enabled: false })
    });
    assert(adminDisable2FaRes.status === 403, 'Privileged SuperAdmin is blocked with HTTP 403 when attempting to disable mandatory 2FA');

  } catch (err) {
    console.error('Unexpected test exception:', err);
    failed++;
  } finally {
    // Cleanup test data
    await User.deleteMany({ email: { $regex: /@isolation-test\.com$/ } });
    await Gym.deleteMany({ name: { $regex: /Isolation Test/ } });
    await Organization.deleteMany({ name: { $regex: /Isolation Org/ } });

    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    console.log(`\n======================================================================`);
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`======================================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runRoleIsolationAndBranchVerificationTests();
