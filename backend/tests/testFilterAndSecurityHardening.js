import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from '../index.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import Exercise from '../models/Exercise.js';
import PreMadePlan from '../models/PreMadePlan.js';
import Article from '../models/Article.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import User from '../models/User.js';

const TEST_PORT = 5105;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runHardeningTests() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC FILTER CONJUNCTION, SAFE REGEX & IDOR HARDENING TEST');
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
    // 1. Start test HTTP server
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

    // 2. Setup Test Users
    console.log('\n--- Setup Test Users & Tokens ---');
    let userA = await User.findOne({ email: 'alice_harden@test.com' });
    if (!userA) {
      userA = await User.create({
        name: 'Alice Harden',
        email: 'alice_harden@test.com',
        password: 'Password123!',
        role: 'User'
      });
    }
    const tokenA = jwt.sign({ id: userA._id, role: userA.role, name: userA.name }, jwtSecret, { expiresIn: '1h' });

    let userB = await User.findOne({ email: 'bob_harden@test.com' });
    if (!userB) {
      userB = await User.create({
        name: 'Bob Harden',
        email: 'bob_harden@test.com',
        password: 'Password123!',
        role: 'User'
      });
    }
    const tokenB = jwt.sign({ id: userB._id, role: userB.role, name: userB.name }, jwtSecret, { expiresIn: '1h' });

    let adminUser = await User.findOne({ role: 'SuperAdmin' });
    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role, name: adminUser.name }, jwtSecret, { expiresIn: '1h' });

    // 3. Seed test Exercises
    console.log('\n--- Seeding Test Exercises ---');
    await Exercise.deleteMany({ createdBy: 'HardeningTest' });
    await Exercise.create([
      {
        exerciseId: 'TEST-BENCH-1',
        name: 'Barbell Flat Bench Press',
        category: 'Chest',
        targetMuscles: ['Chest', 'Triceps'],
        equipmentRequired: 'Barbell',
        difficulty: 'Intermediate',
        status: 'active',
        createdBy: 'HardeningTest'
      },
      {
        exerciseId: 'TEST-PUSHUP-1',
        name: 'Diamond Push Up',
        category: 'Chest',
        targetMuscles: ['Chest', 'Triceps'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        status: 'active',
        createdBy: 'HardeningTest'
      },
      {
        exerciseId: 'TEST-AIRSQUAT-1',
        name: 'Bodyweight Air Squat',
        category: 'Legs',
        targetMuscles: ['Quadriceps', 'Glutes'],
        equipmentRequired: 'None',
        difficulty: 'Beginner',
        status: 'active',
        createdBy: 'HardeningTest'
      },
      {
        exerciseId: 'TEST-HACK-1',
        name: 'Machine Hack Squat',
        category: 'Legs',
        targetMuscles: ['Quadriceps', 'Glutes'],
        equipmentRequired: 'Machine',
        difficulty: 'Advanced',
        status: 'active',
        createdBy: 'HardeningTest'
      }
    ]);

    // 4. Seed test PreMadePlans
    console.log('--- Seeding Test Plans ---');
    await PreMadePlan.deleteMany({ createdBy: 'HardeningTest' });
    await PreMadePlan.create([
      {
        title: 'Hypertrophy Alpha Mass',
        type: 'Workout',
        category: 'Muscle Building',
        goal: 'Hypertrophy',
        difficulty: 'Intermediate',
        status: 'published',
        durationWeeks: 4,
        daysPerWeek: 4,
        createdBy: 'HardeningTest',
        sportTags: ['Bodybuilding']
      },
      {
        title: 'Hypertrophy Cutting Shred',
        type: 'Workout',
        category: 'Fat Loss',
        goal: 'Fat Loss',
        difficulty: 'Intermediate',
        status: 'published',
        durationWeeks: 6,
        daysPerWeek: 4,
        createdBy: 'HardeningTest',
        sportTags: ['HIIT', 'Fat Loss']
      }
    ]);

    // 5. Seed test Article
    console.log('--- Seeding Test Article ---');
    await Article.deleteMany({ author: 'HardeningTest' });
    await Article.create([
      {
        title: 'Biomechanics of C++ (Advanced) Resistance Training',
        content: 'Comprehensive mechanical breakdown of vector forces in compound movements.',
        category: 'Science',
        tags: ['Physics', 'Hypertrophy'],
        status: 'published',
        author: 'HardeningTest'
      }
    ]);

    // =========================================================================
    // TEST SECTION 1: PREMADE PLAN QUERY CONJUNCTION & REGEX HARDENING
    // =========================================================================
    console.log('\n--- Section 1: PreMadePlan Query Conjunction & Safe Regex ---');
    {
      // Conjunction: goal=Fat Loss AND search=Hypertrophy
      const res = await fetch(`${BASE_URL}/api/plans/premade?type=Workout&goal=Fat%20Loss&search=Hypertrophy&paginate=true`);
      const data = await res.json();
      assert(res.status === 200, 'PreMadePlan endpoint responded with HTTP 200');
      const items = data.items || [];
      assert(items.length > 0, 'Found matching plan with both goal=Fat Loss and search=Hypertrophy');
      assert(items.every(p => p.goal === 'Fat Loss'), 'Every plan matches goal "Fat Loss" (filter was not overwritten by search)');
      assert(items.every(p => p.title.toLowerCase().includes('hypertrophy')), 'Every plan title matches search "Hypertrophy"');
    }

    {
      // ReDoS Prevention: Unclosed regex brackets & symbols
      const res = await fetch(`${BASE_URL}/api/plans/premade?type=Workout&search=${encodeURIComponent('([*+?^${}|\\')}&paginate=true`);
      const data = await res.json();
      assert(res.status === 200, 'PreMadePlan search safely handled malformed regex without 500 error');
      assert(Array.isArray(data.items), 'Returned valid empty items array without crashing');
    }

    // =========================================================================
    // TEST SECTION 2: EXERCISE FILTER CONJUNCTION & EQUIPMENT HANDLING
    // =========================================================================
    console.log('\n--- Section 2: Exercise Filter Conjunction & Equipment Handling ---');
    {
      // Conjunction: category=Chest AND search=Barbell
      const res = await fetch(`${BASE_URL}/api/exercises?category=Chest&search=Barbell&paginate=true`);
      const data = await res.json();
      assert(res.status === 200, 'Exercise search responded with HTTP 200');
      const items = data.items || [];
      assert(items.length > 0, 'Found Barbell Flat Bench Press under Chest');
      assert(items.every(e => e.category === 'Chest' || (e.targetMuscles || []).includes('Chest')), 'Category filter Chest retained');
      assert(items.every(e => e.name.toLowerCase().includes('barbell')), 'Search filter Barbell retained');
    }

    {
      // With Equipment Filter: Must exclude Bodyweight and None
      const res = await fetch(`${BASE_URL}/api/exercises?equipment=With%20Equipment&paginate=true`);
      const data = await res.json();
      assert(res.status === 200, 'Exercise "With Equipment" responded with HTTP 200');
      const items = data.items || [];
      assert(items.length > 0, 'Exercises found with equipment');
      const noneOrBw = items.filter(e => /bodyweight|none/i.test(e.equipmentRequired || ''));
      assert(noneOrBw.length === 0, `No bodyweight/none exercises returned when "With Equipment" is selected (found: ${noneOrBw.length})`);
    }

    {
      // No Equipment Filter: Must only include Bodyweight or None
      const res = await fetch(`${BASE_URL}/api/exercises?equipment=No%20Equipment&paginate=true`);
      const data = await res.json();
      assert(res.status === 200, 'Exercise "No Equipment" responded with HTTP 200');
      const items = data.items || [];
      assert(items.length > 0, 'Exercises found for No Equipment');
      const onlyBw = items.every(e => /bodyweight|none/i.test(e.equipmentRequired || ''));
      assert(onlyBw, 'All exercises in "No Equipment" are bodyweight or none');
    }

    {
      // ReDoS Prevention on Exercise search
      const res = await fetch(`${BASE_URL}/api/exercises?search=${encodeURIComponent('((([+{*^$')}&paginate=true`);
      const data = await res.json();
      assert(res.status === 200, 'Exercise search handled malicious regex characters safely');
      assert(Array.isArray(data.items), 'Returned valid items array without 500 error');
    }

    // =========================================================================
    // TEST SECTION 3: ARTICLE SAFE REGEX SEARCH
    // =========================================================================
    console.log('\n--- Section 3: Article Safe Regex Search ---');
    {
      const res = await fetch(`${BASE_URL}/api/articles?search=${encodeURIComponent('C++ (Advanced)')}&paginate=true`);
      const data = await res.json();
      assert(res.status === 200, 'Article search with "C++ (Advanced)" returned HTTP 200');
      const items = data.items || [];
      assert(items.length > 0, 'Found C++ (Advanced) article successfully without syntax crash');
    }

    // =========================================================================
    // TEST SECTION 4: SAVED AI PLANS IDOR & ACCESS CONTROL HARDENING
    // =========================================================================
    console.log('\n--- Section 4: Saved AI Plans IDOR & Access Control Hardening ---');
    let alicePlanId = null;

    {
      // Unauthenticated access must be rejected with 401
      const resGet = await fetch(`${BASE_URL}/api/ai/saved-plans`);
      assert(resGet.status === 401, 'Unauthenticated GET /api/ai/saved-plans rejected with 401');

      const resPost = await fetch(`${BASE_URL}/api/ai/saved-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked Unauth Plan' })
      });
      assert(resPost.status === 401, 'Unauthenticated POST /api/ai/saved-plans rejected with 401');
    }

    {
      // Alice creates a saved AI plan
      const res = await fetch(`${BASE_URL}/api/ai/saved-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          title: 'Alice 12-Week Transformation',
          goal: 'Hypertrophy',
          fitnessLevel: 'Intermediate',
          notes: 'Secret personal fitness plan'
        })
      });
      const data = await res.json();
      assert(res.status === 201, 'Alice saved a plan with HTTP 201');
      assert(data.userName === userA.name, `Plan userName strictly matches Alice (${data.userName})`);
      assert(String(data.userId) === String(userA._id), `Plan userId strictly matches Alice's ObjectId (${data.userId})`);
      alicePlanId = data._id;
    }

    {
      // Bob cannot view Alice's plan
      const res = await fetch(`${BASE_URL}/api/ai/saved-plans`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      const data = await res.json();
      assert(res.status === 200, 'Bob GET /api/ai/saved-plans succeeded');
      const foundAlicePlan = (data || []).some(p => String(p._id) === String(alicePlanId));
      assert(!foundAlicePlan, 'Data Isolation: Bob cannot view Alice\'s saved plan');
    }

    {
      // IDOR Prevention: Bob attempts to DELETE Alice's plan
      const res = await fetch(`${BASE_URL}/api/ai/saved-plans/${alicePlanId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      const data = await res.json();
      assert(res.status === 403, `IDOR Blocked: Bob received HTTP 403 Forbidden attempting to delete Alice's plan (got ${res.status})`);

      // Verify Alice's plan is still intact in DB
      const planStillInDb = await SavedAIPlan.findById(alicePlanId);
      assert(planStillInDb !== null, 'Alice\'s plan remains intact in MongoDB after Bob\'s unauthorized delete attempt');
    }

    {
      // Staff (Admin) can delete the plan
      const res = await fetch(`${BASE_URL}/api/ai/saved-plans/${alicePlanId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert(res.status === 200, 'Admin authorized to delete plan');
      const planAfterAdminDelete = await SavedAIPlan.findById(alicePlanId);
      assert(planAfterAdminDelete === null, 'Plan was successfully cleaned up by Admin');
    }

  } catch (err) {
    console.error('Fatal Test Error:', err);
    failed++;
  } finally {
    // Teardown
    console.log('\n--- Teardown Test Data ---');
    await Exercise.deleteMany({ createdBy: 'HardeningTest' });
    await PreMadePlan.deleteMany({ createdBy: 'HardeningTest' });
    await Article.deleteMany({ author: 'HardeningTest' });
    await User.deleteMany({ email: { $in: ['alice_harden@test.com', 'bob_harden@test.com'] } });

    if (server) {
      server.close();
      console.log('🛑 Test server stopped.');
    }
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed.');

    console.log('\n===============================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runHardeningTests();
