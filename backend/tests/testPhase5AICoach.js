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
import Post from '../models/Post.js';
import Exercise from '../models/Exercise.js';
import Article from '../models/Article.js';
import PreMadePlan from '../models/PreMadePlan.js';
import AICoachMemory from '../models/AICoachMemory.js';
import { fitnessContentService } from '../services/fitnessContentService.js';
import { workoutBuddyFinder, sanitizePublicProfile } from '../services/ai/workoutBuddyFinder.js';
import { aiUserMemoryService } from '../services/ai/aiUserMemoryService.js';
import { aiCoachTruthGuard } from '../services/ai/aiCoachTruthGuard.js';
import { executeCoachPipeline } from '../controllers/aiController.js';

let mongoConnected = false;

async function setupDB() {
  const uri = getTestMongoUri();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    mongoConnected = true;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🧪 TEST SUITE: PHASE 5 - AI COACH BEHAVIOR & INTEGRITY');
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

  // Test setup user and cleanup
  const testUserId = new mongoose.Types.ObjectId();
  const buddyUserId = new mongoose.Types.ObjectId();

  await User.deleteMany({ _id: { $in: [testUserId, buddyUserId] } });
  await Post.deleteMany({ author: { $in: [testUserId, buddyUserId] } });
  await AICoachMemory.deleteMany({ userId: { $in: [testUserId, buddyUserId] } });

  await User.create({
    _id: testUserId,
    name: 'Hamza Khan',
    email: 'hamza.test@example.com',
    password: 'password123',
    role: 'User',
    accountStatus: 'Active',
    city: 'Lahore',
    bioData: {
      weight: null,
      equipmentAccess: null,
      trainingDaysPerWeek: null
    }
  });

  // -------------------------------------------------------------
  // 5.1 Offline: Silent Deterministic Fallback & Zero Offline Banners
  // -------------------------------------------------------------
  console.log('--- 5.1 Offline Resilience & Silent Deterministic Fallback ---');

  await asyncTest('Offline AI executes silent deterministic pipeline with HTTP 200 equivalent result', async () => {
    // When Ollama is offline or disabled, executeCoachPipeline returns a valid assistant response
    const result = await executeCoachPipeline({
      message: 'How do I improve my bench press form?',
      userId: null,
      userContext: { name: 'Ahmad', primaryGoal: 'Gain Strength', fitnessLevel: 'Intermediate' }
    });

    assert.ok(result, 'Result should exist');
    assert.strictEqual(result.role, 'assistant');
    assert.ok(result.content && result.content.length > 10, 'Response should have helpful coaching text');
  });

  test('User-facing response contains zero "AI offline" or "Ollama down" mentions', () => {
    const rawOfflineErr = "Ollama is down right now, so I cannot process your request.";
    const sanitized = aiCoachTruthGuard.sanitizeCoachResponse(rawOfflineErr);
    assert.ok(!sanitized.toLowerCase().includes('ollama is down'), 'Must strip "ollama is down"');
    assert.ok(!sanitized.toLowerCase().includes('ai is offline'), 'Must strip "ai is offline"');
    assert.ok(sanitized.length > 5, 'Must provide helpful coaching fallback');
  });

  // -------------------------------------------------------------
  // 5.2 Content-Only Answers (GymSync Sources) & Workout Buddy Privacy
  // -------------------------------------------------------------
  console.log('\n--- 5.2 Content-Only Citations & Workout Buddy Privacy ---');

  await asyncTest('fitnessContentService searches GymSync content only with source attribution', async () => {
    // Check exercises lookup
    const exercises = await fitnessContentService.findRelevantExercises({ query: 'push up', limit: 2 });
    assert.ok(Array.isArray(exercises), 'Should return exercise array');
    if (exercises.length > 0) {
      assert.strictEqual(exercises[0].sourceType, 'instructor_exercise');
      assert.ok(exercises[0].sourceTitle, 'Exercise should have source title');
    }

    // Check articles lookup
    const articles = await fitnessContentService.findRelevantArticles({ query: 'squat', limit: 2 });
    assert.ok(Array.isArray(articles), 'Should return article array');

    // Check programs lookup
    const programs = await fitnessContentService.findRelevantPrograms({ query: 'strength', limit: 2 });
    assert.ok(Array.isArray(programs), 'Should return program array');
  });

  await asyncTest('Workout buddy search finds public members without leaking ANY private fields', async () => {
    // Create buddy user with lots of sensitive private fields
    await User.create({
      _id: buddyUserId,
      name: 'Usman Ali',
      username: 'usman_lifts',
      email: 'usman.private.secret@example.com',
      phone: '+923001234567',
      password: 'supersecretpasswordhash',
      otpCode: '998877',
      role: 'User',
      status: 'Active',
      city: 'Lahore',
      subscribedGymName: 'Iron Gym Lahore',
      fitnessGoal: 'Hypertrophy & Strength',
      bio: 'Training 4 days a week, looking for a spotter on heavy bench days!',
      disclaimerAcceptedAt: new Date('2025-01-01'),
      disclaimerVersion: 'v1.0',
      bioData: {
        weight: 88,
        height: 182,
        dob: '1996-04-12',
        gender: 'Male',
        foodPreferences: 'High Protein Halal',
        trainingDaysPerWeek: 4,
        equipmentAccess: 'Full Gym'
      }
    });

    const searchResults = await workoutBuddyFinder.findWorkoutBuddies({
      query: 'looking for workout buddy Lahore',
      city: 'Lahore',
      currentUserId: testUserId
    });

    assert.ok(searchResults.buddies && searchResults.buddies.length > 0, 'Should find candidate buddy in Lahore');
    const buddy = searchResults.buddies.find(b => String(b.id || b._id) === String(buddyUserId));
    assert.ok(buddy, 'Found Usman in search results');

    // Verify allowed public fields
    assert.strictEqual(buddy.name, 'Usman Ali');
    assert.ok(buddy.username, 'Should have username string');
    assert.strictEqual(buddy.city, 'Lahore');
    assert.strictEqual(buddy.subscribedGymName, 'Iron Gym Lahore');
    assert.strictEqual(buddy.fitnessGoal, 'Hypertrophy & Strength');

    // STRICT PRIVACY AUDIT: Ensure all private and sensitive fields are completely absent/undefined
    assert.strictEqual(buddy.bioData, undefined, 'Private bioData must NEVER be exposed');
    assert.strictEqual(buddy.weight, undefined, 'Private weight must NEVER be exposed');
    assert.strictEqual(buddy.height, undefined, 'Private height must NEVER be exposed');
    assert.strictEqual(buddy.dob, undefined, 'Private dob must NEVER be exposed');
    assert.strictEqual(buddy.gender, undefined, 'Private gender must NEVER be exposed');
    assert.strictEqual(buddy.email, undefined, 'Private email must NEVER be exposed');
    assert.strictEqual(buddy.phone, undefined, 'Private phone must NEVER be exposed');
    assert.strictEqual(buddy.password, undefined, 'Private password must NEVER be exposed');
    assert.strictEqual(buddy.otpCode, undefined, 'Private otpCode must NEVER be exposed');
    assert.strictEqual(buddy.disclaimerAcceptedAt, undefined, 'Private medical disclaimer must NEVER be exposed');
    assert.strictEqual(buddy.foodLogs, undefined, 'Private food logs must NEVER be exposed');
    assert.strictEqual(buddy.messages, undefined, 'Private messages must NEVER be exposed');
  });

  await asyncTest('AI coach workout buddy intent returns public members with strict privacy note', async () => {
    const response = await executeCoachPipeline({
      message: 'Find me a workout buddy in Lahore',
      userId: testUserId,
      userContext: { name: 'Ahmad', city: 'Lahore' }
    });

    assert.ok(response && response.content, 'Should return assistant response');
    assert.ok(response.content.includes('Workout Buddy Finder'), 'Should identify buddy finder intent');
    assert.ok(response.content.includes('Usman Ali'), 'Should list public member name');
    assert.ok(response.content.includes('Privacy Note'), 'Should include transparent privacy note');
    assert.strictEqual(response.structuredAction.intent, 'workout_buddy');

    // Assure response does NOT contain buddy private weight or email
    assert.ok(!response.content.includes('88 kg'), 'Response must not blurt private weight');
    assert.ok(!response.content.includes('usman.private.secret'), 'Response must not expose private email');
  });

  // -------------------------------------------------------------
  // 5.3 Ask Once Rule & Server-Side Persistence
  // -------------------------------------------------------------
  console.log('\n--- 5.3 Ask Once Rule & Server-Side Persistence ---');

  await asyncTest('aiUserMemoryService records asked fields and prevents re-asking', async () => {
    await aiUserMemoryService.resetMemory(testUserId);

    // Initial state: not asked
    const askedBefore = await aiUserMemoryService.hasBeenAsked(testUserId, 'training_type');
    assert.strictEqual(askedBefore, false, 'Should be false initially');

    // Record asked
    await aiUserMemoryService.recordFieldAsked(testUserId, 'training_type');

    // Next check: must be true
    const askedAfter = await aiUserMemoryService.hasBeenAsked(testUserId, 'training_type');
    assert.strictEqual(askedAfter, true, 'Should be true after recording');
  });

  await asyncTest('AI coach does not re-ask missing info if already asked once', async () => {
    await aiUserMemoryService.resetMemory(testUserId);

    // Turn 1: User sends vague training announcement ("kal meri training hai")
    const turn1 = await executeCoachPipeline({
      message: 'kal meri training hai',
      userId: testUserId,
      userContext: { name: 'Ahmad' }
    });

    assert.strictEqual(turn1.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(turn1.structuredAction.missingContext, 'training_type');

    // Turn 2: User says something similar or continues without answering
    const turn2 = await executeCoachPipeline({
      message: 'kal meri training hai',
      userId: testUserId,
      userContext: { name: 'Ahmad' }
    });

    // Should NOT re-ask! Must proceed with best effort
    assert.notStrictEqual(turn2.structuredAction.type, 'ASK_CLARIFICATION', 'Must not re-ask the user');
    assert.strictEqual(turn2.structuredAction.missingContext, null, 'missingContext must be cleared');
  });

  await asyncTest('User-provided information in message is extracted and persisted server-side', async () => {
    // Reset test user bio fields to null
    await User.findByIdAndUpdate(testUserId, {
      $set: {
        'bioData.weight': null,
        'bioData.equipmentAccess': null,
        'bioData.trainingDaysPerWeek': null
      }
    });

    // User mentions their weight and equipment in chat message
    const rawMessage = "Hi coach, I weigh 76 kg and I work out with dumbbells only, 4 days a week.";
    const { updatedFields, newlyLearned } = await aiUserMemoryService.extractAndPersistUserEntities(testUserId, rawMessage);

    assert.strictEqual(newlyLearned, true, 'Should flag newly learned info');
    assert.strictEqual(updatedFields['bioData.weight'], 76, 'Should extract weight 76 kg');
    assert.strictEqual(updatedFields['bioData.equipmentAccess'], 'Dumbbells Only', 'Should extract Dumbbells Only');
    assert.strictEqual(updatedFields['bioData.trainingDaysPerWeek'], 4, 'Should extract 4 days per week');

    // Verify persisted directly in MongoDB User document
    const updatedUser = await User.findById(testUserId).lean();
    assert.strictEqual(updatedUser.bioData.weight, 76, 'MongoDB must have saved weight 76');
    assert.strictEqual(updatedUser.bioData.equipmentAccess, 'Dumbbells Only', 'MongoDB must have saved equipment');
    assert.strictEqual(updatedUser.bioData.trainingDaysPerWeek, 4, 'MongoDB must have saved training days');
  });

  // -------------------------------------------------------------
  // 5.4 Truth Rule: Never Claim to Modify Program & Never Prescribe Diet
  // -------------------------------------------------------------
  console.log('\n--- 5.4 Truth Rule Enforcement (R1, R2, 5.4) ---');

  test('Truth Guard intercepts and replaces false claims of program modification', () => {
    const falseClaim1 = "I have updated your workout program to 4 sets of 12 reps.";
    const sanitized1 = aiCoachTruthGuard.sanitizeCoachResponse(falseClaim1);

    assert.ok(!sanitized1.includes('I have updated your workout program'), 'Must strip false claim');
    assert.ok(sanitized1.includes('human-authored'), 'Must state programs are human-authored');

    const falseClaim2 = "maine apka plan update kar diya hai.";
    const sanitized2 = aiCoachTruthGuard.sanitizeCoachResponse(falseClaim2);
    assert.ok(!sanitized2.includes('maine apka plan update kar diya'), 'Must strip Urdu false claim');
  });

  test('Truth Guard intercepts and replaces false claims of diet prescription', () => {
    const falseDietClaim = "You should eat 2200 calories and follow this prescribed meal plan.";
    const sanitized = aiCoachTruthGuard.sanitizeCoachResponse(falseDietClaim);

    assert.ok(!sanitized.includes('You should eat 2200 calories'), 'Must strip diet prescription');
    assert.ok(sanitized.includes('Track + Report only') || sanitized.includes('Track & Report only'), 'Must remind Track + Report only');
  });

  test('Truth Guard validates compliant responses as valid', () => {
    const validResponse = "Here are some exercises for chest from our exercise library: Barbell Bench Press and Push-ups.";
    const compliance = aiCoachTruthGuard.validateTruthCompliance(validResponse);
    assert.strictEqual(compliance.valid, true, 'Valid response should pass');
    assert.strictEqual(compliance.claimsProgramMutation, false);
    assert.strictEqual(compliance.claimsDietPrescription, false);
  });

  // Cleanup
  await User.deleteMany({ _id: { $in: [testUserId, buddyUserId] } });
  await Post.deleteMany({ author: { $in: [testUserId, buddyUserId] } });
  await AICoachMemory.deleteMany({ userId: { $in: [testUserId, buddyUserId] } });

  console.log('\n===============================================================');
  console.log(`📊 PHASE 5 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  if (mongoConnected) {
    mongoose.disconnect();
  }
}).catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
