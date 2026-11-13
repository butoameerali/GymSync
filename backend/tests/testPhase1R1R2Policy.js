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

import { findMatchingPrograms } from '../services/workout/programMatcher.js';
import { handleChat } from '../controllers/aiController.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import User from '../models/User.js';
import { GYMSYNC_PRODUCT_KNOWLEDGE } from '../services/ai/gymSyncKnowledge.js';
import { getTestMongoUri } from './mongoTestHelper.js';

console.log('===============================================================');
console.log('🧪 TEST SUITE: PHASE 1 - REMOVE AI PROGRAM AUTHORING (R1 & R2)');
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
    console.log('--- 1.1 findMatchingPrograms (R1: Content Search & Source Attribution) ---');
    await testAsync('findMatchingPrograms returns ranked human-authored programs and library exercises', async () => {
      const results = await findMatchingPrograms(
        { mainGoalArea: 'Hypertrophy', fitnessLevel: 'Intermediate', equipmentAccess: 'Full Gym' },
        'Hypertrophy'
      );

      assert(Array.isArray(results.matchingPrograms), 'Must return matchingPrograms array');
      assert(Array.isArray(results.matchingExercises), 'Must return matchingExercises array');
      assert(results.sourceAttribution, 'Must include sourceAttribution');
      assert.strictEqual(results.sourceAttribution.sourceType, 'human_authored_catalog');

      if (results.matchingPrograms.length > 0) {
        const prog = results.matchingPrograms[0];
        assert(prog.sourceAttribution, 'Program must have sourceAttribution');
        assert(prog.sourceAttribution.sourceType === 'instructor_program' || prog.sourceAttribution.sourceType === 'pre_made_plan');
      }
    });

    console.log('\n--- 1.2 Conversational Plan Edits Do Not Mutate Programs (R1) ---');
    await testAsync('Conversational exercise swap does NOT mutate SavedAIPlan or commit changes', async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const plan = await SavedAIPlan.create({
        userId: testUserId,
        userName: 'EditTestUser',
        title: 'Original Instructor Routine',
        goal: 'Strength',
        isActive: true,
        calendar: [
          {
            dayNumber: 1,
            exercises: [
              { name: 'Barbell Bench Press', sets: 3, reps: '8-10' }
            ]
          }
        ]
      });

      const mockReq = {
        user: { _id: testUserId, name: 'EditTestUser' },
        body: {
          message: 'swap Barbell Bench Press for Incline Dumbbell Press',
          planId: plan._id.toString()
        }
      };

      let responsePayload = null;
      const mockRes = {
        status: (code) => mockRes,
        json: (data) => { responsePayload = data; return mockRes; }
      };

      await handleChat(mockReq, mockRes);
      assert(responsePayload, 'Must receive AI chat response');
      assert.strictEqual(responsePayload.structuredAction?.type, 'SUGGEST_ALTERNATIVE', 'Must suggest alternative without mutating plan');

      // Verify the plan in MongoDB was NOT modified
      const refetchedPlan = await SavedAIPlan.findById(plan._id);
      const ex0 = refetchedPlan.calendar[0].exercises[0];
      assert.strictEqual(ex0.name, 'Barbell Bench Press', 'Original exercise name must remain intact in DB');

      // Cleanup
      await SavedAIPlan.findByIdAndDelete(plan._id);
    });

    console.log('\n--- 1.3 Diet Policy & Capability Contract (R2: Diet is Track + Report Only) ---');
    test('GYMSYNC_PRODUCT_KNOWLEDGE explicitly contracts that AI never creates diet plans or authors programs', () => {
      assert(GYMSYNC_PRODUCT_KNOWLEDGE.includes('The AI NEVER creates or edits workout programs'), 'Contract must forbid AI workout authoring');
      assert(GYMSYNC_PRODUCT_KNOWLEDGE.includes('GymSync and AI NEVER generate or assign diet plans'), 'Contract must forbid AI diet generation');
      assert(GYMSYNC_PRODUCT_KNOWLEDGE.includes('diet is TRACK + REPORT only'), 'Contract must declare diet as Track + Report only');
    });

    await testAsync('AI Chat on diet requests returns refusal to generate diet plans and diet is null', async () => {
      const testUser = await User.create({
        name: 'DietPolicyUser',
        email: `diet_policy_${Date.now()}@gymsync.test`,
        password: 'password123'
      });
      const mockReq = {
        user: { _id: testUser._id, name: 'DietPolicyUser' },
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
      assert(responsePayload, 'Must receive AI response');
      assert(
        responsePayload.content.includes("I can't create diet plans") ||
        responsePayload.content.includes("GymSync does not auto-generate unverified diets"),
        'Must refuse diet plan generation'
      );
      assert.strictEqual(responsePayload.structuredAction?.diet, null, 'structuredAction.diet must be null');
      await User.findByIdAndDelete(testUser._id);
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
