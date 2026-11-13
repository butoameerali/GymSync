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

import User from '../models/User.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import ActivityLog from '../models/ActivityLog.js';
import { isBioComplete } from '../services/user/bioValidator.js';
import { computeTodaysEnergy } from '../services/nutrition/dailyEnergyAggregator.js';
import { programGate } from '../services/workout/programGate.js';
import exerciseSafetyValidator from '../services/safety/exerciseSafetyValidator.js';
import { getPlanVsReality } from '../controllers/nutritionController.js';
import { getTestMongoUri } from './mongoTestHelper.js';

console.log('===============================================================');
console.log('🧪 TEST SUITE: PHASE 0 QA DEFECTS & ARCHITECTURAL GATES');
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

  try {
    console.log('--- 0.1 Nutrition Aggregator & Plan Vs Reality ---');
    await testAsync('computeTodaysEnergy runs safely without 3rd argument', async () => {
      const res = await computeTodaysEnergy('dummyUser123', '2026-11-06');
      assert.strictEqual(typeof res.workoutKcal, 'number');
      assert.strictEqual(typeof res.walkingKcal, 'number');
      assert.strictEqual(typeof res.eatenKcal, 'number');
      assert.strictEqual(typeof res.estimatedExpenditure, 'number');
      assert.strictEqual(typeof res.balance, 'number');
    });

    await testAsync('getPlanVsReality correctly maps returned fields to eatenKcal, estimatedExpenditure, steps', async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockReq = {
        query: { date: '2026-11-06' },
        user: { _id: mockUserId }
      };
      let responseData = null;
      const mockRes = {
        status: (code) => mockRes,
        json: (data) => { responseData = data; return mockRes; }
      };

      await getPlanVsReality(mockReq, mockRes);
      assert(responseData, 'Response data must be returned');
      assert(responseData.actual, 'Response must have actual object');
      assert('dietKcal' in responseData.actual, 'actual must have dietKcal (mapped from eatenKcal)');
      assert('workoutKcal' in responseData.actual, 'actual must have workoutKcal');
      assert('walkingKcal' in responseData.actual, 'actual must have walkingKcal');
      assert('steps' in responseData.actual, 'actual must have steps');
    });

    console.log('\n--- 0.2 Orthopedic Safety Claim Audit ---');
    test('exerciseSafetyValidator.filterSafeExercises does not invent fake validation', () => {
      const candidate = [{ name: 'Barbell Squat' }];
      const res = exerciseSafetyValidator.filterSafeExercises(candidate, {});
      assert.deepStrictEqual(res.safeExercises, candidate);
      assert.deepStrictEqual(res.excludedExercises, []);
      assert.deepStrictEqual(res.safetyWarnings, []);
    });

    console.log('\n--- 0.3 User BioData Defaults & isBioComplete ---');
    test('User schema initializes bioData without hardcoded height/weight/gender/dob defaults', () => {
      const user = new User({ name: 'FreshUser', email: 'fresh@example.com', password: 'password123' });
      assert.strictEqual(user.bioData.height, null, 'Height must default to null');
      assert.strictEqual(user.bioData.weight, null, 'Weight must default to null');
      assert.strictEqual(user.bioData.gender, null, 'Gender must default to null');
      assert.strictEqual(user.bioData.dob, null, 'DOB must default to null');
    });

    test('isBioComplete rejects incomplete profiles', () => {
      assert.strictEqual(isBioComplete(null), false);
      assert.strictEqual(isBioComplete({}), false);
      
      // Missing height
      assert.strictEqual(isBioComplete({
        weight: 70, dob: '1995-05-12', gender: 'Male', fitnessLevel: 'Beginner', equipmentAccess: 'Full Gym', trainingDaysPerWeek: 3
      }), false);

      // Missing weight
      assert.strictEqual(isBioComplete({
        height: 175, dob: '1995-05-12', gender: 'Male', fitnessLevel: 'Beginner', equipmentAccess: 'Full Gym', trainingDaysPerWeek: 3
      }), false);

      // Missing dob/age
      assert.strictEqual(isBioComplete({
        height: 175, weight: 70, gender: 'Male', fitnessLevel: 'Beginner', equipmentAccess: 'Full Gym', trainingDaysPerWeek: 3
      }), false);

      // Missing gender
      assert.strictEqual(isBioComplete({
        height: 175, weight: 70, dob: '1995-05-12', fitnessLevel: 'Beginner', equipmentAccess: 'Full Gym', trainingDaysPerWeek: 3
      }), false);

      // Missing fitnessLevel
      assert.strictEqual(isBioComplete({
        height: 175, weight: 70, dob: '1995-05-12', gender: 'Male', equipmentAccess: 'Full Gym', trainingDaysPerWeek: 3
      }), false);

      // Missing equipmentAccess
      assert.strictEqual(isBioComplete({
        height: 175, weight: 70, dob: '1995-05-12', gender: 'Male', fitnessLevel: 'Beginner', trainingDaysPerWeek: 3
      }), false);

      // Missing trainingDaysPerWeek
      assert.strictEqual(isBioComplete({
        height: 175, weight: 70, dob: '1995-05-12', gender: 'Male', fitnessLevel: 'Beginner', equipmentAccess: 'Full Gym', trainingDaysPerWeek: 0
      }), false);
    });

    test('isBioComplete accepts fully specified profiles (with dob or age)', () => {
      const completeWithDob = {
        height: 180,
        weight: 75,
        dob: '1998-10-15',
        gender: 'Male',
        fitnessLevel: 'Intermediate',
        equipmentAccess: 'Full Gym',
        trainingDaysPerWeek: 4
      };
      assert.strictEqual(isBioComplete(completeWithDob), true);

      const completeWithAge = {
        height: 165,
        weight: 60,
        age: 28,
        gender: 'Female',
        fitnessLevel: 'Beginner',
        equipmentAccess: 'Bodyweight',
        trainingDaysPerWeek: 3
      };
      assert.strictEqual(isBioComplete(completeWithAge), true);
    });

    console.log('\n--- 0.4 Program Gate (R3: One active program per user) ---');
    const testUserId = new mongoose.Types.ObjectId();

    await testAsync('programGate.canJoin allows joining when user has no active program', async () => {
      const result = await programGate.canJoin(testUserId);
      assert.strictEqual(result.canJoin, true);
    });

    await testAsync('programGate.canJoin blocks joining when user has active UserWorkoutProgram', async () => {
      const activeProg = await UserWorkoutProgram.create({
        userId: testUserId,
        userName: 'ActiveUserTest',
        sourceProgramId: new mongoose.Types.ObjectId(),
        title: 'Active Test Split',
        goal: 'Hypertrophy',
        isActive: true,
        weeks: []
      });

      const gateRes = await programGate.canJoin(testUserId);
      assert.strictEqual(gateRes.canJoin, false);
      assert.strictEqual(gateRes.message, 'Finish or leave your current program first');

      // Cleanup
      await UserWorkoutProgram.findByIdAndDelete(activeProg._id);
    });

    await testAsync('programGate.canJoin blocks joining when user has active SavedAIPlan', async () => {
      const activeSaved = await SavedAIPlan.create({
        userId: testUserId,
        userName: 'ActiveSavedTest',
        title: 'Active Saved Split',
        goal: 'Strength',
        isActive: true
      });

      const gateRes = await programGate.canJoin(testUserId);
      assert.strictEqual(gateRes.canJoin, false);
      assert.strictEqual(gateRes.message, 'Finish or leave your current program first');

      // Cleanup
      await SavedAIPlan.findByIdAndDelete(activeSaved._id);
    });

  } finally {
    await mongoose.disconnect();
  }

  console.log('\n===============================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
