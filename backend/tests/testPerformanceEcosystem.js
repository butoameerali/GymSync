import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from '../index.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PreMadePlan from '../models/PreMadePlan.js';
import Article from '../models/Article.js';
import Exercise from '../models/Exercise.js';
import { apiCache } from '../utils/cache.js';

const TEST_PORT = 5101;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPerformanceTests() {
  console.log('===============================================================');
  console.log('⚡ GYMSYNC HIGH-PERFORMANCE & SCALABILITY VERIFICATION SUITE');
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
        console.log(`🚀 Performance test server running at ${BASE_URL}\n`);
        resolve();
      });
    });

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const jwtSecret = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';
    let instructorUser = await User.findOne({ role: 'FitnessInstructor' });
    if (!instructorUser) {
      instructorUser = await User.create({
        name: 'Coach Perf Instructor',
        email: 'coach_perf@gymsync.io',
        password: 'HashedPassword123!',
        role: 'FitnessInstructor'
      });
    }
    const instructorToken = jwt.sign({ id: instructorUser._id, role: instructorUser.role, name: instructorUser.name }, jwtSecret, { expiresIn: '1d' });

    let traineeUser = await User.findOne({ role: 'User' });
    if (!traineeUser) {
      traineeUser = await User.create({
        name: 'Trainee Alex Perf',
        email: 'trainee_perf@gymsync.io',
        password: 'HashedPassword123!',
        role: 'User'
      });
    }
    const traineeToken = jwt.sign({ id: traineeUser._id, role: traineeUser.role, name: traineeUser.name }, jwtSecret, { expiresIn: '1d' });

    // Seed test plans if needed (ensuring at least 6 published workout plans for multi-page cursor pagination)
    const publishedWorkoutCount = await PreMadePlan.countDocuments({ type: 'Workout', status: 'published' });
    if (publishedWorkoutCount < 6) {
      const plansToInsert = [];
      for (let i = 1; i <= 6; i++) {
        plansToInsert.push({
          title: `Performance Test Program ${Date.now()}_${i}`,
          type: 'Workout',
          status: 'published',
          goal: 'Muscle Building',
          difficulty: 'Intermediate',
          durationWeeks: 4,
          daysPerWeek: 4,
          description: `Test program ${i} for performance and pagination benchmarks.`,
          weeks: [
            {
              weekNumber: 1,
              focus: 'Hypertrophy',
              days: [
                {
                  dayNumber: 1,
                  title: 'Upper Body',
                  focus: 'Chest & Back',
                  exercises: [
                    { exerciseId: 'barbell_bench_press', name: 'Barbell Bench Press', sets: 4, reps: '8', rpe: 8, restSeconds: 90 },
                    { exerciseId: 'barbell_bent_over_row', name: 'Barbell Bent-Over Row', sets: 4, reps: '8', rpe: 8, restSeconds: 90 }
                  ]
                }
              ]
            }
          ],
          createdBy: 'Coach Perf Instructor',
          createdById: instructorUser._id
        });
      }
      await PreMadePlan.insertMany(plansToInsert);
    }

    // -------------------------------------------------------------
    // TEST 1: Server-Side Cursor Pagination on Catalogues
    // -------------------------------------------------------------
    console.log('--- Step 1: Server-Side Cursor Pagination ---');
    const page1Res = await fetch(`${BASE_URL}/api/plans/premade?type=Workout&paginate=true&limit=2`);
    assert(page1Res.status === 200, 'Page 1 HTTP status is 200');
    const page1Data = await page1Res.json();

    assert(Array.isArray(page1Data.items), 'Page 1 returns items array');
    assert(page1Data.items.length <= 2, `Page 1 respects limit=2 (received ${page1Data.items.length})`);
    assert(page1Data.hasMore === true, 'Page 1 indicates hasMore === true');
    assert(Boolean(page1Data.nextCursor), `Page 1 provides nextCursor (${page1Data.nextCursor})`);

    // Fetch page 2 with nextCursor
    const page2Res = await fetch(`${BASE_URL}/api/plans/premade?type=Workout&paginate=true&limit=2&cursor=${page1Data.nextCursor}`);
    assert(page2Res.status === 200, 'Page 2 HTTP status is 200');
    const page2Data = await page2Res.json();

    assert(Array.isArray(page2Data.items), 'Page 2 returns items array');
    const page1Ids = page1Data.items.map(p => p._id);
    const page2Ids = page2Data.items.map(p => p._id);
    const hasOverlap = page2Ids.some(id => page1Ids.includes(id));
    assert(!hasOverlap, 'Cursor pagination guarantees zero duplicate items across pages');

    // -------------------------------------------------------------
    // TEST 2: Lightweight Card DTO Projection (Payload Reduction)
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Lightweight Card DTO Projection ---');
    const cardItem = page1Data.items[0];
    assert(!cardItem.weeks || cardItem.weeks.length === 0, 'List projection omits heavy nested weeks matrix');
    assert(Boolean(cardItem.title) && Boolean(cardItem.goal), 'List projection includes essential card headers and metadata');

    // Verify detail endpoint returns complete unabridged object
    const detailRes = await fetch(`${BASE_URL}/api/plans/premade/${cardItem._id}`);
    assert(detailRes.status === 200, 'Detail endpoint HTTP status is 200');
    const detailData = await detailRes.json();
    assert(Array.isArray(detailData.weeks) && detailData.weeks.length > 0, 'Detail endpoint returns complete unabridged weeks & exercise matrices');

    // -------------------------------------------------------------
    // TEST 3: In-Memory TTL Cache Engine & Invalidation
    // -------------------------------------------------------------
    console.log('\n--- Step 3: In-Memory TTL Caching & Dynamic Invalidation ---');
    apiCache.flushAll(); // Clear cache to guarantee initial state

    const cacheTestUrl = `${BASE_URL}/api/plans/premade?type=Workout&goal=Muscle%20Building`;
    const missRes = await fetch(cacheTestUrl);
    assert(missRes.headers.get('X-Cache') === 'MISS', 'First catalogue request is a cache MISS');

    const hitRes = await fetch(cacheTestUrl);
    assert(hitRes.headers.get('X-Cache') === 'HIT', 'Immediate subsequent catalogue request is a cache HIT');

    // Create a new plan as instructor to trigger mutation cache invalidation
    const createRes = await fetch(`${BASE_URL}/api/plans/premade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({
        title: 'Cache Invalidation Verification Plan',
        type: 'Workout',
        goal: 'Muscle Building',
        difficulty: 'Intermediate',
        durationWeeks: 4,
        daysPerWeek: 3,
        description: 'Testing automatic cache invalidation.',
        weeks: [{ weekNumber: 1, focus: 'Test', days: [{ dayNumber: 1, title: 'Day 1', focus: 'Legs', exercises: [{ exerciseId: 'squat', name: 'Squat', sets: 3, reps: '10' }] }] }]
      })
    });
    assert(createRes.status === 201, 'Instructor created plan to trigger cache invalidation');
    const createdPlan = await createRes.json();

    // Verify that cache for plans was invalidated
    const invalidatedRes = await fetch(cacheTestUrl);
    assert(invalidatedRes.headers.get('X-Cache') === 'MISS', 'Subsequent fetch is a cache MISS after instructor mutation');

    // Cleanup created plan
    if (createdPlan._id) {
      await PreMadePlan.findByIdAndDelete(createdPlan._id);
    }

    // -------------------------------------------------------------
    // TEST 4: Direct Signed Upload URL Security & Direct Upload
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Direct Signed CDN Upload URL Endpoint ---');
    // Unauthorized attempt
    const unauthSignedRes = await fetch(`${BASE_URL}/api/media/signed-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'video.mp4', folder: 'exercises' })
    });
    assert(unauthSignedRes.status === 401, 'Unauthenticated signed upload URL request rejected (401)');

    // Non-staff attempting restricted folder (exercises)
    const traineeForbiddenRes = await fetch(`${BASE_URL}/api/media/signed-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({ fileName: 'video.mp4', folder: 'exercises' })
    });
    assert(traineeForbiddenRes.status === 403, 'Trainee forbidden from requesting signed upload for instructor folders (403)');

    // Instructor authorized signed URL request
    const instructorSignedRes = await fetch(`${BASE_URL}/api/media/signed-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({ fileName: 'heavy_squat_demo.mp4', folder: 'exercises', contentType: 'video/mp4', fileSize: 15 * 1024 * 1024 })
    });
    assert(instructorSignedRes.status === 200, 'Instructor signed upload URL request succeeded (200)');
    const signedData = await instructorSignedRes.json();
    assert(signedData.hasOwnProperty('directUploadAvailable'), 'Response includes directUploadAvailable flag for graceful fallback');

    // -------------------------------------------------------------
    // TEST 5: AI Coach Response Latency Instrumentation
    // -------------------------------------------------------------
    console.log('\n--- Step 5: AI Coach Latency Instrumentation Timers ---');
    const aiChatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({
        message: 'Give me a quick 3-point bench press checklist for safe form.',
        activeMode: 'library'
      })
    });

    assert(aiChatRes.status === 200, 'AI Coach responded with 200 OK');
    const aiChatData = await aiChatRes.json();
    assert(Boolean(aiChatData.content), 'AI Coach returned non-empty response content');
    assert(Boolean(aiChatData.meta), 'AI Coach response includes performance meta object');
    assert(typeof aiChatData.meta?.totalTimeMs === 'number', `meta.totalTimeMs is measured (${aiChatData.meta?.totalTimeMs}ms)`);
    assert(typeof aiChatData.meta?.retrievalTimeMs === 'number', `meta.retrievalTimeMs is measured (${aiChatData.meta?.retrievalTimeMs}ms)`);

    // -------------------------------------------------------------
    // TEST 6: Strict Cursor Validation (HTTP 400 on Malformed Cursors)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Strict Keyset Cursor Validation ---');
    const badCursorRes = await fetch(`${BASE_URL}/api/plans/premade?paginate=true&limit=2&cursor=invalid_mongo_hex_id`);
    assert(badCursorRes.status === 400, 'Malformed cursor returns HTTP 400 Bad Request');
    const badCursorData = await badCursorRes.json();
    assert(Boolean(badCursorData.message && badCursorData.message.includes('cursor')), 'Error response clearly identifies invalid cursor');

    // -------------------------------------------------------------
    // TEST 7: Dietary Filter Support in Diet Catalogue
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Dietary Type Filtering Verification ---');
    // Seed a specific dietary plan if not present
    let ketoPlan = await PreMadePlan.findOne({ type: 'Diet', dietaryType: 'Keto' });
    if (!ketoPlan) {
      ketoPlan = await PreMadePlan.create({
        title: 'Keto Kickstart Protocol',
        type: 'Diet',
        dietaryType: 'Keto',
        status: 'published',
        goal: 'Weight Loss',
        durationWeeks: 4,
        caloriesTarget: 2100,
        description: 'Low-carb ketogenic nutrition protocol.',
        weeks: [{ weekNumber: 1, focus: 'Induction', days: [{ dayNumber: 1, title: 'Day 1', meals: [{ mealType: 'Breakfast', name: 'Eggs & Avocado' }] }] }],
        createdBy: 'Coach Perf Instructor',
        createdById: instructorUser._id
      });
    }

    const dietRes = await fetch(`${BASE_URL}/api/plans/premade?type=Diet&dietaryType=Keto`);
    assert(dietRes.status === 200, 'Diet filter query responded 200 OK');
    const dietData = await dietRes.json();
    const dietItems = Array.isArray(dietData) ? dietData : (dietData.items || []);
    assert(dietItems.length > 0, 'Diet catalogue returns matching keto plans');
    const allKeto = dietItems.every(p => p.dietaryType === 'Keto' || (p.title && p.title.toLowerCase().includes('keto')));
    assert(allKeto, 'All returned plans match dietaryType=Keto');

    // -------------------------------------------------------------
    // TEST 8: Article Excerpt Generation & Card DTO Projection
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Article Excerpt Pre-Save & Card DTO Projection ---');
    let testArticle = await Article.findOne({ title: 'Performance Excerpt Test Article' });
    if (!testArticle) {
      testArticle = await Article.create({
        title: 'Performance Excerpt Test Article',
        category: 'Nutrition',
        summary: 'A short overview of modern nutrient timing.',
        content: '### Detailed Analysis of Nutrient Timing\n\nNutrient timing is a popular nutritional strategy that involves consuming specific combinations of nutrients in and around an exercise session. This comprehensive guide covers pre-workout, intra-workout, and post-workout guidelines in extreme detail with scientific research references.',
        status: 'published',
        author: 'Coach Perf Instructor',
        authorId: instructorUser._id
      });
    }

    // Check that pre-save hook generated an excerpt
    assert(Boolean(testArticle.excerpt && testArticle.excerpt.length > 20), 'Article model pre-save hook successfully populated excerpt');

    // Query article list endpoint and verify projection
    const articleListRes = await fetch(`${BASE_URL}/api/articles?category=Nutrition`);
    assert(articleListRes.status === 200, 'Article list query responded 200 OK');
    const articleList = await articleListRes.json();
    const foundArticleCard = articleList.find(a => a._id.toString() === testArticle._id.toString());
    assert(Boolean(foundArticleCard), 'Created article appears in catalogue list');
    assert(Boolean(foundArticleCard.excerpt), 'Article card includes excerpt');
    assert(foundArticleCard.content === undefined, 'Article card projection omits heavy full markdown content');

    // -------------------------------------------------------------
    // TEST 9: Signed Upload URL Security Hardening
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Signed Upload URL Security & Boundary Checks ---');
    // Attempt path traversal in fileName
    const traversalRes = await fetch(`${BASE_URL}/api/media/signed-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({ fileName: '../../etc/passwd', folder: 'exercises', contentType: 'image/png' })
    });
    assert(traversalRes.status === 400, 'Path traversal attempt in fileName returns HTTP 400');

    // Attempt disallowed MIME type / extension (.exe)
    const executableRes = await fetch(`${BASE_URL}/api/media/signed-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({ fileName: 'malicious.exe', folder: 'exercises', contentType: 'application/x-msdownload' })
    });
    assert(executableRes.status === 400, 'Disallowed MIME/extension upload request returns HTTP 400');

    // Attempt oversized file (e.g. 100MB video exceeding 50MB limit)
    const oversizedRes = await fetch(`${BASE_URL}/api/media/signed-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({ fileName: 'huge_video.mp4', folder: 'exercises', contentType: 'video/mp4', fileSize: 100 * 1024 * 1024 })
    });
    assert(oversizedRes.status === 400, 'Oversized file exceeding size limit returns HTTP 400');

    // -------------------------------------------------------------
    // TEST 10: Exercise Library Server-Side Pagination & DTO
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Exercise Library Pagination & Lightweight Projection ---');
    // Ensure at least 5 exercises exist in DB
    const exerciseCount = await Exercise.countDocuments();
    if (exerciseCount < 5) {
      const demoExercises = [
        { exerciseId: 'push_up', name: 'Push Up', category: 'Strength', targetMuscles: ['Chest', 'Triceps'], equipment: 'Bodyweight', difficulty: 'Beginner', executionSteps: ['Get into plank position', 'Lower chest to floor', 'Push back up'] },
        { exerciseId: 'pull_up', name: 'Pull Up', category: 'Strength', targetMuscles: ['Back', 'Biceps'], equipment: 'Pull-up Bar', difficulty: 'Intermediate', executionSteps: ['Grip bar', 'Pull chin over bar', 'Lower down'] },
        { exerciseId: 'air_squat', name: 'Air Squat', category: 'Strength', targetMuscles: ['Quads', 'Glutes'], equipment: 'Bodyweight', difficulty: 'Beginner', executionSteps: ['Stand shoulder-width', 'Squat down', 'Drive through heels'] },
        { exerciseId: 'plank', name: 'Plank', category: 'Core', targetMuscles: ['Core', 'Abs'], equipment: 'Bodyweight', difficulty: 'Beginner', executionSteps: ['Rest on forearms', 'Maintain straight spine', 'Hold'] },
        { exerciseId: 'dumbbell_curl', name: 'Dumbbell Curl', category: 'Strength', targetMuscles: ['Biceps'], equipment: 'Dumbbell', difficulty: 'Beginner', executionSteps: ['Hold dumbbells', 'Curl up', 'Lower slowly'] }
      ];
      for (const ex of demoExercises) {
        await Exercise.findOneAndUpdate({ exerciseId: ex.exerciseId }, ex, { upsert: true, new: true });
      }
    }

    const exPage1Res = await fetch(`${BASE_URL}/api/exercises?paginate=true&limit=3`);
    assert(exPage1Res.status === 200, 'Exercise pagination query responded 200 OK');
    const exPage1 = await exPage1Res.json();
    assert(Array.isArray(exPage1.items) && exPage1.items.length <= 3, 'Exercise page 1 respects limit=3');
    assert(Boolean(exPage1.nextCursor), 'Exercise page 1 returns nextCursor');
    assert(exPage1.items[0].executionSteps === undefined, 'Exercise card DTO omits executionSteps array');

    // Malformed cursor for exercises returns 400
    const badExCursor = await fetch(`${BASE_URL}/api/exercises?paginate=true&limit=3&cursor=not_valid_hex`);
    assert(badExCursor.status === 400, 'Exercise malformed cursor returns HTTP 400');


    console.log('\n===============================================================');
    console.log(`📊 PERFORMANCE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Fatal Performance Test Error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
    await mongoose.disconnect();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runPerformanceTests();
