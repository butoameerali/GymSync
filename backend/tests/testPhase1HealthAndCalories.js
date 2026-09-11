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
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import { estimateExerciseCalories } from '../services/workout/exerciseRegistry.js';

const TEST_PORT = 5126;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase1Tests() {
  console.log('===============================================================');
  console.log('🧪 GYMSYNC PHASE 1: HEALTH BIO, CALORIE LOGGING & YOURGYM SUITE');
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
    // Clean up test data
    // -----------------------------------------------------------------
    await User.deleteMany({ email: { $in: ['phase1_alice@gymsync.test', 'phase1_bob@gymsync.test'] } });
    await PreMadePlan.deleteMany({ title: 'Phase 1 Test Starter Plan' });
    await UserWorkoutProgram.deleteMany({ userName: { $in: ['Phase1_Alice', 'Phase1_Bob'] } });

    // Seed users
    const alice = await User.create({
      name: 'Phase1_Alice',
      email: 'phase1_alice@gymsync.test',
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true,
      gymAutoRenew: true,
      gymMembershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      bioData: {
        weight: 65,
        height: 168,
        trainingDaysPerWeek: 4,
        equipmentAccess: 'Full Gym'
      }
    });

    const bob = await User.create({
      name: 'Phase1_Bob',
      email: 'phase1_bob@gymsync.test',
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true,
      bioData: {
        weight: 80,
        height: 180
      }
    });

    const aliceToken = jwt.sign({ id: alice._id }, jwtSecret, { expiresIn: '1h' });
    const bobToken = jwt.sign({ id: bob._id }, jwtSecret, { expiresIn: '1h' });

    // =================================================================
    // SECTION 1: HEALTH / MEDICAL / DIETARY BIO PERSISTENCE & WHITELIST
    // =================================================================
    console.log('\n--- 1. Health, Medical & Dietary Bio Persistence ---');

    // Alice updates bio with health/diet fields
    const bioPayload = {
      jointPain: ['Knee', 'Lower Back'],
      injuries: ['Rotator Cuff'],
      medicalConditions: ['Mild Asthma'],
      limitations: ['Avoid overhead lockouts'],
      foodPreferences: ['Halal', 'High Protein', 'Lactose Intolerant'],
      injectedDangerousField: 'ATTACKER_VALUE',
      isBanned: true
    };

    const bioRes = await fetch(`${BASE_URL}/api/users/bio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify(bioPayload)
    });

    assert(bioRes.status === 200, `PUT /api/users/bio returned 200 OK (got ${bioRes.status})`);
    const bioData = await bioRes.json();

    assert(Array.isArray(bioData.bioData?.jointPain) && bioData.bioData.jointPain.includes('Knee'), 'jointPain correctly persisted as string array');
    assert(bioData.bioData?.jointPain.includes('Lower Back'), 'jointPain includes multiple selected items');
    assert(Array.isArray(bioData.bioData?.injuries) && bioData.bioData.injuries.includes('Rotator Cuff'), 'injuries correctly persisted as string array');
    assert(Array.isArray(bioData.bioData?.medicalConditions) && bioData.bioData.medicalConditions.includes('Mild Asthma'), 'medicalConditions correctly persisted');
    assert(Array.isArray(bioData.bioData?.limitations) && bioData.bioData.limitations.includes('Avoid overhead lockouts'), 'limitations correctly persisted');
    assert(typeof bioData.bioData?.foodPreferences === 'string' && bioData.bioData.foodPreferences.includes('Halal'), 'foodPreferences correctly formatted and persisted');
    assert(bioData.bioData?.injectedDangerousField === undefined, 'Strict whitelist prevents arbitrary property injection into bioData');

    // Verify database document directly
    const aliceDb = await User.findById(alice._id);
    assert(aliceDb.isBanned === false, 'User status fields (isBanned) cannot be overridden via bio update');
    assert(aliceDb.bioData.weight === 65, 'Existing biological fields (weight) are preserved during bio updates');

    // Unauthorized check: unauthenticated user cannot update bio
    const unauthBio = await fetch(`${BASE_URL}/api/users/bio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jointPain: ['Knee'] })
    });
    assert(unauthBio.status === 401, `Unauthenticated bio update rejected with HTTP 401 (got ${unauthBio.status})`);

    // =================================================================
    // SECTION 2: EXERCISE CALORIE PERSISTENCE & WORKOUT COMPLETION
    // =================================================================
    console.log('\n--- 2. Exercise Calorie Persistence & Session Completion ---');

    // Create a PreMadePlan and an active UserWorkoutProgram for Alice
    const plan = await PreMadePlan.create({
      title: 'Phase 1 Test Starter Plan',
      type: 'Workout',
      category: 'General Fitness',
      goal: 'Fitness',
      difficulty: 'Beginner',
      durationWeeks: 4,
      daysPerWeek: 3,
      weeks: [{
        weekNumber: 1,
        days: [{
          dayNumber: 1,
          title: 'Full Body Primer',
          isRestDay: false,
          exercises: [
            { exerciseId: 'EX-0001', name: 'Barbell Back Squat', sets: 3, reps: '10', duration: 15 },
            { exerciseId: 'EX-0002', name: 'Push-ups', sets: 3, reps: '12', duration: 10 },
            { exerciseId: 'UNKNOWN-EX', name: 'Mystery Functional Movement', sets: 2, reps: '10', duration: 10 }
          ]
        }, {
          dayNumber: 2,
          title: 'Upper Body Blast',
          isRestDay: false,
          exercises: [
            { exerciseId: 'EX-0003', name: 'Pull-ups', sets: 3, reps: '8', duration: 10 }
          ]
        }]
      }]
    });

    const aliceProgram = await UserWorkoutProgram.create({
      userId: alice._id,
      userName: alice.name,
      sourceProgramId: plan._id,
      title: plan.title,
      durationWeeks: 4,
      daysPerWeek: 3,
      weeks: plan.weeks,
      progress: {
        currentWeek: 1,
        currentDay: 1,
        completedSessions: []
      }
    });

    // Alice completes Week 1, Day 1
    const completeRes = await fetch(`${BASE_URL}/api/plans/user-programs/${aliceProgram._id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        weekNumber: 1,
        dayNumber: 1,
        durationMinutes: 45
      })
    });

    assert(completeRes.status === 200, `POST session progress returned 200 OK (got ${completeRes.status})`);
    const programAfterComplete = await UserWorkoutProgram.findById(aliceProgram._id);

    assert(programAfterComplete.progress.completedSessions.length === 1, 'Completed session added to completedSessions');
    const session = programAfterComplete.progress.completedSessions[0];

    assert(session.weekNumber === 1 && session.dayNumber === 1, 'Session week and day numbers match requested session');
    assert(Number(session.caloriesBurned) > 0, `Session has non-zero total caloriesBurned (${session.caloriesBurned} kcal estimated)`);
    assert(Array.isArray(session.exerciseLogs) && session.exerciseLogs.length === 3, 'Exercise logs resolved from target day schedule');

    // Check individual exercise calories
    const squatLog = session.exerciseLogs.find(l => l.name === 'Barbell Back Squat');
    assert(squatLog && Number(squatLog.caloriesBurned) > 0, `Squat exercise log persisted with calculated caloriesBurned (${squatLog?.caloriesBurned} kcal)`);

    const unknownLog = session.exerciseLogs.find(l => l.name === 'Mystery Functional Movement');
    assert(unknownLog && Number(unknownLog.caloriesBurned) > 0, `Unknown exercise gracefully fell back to default MET and calculated calories (${unknownLog?.caloriesBurned} kcal)`);

    // Verify calculation matches ACSM formula for 65kg Alice
    const expectedSquatKcal = estimateExerciseCalories('Barbell Back Squat', 15, 65);
    assert(squatLog.caloriesBurned === expectedSquatKcal, `Squat calories (${squatLog.caloriesBurned}) matches ACSM MET formula estimate (${expectedSquatKcal})`);

    // =================================================================
    // SECTION 3: REPEATED COMPLETION IDEMPOTENCY (NO DOUBLE-COUNTING)
    // =================================================================
    console.log('\n--- 3. Repeated Completion Idempotency ---');

    const duplicateCompleteRes = await fetch(`${BASE_URL}/api/plans/user-programs/${aliceProgram._id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        weekNumber: 1,
        dayNumber: 1,
        durationMinutes: 45
      })
    });

    assert(duplicateCompleteRes.status === 200, `Duplicate completion request returned 200 OK (got ${duplicateCompleteRes.status})`);
    const dupBody = await duplicateCompleteRes.json();
    assert(dupBody.alreadyCompleted === true, 'Server detects session was already completed');

    const programAfterDup = await UserWorkoutProgram.findById(aliceProgram._id);
    assert(programAfterDup.progress.completedSessions.length === 1, 'Repeated request does NOT duplicate session in completedSessions');
    assert(programAfterDup.progress.completedSessions[0].caloriesBurned === session.caloriesBurned, 'Calories are not multiplied or double-counted');

    // =================================================================
    // SECTION 4: IDOR / OWNERSHIP AUTHORIZATION
    // =================================================================
    console.log('\n--- 4. IDOR / Ownership Authorization ---');

    // Bob attempts to log progress on Alice's program
    const bobHackingRes = await fetch(`${BASE_URL}/api/plans/user-programs/${aliceProgram._id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bobToken}`
      },
      body: JSON.stringify({
        weekNumber: 1,
        dayNumber: 2
      })
    });

    assert(bobHackingRes.status === 403, `Bob rejected with HTTP 403 Forbidden when logging on Alice's program (got ${bobHackingRes.status})`);

    // =================================================================
    // SECTION 5: /YOUR-GYM SUBSCRIPTION RENEWAL CANCELLATION
    // =================================================================
    console.log('\n--- 5. YourGym Subscription Renewal Cancellation ---');

    // Alice cancels renewal (NOT terminating active membership immediately)
    const cancelRes = await fetch(`${BASE_URL}/api/users/membership-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ cancelRenewal: true })
    });

    assert(cancelRes.status === 200, `PUT /api/users/membership-settings returned 200 OK (got ${cancelRes.status})`);
    const cancelData = await cancelRes.json();

    assert(cancelData.gymAutoRenew === false, 'gymAutoRenew is turned off');
    assert(cancelData.gymMembershipExpiresAt !== null, 'Membership expiry date is retained and returned');
    assert(cancelData.message && cancelData.message.includes('Auto-renewal cancelled'), 'Informative non-punitive cancellation confirmation returned');

    const aliceAfterCancel = await User.findById(alice._id);
    assert(aliceAfterCancel.gymAutoRenew === false, 'Database confirms auto-renew is false');
    assert(aliceAfterCancel.gymMembershipExpiresAt > new Date(), 'Membership remains active until current billing cycle expiry');

    // Test backward compatibility: autoRenew: true toggle still works
    const reEnableRes = await fetch(`${BASE_URL}/api/users/membership-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ autoRenew: true })
    });

    const reEnableData = await reEnableRes.json();
    assert(reEnableData.gymAutoRenew === true, 'Backward compatibility: { autoRenew: true } correctly updates renewal preference');

    // Teardown
    await User.deleteMany({ email: { $in: ['phase1_alice@gymsync.test', 'phase1_bob@gymsync.test'] } });
    await PreMadePlan.deleteMany({ title: 'Phase 1 Test Starter Plan' });
    await UserWorkoutProgram.deleteMany({ userName: { $in: ['Phase1_Alice', 'Phase1_Bob'] } });

  } catch (err) {
    console.error('❌ Unexpected Error during Phase 1 Test Execution:', err);
    failed++;
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
  }

  console.log('\n===============================================================');
  console.log(`📊 PHASE 1 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase1Tests();
