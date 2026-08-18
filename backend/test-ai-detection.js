import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5005;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';

async function runAIDetectionTestSuite() {
  console.log('====================================================');
  console.log('🏋️ GymSync Optional AI Exercise Architecture Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function runTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`[PASS] ✅ TEST ${totalTests}: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`[FAIL] ❌ TEST ${totalTests}: ${name} -> Error: ${err.message}`);
    }
  }

  // Register FitnessInstructor user to acquire valid token
  const instructorEmail = `ai_instructor_${Date.now()}@gymsync.com`;
  const regInstructor = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'AI Instructor', email: instructorEmail, password: 'password123', role: 'FitnessInstructor' })
  }).then(r => r.json());

  const adminToken = regInstructor.token;

  // TEST 1: Create Exercise without AI
  let noAiExerciseId;
  await runTest('Create exercise without AI (aiDetection.enabled = false)', async () => {
    const res = await fetch(`${BASE_URL}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Standard Bench Press',
        targetMuscles: ['Chest'],
        aiDetection: { enabled: false }
      })
    });

    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const data = await res.json();
    noAiExerciseId = data._id;
    if (data.aiDetection?.enabled !== false || data.aiDetection?.detectorId !== null) {
      throw new Error('aiDetection not correctly set to false/null');
    }
  });

  // TEST 2: Create Exercise with registered safe AI detector
  let aiExerciseId;
  await runTest('Create exercise with valid registered detector (pushup_v1)', async () => {
    const res = await fetch(`${BASE_URL}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'AI Push-up',
        targetMuscles: ['Chest', 'Triceps'],
        aiDetection: { enabled: true, detectorId: 'pushup_v1' }
      })
    });

    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const data = await res.json();
    aiExerciseId = data._id;
    if (data.aiDetection?.enabled !== true || data.aiDetection?.detectorId !== 'pushup_v1') {
      throw new Error('aiDetection not set correctly for pushup_v1');
    }
  });

  // TEST 3: Reject unregistered / malicious detectorId
  await runTest('Reject unregistered detectorId (e.g. malicious_path.js)', async () => {
    const res = await fetch(`${BASE_URL}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Malicious Exercise',
        aiDetection: { enabled: true, detectorId: '../../malicious.js' }
      })
    });

    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
  });

  // TEST 4: Update exercise to toggle AI Detection
  await runTest('Update exercise to enable AI Detection', async () => {
    const res = await fetch(`${BASE_URL}/api/exercises/${noAiExerciseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        aiDetection: { enabled: true, detectorId: 'pushup_v1' }
      })
    });

    if (res.status !== 200) throw new Error(`Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    if (data.aiDetection?.enabled !== true || data.aiDetection?.detectorId !== 'pushup_v1') {
      throw new Error('Failed to enable AI Detection on update');
    }
  });

  // Clean up created exercises
  if (noAiExerciseId) await fetch(`${BASE_URL}/api/exercises/${noAiExerciseId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } });
  if (aiExerciseId) await fetch(`${BASE_URL}/api/exercises/${aiExerciseId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } });

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('====================================================\n');
}

runAIDetectionTestSuite();
