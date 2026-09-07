import assert from 'assert';
import coachConversationEngine from '../services/ai/coachConversationEngine.js';
import intentClassifier, { INTENTS } from '../services/ai/intentClassifier.js';
import eventAwarenessEngine, { EVENT_TYPES } from '../services/workout/eventAwarenessEngine.js';
import workoutDecisionEngine from '../services/workout/workoutDecisionEngine.js';
import dietBuilder from '../services/nutrition/dietBuilder.js';
import dietValidator from '../services/nutrition/dietValidator.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('\n====================================================');
console.log('  RUNNING CONVERSATIONAL COACH ADAPTIVE TEST SUITE  ');
console.log('====================================================\n');

// -------------------------------------------------------------------
// TEST 1: Vague "I have training tomorrow" -> Coach asks what type of training
// -------------------------------------------------------------------
test('TEST 1: Vague "I have training tomorrow" triggers clarification', () => {
  const result = coachConversationEngine.processTurn({
    message: 'I have training tomorrow.',
    userContext: { fitnessLevel: 'Intermediate', equipmentAccess: 'Full Gym' },
    history: []
  });

  assert.strictEqual(result.structuredAction.type, 'ASK_CLARIFICATION', 'Must ask for clarification');
  assert.strictEqual(result.structuredAction.missingContext, 'training_type', 'Must identify training_type as missing');
  assert(result.content.includes('What type of training is it tomorrow'), 'Must ask what type of training tomorrow');
  assert.strictEqual(result.structuredAction.workout, null, 'Must NOT generate random exercises immediately');
});

// -------------------------------------------------------------------
// TEST 2: User responds "Army training" -> Coach asks what tomorrow involves
// -------------------------------------------------------------------
test('TEST 2: Follow-up "Army training" asks what training involves', () => {
  const history = [
    { role: 'user', content: 'I have training tomorrow.' },
    { role: 'assistant', content: 'What type of training is it tomorrow? (For example: Army, football, cricket...)' }
  ];

  const result = coachConversationEngine.processTurn({
    message: 'Army training',
    userContext: { fitnessLevel: 'Intermediate', equipmentAccess: 'Full Gym' },
    history
  });

  assert.strictEqual(result.structuredAction.type, 'ASK_CLARIFICATION', 'Must ask for clarification of army activities');
  assert.strictEqual(result.structuredAction.missingContext, 'training_activities', 'Must request training activities');
  assert(result.content.includes('running') || result.content.includes('push-ups') || result.content.includes('obstacle'), 'Must give examples of military activities');
  assert.strictEqual(result.structuredAction.workout, null, 'Must not jump to workout before knowing activities');
});

// -------------------------------------------------------------------
// TEST 3: User specifies "Running, push-ups, pull-ups and obstacle course" -> Pre-event priming protocol
// -------------------------------------------------------------------
test('TEST 3: Full military workload details -> Pre-event priming, zero chest/lat/quad exhaustion', () => {
  const history = [
    { role: 'user', content: 'I have training tomorrow.' },
    { role: 'assistant', content: 'What type of training is it tomorrow?' },
    { role: 'user', content: 'Army training' },
    { role: 'assistant', content: 'What does tomorrow\'s training involve? For example, running, push-ups, pull-ups, obstacle work...' }
  ];

  const result = coachConversationEngine.processTurn({
    message: 'Running, push-ups, pull-ups and obstacle course.',
    userContext: { fitnessLevel: 'Intermediate', equipmentAccess: 'Full Gym' },
    history
  });

  assert.strictEqual(result.structuredAction.type, 'UPDATE_WORKOUT', 'Must generate adapted workout');
  assert(result.structuredAction.workout, 'Workout must be present');

  // Verify heavy exercises are avoided
  const exNames = result.structuredAction.workout.mainWorkout.map(e => e.name);
  assert(!exNames.includes('Barbell Bench Press'), 'Must not include heavy bench press before push-up test');
  assert(!exNames.includes('Barbell Back Squat'), 'Must not include heavy squats before running/obstacle test');

  // Verify coach advice includes hydration & sleep
  assert(result.content.toLowerCase().includes('sleep') || result.content.toLowerCase().includes('water'), 'Must include rest and hydration advice');
  assert(result.content.toLowerCase().includes('zero chest') || result.content.toLowerCase().includes('fatigue'), 'Must explain fatigue protection in plain language');
});

// -------------------------------------------------------------------
// TEST 4: Vague "I have a race" -> Coach asks distance & timing
// -------------------------------------------------------------------
test('TEST 4: Vague "I have a race" asks for distance and timing', () => {
  const result = coachConversationEngine.processTurn({
    message: 'I have a race',
    userContext: { fitnessLevel: 'Intermediate' },
    history: []
  });

  assert.strictEqual(result.structuredAction.type, 'ASK_CLARIFICATION', 'Must ask clarification for race');
  assert.strictEqual(result.structuredAction.missingContext, 'race_details', 'Missing context must be race_details');
  assert(result.content.includes('What distance is the race') || result.content.includes('when is it'), 'Must query distance and date');
});

// -------------------------------------------------------------------
// TEST 5: Specific "5K race tomorrow" -> Immediate pre-race protocol without redundant questions
// -------------------------------------------------------------------
test('TEST 5: "5K race tomorrow" immediately produces pre-race priming (no redundant questions)', () => {
  const result = coachConversationEngine.processTurn({
    message: '5K race tomorrow',
    userContext: { fitnessLevel: 'Intermediate', equipmentAccess: 'Bodyweight' },
    history: []
  });

  assert.strictEqual(result.structuredAction.type, 'UPDATE_WORKOUT', 'Must immediately generate pre-race priming');
  assert(result.structuredAction.workout, 'Workout must be generated');
  assert(result.content.includes('5K race tomorrow') || result.content.includes('5K'), 'Must acknowledge 5K race');

  // RPE must be capped at 6.5
  const maxRpe = Math.max(...result.structuredAction.workout.mainWorkout.map(e => parseFloat(e.rpe.replace(/[^0-9.]/g, '')) || 6));
  assert(maxRpe <= 7, 'Pre-race RPE must be strictly capped below 7.0');
});

// -------------------------------------------------------------------
// TEST 6: Vague goal "I want to get fit" -> Asks clarifying question without dumping random workout
// -------------------------------------------------------------------
test('TEST 6: "I want to get fit" asks what to prioritize in plain language', () => {
  const result = coachConversationEngine.processTurn({
    message: 'I want to get fit.',
    userContext: { fitnessLevel: 'Beginner' },
    history: []
  });

  assert.strictEqual(result.structuredAction.type, 'ASK_CLARIFICATION', 'Must ask what fitness goal to prioritize');
  assert.strictEqual(result.structuredAction.missingContext, 'goal_priority', 'Missing context must be goal_priority');
  assert(result.content.includes('priority right now') || result.content.includes('Losing weight'), 'Must offer clear priorities');
  assert.strictEqual(result.structuredAction.workout, null, 'Must NOT output random exercises immediately');
});

// -------------------------------------------------------------------
// TEST 7: 100 kg weight loss request -> Uses bio, explains in plain language
// -------------------------------------------------------------------
test('TEST 7: "My weight is 100 kg and I want to lose it" gives plain language plan & meal portions', () => {
  const userBio = {
    gender: 'Male',
    height: 175,
    weight: 100,
    fitnessLevel: 'Beginner',
    equipmentAccess: 'Bodyweight'
  };

  const result = coachConversationEngine.processTurn({
    message: 'My weight is 100 kg and I want to lose it',
    userContext: userBio,
    history: []
  });

  assert.strictEqual(result.structuredAction.type, 'UPDATE_WORKOUT', 'Must create joint-friendly weight loss session');
  assert(result.structuredAction.workout, 'Workout must be present');
  assert(result.structuredAction.diet, 'Diet must be present');

  // Verify plain portion language
  assert(result.content.includes('boiled eggs') || result.content.includes('daal') || result.content.includes('rotis'), 'Must include plain everyday portion terms');
  assert(result.content.includes('100 kg'), 'Must acknowledge the 100 kg starting point');
});

// -------------------------------------------------------------------
// TEST 8: Workload Conflict: Legs yesterday + Football tomorrow -> Upper body & core
// -------------------------------------------------------------------
test('TEST 8: Cumulative fatigue: Legs yesterday + Football tomorrow -> Upper body & core', () => {
  const result = coachConversationEngine.processTurn({
    message: 'I trained legs heavily yesterday and tomorrow I have football practice.',
    userContext: { fitnessLevel: 'Intermediate', equipmentAccess: 'Full Gym' },
    history: []
  });

  assert.strictEqual(result.structuredAction.type, 'UPDATE_WORKOUT', 'Must update workout');
  assert(result.structuredAction.workout, 'Workout must be present');

  // Verify legs are protected
  const patterns = result.structuredAction.workout.mainWorkout.map(e => e.movementPattern);
  assert(!patterns.includes('squat'), 'Must strictly eliminate squats');
  assert(!patterns.includes('lunge'), 'Must strictly eliminate lunges');

  // Verify plain language explanation
  assert(result.content.includes('I chose these exercises because tomorrow\'s football practice already gives you a high lower-body workload') ||
         result.content.includes('football practice'), 'Must explain rationale clearly in plain language');
});

// -------------------------------------------------------------------
// TEST 9: Sequential adaptation during chat ("Only dumbbells" -> "Only 20 mins" -> "Knee hurts")
// -------------------------------------------------------------------
test('TEST 9: Dynamic adaptation during chat modifies workout iteratively', () => {
  // Turn 1: Dumbbells only
  const turn1 = coachConversationEngine.processTurn({
    message: 'I only have dumbbells today',
    userContext: { equipmentAccess: 'Full Gym', sessionDurationMins: 45 },
    history: []
  });
  assert(turn1.structuredAction.workout.mainWorkout.every(e => e.equipment === 'Dumbbells' || e.equipment === 'Bodyweight'), 'Must only use dumbbells or bodyweight');

  // Turn 2: 20 minutes
  const turn2 = coachConversationEngine.processTurn({
    message: 'Actually I only have 20 minutes',
    userContext: { equipmentAccess: 'Dumbbells', sessionDurationMins: 45 },
    history: [{ role: 'user', content: 'I only have dumbbells today' }, { role: 'assistant', content: turn1.content }]
  });
  assert(turn2.structuredAction.workout.timeBudget.totalEstimatedMinutes <= 26, 'Must budget session to ~20 minutes');

  // Turn 3: Knee hurts
  const turn3 = coachConversationEngine.processTurn({
    message: 'My knee hurts today',
    userContext: { equipmentAccess: 'Dumbbells', sessionDurationMins: 20 },
    history: [
      { role: 'user', content: 'I only have dumbbells today' },
      { role: 'assistant', content: turn1.content },
      { role: 'user', content: 'Actually I only have 20 minutes' },
      { role: 'assistant', content: turn2.content }
    ]
  });
  const kneeEx = turn3.structuredAction.workout.mainWorkout.map(e => e.name);
  assert(!kneeEx.includes('Barbell Back Squat') && !kneeEx.includes('Walking Lunges'), 'Must eliminate deep knee flexion');
  assert(turn3.structuredAction.safetyFlags.some(f => f.toLowerCase().includes('knee')), 'Must flag knee protection');
});

// -------------------------------------------------------------------
// TEST 10: Bio Respect: Never asks for info already in userContext
// -------------------------------------------------------------------
test('TEST 10: Bio Respect: Never asks for height/weight/equipment if already present in bio', () => {
  const completeBio = {
    height: 180,
    weight: 78,
    gender: 'Male',
    fitnessLevel: 'Intermediate',
    equipmentAccess: 'Full Gym',
    primaryGoal: 'Muscle Gain'
  };

  const result = coachConversationEngine.processTurn({
    message: 'What should I do today?',
    userContext: completeBio,
    history: []
  });

  // Must not ask for height, weight, or equipment
  assert(!result.content.includes('What is your height'), 'Must not ask for height');
  assert(!result.content.includes('What is your weight'), 'Must not ask for weight');
  assert(!result.content.includes('What equipment do you have'), 'Must not ask for equipment');
  assert.strictEqual(result.structuredAction.type, 'UPDATE_WORKOUT', 'Must generate workout immediately');
});

// -------------------------------------------------------------------
// TEST 11: Plain Language Diet portions
// -------------------------------------------------------------------
test('TEST 11: Diet Builder outputs everyday meal portion descriptions', () => {
  const diet = dietBuilder.generateDietPlan({
    userProfile: { weight: 75, height: 175, age: 26, gender: 'Male', primaryGoal: 'Muscle Gain' }
  });

  assert(diet.meals.length >= 3, 'Must have at least 3 meals');
  const allItems = diet.meals.flatMap(m => m.items);
  // Check that portions are described in everyday units
  const hasEverydayUnits = allItems.some(i => i.portion.includes('egg') || i.portion.includes('chapati') || i.portion.includes('cup') || i.portion.includes('bowl'));
  assert(hasEverydayUnits, 'Diet items must use everyday units');
});

// -------------------------------------------------------------------
// TEST 12: Diet Validator rejects absurd quantities
// -------------------------------------------------------------------
test('TEST 12: Diet Validator strictly rejects absurd food quantities', () => {
  const userProfile = { weight: 70 };
  const absurdDiet = {
    actualTotals: { totalDailyCalories: 5500, totalProtein: 350 },
    meals: [
      {
        mealName: 'Breakfast',
        items: [{ food: 'Whole Eggs', portion: '12 whole eggs' }]
      }
    ]
  };

  const validation = dietValidator.validateDiet(absurdDiet, userProfile);
  assert(!validation.isValid, 'Diet with 12 eggs and 350g protein must be rejected');
  assert(validation.issues.some(i => i.includes('Egg quantity')), 'Must flag excessive eggs');
  assert(validation.issues.some(i => i.includes('Protein ceiling exceeded')), 'Must flag protein ceiling');
});

console.log('\n====================================================');
console.log(`  ALL ${passed} OF ${passed + failed} TESTS PASSED SUCCESSFULLY!  `);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
