import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('⚠️ Could not set custom DNS servers:', dnsErr.message);
}

import { getTestMongoUri } from './mongoTestHelper.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import WeightLossEnrollment from '../models/WeightLossEnrollment.js';
import { isBioComplete } from '../services/user/bioValidator.js';
import { programGate } from '../services/workout/programGate.js';
import { checkWeightLossEligibility } from '../services/weightLoss/weightLossEligibility.js';
import {
  evaluateWeightLossPlan,
  calculateBMR,
  calculateTDEE
} from '../services/weightLoss/weightLossCalculator.js';
import { generateWeightLossProjection } from '../services/weightLoss/weightLossProjection.js';
import { workoutBuddyFinder } from '../services/ai/workoutBuddyFinder.js';
import {
  createNotificationWithIdempotency,
  isQuietHours,
  reminderScheduler
} from '../services/notifications/reminderScheduler.js';
import { handleChat, executeCoachPipeline } from '../controllers/aiController.js';
import { GYMSYNC_PRODUCT_KNOWLEDGE } from '../services/ai/gymSyncKnowledge.js';

let mongoConnected = false;

async function setupDB() {
  const uri = getTestMongoUri();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    mongoConnected = true;
  }
}

async function runRegressionSuite() {
  console.log('\n===============================================================');
  console.log('🧪 MASTER REGRESSION QA SUITE: PHASE 6 COMPLETE GATES & AUDIT');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  await setupDB();

  const regUserId = new mongoose.Types.ObjectId();
  const buddyId = new mongoose.Types.ObjectId();

  // Cleanup test artifacts
  await User.deleteMany({ _id: { $in: [regUserId, buddyId] } });
  await UserWorkoutProgram.deleteMany({ userId: regUserId });
  await SavedAIPlan.deleteMany({ userId: regUserId });
  await WeightLossEnrollment.deleteMany({ userId: regUserId });
  await Notification.deleteMany({ userId: regUserId });

  // Baseline complete bio profile
  const completeBio = {
    height: 175,
    weight: 80,
    dob: '1995-06-15',
    gender: 'Male',
    fitnessLevel: 'Intermediate',
    equipmentAccess: 'Full Gym',
    trainingDaysPerWeek: 4
  };

  await User.create({
    _id: regUserId,
    name: 'Regression User',
    email: 'regression.qa@example.com',
    password: 'password123',
    role: 'User',
    accountStatus: 'Active',
    bioData: { ...completeBio }
  });

  // -----------------------------------------------------------------
  // 1. ELIGIBILITY GATE MATRIX
  // -----------------------------------------------------------------
  console.log('--- 1. Eligibility Gate Matrix (Age, BMI, Bio, Program, MedAck) ---');

  await asyncTest('1.1 Incomplete Bio is blocked with INCOMPLETE_BIO (Rule R4)', async () => {
    const userIncomplete = {
      _id: regUserId,
      bioData: { height: null, weight: 80, fitnessLevel: 'Beginner' }
    };
    assert.strictEqual(isBioComplete(userIncomplete), false);

    const gate = await checkWeightLossEligibility({
      user: userIncomplete,
      targetWeightKg: 75,
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(gate.eligible, false);
    assert.strictEqual(gate.code, 'INCOMPLETE_BIO');
  });

  await asyncTest('1.2 Underage (<18) user is blocked with UNDERAGE', async () => {
    const minorUser = {
      _id: regUserId,
      bioData: {
        ...completeBio,
        dob: new Date(Date.now() - 16 * 365.25 * 24 * 3600 * 1000).toISOString()
      }
    };
    const gate = await checkWeightLossEligibility({
      user: minorUser,
      targetWeightKg: 75,
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(gate.eligible, false);
    assert.strictEqual(gate.code, 'UNDERAGE');
  });

  await asyncTest('1.3 Senior (65+) requires senior physician acknowledgment (SENIOR_ACK_REQUIRED)', async () => {
    const seniorUser = {
      _id: regUserId,
      bioData: { ...completeBio, dob: '1955-01-01' }
    };
    // Without senior ack
    const gateWithoutAck = await checkWeightLossEligibility({
      user: seniorUser,
      targetWeightKg: 75,
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: true,
      seniorAcknowledged: false
    });
    assert.strictEqual(gateWithoutAck.eligible, false);
    assert.strictEqual(gateWithoutAck.code, 'SENIOR_ACK_REQUIRED');

    // With senior ack
    const gateWithAck = await checkWeightLossEligibility({
      user: seniorUser,
      targetWeightKg: 75,
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: true,
      seniorAcknowledged: true
    });
    assert.strictEqual(gateWithAck.eligible, true);
  });

  await asyncTest('1.4 Current BMI < 18.5 is blocked with UNDERWEIGHT', async () => {
    const underweightUser = {
      _id: regUserId,
      bioData: { ...completeBio, height: 180, weight: 50 } // BMI = 15.4
    };
    const gate = await checkWeightLossEligibility({
      user: underweightUser,
      targetWeightKg: 45,
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(gate.eligible, false);
    assert.strictEqual(gate.code, 'UNDERWEIGHT');
  });

  await asyncTest('1.5 Target BMI < 18.5 is blocked with PROJECTED_UNDERWEIGHT', async () => {
    const normalUser = {
      _id: regUserId,
      bioData: { ...completeBio, height: 175, weight: 70 } // Current BMI = 22.9
    };
    const gate = await checkWeightLossEligibility({
      user: normalUser,
      targetWeightKg: 45, // Target BMI = 14.7 (< 18.5)
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(gate.eligible, false);
    assert.strictEqual(gate.code, 'PROJECTED_UNDERWEIGHT');
  });

  await asyncTest('1.6 Active program conflict is blocked with ACTIVE_PROGRAM_EXISTS (Rule R3)', async () => {
    // Insert an active UserWorkoutProgram
    await UserWorkoutProgram.create({
      userId: regUserId,
      userName: 'Regression User',
      sourceProgramId: new mongoose.Types.ObjectId(),
      title: 'Current Active Hypertrophy',
      goal: 'Strength',
      difficulty: 'Intermediate',
      durationWeeks: 4,
      daysPerWeek: 4,
      isActive: true,
      startDate: new Date()
    });

    const adultUser = {
      _id: regUserId,
      bioData: { ...completeBio }
    };

    const gate = await checkWeightLossEligibility({
      user: adultUser,
      targetWeightKg: 75,
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(gate.eligible, false);
    assert.strictEqual(gate.code, 'ACTIVE_PROGRAM_EXISTS');

    // Clean up active program
    await UserWorkoutProgram.deleteMany({ userId: regUserId });
  });

  await asyncTest('1.7 Missing medical warning acknowledgment is blocked with MEDICAL_WARNING_REQUIRED (Rule R5)', async () => {
    const adultUser = {
      _id: regUserId,
      bioData: { ...completeBio }
    };

    const gate = await checkWeightLossEligibility({
      user: adultUser,
      targetWeightKg: 75,
      targetDurationWeeks: 12,
      medicalWarningAcknowledged: false
    });
    assert.strictEqual(gate.eligible, false);
    assert.strictEqual(gate.code, 'MEDICAL_WARNING_REQUIRED');
  });

  // -----------------------------------------------------------------
  // 2. PROJECTION RANGES & NON-LINEAR YEARLY MODELING
  // -----------------------------------------------------------------
  console.log('\n--- 2. Projection Ranges & Non-Linear Yearly Modeling ---');

  test('2.1 Default planning band is 0.25%-0.75%/wk with 1.0% hard cap', () => {
    const plan = evaluateWeightLossPlan({
      currentWeightKg: 100,
      targetWeightKg: 90,
      targetDurationWeeks: 10,
      heightCm: 180,
      age: 30,
      gender: 'Male'
    });

    assert.strictEqual(plan.recommendedPlanningBand.hardCapWeeklyKg, 1.0); // 1% of 100kg = 1.0 kg/wk
    assert.strictEqual(plan.recommendedPlanningBand.minSafeWeeklyKg, 0.25); // 0.25% of 100kg
    assert.strictEqual(plan.recommendedPlanningBand.maxSafeWeeklyKg, 0.75); // 0.75% of 100kg
  });

  test('2.2 Unrealistic aggressive timeline returns realistic date and maximum safe loss', () => {
    // Requesting 16 kg loss in 4 weeks (4 kg/wk > 0.8 kg cap)
    const plan = evaluateWeightLossPlan({
      currentWeightKg: 80,
      targetWeightKg: 64,
      targetDurationWeeks: 4,
      heightCm: 175,
      age: 25,
      gender: 'Male'
    });

    assert.strictEqual(plan.isTimelineRealistic, false);
    assert.strictEqual(plan.requestedRateKgPerWeek, 4.0);
    assert.strictEqual(plan.realisticWeeks, 20); // 16kg / 0.8kg cap = 20 weeks
    assert.strictEqual(plan.maxSafeLossForRequestedTimeframeKg, 3.2); // 4 wks * 0.8kg
    assert.ok(plan.realisticDate, 'Must return realistic completion date string');
  });

  test('2.3 Yearly projection models metabolic slowdown (NOT weekly * 52)', () => {
    const proj = generateWeightLossProjection({
      currentWeightKg: 90,
      targetWeightKg: 75,
      targetDurationWeeks: 24,
      age: 32,
      gender: 'Male'
    });

    const linearWeekly52Max = proj.ranges.weekly.maxKg * 52;
    assert.ok(proj.ranges.yearly.maxKg < linearWeekly52Max, 'Yearly loss must model metabolic adaptation and slowdown');
    assert.ok(proj.ranges.yearly.maxKg > 0, 'Yearly loss must be positive');
  });

  // -----------------------------------------------------------------
  // 3. ONE-ACTIVE-PROGRAM ENFORCEMENT (Rule R3)
  // -----------------------------------------------------------------
  console.log('\n--- 3. One-Active-Program Enforcement (programGate.canJoin) ---');

  await asyncTest('3.1 programGate allows joining when user has 0 active programs', async () => {
    await UserWorkoutProgram.deleteMany({ userId: regUserId });
    await SavedAIPlan.deleteMany({ userId: regUserId });
    await WeightLossEnrollment.deleteMany({ userId: regUserId });

    const gate = await programGate.canJoin(regUserId);
    assert.strictEqual(gate.canJoin, true);
  });

  await asyncTest('3.2 programGate blocks joining when active UserWorkoutProgram exists', async () => {
    await UserWorkoutProgram.create({
      userId: regUserId,
      userName: 'Regression User',
      sourceProgramId: new mongoose.Types.ObjectId(),
      title: 'Active Program A',
      goal: 'Strength',
      difficulty: 'Intermediate',
      durationWeeks: 4,
      daysPerWeek: 4,
      isActive: true,
      startDate: new Date()
    });

    const gate = await programGate.canJoin(regUserId);
    assert.strictEqual(gate.canJoin, false);
    assert.ok(gate.message.includes('Finish or leave your current program first'));

    await UserWorkoutProgram.deleteMany({ userId: regUserId });
  });

  await asyncTest('3.3 programGate blocks joining when active SavedAIPlan exists', async () => {
    await SavedAIPlan.create({
      userId: regUserId,
      title: 'Active AI Routine B',
      isActive: true
    });

    const gate = await programGate.canJoin(regUserId);
    assert.strictEqual(gate.canJoin, false);
    assert.ok(gate.message.includes('Finish or leave your current program first'));

    await SavedAIPlan.deleteMany({ userId: regUserId });
  });

  await asyncTest('3.4 programGate blocks joining when active WeightLossEnrollment exists', async () => {
    await WeightLossEnrollment.create({
      userId: regUserId,
      status: 'Active',
      isActive: true,
      startWeightKg: 85,
      targetWeightKg: 78,
      targetDurationWeeks: 12,
      targetDate: new Date(Date.now() + 12 * 7 * 86400000),
      medicalWarning: { acknowledgedAt: new Date(), version: 'v1.0' }
    });

    const gate = await programGate.canJoin(regUserId);
    assert.strictEqual(gate.canJoin, false);
    assert.ok(gate.message.includes('Finish or leave your current program first'));

    await WeightLossEnrollment.deleteMany({ userId: regUserId });
  });

  // -----------------------------------------------------------------
  // 4. REMINDER IDEMPOTENCY & SCHEDULER (Rule R6)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Reminder Idempotency & Scheduler ---');

  await asyncTest('4.1 createNotificationWithIdempotency enforces at most 1 notification per slot per day', async () => {
    const today = new Date().toISOString().split('T')[0];
    const eventKey = `workout_reg_${regUserId}_${today}`;

    // Attempt 1
    const n1 = await createNotificationWithIdempotency({
      userId: regUserId,
      recipientId: regUserId,
      title: 'Workout Time!',
      message: 'Time for today workout.',
      type: 'workout_reminder',
      link: '/ai-trainer?tab=today',
      eventKey
    });
    assert.strictEqual(n1.created, true, 'First notification created');

    // Attempt 2 (Duplicate slot/day)
    const n2 = await createNotificationWithIdempotency({
      userId: regUserId,
      recipientId: regUserId,
      title: 'Workout Time!',
      message: 'Time for today workout.',
      type: 'workout_reminder',
      link: '/ai-trainer?tab=today',
      eventKey
    });
    assert.strictEqual(n2.created, false, 'Duplicate slot on same day must be rejected by idempotency');

    // Count in DB
    const count = await Notification.countDocuments({ userId: regUserId, eventKey });
    assert.strictEqual(count, 1, 'Only 1 notification should exist for this eventKey');
  });

  test('4.2 Quiet hours correctly detects overnight quiet window and mute settings', () => {
    assert.strictEqual(isQuietHours({ muted: true }, new Date()), true); // Muted always true
    assert.strictEqual(isQuietHours({ quietHoursStart: '22:00', quietHoursEnd: '07:00' }, new Date('2026-11-20T23:00:00')), true); // 11pm quiet
    assert.strictEqual(isQuietHours({ quietHoursStart: '22:00', quietHoursEnd: '07:00' }, new Date('2026-11-20T03:00:00')), true); // 3am quiet
    assert.strictEqual(isQuietHours({ quietHoursStart: '22:00', quietHoursEnd: '07:00' }, new Date('2026-11-20T15:00:00')), false); // 3pm active
  });

  // -----------------------------------------------------------------
  // 5. NOTIFICATION DEEP LINK ROUTING
  // -----------------------------------------------------------------
  console.log('\n--- 5. Notification Deep Link Routing ---');

  await asyncTest('5.1 Reminder dispatcher creates deep links directly to target views', async () => {
    // Generate reminders from active program
    await UserWorkoutProgram.create({
      userId: regUserId,
      userName: 'Regression User',
      sourceProgramId: new mongoose.Types.ObjectId(),
      title: 'Leg Day Blast',
      goal: 'Strength',
      difficulty: 'Intermediate',
      durationWeeks: 4,
      daysPerWeek: 4,
      isActive: true,
      startDate: new Date(),
      weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, focus: 'Legs', restDay: false, exercises: [{ name: 'Squats' }] }] }]
    });

    const testDate = new Date('2026-11-20T10:00:00.000Z');

    // Workout reminder
    const workoutRes = await reminderScheduler.generateWorkoutReminders({ date: testDate, targetUserId: regUserId });
    assert.strictEqual(workoutRes.createdCount, 1);

    const workoutNotification = await Notification.findOne({
      userId: regUserId,
      type: 'workout_reminder'
    });
    assert.ok(workoutNotification.link.includes('/ai-trainer'), 'Workout reminder must deep link to workout session');

    // Meal reminder (lunch slot)
    const mealRes = await reminderScheduler.generateMealReminders({ date: testDate, forceSlot: 'lunch', targetUserId: regUserId });
    assert.strictEqual(mealRes.createdCount, 1);

    const mealNotification = await Notification.findOne({
      userId: regUserId,
      type: 'meal_reminder'
    });
    assert.ok(mealNotification.link.includes('action=log_meal') || mealNotification.link.includes('/food-log'), 'Meal reminder must deep link to food-log form');

    await UserWorkoutProgram.deleteMany({ userId: regUserId });
  });

  // -----------------------------------------------------------------
  // 6. PRIVATE-DATA LEAKAGE IN AI CONTEXT & ANSWERS
  // -----------------------------------------------------------------
  console.log('\n--- 6. Private Data Leakage Prevention ---');

  await asyncTest('6.1 Workout buddy finder & AI answers NEVER expose private bioData or personal metrics', async () => {
    // Create buddy with private medical acknowledgment and bio
    await User.create({
      _id: buddyId,
      name: 'Farhan Zaidi',
      email: 'farhan.classified@example.com',
      password: 'passwordHash',
      phone: '+923330001122',
      role: 'User',
      accountStatus: 'Active',
      city: 'Islamabad',
      subscribedGymName: 'Islamabad Club Gym',
      fitnessGoal: 'CrossFit & Conditioning',
      bio: 'Training 3 days a week. Need a partner for morning sprints!',
      disclaimerAcceptedAt: new Date(),
      disclaimerVersion: 'v1.0',
      bioData: {
        weight: 92,
        height: 185,
        dob: '1992-08-20',
        gender: 'Male',
        foodPreferences: 'Keto'
      }
    });

    const searchResults = await workoutBuddyFinder.findWorkoutBuddies({
      query: 'Islamabad workout buddy sprints',
      city: 'Islamabad',
      currentUserId: regUserId
    });

    assert.ok(searchResults.buddies.length > 0, 'Found buddy');
    const b = searchResults.buddies.find(x => String(x.id || x._id) === String(buddyId));
    assert.ok(b);

    // Verify whitelisted public fields
    assert.strictEqual(b.name, 'Farhan Zaidi');
    assert.strictEqual(b.city, 'Islamabad');
    assert.strictEqual(b.fitnessGoal, 'CrossFit & Conditioning');

    // Strict privacy assertions: Private metrics must NEVER exist
    assert.strictEqual(b.bioData, undefined);
    assert.strictEqual(b.weight, undefined);
    assert.strictEqual(b.height, undefined);
    assert.strictEqual(b.dob, undefined);
    assert.strictEqual(b.gender, undefined);
    assert.strictEqual(b.email, undefined);
    assert.strictEqual(b.phone, undefined);
    assert.strictEqual(b.password, undefined);
    assert.strictEqual(b.disclaimerAcceptedAt, undefined);
    assert.strictEqual(b.foodLogs, undefined);
    assert.strictEqual(b.messages, undefined);

    // AI Coach turn asserting no private data blurted in conversational text
    const aiResponse = await executeCoachPipeline({
      message: 'Can you find me a workout buddy in Islamabad?',
      userId: regUserId,
      userContext: { name: 'Regression User', city: 'Islamabad' }
    });

    assert.ok(aiResponse.content.includes('Farhan Zaidi'));
    assert.ok(!aiResponse.content.includes('92 kg'), 'Must not leak private weight');
    assert.ok(!aiResponse.content.includes('farhan.classified'), 'Must not leak email');
    assert.ok(!aiResponse.content.includes('+92333'), 'Must not leak phone');
  });

  // -----------------------------------------------------------------
  // 7. DIET-PLAN GENERATION IS UNREACHABLE (Rule R2)
  // -----------------------------------------------------------------
  console.log('\n--- 7. Diet-Plan Generation is Unreachable (Rule R2) ---');

  test('7.1 GYMSYNC_PRODUCT_KNOWLEDGE contract explicitly declares diet is Track + Report only', () => {
    assert.ok(GYMSYNC_PRODUCT_KNOWLEDGE.includes('NO diet plan is ever generated or assigned by the AI or system'));
    assert.ok(GYMSYNC_PRODUCT_KNOWLEDGE.includes('TRACK + REPORT only'));
  });

  await asyncTest('7.2 Conversational AI refuses diet plan prescription in chat and returns diet as null', async () => {
    const mockReq = {
      user: { _id: regUserId, name: 'Regression User' },
      body: {
        message: 'Give me a diet plan for weight loss'
      }
    };

    let responsePayload = null;
    const mockRes = {
      status: (code) => mockRes,
      json: (data) => { responsePayload = data; return mockRes; }
    };

    await handleChat(mockReq, mockRes);
    assert.ok(responsePayload, 'Must receive AI response');
    assert.ok(
      responsePayload.content.includes("I can't create diet plans") ||
      responsePayload.content.includes("GymSync does not auto-generate unverified diets") ||
      responsePayload.content.includes("Track + Report") ||
      responsePayload.content.includes("Track & Report"),
      'Must refuse diet plan generation'
    );
    assert.strictEqual(responsePayload.structuredAction?.diet, null, 'structuredAction.diet must be null');
  });

  // Final Cleanup
  await User.deleteMany({ _id: { $in: [regUserId, buddyId] } });
  await UserWorkoutProgram.deleteMany({ userId: regUserId });
  await SavedAIPlan.deleteMany({ userId: regUserId });
  await WeightLossEnrollment.deleteMany({ userId: regUserId });
  await Notification.deleteMany({ userId: regUserId });

  console.log('\n===============================================================');
  console.log(`📊 MASTER REGRESSION QA RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().then(() => {
  if (mongoConnected) {
    mongoose.disconnect();
  }
}).catch(err => {
  console.error('Master regression test execution error:', err);
  process.exit(1);
});
