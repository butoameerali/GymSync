import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5005';

let testResults = [];

function recordTest(name, category, pass, details, severity = null) {
  testResults.push({ name, category, pass, details, severity });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] ${category} :: ${name} - ${details}`);
}

async function runLiveE2EQATestSuite() {
  console.log('====================================================');
  console.log('🧪 GymSync Live End-to-End QA Test Suite');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const userAEmail = `e2e_usera_${timestamp}@example.com`;
  const userBEmail = `e2e_userb_${timestamp}@example.com`;
  const userCEmail = `e2e_userc_${timestamp}@example.com`;
  const instructorEmail = `e2e_instructor_${timestamp}@example.com`;
  const ownerEmail = `e2e_owner_${timestamp}@example.com`;
  const adminEmail = `e2e_admin_${timestamp}@example.com`;

  let userAToken, userBToken, userCToken, instructorToken, ownerToken, adminToken;
  let userAId, userBId, userCId, instructorId, ownerId, adminId;
  let createdGymId, createdPostId, createdCommentId, createdReplyId;

  // ----------------------------------------------------
  // 1. AUTHENTICATION & REGISTRATION
  // ----------------------------------------------------
  console.log('--- 1. AUTHENTICATION QA ---');

  // Register User A
  let res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `User A ${timestamp}`, email: userAEmail, password: 'password123', role: 'User' })
  });
  let data = await res.json();
  if (res.status === 201 && data.token) {
    userAToken = data.token;
    userAId = data._id;
    recordTest('User A Registration & Token Issue', 'AUTH', true, `Token issued for User A (${data.email})`);
  } else {
    recordTest('User A Registration & Token Issue', 'AUTH', false, `Status ${res.status}: ${data.message}`, 'P0');
  }

  // Register User B
  res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `User B ${timestamp}`, email: userBEmail, password: 'password123', role: 'User' })
  });
  data = await res.json();
  if (res.status === 201) {
    userBToken = data.token;
    userBId = data._id;
    recordTest('User B Registration', 'AUTH', true, `User B created`);
  } else {
    recordTest('User B Registration', 'AUTH', false, data.message, 'P0');
  }

  // Register User C
  res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `User C ${timestamp}`, email: userCEmail, password: 'password123', role: 'User' })
  });
  data = await res.json();
  if (res.status === 201) {
    userCToken = data.token;
    userCId = data._id;
  }

  // Register FitnessInstructor
  res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Instructor ${timestamp}`, email: instructorEmail, password: 'password123', role: 'FitnessInstructor' })
  });
  data = await res.json();
  if (res.status === 201) {
    instructorToken = data.token;
    instructorId = data._id;
    recordTest('FitnessInstructor Registration', 'AUTH', true, 'Role assigned as FitnessInstructor');
  }

  // Register GymOwner
  res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `GymOwner ${timestamp}`, email: ownerEmail, password: 'password123', role: 'GymOwner' })
  });
  data = await res.json();
  if (res.status === 201) {
    ownerToken = data.token;
    ownerId = data._id;
    recordTest('GymOwner Registration', 'AUTH', true, 'Role assigned as GymOwner');
  }

  // Register Admin
  res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Admin ${timestamp}`, email: adminEmail, password: 'password123', role: 'Admin' })
  });
  data = await res.json();
  if (res.status === 201) {
    adminToken = data.token;
    adminId = data._id;
    recordTest('Admin Registration', 'AUTH', true, 'Role assigned as Admin');
  }

  // Test Wrong Password Login
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAEmail, password: 'wrongpassword' })
  });
  recordTest('Wrong Password Login Rejection', 'AUTH', res.status === 401, `Status ${res.status} returned`);

  // ----------------------------------------------------
  // 2. ROLE AUTHORIZATION QA
  // ----------------------------------------------------
  console.log('\n--- 2. ROLE AUTHORIZATION QA ---');

  // Normal User hitting Admin Stats -> Should return 403
  res = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  recordTest('Normal User Blocked from Admin Panel', 'RBAC', res.status === 403, `Status ${res.status} (Forbidden)`);

  // Admin hitting Admin Stats -> Should return 200
  res = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  recordTest('Admin Authorized for Admin Panel', 'RBAC', res.status === 200, `Status ${res.status} (OK)`);

  // FitnessInstructor creating Exercise -> Should return 201
  res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instructorToken}` },
    body: JSON.stringify({
      name: `Instructor Exercise ${timestamp}`,
      targetMuscles: ['Chest', 'Triceps'],
      equipmentRequired: 'Dumbbells',
      difficulty: 'Intermediate',
      description: 'E2E test exercise created by FitnessInstructor',
      aiDetection: { enabled: true, detectorId: 'pushup_v1' }
    })
  });
  data = await res.json();
  const createdExerciseId = data._id;
  recordTest('FitnessInstructor Allowed to Create Exercise', 'RBAC', res.status === 201, `Created exercise ID: ${createdExerciseId}`);

  // FitnessInstructor attempting to access Admin Stats -> Should return 403
  res = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${instructorToken}` }
  });
  recordTest('FitnessInstructor Blocked from Admin Stats', 'RBAC', res.status === 403, `Status ${res.status}`);

  // ----------------------------------------------------
  // 3. EXERCISE LIBRARY & OPTIONAL AI DETECTOR QA
  // ----------------------------------------------------
  console.log('\n--- 3. EXERCISE & AI DETECTOR QA ---');

  // Fetch Exercises Search
  res = await fetch(`${BASE_URL}/api/exercises?search=Chest`);
  data = await res.json();
  recordTest('Exercise Library Search & Filter', 'EXERCISES', res.status === 200 && Array.isArray(data), `Returned ${data.length} exercises`);

  // Create Malicious Detector Exercise -> Should return 400
  res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Malicious AI Exercise ${timestamp}`,
      targetMuscles: ['Core'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      description: 'Test invalid detector path',
      aiDetection: { enabled: true, detectorId: '../../malicious.js' }
    })
  });
  recordTest('Server Rejects Malicious Unregistered Detector', 'AI_DETECTOR', res.status === 400, `Status ${res.status} Bad Request`);

  // ----------------------------------------------------
  // 4. GYM MANAGEMENT & MEMBERSHIP FLOW QA
  // ----------------------------------------------------
  console.log('\n--- 4. GYM MANAGEMENT & MEMBERSHIP QA ---');

  const gymName = `E2E Fitness Gym ${timestamp}`;

  // GymOwner registers Gym Profile
  res = await fetch(`${BASE_URL}/api/gym-owner/gym/new`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: gymName,
      location: '123 E2E QA Way',
      description: 'Top-tier GymSync verified gym facility',
      facilities: ['Locker Rooms', 'Cardio Deck', 'Free Weights'],
      monthlyFee: 50,
      admissionFee: 20
    })
  });
  data = await res.json();
  createdGymId = data._id || data.gym?._id;
  recordTest('GymOwner Registers Gym Facility', 'GYM', res.status === 200 || res.status === 201, `Gym ID: ${createdGymId}`);

  // Admin Approves Gym
  if (createdGymId) {
    res = await fetch(`${BASE_URL}/api/admin/gyms/${createdGymId}/approval`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Approved' })
    });
    recordTest('Admin Approves Gym Facility', 'GYM', res.status === 200, `Approved gym status`);
  }

  // GymOwner Check-in Member
  res = await fetch(`${BASE_URL}/api/gym-owner/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ gymId: createdGymId, memberName: `User A ${timestamp}` })
  });
  data = await res.json();
  const attendanceId = data._id || data.attendance?._id;
  recordTest('GymOwner Check-In Member Attendance', 'ATTENDANCE', res.status === 201 || res.status === 200, `Check-in ID: ${attendanceId}`);

  // GymOwner Check-out Member
  if (attendanceId) {
    res = await fetch(`${BASE_URL}/api/gym-owner/attendance/check-out/${attendanceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    recordTest('GymOwner Check-Out Member Attendance', 'ATTENDANCE', res.status === 200, `Check-out timestamp updated`);
  }

  // ----------------------------------------------------
  // 5. SOCIAL FEED & PRIVACY QA
  // ----------------------------------------------------
  console.log('\n--- 5. SOCIAL FEED & PRIVACY QA ---');

  // User A Create Post
  res = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
    body: JSON.stringify({ content: `User A E2E post content ${timestamp}` })
  });
  data = await res.json();
  createdPostId = data._id;
  recordTest('User A Creates Social Post', 'SOCIAL', res.status === 201, `Post ID: ${createdPostId}`);

  // User B Likes User A's Post
  if (createdPostId) {
    res = await fetch(`${BASE_URL}/api/posts/${createdPostId}/like`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    recordTest('User B Likes User A Post', 'SOCIAL', res.status === 200, `Post liked`);

    // User B Comments on User A's Post
    res = await fetch(`${BASE_URL}/api/posts/${createdPostId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({ text: 'Great post User A!' })
    });
    data = await res.json();
    const commentObj = data.comments?.[data.comments.length - 1];
    createdCommentId = commentObj?._id;
    recordTest('User B Comments on User A Post', 'SOCIAL', res.status === 200, `Comment ID: ${createdCommentId}`);

    // User A Replies to User B's Comment
    if (createdCommentId) {
      res = await fetch(`${BASE_URL}/api/posts/${createdPostId}/comment/${createdCommentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
        body: JSON.stringify({ text: 'Thanks User B!' })
      });
      data = await res.json();
      const commentWithReply = data.comments?.find(c => String(c._id) === String(createdCommentId));
      createdReplyId = commentWithReply?.replies?.[0]?._id;
      recordTest('User A Replies to Comment', 'SOCIAL', res.status === 200, `Reply ID: ${createdReplyId}`);

      // User B attempts to Delete User A's Reply -> Should return 403 Forbidden
      if (createdReplyId) {
        res = await fetch(`${BASE_URL}/api/posts/${createdPostId}/comment/${createdCommentId}/reply/${createdReplyId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userBToken}` }
        });
        recordTest('User B Blocked from Deleting User A Reply', 'SOCIAL', res.status === 403, `Status ${res.status} (Forbidden)`);
      }
    }
  }

  // User B Sends Friend Request to User A
  res = await fetch(`${BASE_URL}/api/users/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
    body: JSON.stringify({ receiverName: `User A ${timestamp}` })
  });
  recordTest('User B Sends Friend Request to User A', 'SOCIAL', res.status === 200, `Request sent`);

  // User A Accepts Friend Request
  res = await fetch(`${BASE_URL}/api/users/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
    body: JSON.stringify({ senderName: `User B ${timestamp}` })
  });
  recordTest('User A Accepts Friend Request', 'SOCIAL', res.status === 200, `Request accepted`);

  // ----------------------------------------------------
  // 6. PRIVATE CHAT & IDOR QA
  // ----------------------------------------------------
  console.log('\n--- 6. PRIVATE CHAT & IDOR QA ---');

  // User A sends private message to User B
  res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
    body: JSON.stringify({ receiver: `User B ${timestamp}`, text: 'Hello User B, private chat test!' })
  });
  recordTest('User A Sends Private Chat to User B', 'CHAT', res.status === 201, `Message sent`);

  // User B fetches conversation with User A -> Should return 200
  res = await fetch(`${BASE_URL}/api/chat/User A ${timestamp}/User B ${timestamp}`, {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  recordTest('User B Accesses Own Private Conversation', 'CHAT', res.status === 200, `Chat messages retrieved`);

  // User C attempts to access User A & B conversation -> Should return 403 Forbidden
  res = await fetch(`${BASE_URL}/api/chat/User A ${timestamp}/User B ${timestamp}`, {
    headers: { Authorization: `Bearer ${userCToken}` }
  });
  recordTest('User C Blocked from Reading User A & B Private Chat (IDOR)', 'CHAT', res.status === 403, `Status ${res.status} (Forbidden)`);

  // ----------------------------------------------------
  // 7. NOTIFICATIONS & IDOR QA
  // ----------------------------------------------------
  console.log('\n--- 7. NOTIFICATIONS QA ---');

  // User A fetches own notifications -> Should return 200
  res = await fetch(`${BASE_URL}/api/notifications/${userAId}`, {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  recordTest('User A Accesses Own Notifications', 'NOTIFICATIONS', res.status === 200, `Notifications fetched`);

  // User C attempts to fetch User A notifications -> Should return 403 Forbidden
  res = await fetch(`${BASE_URL}/api/notifications/${userAId}`, {
    headers: { Authorization: `Bearer ${userCToken}` }
  });
  recordTest('User C Blocked from Reading User A Notifications (IDOR)', 'NOTIFICATIONS', res.status === 403, `Status ${res.status} (Forbidden)`);

  // ----------------------------------------------------
  // 8. STORE & E-COMMERCE QA
  // ----------------------------------------------------
  console.log('\n--- 8. STORE & E-COMMERCE QA ---');

  // Fetch Store Products
  res = await fetch(`${BASE_URL}/api/store/products`);
  data = await res.json();
  recordTest('Fetch Store Products Catalog', 'STORE', res.status === 200 && Array.isArray(data), `Returned ${data.length} products`);

  // ----------------------------------------------------
  // 9. SUMMARY OF RESULTS
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('📊 LIVE E2E QA TEST SUITE SUMMARY');
  console.log('====================================================');

  const total = testResults.length;
  const passed = testResults.filter(t => t.pass).length;
  const failed = testResults.filter(t => !t.pass).length;

  console.log(`Total Scenarios Tested: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runLiveE2EQATestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
