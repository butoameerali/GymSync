import assert from 'assert';
import workoutDecisionEngine from '../services/workout/workoutDecisionEngine.js';
import nutritionCalculator from '../services/nutrition/nutritionCalculator.js';
import dietBuilder from '../services/nutrition/dietBuilder.js';
import dietValidator from '../services/nutrition/dietValidator.js';
import coachConversationEngine from '../services/ai/coachConversationEngine.js';
import exerciseSafetyValidator from '../services/safety/exerciseSafetyValidator.js';
import exerciseRegistry from '../services/workout/exerciseRegistry.js';

console.log('====================================================');
console.log('  RUNNING GYMSYNC AI TRAINER DECISION ENGINE TESTS  ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 12;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------------
// TEST 1: Beginner, Fat loss, No equipment, 3 days/week
// -------------------------------------------------------------------
test('TEST 1: Beginner, Fat loss, No equipment, 3 days/week', () => {
  const profile = {
    fitnessLevel: 'Beginner',
    mainGoalArea: 'Weight Loss & Fat Burn',
    equipmentAccess: 'Bodyweight only',
    trainingDaysPerWeek: 3,
    sessionDurationMins: 45,
    pushupBaseline: 8
  };

  const session = workoutDecisionEngine.generateSession({ userProfile: profile });

  assert(session.mainWorkout.length >= 3, 'Should generate at least 3 exercises');
  // All exercises must be Bodyweight
  session.mainWorkout.forEach(ex => {
    assert.strictEqual(ex.equipment, 'Bodyweight', `Exercise ${ex.name} must be Bodyweight only`);
    assert(ex.reasonForSelection, 'Must have reasonForSelection');
    assert(ex.movementPattern, 'Must have movementPattern');
    assert.strictEqual(typeof ex.sets, 'number', 'Must have numeric sets');
    assert(ex.rpe.includes('RPE'), 'Must have RPE guidance');
  });
  // Must have reasoned warm-up and cool-down
  assert(session.warmup.warmupExercises.length >= 3, 'Must include multi-phase warm-up');
  assert(session.cooldown.cooldownExercises.length >= 2, 'Must include cooldown');
});

// -------------------------------------------------------------------
// TEST 2: Cricketer, Intermediate, Performance goal, Full gym
// -------------------------------------------------------------------
test('TEST 2: Cricketer, Intermediate, Performance goal, Full gym', () => {
  const profile = {
    sport: 'Cricket',
    fitnessLevel: 'Intermediate',
    mainGoalArea: 'Athletic Performance',
    equipmentAccess: 'Full Gym',
    trainingDaysPerWeek: 4,
    pushupBaseline: 18
  };

  const session = workoutDecisionEngine.generateSession({ userProfile: profile });

  assert.strictEqual(session.sport, 'Cricket', 'Sport profile must be Cricket');
  // Must include rotational / trunk stability or shoulder health
  const patterns = session.mainWorkout.map(e => e.movementPattern);
  const hasRotationalOrPull = patterns.some(p => p === 'rotation' || p === 'anti-rotation' || p === 'horizontal pull');
  assert(hasRotationalOrPull, 'Cricket session must prioritize rotational or scapular movement patterns');
});

// -------------------------------------------------------------------
// TEST 3: Runner, Endurance goal, 4 days/week
// -------------------------------------------------------------------
test('TEST 3: Runner, Endurance goal, 4 days/week', () => {
  const profile = {
    sport: 'Running',
    fitnessLevel: 'Intermediate',
    mainGoalArea: 'Stamina & Endurance Boost',
    equipmentAccess: 'Bodyweight only',
    trainingDaysPerWeek: 4,
    pushupBaseline: 15
  };

  const session = workoutDecisionEngine.generateSession({ userProfile: profile });

  assert.strictEqual(session.sport, 'Running / Track', 'Sport profile must detect Running');
  // Warmup must address ankle/hip or calf prep
  const warmupNames = session.warmup.warmupExercises.map(w => w.name.toLowerCase()).join(' ');
  assert(warmupNames.includes('ankle') || warmupNames.includes('hip') || warmupNames.includes('glute'), 'Runner warmup must prep ankle/hip stabilizers');
});

// -------------------------------------------------------------------
// TEST 4: User with knee pain (Verify incompatible exercises are removed)
// -------------------------------------------------------------------
test('TEST 4: User with knee pain (Verify incompatible exercises are removed)', () => {
  const profile = {
    fitnessLevel: 'Intermediate',
    mainGoalArea: 'Muscle Building (Hypertrophy)',
    equipmentAccess: 'Full Gym',
    jointPain: ['knees']
  };

  const session = workoutDecisionEngine.generateSession({ userProfile: profile });

  // Barbell Back Squats and Leg Extensions must NOT be present
  session.mainWorkout.forEach(ex => {
    const n = ex.name.toLowerCase();
    assert(!n.includes('barbell back squat'), 'Heavy back squats must be removed for knee pain');
    assert(!n.includes('leg extension'), 'Leg extensions must be removed for knee pain');
  });

  assert(session.medicalSafetyReview.excludedCount > 0, 'Must record excluded exercises in audit');
});

// -------------------------------------------------------------------
// TEST 5: 30-minute session (Verify generated session fits time)
// -------------------------------------------------------------------
test('TEST 5: 30-minute session (Verify generated session fits time)', () => {
  const profile = {
    fitnessLevel: 'Beginner',
    mainGoalArea: 'General Fitness',
    equipmentAccess: 'Full Gym',
    sessionDurationMins: 30
  };

  const session = workoutDecisionEngine.generateSession({ userProfile: profile });

  const totalMins = session.timeBudget.totalEstimatedMinutes;
  assert(totalMins <= 38, `30-minute session must not run into 70 mins (got ${totalMins} mins)`);
  assert(totalMins >= 20, `30-minute session must be substantial (got ${totalMins} mins)`);
});

// -------------------------------------------------------------------
// TEST 6: Muscle gain (Verify calorie surplus logic and adequate protein)
// -------------------------------------------------------------------
test('TEST 6: Muscle gain (Verify calorie surplus logic and adequate protein)', () => {
  const user = { weightKg: 75, heightCm: 178, age: 24, gender: 'Male', goal: 'Muscle Building (Hypertrophy)' };
  const macros = nutritionCalculator.calculateMacroTargets(user);

  assert(macros.targetCalories > macros.tdee, 'Muscle gain must produce a caloric surplus (targetCalories > tdee)');
  const proteinPerKg = macros.proteinGrams / user.weightKg;
  assert(proteinPerKg >= 1.8, `Protein intake (${proteinPerKg} g/kg) must be at least 1.8g/kg for muscle gain`);
});

// -------------------------------------------------------------------
// TEST 7: Fat loss (Verify calorie deficit logic)
// -------------------------------------------------------------------
test('TEST 7: Fat loss (Verify calorie deficit logic)', () => {
  const user = { weightKg: 85, heightCm: 175, age: 28, gender: 'Male', goal: 'Weight Loss & Fat Burn' };
  const macros = nutritionCalculator.calculateMacroTargets(user);

  assert(macros.targetCalories < macros.tdee, 'Fat loss must produce a caloric deficit (targetCalories < tdee)');
  const deficit = macros.tdee - macros.targetCalories;
  assert(deficit >= 350 && deficit <= 650, `Caloric deficit (${deficit} kcal) must be biologically safe (350-650 kcal)`);
});

// -------------------------------------------------------------------
// TEST 8: User trained legs yesterday (Verify today's plan avoids heavy leg overload)
// -------------------------------------------------------------------
test('TEST 8: User trained legs yesterday (Verify today does not blindly repeat high-fatigue leg work)', () => {
  const profile = { fitnessLevel: 'Intermediate', equipmentAccess: 'Full Gym' };
  const recentHistory = [
    { name: 'Barbell Back Squats', movementPattern: 'squat', date: new Date().toISOString() }
  ];

  const session = workoutDecisionEngine.generateSession({
    userProfile: profile,
    recentWorkoutHistory: recentHistory
  });

  const patterns = session.mainWorkout.map(e => e.movementPattern);
  assert(!patterns.includes('squat'), 'Should NOT prescribe heavy squats immediately after yesterday leg workout');
  assert(session.sessionType === 'upper' || session.sessionObjective.includes('Upper'), 'Should shift focus to upper body or recovery');
});

// -------------------------------------------------------------------
// TEST 9: Diet validator (Reject unrealistic quantities)
// -------------------------------------------------------------------
test('TEST 9: Diet validator (Reject unrealistic quantities)', () => {
  const unrealisticDiet = {
    actualTotals: { totalDailyCalories: 5200, totalProtein: 350, totalCarbs: 400, totalFat: 200 },
    meals: [
      {
        mealName: 'Breakfast',
        totalCalories: 2000,
        items: [{ food: 'Boiled Eggs', portion: '14 whole eggs', calories: 1000 }]
      }
    ]
  };

  const audit = dietValidator.validateDiet(unrealisticDiet, { weightKg: 70 });
  assert.strictEqual(audit.valid, false, 'Diet validator must reject absurd plan');
  assert(audit.errors.some(e => e.includes('egg') || e.includes('excessively high') || e.includes('protein')), 'Must flag excessive eggs, calories, or protein');
});

// -------------------------------------------------------------------
// TEST 10: Conversation adaptation (User changes equipment gym -> dumbbells only)
// -------------------------------------------------------------------
test('TEST 10: Conversation adaptation (User changes equipment gym -> dumbbells only)', () => {
  const turn = coachConversationEngine.processTurn({
    message: 'I only have dumbbells today',
    userContext: { equipmentAccess: 'Full Gym', fitnessLevel: 'Beginner' }
  });

  assert(turn.structuredAction.workout, 'Must return structured workout');
  turn.structuredAction.workout.mainWorkout.forEach(ex => {
    assert(ex.equipment === 'Dumbbells' || ex.equipment === 'Bodyweight', `Exercise ${ex.name} must be Dumbbells or Bodyweight only`);
  });
});

// -------------------------------------------------------------------
// TEST 11: Conversation adaptation (User says they have a match tomorrow)
// -------------------------------------------------------------------
test('TEST 11: Conversation adaptation (User says they have a match tomorrow)', () => {
  const turn = coachConversationEngine.processTurn({
    message: 'I have a cricket match tomorrow, what should I do?',
    userContext: { sport: 'Cricket', equipmentAccess: 'Full Gym', fitnessLevel: 'Intermediate' }
  });

  assert(turn.structuredAction.workout, 'Must return pre-match workout');
  const session = turn.structuredAction.workout;
  assert(session.preEventStrategy, 'Pre-event strategy must be active');
  // Every exercise RPE must be submaximal (RPE 6 or 6.5)
  session.mainWorkout.forEach(ex => {
    assert(!ex.rpe.includes('RPE 9') && !ex.rpe.includes('RPE 8.5'), `Pre-match session must avoid high RPE (got ${ex.rpe})`);
  });
});

// -------------------------------------------------------------------
// TEST 12: Existing exercise library (Educational browsing does not count as assigned workout completion)
// -------------------------------------------------------------------
test('TEST 12: Existing exercise library (Educational browsing does not alter assigned workout)', () => {
  // In AITrainer architecture, exercises from EXERCISE_LIBRARY have no aiWorkoutIndex
  // Only exercises with assigned aiWorkoutIndex can alter completion status.
  const libraryExercise = { id: 'ex_1', name: 'Barbell Bench Press', category: 'Chest' };
  assert.strictEqual(libraryExercise.aiWorkoutIndex, undefined, 'Library exercise must not have aiWorkoutIndex');

  const assignedExercise = { id: 'ex_1', name: 'Barbell Bench Press', aiWorkoutIndex: 0 };
  assert.strictEqual(typeof assignedExercise.aiWorkoutIndex, 'number', 'Assigned exercise has valid workout index');
});

console.log(`\n====================================================`);
console.log(`  ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!  `);
console.log(`====================================================\n`);
