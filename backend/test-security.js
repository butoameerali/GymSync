import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5005;
const BASE_URL = process.env.TEST_BASE_URL || `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';

async function runSecurityTestSuite() {
  console.log('====================================================');
  console.log('🔒 GymSync Security & Authentication Audit Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const results = [];

  async function runTest(id, name, fn) {
    totalTests++;
    try {
      const status = await fn();
      console.log(`[PASS] ✅ TEST ${id}: ${name} -> Received HTTP ${status}`);
      passedTests++;
      results.push({ id, name, status, passed: true });
    } catch (err) {
      console.error(`[FAIL] ❌ TEST ${id}: ${name} -> Error: ${err.message}`);
      results.push({ id, name, error: err.message, passed: false });
    }
  }

  // Generate tokens for testing
  const adminEmail = `sec_admin_${Date.now()}@gymsync.com`;
  const ownerEmail = `sec_owner_${Date.now()}@gymsync.com`;
  const userAEmail = `sec_usera_${Date.now()}@gymsync.com`;
  const userBEmail = `sec_userb_${Date.now()}@gymsync.com`;
  const bannedEmail = `sec_banned_${Date.now()}@gymsync.com`;

  // Register users & get genuine Admin token
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gymsync.com', password: 'admin123' })
  }).then(r => r.json());

  const regUserA = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User Alice', email: userAEmail, password: 'password123', role: 'User' })
  }).then(r => r.json());

  const regUserB = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User Bob', email: userBEmail, password: 'password123', role: 'User' })
  }).then(r => r.json());

  const regBanned = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Banned User', email: bannedEmail, password: 'password123', role: 'User' })
  }).then(r => r.json());

  const adminToken = adminLogin.token;
  const userAToken = regUserA.token;
  const userBToken = regUserB.token;
  const bannedToken = regBanned.token;

  // Ban the banned user via Admin API
  await fetch(`${BASE_URL}/api/admin/users/${regBanned._id}/ban`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ isBanned: true, banReason: 'Testing ban' })
  });

  // TEST 1: No Authorization header
  await runTest(1, 'No Authorization header to protected endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 2: Authorization: Bearer invalidtoken
  await runTest(2, 'Authorization: Bearer invalidtoken', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': 'Bearer invalidtoken' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 3: Authorization: Bearer expiredtoken
  await runTest(3, 'Authorization: Bearer expiredtoken', async () => {
    const expiredToken = jwt.sign({ id: regUserA._id }, JWT_SECRET, { expiresIn: -10 });
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 4: x-user-name: admin without JWT
  await runTest(4, 'x-user-name: admin without JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'x-user-name': 'admin' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 5: x-user-name: owner without JWT
  await runTest(5, 'x-user-name: owner without JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/gym-owner/dashboard/someowner`, {
      headers: { 'x-user-name': 'owner' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 6: x-user-name: admin + x-user-role: Admin without JWT
  await runTest(6, 'x-user-name: admin + x-user-role: Admin without JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'x-user-name': 'admin', 'x-user-role': 'Admin' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 7: Valid normal User JWT -> Admin endpoint
  await runTest(7, 'Valid normal User JWT -> Admin endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    return res.status;
  });

  // TEST 8: Valid Admin JWT -> Admin endpoint
  await runTest(8, 'Valid Admin JWT -> Admin endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return res.status;
  });

  // TEST 9: Valid User JWT + x-user-role: Admin
  await runTest(9, 'Valid User JWT + x-user-role: Admin header', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${userAToken}`, 'x-user-role': 'Admin' }
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    return res.status;
  });

  // TEST 10: Valid User JWT + x-user-name: admin
  await runTest(10, 'Valid User JWT + x-user-name: admin header', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${userAToken}`, 'x-user-name': 'admin' }
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    return res.status;
  });

  // TEST 11: Unauthenticated POST /api/exercises
  await runTest(11, 'Unauthenticated POST /api/exercises', async () => {
    const res = await fetch(`${BASE_URL}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Exercise' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 12: Normal User POST /api/exercises
  await runTest(12, 'Normal User POST /api/exercises', async () => {
    const res = await fetch(`${BASE_URL}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
      body: JSON.stringify({ name: 'Test Exercise' })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    return res.status;
  });

  // TEST 13: Admin POST /api/exercises
  await runTest(13, 'Admin POST /api/exercises', async () => {
    const res = await fetch(`${BASE_URL}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Test Exercise Admin', equipmentRequired: 'Dumbbell' })
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    return res.status;
  });

  // TEST 14: Valid JWT for normal user + JWT payload role manipulation
  await runTest(14, 'Valid JWT for normal user + fake payload role Admin', async () => {
    const forgedRoleToken = jwt.sign({ id: regUserA._id, role: 'Admin' }, JWT_SECRET);
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${forgedRoleToken}` }
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    return res.status;
  });

  // TEST 15: Banned user with previously valid JWT
  await runTest(15, 'Banned user with previously valid JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/users/profile-pic`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bannedToken}` },
      body: JSON.stringify({ profilePic: 'http://example.com/pic.png' })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    return res.status;
  });

  // TEST 16: Deleted user with previously valid JWT
  await runTest(16, 'Deleted user with previously valid JWT', async () => {
    const tempUser = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Temp Delete Me', email: `temp_${Date.now()}@gymsync.com`, password: 'password123' })
    }).then(r => r.json());

    // Delete temp user via Admin
    await fetch(`${BASE_URL}/api/admin/users/${tempUser._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    // Try accessing protected route with deleted user's token
    const res = await fetch(`${BASE_URL}/api/users/profile-pic`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempUser.token}` },
      body: JSON.stringify({ profilePic: 'http://example.com/pic.png' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 17: x-user-name + x-user-role + x-user-email without JWT
  await runTest(17, 'x-user-name + x-user-role + x-user-email without JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'x-user-name': 'Admin', 'x-user-role': 'Admin', 'x-user-email': 'admin@gymsync.com' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return res.status;
  });

  // TEST 18: User B attempting to edit/delete User A's reply
  await runTest(18, "User B attempting to edit/delete User A's reply", async () => {
    // User A creates post, comment, reply
    const postRes = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
      body: JSON.stringify({ content: 'Test post for replies' })
    }).then(r => r.json());

    const commentsRes = await fetch(`${BASE_URL}/api/posts/${postRes._id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
      body: JSON.stringify({ text: 'Comment by User A' })
    }).then(r => r.json());

    const commentId = commentsRes[0]._id;

    const repliesRes = await fetch(`${BASE_URL}/api/posts/${postRes._id}/comment/${commentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
      body: JSON.stringify({ text: "Reply by User A" })
    }).then(r => r.json());

    const replyId = repliesRes[0].replies[0]._id;

    // User B attempts to edit User A's reply
    const editRes = await fetch(`${BASE_URL}/api/posts/${postRes._id}/comment/${commentId}/reply/${replyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userBToken}` },
      body: JSON.stringify({ text: "Hacked reply by User B" })
    });

    if (editRes.status !== 403) throw new Error(`Expected 403 for unauthorized reply edit, got ${editRes.status}`);
    return editRes.status;
  });

  // TEST 19: User B attempting to modify User A's follow/friend relationship
  await runTest(19, "User B attempting to modify User A's relationship via fake payload", async () => {
    const res = await fetch(`${BASE_URL}/api/users/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userBToken}` },
      body: JSON.stringify({ followerName: 'User Alice', targetName: 'Security Admin' })
    }).then(r => r.json());

    // Verify it follows as User Bob (req.user.name), NOT User Alice
    if (res.message.includes('User Alice')) throw new Error('Identity spoofing succeeded in follow endpoint');
    return 200;
  });

  // TEST 20: Normal user attempting every privileged role endpoint
  await runTest(20, 'Normal user attempting privileged admin & store endpoints', async () => {
    const endpoints = [
      { url: `${BASE_URL}/api/admin/users`, method: 'GET' },
      { url: `${BASE_URL}/api/admin/gyms/pending`, method: 'GET' },
      { url: `${BASE_URL}/api/admin/audit-logs`, method: 'GET' },
      { url: `${BASE_URL}/api/store/products`, method: 'POST' },
      { url: `${BASE_URL}/api/payments/pending`, method: 'GET' }
    ];

    for (const ep of endpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` }
      });
      if (res.status !== 403) throw new Error(`Endpoint ${ep.url} returned ${res.status} instead of 403`);
    }
    return 403;
  });
  // TEST 21: Self-registering as SuperAdmin is rejected with 403
  await runTest(21, 'Self-registering as SuperAdmin rejected (privilege escalation protection)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker User',
        email: `hacker_${Date.now()}@example.com`,
        password: 'password123',
        role: 'SuperAdmin'
      })
    });
    if (res.status !== 403) throw new Error(`Registration with role SuperAdmin returned ${res.status} instead of 403`);
    return 403;
  });

  // TEST 22: User B attempting to modify User A's gym profile (IDOR)
  await runTest(22, 'User B attempting to modify User A gym profile via URL ID (IDOR protection)', async () => {
    const res = await fetch(`${BASE_URL}/api/gym-owner/gym/60d5ecb8b5c9c824c8b45678`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userBToken}` },
      body: JSON.stringify({ name: 'Hacked Gym Name' })
    });
    if (res.status !== 403 && res.status !== 404) throw new Error(`IDOR gym modification returned ${res.status} instead of 403/404`);
    return res.status;
  });

  // TEST 23: Password reset OTP bypass rejection (skipping verify-otp)
  await runTest(23, 'Password reset directly calling reset-password without verify-otp is rejected', async () => {
    const otpUserEmail = `otp_victim_${Date.now()}@gymsync.com`;
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'OTP Victim', email: otpUserEmail, password: 'password123', role: 'User' })
    });

    // Step 1: Request OTP
    await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpUserEmail })
    });

    // Step 2: Skip verify-otp and attempt reset-password immediately
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpUserEmail, newPassword: 'hackedpassword123' })
    });

    if (resetRes.status !== 400) throw new Error(`Expected 400 for unverified reset attempt, got ${resetRes.status}`);
    return resetRes.status;
  });

  // TEST 24: Stripe PaymentIntent duplicate replay rejection
  await runTest(24, 'Duplicate Stripe PaymentIntent replay is rejected with 409 Conflict', async () => {
    const transactionRef = `pi_test_replay_${Date.now()}`;
    
    // First creation (with test bypass flag enabled)
    const firstRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
      body: JSON.stringify({
        paymentId: `PAY_REPLAY_1_${Date.now()}`,
        paymentMethod: 'Stripe',
        paymentType: 'GymMembership',
        amount: 29.99,
        transactionRef
      })
    });

    // Second creation using same transactionRef
    const secondRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userBToken}` },
      body: JSON.stringify({
        paymentId: `PAY_REPLAY_2_${Date.now()}`,
        paymentMethod: 'Stripe',
        paymentType: 'GymMembership',
        amount: 29.99,
        transactionRef
      })
    });

    if (secondRes.status !== 409) throw new Error(`Expected 409 for duplicate PaymentIntent replay, got ${secondRes.status}`);
    return secondRes.status;
  });

  // TEST 25: Unconfigured / invalid Stripe PaymentIntent status rejection
  await runTest(25, 'Unconfigured/invalid Stripe PaymentIntent reference is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAToken}` },
      body: JSON.stringify({
        paymentId: `PAY_INVALID_STRIPE_${Date.now()}`,
        paymentMethod: 'Stripe',
        paymentType: 'GymMembership',
        amount: 50.00,
        transactionRef: `invalid_ref_non_pi_${Date.now()}`
      })
    });

    if (res.status !== 400 && res.status !== 500) throw new Error(`Expected 400 or 500 for invalid Stripe ref, got ${res.status}`);
    return res.status;
  });

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('====================================================\n');
}

runSecurityTestSuite();
