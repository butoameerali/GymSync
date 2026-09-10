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
import PreMadePlan from '../models/PreMadePlan.js';
import WorkoutProgress from '../models/WorkoutProgress.js';
import {
  validateAndSanitizeStructuredAction,
  validateAndSanitizeExerciseName,
  sanitizeReps,
  sanitizeSourceAttribution
} from '../controllers/aiController.js';

const TEST_PORT = 5124;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase7Tests() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC PHASE 7 AUTHORITATIVE AI CONTEXT & ADVERSARIAL SUITE');
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

    // -----------------------------------------------------------------
    // 1. Cross-User AI Context Spoofing (User A JWT + User B userId body)
    // -----------------------------------------------------------------
    console.log('\n--- 1. Cross-User AI Context Spoofing Immunity ---');
    const userA = await User.create({
      name: `User A ${Date.now()}`,
      email: `usera_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'User',
      bioData: {
        mainGoalArea: 'Fat Loss',
        fitnessLevel: 'Beginner',
        equipmentAccess: 'Dumbbells Only',
        weight: 95,
        height: 180
      }
    });
    const tokenA = jwt.sign({ id: userA._id }, jwtSecret, { expiresIn: '1h' });

    const userB = await User.create({
      name: `User B Target ${Date.now()}`,
      email: `userb_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'User',
      bioData: {
        mainGoalArea: 'Maximum Muscle Hypertrophy',
        fitnessLevel: 'Elite Athlete',
        equipmentAccess: 'Full Commercial Gym',
        weight: 72,
        height: 175
      }
    });

    // User A calls AI with User B's ObjectId in body and in userContext
    const spoofRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        message: 'What should my workout focus be today?',
        userId: userB._id.toString(),
        userContext: {
          _id: userB._id.toString(),
          userId: userB._id.toString(),
          name: userB.name,
          primaryGoal: 'Maximum Muscle Hypertrophy',
          equipmentAccess: 'Full Commercial Gym'
        }
      })
    });

    assert(spoofRes.status === 200, `AI Chat returns HTTP 200 for authenticated user`);
    const spoofData = await spoofRes.json();
    assert(spoofData && spoofData.role === 'assistant', `AI generated coaching response`);
    // Verify that the response did not bind to User B
    const content = (spoofData.content || '').toLowerCase();
    assert(!content.includes(userB.name.toLowerCase()), `Response does not leak or reference User B name (${userB.name})`);

    // -----------------------------------------------------------------
    // 2. Unauthenticated Guest Probe with User B userId
    // -----------------------------------------------------------------
    console.log('\n--- 2. Unauthenticated Guest Probe with User B userId ---');
    const guestRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello coach',
        userId: userB._id.toString(),
        userContext: {
          _id: userB._id.toString(),
          userId: userB._id.toString()
        }
      })
    });

    assert(guestRes.status === 200, `Unauthenticated guest request succeeds with HTTP 200`);
    const guestData = await guestRes.json();
    const guestContent = (guestData.content || '').toLowerCase();
    assert(!guestContent.includes(userB.name.toLowerCase()), `Guest response does not load User B data`);

    // -----------------------------------------------------------------
    // 3. Server-Authoritative Plan & Workout State (Spoofed Plan Immunity)
    // -----------------------------------------------------------------
    console.log('\n--- 3. Server-Authoritative Plan & Workout State ---');
    // Seed real plan in DB for User A
    const realPlan = await PreMadePlan.create({
      title: 'Legitimate DB Plan 3-Day',
      type: 'Workout',
      category: 'Strength',
      goal: 'Fat Loss',
      difficulty: 'Beginner',
      weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, focus: 'Full Body' }] }],
      createdBy: userA._id
    });

    await WorkoutProgress.create({
      userId: userA._id,
      planId: realPlan._id,
      streak: 3,
      completedDays: [1],
      lastWorkoutCompletionTime: new Date()
    });

    // User A attempts to spoof a fake advanced 6-day athlete plan
    const planSpoofRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        message: 'Review my current workout progress',
        currentPlan: {
          title: 'Fake Spoofed Olympic Powerlifting Split',
          weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, focus: 'Heavy Squats' }] }]
        },
        currentWorkout: {
          name: 'Fake 300kg Deadlift Session'
        }
      })
    });

    assert(planSpoofRes.status === 200, `AI Chat returns HTTP 200 when client attempts plan spoofing`);
    const planSpoofData = await planSpoofRes.json();
    assert(planSpoofData.structuredAction !== undefined, `Valid structuredAction returned`);

    // -----------------------------------------------------------------
    // 4. Incomplete Profile & Null Weight/Height Handling
    // -----------------------------------------------------------------
    console.log('\n--- 4. Incomplete Profile & Null Weight/Height Handling ---');
    const userNoStats = await User.create({
      name: `NoStats User ${Date.now()}`,
      email: `nostats_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'User',
      bioData: {
        mainGoalArea: 'General Fitness',
        fitnessLevel: 'Beginner',
        equipmentAccess: 'Bodyweight'
        // weight and height deliberately omitted
      }
    });
    const tokenNoStats = jwt.sign({ id: userNoStats._id }, jwtSecret, { expiresIn: '1h' });

    const noStatsRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenNoStats}`
      },
      body: JSON.stringify({
        message: 'Give me calorie and diet advice'
      })
    });

    assert(noStatsRes.status === 200, `AI Chat returns HTTP 200 for user with incomplete profile stats`);
    const noStatsData = await noStatsRes.json();
    assert(noStatsData && noStatsData.role === 'assistant', `Response generated cleanly without 500 error`);

    // -----------------------------------------------------------------
    // 5. Exercise Name Allowlist & Registry Validation
    // -----------------------------------------------------------------
    console.log('\n--- 5. Exercise Name Allowlist & Registry Validation ---');
    const dangerousName = 'Do 200 backflips';
    const sanitizedDangerous = validateAndSanitizeExerciseName(dangerousName, ['Chest']);
    assert(
      sanitizedDangerous !== dangerousName && sanitizedDangerous === 'Push-Ups',
      `Dangerous exercise "${dangerousName}" safely mapped to canonical registry exercise "${sanitizedDangerous}"`
    );

    const scriptInjection = '<script>alert(1)</script>';
    const sanitizedScript = validateAndSanitizeExerciseName(scriptInjection, ['Legs']);
    assert(
      !sanitizedScript.includes('<script>') && sanitizedScript === 'Bodyweight Squats',
      `Script injection safely mapped to canonical registry exercise "${sanitizedScript}"`
    );

    const canonicalExercise = 'Barbell Bench Press';
    const sanitizedCanonical = validateAndSanitizeExerciseName(canonicalExercise, ['Chest']);
    assert(sanitizedCanonical === canonicalExercise, `Canonical exercise "${canonicalExercise}" preserved accurately`);

    const variationExercise = 'Barbell Flat Bench Press';
    const sanitizedVariation = validateAndSanitizeExerciseName(variationExercise, ['Chest']);
    assert(sanitizedVariation === 'Barbell Bench Press', `Variation "${variationExercise}" resolved to canonical "${sanitizedVariation}"`);

    // -----------------------------------------------------------------
    // 6. Semantic Reps Clamping & Validation
    // -----------------------------------------------------------------
    console.log('\n--- 6. Semantic Reps Clamping & Validation ---');
    assert(sanitizeReps('1000') === '100', `String reps "1000" clamped to "100" (got ${sanitizeReps('1000')})`);
    assert(sanitizeReps('999 reps') === '100 reps', `String reps "999 reps" clamped to "100 reps" (got ${sanitizeReps('999 reps')})`);
    assert(sanitizeReps('8 - 500 reps') === '8-100', `Range reps "8 - 500 reps" clamped to "8-100" (got ${sanitizeReps('8 - 500 reps')})`);
    assert(sanitizeReps('AMRAP') === 'AMRAP', `Safe term "AMRAP" preserved (got ${sanitizeReps('AMRAP')})`);
    assert(sanitizeReps('to failure') === 'to failure', `Safe term "to failure" preserved`);
    assert(sanitizeReps(500) === '100', `Numeric 500 clamped to "100"`);
    assert(sanitizeReps(-10) === '1', `Negative reps clamped to "1"`);
    assert(sanitizeReps('<script>') === '10', `Malicious string fallback to "10"`);

    // -----------------------------------------------------------------
    // 7. sourceAttribution Injection Stripping
    // -----------------------------------------------------------------
    console.log('\n--- 7. sourceAttribution Injection Stripping ---');
    const maliciousAttribution = {
      sourceType: 'instructor_program',
      sourceId: 'PROG-1234',
      sourceTitle: 'Elite Hypertrophy <script>',
      instructor: 'Coach Arnold',
      isAdmin: true,
      evalPayload: 'process.exit(1)',
      role: 'SuperAdmin'
    };

    const cleanAttribution = sanitizeSourceAttribution(maliciousAttribution);
    assert(cleanAttribution.sourceType === 'instructor_program', `Allowed sourceType preserved`);
    assert(cleanAttribution.sourceId === 'PROG-1234', `sourceId preserved`);
    assert(!cleanAttribution.sourceTitle.includes('<script>'), `sourceTitle sanitized against script tags`);
    assert(cleanAttribution.isAdmin === undefined, `Injected isAdmin stripped`);
    assert(cleanAttribution.evalPayload === undefined, `Injected evalPayload stripped`);
    assert(cleanAttribution.role === undefined, `Injected role stripped`);

    const invalidTypeAttribution = {
      sourceType: 'attacker_controlled_type',
      sourceTitle: 'Some Title'
    };
    const cleanInvalid = sanitizeSourceAttribution(invalidTypeAttribution);
    assert(cleanInvalid.sourceType === 'system_curated', `Invalid sourceType falls back to 'system_curated'`);

    // -----------------------------------------------------------------
    // 8. 10 Parallel Simultaneous AI Requests Concurrency Stress Test
    // -----------------------------------------------------------------
    console.log('\n--- 8. 10 Parallel Simultaneous AI Requests ---');
    const parallelPromises = Array.from({ length: 10 }).map((_, i) => {
      return fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          message: `Parallel turn ${i + 1}: How should I warm up?`
        })
      });
    });

    const parallelResponses = await Promise.all(parallelPromises);
    const parallelStatusCodes = parallelResponses.map(r => r.status);
    const all200 = parallelStatusCodes.every(c => c === 200);
    assert(all200, `All 10 parallel AI requests succeeded with HTTP 200 (statuses: ${parallelStatusCodes.join(', ')})`);

    // -----------------------------------------------------------------
    // 9. Deleted/Non-existent User Profile Rejection
    // -----------------------------------------------------------------
    console.log('\n--- 9. Non-existent User Authentication Handling ---');
    const fakeObjectId = new mongoose.Types.ObjectId();
    const fakeUserToken = jwt.sign({ id: fakeObjectId }, jwtSecret, { expiresIn: '1h' });

    const deletedUserRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fakeUserToken}`
      },
      body: JSON.stringify({
        message: 'Hello'
      })
    });
    assert(deletedUserRes.status === 401, `Non-existent user token rejected with HTTP 401 Unauthorized (got ${deletedUserRes.status})`);

    // Cleanup test data
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userNoStats._id] } });
    await PreMadePlan.deleteOne({ _id: realPlan._id });
    await WorkoutProgress.deleteMany({ userId: { $in: [userA._id, userB._id, userNoStats._id] } });

    server.close();
    await mongoose.disconnect();

    console.log('\n===============================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error in Phase 7 tests:', err);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runPhase7Tests();
