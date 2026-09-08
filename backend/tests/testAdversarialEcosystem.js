import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../models/User.js';
import PreMadePlan from '../models/PreMadePlan.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import UserDietPlan from '../models/UserDietPlan.js';
import WorkoutProgress from '../models/WorkoutProgress.js';

import planRoutes from '../routes/planRoutes.js';
import mediaRoutes from '../routes/mediaRoutes.js';
import aiRoutes from '../routes/aiRoutes.js';
import { rankProgramCandidates, findRelevantDietTemplates } from '../services/fitnessContentService.js';

const app = express();
app.use(express.json());
app.use('/api/plans', planRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/ai', aiRoutes);


let server;
let port;
let baseUrl;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_tests';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = JWT_SECRET;

async function runTests() {
  console.log('🧪 Starting GymSync Adversarial & Hardening Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. Database Connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gymsync');
    }

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    console.log(`📡 Test Server listening on ${baseUrl}`);

    // Setup Test Users
    const traineeEmail = `trainee_adv_${Date.now()}@example.com`;
    const instructorEmail = `coach_adv_${Date.now()}@example.com`;

    const traineeUser = await User.create({
      name: 'Adversarial Trainee',
      email: traineeEmail,
      password: 'hashedpassword123',
      role: 'User'
    });

    const instructorUser = await User.create({
      name: 'Elite Coach',
      email: instructorEmail,
      password: 'hashedpassword123',
      role: 'FitnessInstructor'
    });

    const traineeToken = jwt.sign({ id: traineeUser._id, role: traineeUser.role }, JWT_SECRET);
    const instructorToken = jwt.sign({ id: instructorUser._id, role: instructorUser.role }, JWT_SECRET);

    console.log('\n--- 1. MEDIA STORAGE & SECURITY AUDIT ---');

    // 1A: Anonymous Upload must be rejected (401)
    const anonRes = await fetch(`${baseUrl}/api/media/upload`, {
      method: 'POST'
    });
    assert(anonRes.status === 401, 'Anonymous media upload returns 401 Unauthorized');

    // 1B: Trainee uploading to instructor folder must be forbidden (403)
    const formDataBoundary = '----WebKitFormBoundaryAdversarialTest';
    const fakeImageBuffer = Buffer.from('fake image content');
    const bodyTrainee = Buffer.concat([
      Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\nexercises\r\n`),
      Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      fakeImageBuffer,
      Buffer.from(`\r\n--${formDataBoundary}--\r\n`)
    ]);

    const traineeUploadRes = await fetch(`${baseUrl}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`
      },
      body: bodyTrainee
    });
    assert(traineeUploadRes.status === 403, 'Trainee attempting upload to instructor folder "exercises" is rejected with 403 Forbidden');

    // 1C: Instructor uploading to instructor folder is accepted
    const instructorUploadRes = await fetch(`${baseUrl}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${instructorToken}`,
        'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`
      },
      body: bodyTrainee
    });
    const instructorUploadData = await instructorUploadRes.json();
    assert(instructorUploadRes.status === 200 || instructorUploadRes.status === 201, 'Instructor uploading to "exercises" folder succeeds');
    assert(instructorUploadData.success === true && (instructorUploadData.storage === 'supabase' || instructorUploadData.storage === 'inline_fallback'), 'Upload uses Supabase storage or secure fallback');

    console.log('\n--- 2. PROGRAM PROGRESSION & ANTI-CHEATING AUDIT ---');

    // Create a 4-week workout program
    const testProgram = await PreMadePlan.create({
      title: 'Audit Strength & Power Program',
      type: 'Workout',
      category: 'Strength',
      goal: 'Strength',
      difficulty: 'Intermediate',
      durationWeeks: 4,
      daysPerWeek: 4,
      status: 'published',
      createdBy: 'Elite Coach',
      weeks: [
        {
          weekNumber: 1,
          days: [
            { dayNumber: 1, title: 'Upper Heavy', focus: 'Upper Body', exercises: [{ exerciseId: 'bench-press', name: 'Bench Press', sets: 4, reps: '5' }] },
            { dayNumber: 2, title: 'Lower Heavy', focus: 'Lower Body', exercises: [{ exerciseId: 'squat', name: 'Back Squat', sets: 4, reps: '5' }] }
          ]
        },
        {
          weekNumber: 2,
          days: [
            { dayNumber: 1, title: 'Upper Hypertrophy', focus: 'Upper Body', exercises: [{ exerciseId: 'incline-press', name: 'Incline Press', sets: 4, reps: '8' }] }
          ]
        }
      ]
    });

    // Trainee applies program
    const applyRes = await fetch(`${baseUrl}/api/plans/premade/${testProgram._id}/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': 'application/json'
      }
    });
    const applyData = await applyRes.json();
    assert(applyRes.status === 201, 'Trainee applies instructor program successfully');
    const userProgId = applyData.userProgram._id;

    // 2A: Anti-cheating: Trainee tries to skip ahead directly to Week 2 Day 1
    const cheatRes = await fetch(`${baseUrl}/api/plans/user-programs/${userProgId}/progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        weekNumber: 2,
        dayNumber: 1,
        exerciseLogs: [{ exerciseId: 'incline-press', completedSets: 4 }]
      })
    });
    const cheatData = await cheatRes.json();
    assert(cheatRes.status === 400, 'Skipping ahead to Week 2 Day 1 rejected with 400 Bad Request');
    assert(cheatData.error.includes('Cannot skip ahead'), 'Error message clearly explains sequential requirement');

    // 2B: Legitimate sequential completion: Week 1 Day 1
    const legitRes1 = await fetch(`${baseUrl}/api/plans/user-programs/${userProgId}/progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        weekNumber: 1,
        dayNumber: 1,
        exerciseLogs: [{ exerciseId: 'bench-press', completedSets: 4 }]
      })
    });
    const legitData1 = await legitRes1.json();
    assert(legitRes1.status === 200, 'Legitimate completion of Week 1 Day 1 succeeds');
    assert(legitData1.progress.completedSessions.length === 1, 'Completed sessions count is 1');

    // 2C: Idempotency Check: Calling progress again for the SAME session (Week 1 Day 1)
    const dupRes = await fetch(`${baseUrl}/api/plans/user-programs/${userProgId}/progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        weekNumber: 1,
        dayNumber: 1,
        exerciseLogs: [{ exerciseId: 'bench-press', completedSets: 4, notes: 'Updated idempotently' }]
      })
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 200, 'Duplicate session submission returns 200 OK');
    assert(dupData.alreadyCompleted === true, 'Response identifies session was already completed');
    assert(dupData.progress.completedSessions.length === 1, 'Idempotency prevents duplicate session entries in database');

    console.log('\n--- 3. NUTRITION ARITHMETIC & ALLERGEN INTEGRITY AUDIT ---');

    // 3A: Create Diet Template and verify pre-save arithmetic sum
    const testDiet = new PreMadePlan({
      title: 'South Asian Lean Mass Plan',
      type: 'Diet',
      category: 'Muscle Building',
      status: 'published',
      createdBy: 'Elite Coach',
      meals: [
        {
          mealType: 'Breakfast',
          name: 'Eggs & Oats',
          foodItems: [
            { name: 'Whole Eggs', quantity: 2, calories: 144, protein: 12, carbs: 1, fat: 10, allergens: ['eggs'], localAlternative: 'Desi Eggs' },
            { name: 'Oats in Water', quantity: 50, calories: 190, protein: 6, carbs: 34, fat: 3, allergens: ['gluten'], localAlternative: 'Dalia' }
          ]
        },
        {
          mealType: 'Lunch',
          name: 'Chicken & Roti',
          foodItems: [
            { name: 'Chicken Breast', quantity: 150, calories: 247, protein: 46, carbs: 0, fat: 5, allergens: [] },
            { name: 'Whole Wheat Roti', quantity: 2, calories: 208, protein: 6, carbs: 42, fat: 2, allergens: ['gluten'], localAlternative: 'Chapati' }
          ]
        }
      ]
    });

    await testDiet.save();

    // Verify calculated meal totals and daily plan totals
    const expectedBreakfastCal = 144 + 190;
    const expectedLunchCal = 247 + 208;
    const expectedTotalCal = expectedBreakfastCal + expectedLunchCal;

    assert(testDiet.meals[0].calories === expectedBreakfastCal, `Meal 1 calories correctly calculated: ${testDiet.meals[0].calories} == ${expectedBreakfastCal}`);
    assert(testDiet.meals[1].calories === expectedLunchCal, `Meal 2 calories correctly calculated: ${testDiet.meals[1].calories} == ${expectedLunchCal}`);
    assert(testDiet.calories === expectedTotalCal, `Total daily calories match sum of meals: ${testDiet.calories} == ${expectedTotalCal}`);
    assert(testDiet.allergies.includes('eggs') && testDiet.allergies.includes('gluten'), 'Food-level allergens automatically aggregated to plan level');

    // 3B: Food-level allergy exclusion check
    const nonAllergicDiets = await findRelevantDietTemplates({
      allergies: ['gluten'],
      limit: 10
    });
    const containsGluten = nonAllergicDiets.some(d => d._id.toString() === testDiet._id.toString());
    assert(!containsGluten, 'Diet containing gluten in food items is properly excluded for gluten-allergic user');

    console.log('\n--- 4. USER DIET ADOPTION & ADHERENCE AUDIT ---');

    // Trainee applies diet template
    const applyDietRes = await fetch(`${baseUrl}/api/plans/premade/${testDiet._id}/apply-diet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': 'application/json'
      }
    });
    const applyDietData = await applyDietRes.json();
    assert(applyDietRes.status === 201, 'Trainee successfully adopts instructor diet template');
    const userDietId = applyDietData.userDiet._id;

    // Log meal adherence
    const mealLogRes = await fetch(`${baseUrl}/api/plans/user-diets/${userDietId}/meal-log`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mealName: 'Eggs & Oats',
        mealType: 'Breakfast',
        caloriesConsumed: 334,
        adherenceNote: 'Substituted Dalia for Oats as recommended'
      })
    });
    const mealLogData = await mealLogRes.json();
    assert(mealLogRes.status === 200, 'Meal adherence logged successfully');
    assert(mealLogData.adherenceLogs.length === 1, 'Adherence log recorded in user active diet');

    console.log('\n--- 5. AI SPORTS SCIENCE & SAFETY ENGINE AUDIT ---');

    // 5A: Medical safety flag on acute pain
    const safetyChatRes = await fetch(`${baseUrl}/api/ai/coach-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${traineeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'I felt a sharp pain in my knee and it is swelling badly when squatting'
      })
    });
    const safetyChatData = await safetyChatRes.json();
    assert(safetyChatRes.status === 200, 'Coach chat handles acute pain query');
    assert(
      safetyChatData.content.includes('Medical Safety Alert') || safetyChatData.content.includes('doctor') || safetyChatData.content.includes('stop'),
      'AI responds with strict medical safety advice to stop and consult a doctor'
    );

    // 5B: Multi-factor candidate program ranking algorithm
    const samplePrograms = [
      { id: 'p1', title: 'Standard Full Body', goal: 'General Fitness', sportTags: [], difficulty: 'Beginner', equipmentRequired: ['Dumbbells'] },
      { id: 'p2', title: 'Cricket Fast Bowling Strength & Power', goal: 'Athletic Performance', sportTags: ['Cricket'], difficulty: 'Intermediate', equipmentRequired: ['Barbell', 'Dumbbells'], weeks: [{ days: [{ focus: 'Pre-Match Primer Activation' }] }] },
      { id: 'p3', title: 'Bodybuilding Hypertrophy Split', goal: 'Hypertrophy', sportTags: ['Bodybuilding'], difficulty: 'Advanced', equipmentRequired: ['Full Gym'] }
    ];

    const rankedForCricket = rankProgramCandidates(samplePrograms, {
      query: 'kal mera cricket match hai, activation primer workout chahiye',
      goal: 'Athletic Performance',
      sport: 'Cricket',
      equipment: 'Barbell'
    });

    assert(rankedForCricket[0].id === 'p2', `Candidate ranking correctly ranks Cricket Fast Bowling program #1 (Score: ${rankedForCricket[0].matchScore})`);
    assert(rankedForCricket[0].matchScore >= 50, `Winning candidate received comprehensive multi-factor score: ${rankedForCricket[0].matchScore}`);

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTests();
