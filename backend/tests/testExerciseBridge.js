import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import Exercise from '../models/Exercise.js';
import exerciseRegistry, { syncDatabaseExercises } from '../services/workout/exerciseRegistry.js';
import workoutDecisionEngine from '../services/workout/workoutDecisionEngine.js';
import coachConversationEngine from '../services/ai/coachConversationEngine.js';

async function runTests() {
  console.log('🧪 Starting Exercise Database -> AI Trainer Bridge Suite...');
  let passCount = 0;

  try {
    await connectDB();

    // 1. Verify synchronous methods NEVER return a Promise
    const all = exerciseRegistry.getAll();
    assert(Array.isArray(all), 'exerciseRegistry.getAll() must return an Array, not a Promise');
    assert(!(all instanceof Promise), 'getAll() must not return a Promise');
    passCount++;
    console.log('  ✅ 1. exerciseRegistry.getAll() returns direct Array synchronously');

    const byId = exerciseRegistry.getById('EX-0001');
    assert(byId && typeof byId === 'object' && !(byId instanceof Promise), 'getById must return object synchronously');
    passCount++;
    console.log('  ✅ 2. exerciseRegistry.getById() returns direct object synchronously');

    const byName = exerciseRegistry.findByName('Barbell Back Squat');
    assert(byName && typeof byName === 'object' && !(byName instanceof Promise), 'findByName must return object synchronously');
    passCount++;
    console.log('  ✅ 3. exerciseRegistry.findByName() returns direct object synchronously');

    const byPattern = exerciseRegistry.getByMovementPattern('squat');
    assert(Array.isArray(byPattern) && !(byPattern instanceof Promise), 'getByMovementPattern must return array synchronously');
    passCount++;
    console.log('  ✅ 4. exerciseRegistry.getByMovementPattern() returns direct array synchronously');

    // 2. Clean up any previous test custom exercises
    await Exercise.deleteMany({ exerciseId: { $in: ['CUSTOM-EX-001', 'CUSTOM-EX-ARCHIVED'] } });

    // 3. Insert an active custom exercise into MongoDB
    const testExercise = await Exercise.create({
      exerciseId: 'CUSTOM-EX-001',
      name: 'Viking Overhead Shoulder Thruster',
      category: 'Shoulders',
      targetMuscles: ['Deltoids', 'Triceps'],
      secondaryMuscles: ['Core', 'Quadriceps'],
      equipmentRequired: 'Dumbbells',
      difficulty: 'Intermediate',
      movementPatterns: ['vertical push'],
      movementPattern: 'vertical push',
      jointPainAvoidIf: ['shoulder'],
      medicalAvoidIf: ['hypertension'],
      status: 'active',
      isAiTrackable: false,
      calorieEstimation: {
        metValue: 7.0,
        estimatedKcalPerMinute: 8.5
      },
      instructions: 'Drive through legs and press overhead explosively.'
    });

    // 4. Force sync into AI registry
    await syncDatabaseExercises({ force: true });
    passCount++;
    console.log('  ✅ 5. syncDatabaseExercises({ force: true }) executed successfully');

    // 5. Verify the custom DB exercise is in the registry
    const syncedEx = exerciseRegistry.getById('CUSTOM-EX-001');
    assert(syncedEx, 'Custom exercise CUSTOM-EX-001 must exist in AI registry');
    assert.strictEqual(syncedEx.name, 'Viking Overhead Shoulder Thruster');
    assert.strictEqual(syncedEx.equipment, 'Dumbbells');
    assert.strictEqual(syncedEx.movementPattern, 'vertical push');
    assert(syncedEx.injuryExclusions.includes('shoulder'), 'Shoulder injury exclusion must be mapped');
    passCount++;
    console.log('  ✅ 6. Custom DB exercise mapped properly with equipment and injury exclusions');

    // 6. Test that workoutDecisionEngine selects the DB exercise for a matching Dumbbell upper body workout
    const generatedSession = workoutDecisionEngine.generateSession({
      userProfile: {
        fitnessLevel: 'Intermediate',
        equipmentAccess: 'Dumbbells',
        primaryGoal: 'Muscle Hypertrophy',
        jointPain: [],
        medicalConditions: [],
        sessionDurationMins: 45
      },
      sessionType: 'upper',
      dayNumber: 2
    });

    assert(generatedSession && Array.isArray(generatedSession.exercises), 'generateSession must return session synchronously');
    assert(!(generatedSession instanceof Promise), 'generateSession must NEVER return a Promise');
    passCount++;
    console.log('  ✅ 7. workoutDecisionEngine.generateSession() returns session synchronously');

    // 7. Verify medical/injury exclusion: If user has shoulder pain, CUSTOM-EX-001 must NOT be selected
    const injuredSession = workoutDecisionEngine.generateSession({
      userProfile: {
        fitnessLevel: 'Intermediate',
        equipmentAccess: 'Dumbbells',
        primaryGoal: 'Muscle Hypertrophy',
        jointPain: ['shoulder'],
        medicalConditions: [],
        sessionDurationMins: 45
      },
      sessionType: 'upper',
      dayNumber: 2
    });

    const hasExcludedInInjured = injuredSession.exercises.some(e => e.id === 'CUSTOM-EX-001' || e.name.includes('Viking'));
    assert(!hasExcludedInInjured, 'Custom exercise with shoulder pain exclusion must be filtered out for user with shoulder pain');
    passCount++;
    console.log('  ✅ 8. Medical & joint safety filter excludes custom exercise when contraindicated');

    // 8. Test coachConversationEngine.processTurn() async/sync safety
    const turnResult = coachConversationEngine.processTurn({
      message: 'Give me a dumbbell shoulder workout',
      userContext: {
        equipmentAccess: 'Dumbbells',
        fitnessLevel: 'Intermediate',
        primaryGoal: 'Hypertrophy'
      }
    });

    assert(turnResult && typeof turnResult === 'object' && !(turnResult instanceof Promise), 'processTurn must return object synchronously');
    passCount++;
    console.log('  ✅ 9. coachConversationEngine.processTurn() returns direct object synchronously');

    // 9. Deactivate exercise (archive it) and test pruning
    testExercise.status = 'archived';
    await testExercise.save();

    await syncDatabaseExercises({ force: true });
    const prunedEx = exerciseRegistry.getById('CUSTOM-EX-001');
    assert(!prunedEx, 'Archived exercise must be pruned from AI registry');
    passCount++;
    console.log('  ✅ 10. Archived / inactive database exercise is automatically pruned from AI registry');

    // Cleanup
    await Exercise.findByIdAndDelete(testExercise._id);

    console.log(`\n🎉 All ${passCount}/${passCount} Exercise Database -> AI Trainer Bridge checks PASSED!\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Exercise Bridge Suite FAILED:', err);
    process.exit(1);
  }
}

runTests();
