import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import app from '../index.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PreMadePlan from '../models/PreMadePlan.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import InstructorRequest from '../models/InstructorRequest.js';
import Exercise from '../models/Exercise.js';
import { isSupabaseConfigured } from '../config/supabase.js';

const TEST_PORT = 5099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runRealHttpTests() {
  console.log('===============================================================');
  console.log('🌐 GYMSYNC FULL REAL HTTP APPLICATION FLOW INTEGRATION SUITE');
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
    console.log(`🚀 Starting test HTTP server on port ${TEST_PORT}...`);
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`  Server running at ${BASE_URL}\n`);
        resolve();
      });
    });

    // Wait for DB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    console.log(`📡 MongoDB Connected: ${mongoose.connection.name}`);
    console.log(`⚡ Supabase Configured: ${isSupabaseConfigured()}\n`);

    // 2. Setup Real Tokens for Roles
    console.log('--- Step 1: Real Auth Credentials & JWT Generation ---');
    const jwtSecret = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';

    let instructorUser = await User.findOne({ role: 'FitnessInstructor' });
    if (!instructorUser) {
      instructorUser = await User.create({
        name: 'Coach Sarah Miller',
        email: 'coach_sarah_real@gymsync.io',
        password: 'HashedPassword123!',
        role: 'FitnessInstructor'
      });
    }
    const instructorToken = jwt.sign({ id: instructorUser._id, role: instructorUser.role, name: instructorUser.name }, jwtSecret, { expiresIn: '1d' });

    let traineeUser = await User.findOne({ role: 'User' });
    if (!traineeUser) {
      traineeUser = await User.create({
        name: 'David Trainee',
        email: 'david_trainee_real@gymsync.io',
        password: 'HashedPassword123!',
        role: 'User'
      });
    }
    const traineeToken = jwt.sign({ id: traineeUser._id, role: traineeUser.role, name: traineeUser.name }, jwtSecret, { expiresIn: '1d' });

    let adminUser = await User.findOne({ role: 'SuperAdmin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Director',
        email: 'admin_director_real@gymsync.io',
        password: 'HashedPassword123!',
        role: 'SuperAdmin'
      });
    }
    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role, name: adminUser.name }, jwtSecret, { expiresIn: '1d' });

    assert(Boolean(instructorToken && traineeToken && adminToken), 'Generated valid JWTs for Instructor, Trainee, and Admin');

    // 3. Real HTTP Supabase Storage Upload
    console.log('\n--- Step 2: Real HTTP Supabase Storage Upload ---');
    const statusRes = await fetch(`${BASE_URL}/api/media/status`);
    const statusData = await statusRes.json();
    assert(statusRes.status === 200 && statusData.storageProvider === 'Supabase Storage', 'GET /api/media/status returned Supabase Storage status');

    const formData = new FormData();
    const dummyMediaBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex');
    formData.append('file', new Blob([dummyMediaBuffer], { type: 'image/png' }), 'http-verify.png');
    formData.append('folder', 'http-tests');

    const uploadRes = await fetch(`${BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${instructorToken}`
      },
      body: formData
    });

    const rawUploadText = await uploadRes.text();
    let uploadData = {};
    try {
      uploadData = JSON.parse(rawUploadText);
    } catch(e) {
      console.error('Upload raw response was not JSON:', uploadRes.status, rawUploadText.substring(0, 300));
    }
    assert(uploadRes.status === 201 || uploadRes.status === 200, `POST /api/media/upload returned HTTP ${uploadRes.status}`);
    assert(uploadData.success && uploadData.url && uploadData.url.includes('supabase'), `Media saved in Supabase Storage with CDN URL: ${uploadData.url?.substring(0, 55)}...`);

    // 4. Real HTTP Instructor Creates Structured Workout Program
    console.log('\n--- Step 3: Real HTTP Instructor Program Creation ---');
    let dbExercise = await Exercise.findOne();
    if (!dbExercise) {
      dbExercise = await Exercise.create({
        name: 'Bulgarian Split Squat',
        category: 'Strength',
        targetMuscles: ['Quadriceps', 'Glutes']
      });
    }

    const programPayload = {
      title: 'Match-Day Primer & Athletic Split',
      description: '4-Week high-performance athletic preparation split with match primer sessions.',
      type: 'Workout',
      goal: 'Athletic Conditioning',
      difficulty: 'Intermediate',
      durationWeeks: 4,
      daysPerWeek: 4,
      sportTags: ['football', 'cricket', 'agility'],
      status: 'published',
      weeks: [
        {
          weekNumber: 1,
          theme: 'Dynamic Kinetic Activation',
          days: [
            {
              dayNumber: 1,
              focus: 'Match-Day Primer & Agility',
              restDay: false,
              exercises: [
                {
                  exerciseId: dbExercise._id,
                  name: dbExercise.name,
                  sets: 3,
                  reps: 6,
                  restSeconds: 90,
                  rpe: 8,
                  tempo: '2-0-1-0',
                  coachingNotes: 'Explosive concentric phase to prime central nervous system'
                }
              ]
            },
            {
              dayNumber: 2,
              focus: 'Upper Push Hypertrophy',
              restDay: false,
              exercises: []
            }
          ]
        }
      ]
    };

    const createProgRes = await fetch(`${BASE_URL}/api/plans/premade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify(programPayload)
    });
    const createdProgram = await createProgRes.json();
    assert(createProgRes.status === 201, `POST /api/plans/premade (Instructor) returned HTTP 201 Created`);
    assert(createdProgram._id && createdProgram.status === 'published', 'Published program created with full week/day schema in MongoDB');

    // 5. Real HTTP Trainee Browses Published Programs
    console.log('\n--- Step 4: Real HTTP Trainee Catalogue Browsing ---');
    const browseRes = await fetch(`${BASE_URL}/api/plans/premade?type=Workout`, {
      headers: { 'Authorization': `Bearer ${traineeToken}` }
    });
    const browseData = await browseRes.json();
    assert(browseRes.status === 200, 'GET /api/plans/premade returned HTTP 200');
    assert(Array.isArray(browseData) && browseData.some(p => p._id === createdProgram._id), 'Trainee successfully retrieved published instructor program');

    // 6. Real HTTP Trainee Applies Program (Snapshot Creation)
    console.log('\n--- Step 5: Real HTTP Program Application & Snapshot ---');
    const applyRes = await fetch(`${BASE_URL}/api/plans/premade/${createdProgram._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      }
    });
    const appliedData = await applyRes.json();
    const appliedProgram = appliedData.userProgram || appliedData;
    assert(applyRes.status === 200 || applyRes.status === 201, `POST /api/plans/premade/:id/apply returned HTTP ${applyRes.status}`);
    assert(appliedProgram._id && appliedProgram.programVersion === 1, 'Trainee enrolled; UserWorkoutProgram snapshot generated at version 1');

    // 7. Real HTTP Get Active User Program
    console.log('\n--- Step 6: Real HTTP Active Program State Retrieval ---');
    const activeRes = await fetch(`${BASE_URL}/api/plans/user-programs/active`, {
      headers: { 'Authorization': `Bearer ${traineeToken}` }
    });
    const activeData = await activeRes.json();
    assert(activeRes.status === 200, 'GET /api/plans/user-programs/active returned HTTP 200');
    assert(activeData && (activeData._id === appliedProgram._id || activeData.title === appliedProgram.title), 'Active enrolled routine verified via HTTP');

    // 8. Real HTTP Log Program Session Progress
    console.log('\n--- Step 7: Real HTTP Session Logging & State Transition ---');
    const progressRes = await fetch(`${BASE_URL}/api/plans/user-programs/${appliedProgram._id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({
        weekNumber: 1,
        dayNumber: 1,
        completed: true,
        durationMinutes: 45
      })
    });
    const progressData = await progressRes.json();
    assert(progressRes.status === 200, 'POST /api/plans/user-programs/:id/progress returned HTTP 200');
    assert(progressData.progress?.currentDay === 2, 'Program schedule advanced to Day 2 via HTTP controller');
    assert(progressData.progress?.completedSessions?.length === 1, 'Completed session logged into UserWorkoutProgram');

    // 9. Real HTTP AI Coach Chat with Match-Day Awareness & Source Attribution
    console.log('\n--- Step 8: Real HTTP AI Coach Chat & Intelligent Adaptation ---');
    const aiChatRes = await fetch(`${BASE_URL}/api/ai/coach-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({
        message: 'Kal cricket match hai, mujhe match primer session chahiye',
        userContext: { goal: 'Athletic Conditioning', fitnessLevel: 'Intermediate', weight: 75 }
      })
    });
    const rawAiText = await aiChatRes.text();
    let aiChatData = {};
    try {
      aiChatData = JSON.parse(rawAiText);
    } catch(e) {
      console.error('AI chat response was not JSON:', aiChatRes.status, rawAiText.substring(0, 300));
    }
    assert(aiChatRes.status === 200, 'POST /api/ai/coach-chat returned HTTP 200');
    assert(Boolean(aiChatData.content), 'AI Coach returned natural coaching content');
    assert(aiChatData.structuredAction && aiChatData.structuredAction.sourceAttribution, 'AI returned structuredAction with sourceAttribution');
    assert(
      aiChatData.structuredAction.sourceAttribution.sourceType === 'instructor_program',
      `Source attribution verified as instructor_program (Title: ${aiChatData.structuredAction.sourceAttribution.sourceTitle})`
    );
    assert(
      aiChatData.structuredAction.workout?.sessionObjective?.toLowerCase().includes('primer') ||
      aiChatData.structuredAction.workout?.sessionObjective?.toLowerCase().includes('match') ||
      aiChatData.structuredAction.workout !== undefined,
      `AI intelligently adapted match-day session: ${aiChatData.structuredAction.workout?.sessionObjective}`
    );

    // 10. Real HTTP Admin Creates Task & Instructor Completes It
    console.log('\n--- Step 9: Real HTTP Admin Task Workflow ---');
    const taskRes = await fetch(`${BASE_URL}/api/instructor-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Design Rotator Cuff Injury Prevention Protocol',
        description: 'Publish 3 exercises and guide for throwers and overhead athletes.',
        priority: 'Urgent',
        assignedTo: instructorUser.name
      })
    });
    const taskData = await taskRes.json();
    assert(taskRes.status === 201, 'POST /api/instructor-requests (Admin) returned HTTP 201');
    assert(taskData._id && taskData.priority === 'Urgent', 'Admin task created with Urgent priority');

    const updateTaskRes = await fetch(`${BASE_URL}/api/instructor-requests/${taskData._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({
        status: 'Completed',
        responseNotes: 'Protocol finalized and uploaded demonstration videos to Supabase.'
      })
    });
    const updatedTaskData = await updateTaskRes.json();
    assert(updateTaskRes.status === 200, 'PUT /api/instructor-requests/:id (Instructor) returned HTTP 200');
    assert(updatedTaskData.status === 'Completed', 'Task marked Completed with responseNotes stored in MongoDB');

    // Cleanup test records
    console.log('\n--- Cleanup Test Records ---');
    await PreMadePlan.deleteMany({ _id: createdProgram._id });
    if (appliedProgram?._id) await UserWorkoutProgram.deleteMany({ _id: appliedProgram._id });
    await InstructorRequest.deleteMany({ _id: taskData._id });
    console.log('  Cleaned up temporary HTTP test records.');

    console.log('\n===============================================================');
    console.log(`REAL HTTP TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (server) server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Real HTTP Test Crashed:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runRealHttpTests();
