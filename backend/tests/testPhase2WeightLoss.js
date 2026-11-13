import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import WeightLossEnrollment from '../models/WeightLossEnrollment.js';
import {
  checkWeightLossEligibility,
  calculateAge,
  MEDICAL_WARNING_TEXT,
  MEDICAL_WARNING_VERSION
} from '../services/weightLoss/weightLossEligibility.js';
import {
  calculateBMR,
  getActivityMultiplier,
  calculateTDEE,
  evaluateWeightLossPlan
} from '../services/weightLoss/weightLossCalculator.js';
import {
  generateWeightLossProjection,
  calculateConfidenceLabel,
  getAgeMetabolicFactor,
  PROJECTION_DISCLAIMER
} from '../services/weightLoss/weightLossProjection.js';
import {
  getMatchingWeightLossTemplate,
  seedWeightLossTemplatesIfMissing
} from '../services/weightLoss/weightLossTemplates.js';

console.log('===============================================================');
console.log('🧪 TEST SUITE: PHASE 2 - WEIGHT LOSS PROGRAM & SAFETY ENGINE');
console.log('===============================================================\n');

async function runTests() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(getTestMongoUri());
  }

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // 1. CALCULATOR & BMR UNIT TESTS (Mifflin-St Jeor)
  // -------------------------------------------------------------
  test('1.1 BMR calculation follows Mifflin-St Jeor for Male and Female', () => {
    // Male: 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
    const bmrMale = calculateBMR({ weightKg: 80, heightCm: 180, age: 30, gender: 'male' });
    assert.strictEqual(bmrMale, 1780, `Expected 1780, got ${bmrMale}`);

    // Female: 10 * 65 + 6.25 * 165 - 5 * 28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25 -> 1380
    const bmrFemale = calculateBMR({ weightKg: 65, heightCm: 165, age: 28, gender: 'female' });
    assert.strictEqual(bmrFemale, 1380, `Expected 1380, got ${bmrFemale}`);
  });

  test('1.2 Activity multiplier and TDEE calculation', () => {
    assert.strictEqual(getActivityMultiplier(2), 1.2);
    assert.strictEqual(getActivityMultiplier(3), 1.375);
    assert.strictEqual(getActivityMultiplier(5), 1.55);
    assert.strictEqual(getActivityMultiplier(6), 1.725);

    const tdee = calculateTDEE({ weightKg: 80, heightCm: 180, age: 30, gender: 'male', trainingDaysPerWeek: 3 });
    // 1780 * 1.375 = 2447.5 -> 2448
    assert.strictEqual(tdee, 2448, `Expected 2448, got ${tdee}`);
  });

  test('1.3 evaluateWeightLossPlan calculates planning bands (0.25%-0.75%/wk) and 1% hard cap', () => {
    const curW = 100;
    const plan = evaluateWeightLossPlan({
      currentWeightKg: curW,
      targetWeightKg: 90,
      targetDurationWeeks: 10,
      heightCm: 180,
      age: 30,
      gender: 'male'
    });

    assert.strictEqual(plan.recommendedPlanningBand.minSafeWeeklyKg, 0.25);
    assert.strictEqual(plan.recommendedPlanningBand.maxSafeWeeklyKg, 0.75);
    assert.strictEqual(plan.recommendedPlanningBand.hardCapWeeklyKg, 1.0);
    assert.strictEqual(plan.isTimelineRealistic, true, '1 kg/wk for 100kg user meets 1% cap');
  });

  test('1.4 evaluateWeightLossPlan flags unrealistic timeline and computes realistic date/loss', () => {
    const curW = 80;
    // Asking to lose 16kg in 4 weeks = 4 kg/week (> 1% of 80kg = 0.8 kg/wk)
    const aggressivePlan = evaluateWeightLossPlan({
      currentWeightKg: curW,
      targetWeightKg: 64,
      targetDurationWeeks: 4,
      heightCm: 175,
      age: 25,
      gender: 'male'
    });

    assert.strictEqual(aggressivePlan.isTimelineRealistic, false);
    assert.strictEqual(aggressivePlan.requestedRateKgPerWeek, 4.0);
    // Hard cap is 0.8 kg/wk; realistic weeks = 16 / 0.8 = 20 weeks
    assert.strictEqual(aggressivePlan.realisticWeeks, 20);
    assert.strictEqual(aggressivePlan.maxSafeLossForRequestedTimeframeKg, 3.2); // 4 wks * 0.8 kg
  });

  // -------------------------------------------------------------
  // 2. PROJECTION ENGINE UNIT TESTS (Non-linear slowdown, age bands, extreme inputs)
  // -------------------------------------------------------------
  test('2.1 Metabolic age factors adjust progressively', () => {
    assert.strictEqual(getAgeMetabolicFactor(22), 1.0, 'Age 18-29');
    assert.strictEqual(getAgeMetabolicFactor(35), 0.95, 'Age 30-49');
    assert.strictEqual(getAgeMetabolicFactor(55), 0.90, 'Age 50-64');
    assert.strictEqual(getAgeMetabolicFactor(70), 0.85, 'Age 65+');
  });

  test('2.2 Projections for age brackets (18-29, 30-49, 50-64, 65+) execute safely', () => {
    const brackets = [22, 35, 55, 68];
    brackets.forEach((age) => {
      const proj = generateWeightLossProjection({
        currentWeightKg: 85,
        targetWeightKg: 75,
        targetDurationWeeks: 12,
        age,
        gender: 'male'
      });

      assert(proj.ranges.weekly.minKg > 0);
      assert(proj.ranges.weekly.maxKg > proj.ranges.weekly.minKg);
      assert(proj.ranges.monthly.minKg > proj.ranges.weekly.minKg);
      assert(proj.ranges.yearly.minKg > proj.ranges.monthly.minKg);
      assert.strictEqual(proj.disclaimer, PROJECTION_DISCLAIMER);
    });
  });

  test('2.3 Yearly projection models slowdown and is NOT weekly * 52', () => {
    const proj = generateWeightLossProjection({
      currentWeightKg: 90,
      targetWeightKg: 75,
      targetDurationWeeks: 24,
      age: 32,
      gender: 'male'
    });

    const linearWeekly52Max = proj.ranges.weekly.maxKg * 52;
    assert(
      proj.ranges.yearly.maxKg < linearWeekly52Max,
      `Yearly max (${proj.ranges.yearly.maxKg}) must be strictly less than linear weekly*52 (${linearWeekly52Max})`
    );
  });

  test('2.4 Extreme inputs are clamped and handled gracefully without crashing or NaN', () => {
    // Extreme high weight
    const high = generateWeightLossProjection({
      currentWeightKg: 500,
      targetWeightKg: 80,
      age: 40
    });
    assert(!isNaN(high.ranges.weekly.maxKg));
    assert(!isNaN(high.ranges.yearly.maxKg));

    // Extreme low weight
    const low = generateWeightLossProjection({
      currentWeightKg: 20,
      targetWeightKg: 15,
      age: 20
    });
    assert(!isNaN(low.ranges.weekly.minKg));
    assert(!isNaN(low.ranges.yearly.minKg));
  });

  test('2.5 Confidence label is purely data-driven (workouts, weigh-ins, logs), NOT fake percentage', () => {
    assert.strictEqual(calculateConfidenceLabel({ workoutsCount: 0, weighInsCount: 1 }), 'Low');
    assert.strictEqual(calculateConfidenceLabel({ workoutsCount: 2, weighInsCount: 2 }), 'Medium');
    assert.strictEqual(calculateConfidenceLabel({ workoutsCount: 8, weighInsCount: 3 }), 'High');
  });

  // -------------------------------------------------------------
  // 3. ELIGIBILITY GATE & MEDICAL WARNING TESTS (R3, R4, R5)
  // -------------------------------------------------------------
  await testAsync('3.1 Eligibility gate blocks incomplete bio (R4)', async () => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      bioData: {
        height: 175,
        weight: null // missing weight
      }
    };

    const res = await checkWeightLossEligibility({ user });
    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'INCOMPLETE_BIO');
    assert.strictEqual(res.message, 'Complete your profile to start');
    assert.strictEqual(res.action.url, '/profile');
  });

  await testAsync('3.2 Eligibility gate blocks underage (<18) users', async () => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      bioData: {
        height: 170,
        weight: 65,
        age: 16,
        gender: 'female',
        fitnessLevel: 'Beginner',
        equipmentAccess: ['Dumbbells'],
        trainingDaysPerWeek: 3
      }
    };

    const res = await checkWeightLossEligibility({ user });
    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.code, 'UNDERAGE');
  });

  await testAsync('3.3 Eligibility gate blocks current BMI < 18.5 and projected BMI < 18.5', async () => {
    // Current BMI < 18.5 (50kg at 180cm -> BMI = 15.4)
    const userUnderweight = {
      _id: new mongoose.Types.ObjectId(),
      bioData: {
        height: 180,
        weight: 50,
        age: 25,
        gender: 'female',
        fitnessLevel: 'Beginner',
        equipmentAccess: ['Bodyweight'],
        trainingDaysPerWeek: 3
      }
    };

    const resCurrent = await checkWeightLossEligibility({ user: userUnderweight });
    assert.strictEqual(resCurrent.eligible, false);
    assert.strictEqual(resCurrent.code, 'UNDERWEIGHT');

    // Normal current weight (70kg at 175cm = BMI 22.9), but projected target weight 45kg -> BMI 14.7 (< 18.5)
    const userNormal = {
      _id: new mongoose.Types.ObjectId(),
      bioData: {
        height: 175,
        weight: 70,
        age: 25,
        gender: 'male',
        fitnessLevel: 'Intermediate',
        equipmentAccess: ['Full Gym'],
        trainingDaysPerWeek: 4
      }
    };

    const resProjected = await checkWeightLossEligibility({
      user: userNormal,
      targetWeightKg: 45
    });
    assert.strictEqual(resProjected.eligible, false);
    assert.strictEqual(resProjected.code, 'PROJECTED_UNDERWEIGHT');
  });

  await testAsync('3.4 Eligibility gate enforces R3: blocks if another active program exists', async () => {
    const dummyId = new mongoose.Types.ObjectId();
    const user = {
      _id: dummyId,
      bioData: {
        height: 175,
        weight: 85,
        age: 30,
        gender: 'male',
        fitnessLevel: 'Intermediate',
        equipmentAccess: ['Full Gym'],
        trainingDaysPerWeek: 3
      }
    };

    // Insert an active UserWorkoutProgram
    await UserWorkoutProgram.create({
      userId: dummyId,
      userName: 'Active Program Tester',
      sourceProgramId: new mongoose.Types.ObjectId(),
      title: 'Current Existing Program',
      goal: 'Strength',
      difficulty: 'Intermediate',
      durationWeeks: 4,
      daysPerWeek: 3,
      isActive: true,
      startDate: new Date()
    });

    try {
      const res = await checkWeightLossEligibility({
        user,
        targetWeightKg: 78,
        medicalWarningAcknowledged: true
      });
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.code, 'ACTIVE_PROGRAM_EXISTS');
      assert(res.message.includes('Finish or leave your current program first'));
    } finally {
      await UserWorkoutProgram.deleteMany({ userId: dummyId });
    }
  });

  await testAsync('3.5 Senior check requires senior physician acknowledgment (age >= 65)', async () => {
    const userSenior = {
      _id: new mongoose.Types.ObjectId(),
      bioData: {
        height: 170,
        weight: 80,
        age: 68,
        gender: 'female',
        fitnessLevel: 'Beginner',
        equipmentAccess: ['Bodyweight'],
        trainingDaysPerWeek: 3
      }
    };

    // Without senior ack
    const resNoSeniorAck = await checkWeightLossEligibility({
      user: userSenior,
      targetWeightKg: 72,
      seniorAcknowledged: false,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(resNoSeniorAck.eligible, false);
    assert.strictEqual(resNoSeniorAck.code, 'SENIOR_ACK_REQUIRED');

    // With senior ack
    const resWithSeniorAck = await checkWeightLossEligibility({
      user: userSenior,
      targetWeightKg: 72,
      seniorAcknowledged: true,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(resWithSeniorAck.eligible, true);
    assert.strictEqual(resWithSeniorAck.code, 'ELIGIBLE');
  });

  await testAsync('3.6 Medical warning acknowledgment requirement (R5: no medical conditions stored)', async () => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      bioData: {
        height: 175,
        weight: 85,
        age: 28,
        gender: 'male',
        fitnessLevel: 'Intermediate',
        equipmentAccess: ['Full Gym'],
        trainingDaysPerWeek: 4
      }
    };

    // Without medical warning ack
    const resNoAck = await checkWeightLossEligibility({
      user,
      targetWeightKg: 78,
      medicalWarningAcknowledged: false
    });
    assert.strictEqual(resNoAck.eligible, false);
    assert.strictEqual(resNoAck.code, 'MEDICAL_WARNING_REQUIRED');
    assert.strictEqual(resNoAck.warningText, MEDICAL_WARNING_TEXT);
    assert.strictEqual(resNoAck.version, MEDICAL_WARNING_VERSION);

    // With medical warning ack
    const resWithAck = await checkWeightLossEligibility({
      user,
      targetWeightKg: 78,
      medicalWarningAcknowledged: true
    });
    assert.strictEqual(resWithAck.eligible, true);
    assert.strictEqual(resWithAck.code, 'ELIGIBLE');
  });

  // -------------------------------------------------------------
  // 4. TEMPLATE MATCHING & WEIGH-IN MODEL (R1 & Optional Weigh-ins)
  // -------------------------------------------------------------
  test('4.1 System matches human-authored template based on equipment & days (R1)', () => {
    const homeTemplate = getMatchingWeightLossTemplate({ equipmentAccess: ['Bodyweight'], trainingDaysPerWeek: 3 });
    assert.strictEqual(homeTemplate.key, 'home_bodyweight');
    assert(homeTemplate.createdBy.includes('Coach') || homeTemplate.createdBy.includes('Instructor'));

    const gymTemplate = getMatchingWeightLossTemplate({ equipmentAccess: ['Barbell', 'Dumbbells'], trainingDaysPerWeek: 4 });
    assert.strictEqual(gymTemplate.key, 'gym_standard');

    const walkingTemplate = getMatchingWeightLossTemplate({ equipmentAccess: [], trainingDaysPerWeek: 5 });
    assert.strictEqual(walkingTemplate.key, 'walking_cardio');
  });

  await testAsync('4.2 WeightLossEnrollment stores metadata only and supports optional weigh-ins', async () => {
    const userId = new mongoose.Types.ObjectId();
    const enrollment = await WeightLossEnrollment.create({
      userId,
      userWorkoutProgramId: new mongoose.Types.ObjectId(),
      programTemplateId: new mongoose.Types.ObjectId(),
      status: 'Active',
      isActive: true,
      startWeightKg: 90,
      targetWeightKg: 80,
      targetDurationWeeks: 12,
      startDate: new Date(),
      targetDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000),
      templateType: 'home_bodyweight',
      medicalWarning: {
        acknowledgedAt: new Date(),
        version: MEDICAL_WARNING_VERSION
      },
      confidenceLabel: 'Low',
      weighIns: [
        {
          date: '2026-11-06',
          weightKg: 90,
          isVerified: false,
          notes: 'Baseline'
        }
      ]
    });

    try {
      assert.strictEqual(enrollment.medicalWarning.version, 'v1.0');
      assert.strictEqual(enrollment.weighIns[0].isVerified, false, 'Weigh-ins are unverified');
      assert.strictEqual(enrollment.toObject().medicalHistory, undefined, 'No medical history field in model');

      // Record optional waist check-in without scale
      enrollment.weighIns.push({
        date: '2026-11-20',
        weightKg: null, // No scale available
        waistCm: 88,
        isVerified: false,
        notes: 'Waist measurement only'
      });
      await enrollment.save();

      const updated = await WeightLossEnrollment.findById(enrollment._id);
      assert.strictEqual(updated.weighIns.length, 2);
      assert.strictEqual(updated.weighIns[1].weightKg, null);
      assert.strictEqual(updated.weighIns[1].waistCm, 88);
    } finally {
      await WeightLossEnrollment.deleteMany({ userId });
    }
  });

  console.log('\n===============================================================');
  console.log(`📊 PHASE 2 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error('Fatal Test Runner Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
