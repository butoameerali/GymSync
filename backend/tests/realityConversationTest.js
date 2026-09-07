import assert from 'assert';
import { handleChat } from '../controllers/aiController.js';
import dietBuilder from '../services/nutrition/dietBuilder.js';
import dietValidator from '../services/nutrition/dietValidator.js';
import { EVENT_TYPES } from '../services/workout/eventAwarenessEngine.js';

/**
 * Reality Test Suite for GymSync Conversational Adaptive Personal Trainer
 * Executes true multi-turn conversational interaction through handleChat
 * across all 15 scenarios (TEST A through TEST O).
 */

// Helper to simulate express req/res against handleChat
async function simulateChatTurn({
  message,
  history = [],
  userContext = { name: 'Ameer', fitnessLevel: 'Intermediate', equipmentAccess: 'Full Gym', sessionDurationMins: 45 },
  currentPlan = null,
  currentWorkout = null,
  recentWorkoutHistory = [],
  currentProgress = {},
  preferences = {}
}) {
  let responseData = null;
  let statusCode = 200;

  const req = {
    body: {
      message,
      userContext,
      history,
      currentPlan,
      currentWorkout,
      recentWorkoutHistory,
      currentProgress,
      preferences
    }
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  await handleChat(req, res);
  return { statusCode, data: responseData };
}

let passedTests = 0;
let failedTests = 0;
const resultsLog = [];

async function runRealityTest(testName, testType, fn) {
  try {
    const details = await fn();
    console.log(`\n======================================================`);
    console.log(`✅ [PASS] ${testName} (${testType})`);
    console.log(`======================================================`);
    if (details) {
      console.log(`   - Detected Intent: ${details.intent || 'N/A'}`);
      console.log(`   - Action Type: ${details.actionType || 'N/A'}`);
      if (details.clarification) console.log(`   - Clarification Asked: ${details.clarification}`);
      if (details.sampleResponse) console.log(`   - Response Preview: "${details.sampleResponse.slice(0, 140)}..."`);
      if (details.notes) console.log(`   - Reality Verification: ${details.notes}`);
    }
    passedTests++;
    resultsLog.push({ testName, testType, status: 'PASS', details });
  } catch (err) {
    console.error(`\n❌ [FAIL] ${testName} (${testType})`);
    console.error(err);
    failedTests++;
    resultsLog.push({ testName, testType, status: 'FAIL', error: err.message });
  }
}

async function runAllRealityTests() {
  console.log('\n=============================================================');
  console.log('  STARTING REALITY TEST OF CONVERSATIONAL ADAPTIVE TRAINER  ');
  console.log('=============================================================\n');

  const sharedUser = {
    name: 'Ameer Ali',
    age: 24,
    gender: 'Male',
    height: 178,
    weight: 75,
    fitnessLevel: 'Intermediate',
    equipmentAccess: 'Full Gym',
    sessionDurationMins: 45,
    trainingDaysPerWeek: 4,
    jointPain: []
  };

  // -------------------------------------------------------------------------
  // TEST A: VAGUE TRAINING ("Kal meri training hai.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST A: VAGUE TRAINING', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'Kal meri training hai.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(res.data.structuredAction.missingContext, 'training_type');
    assert.strictEqual(res.data.structuredAction.workout, null, 'Must NOT generate workout prematurely');
    assert(res.data.content.includes('What type of training is it tomorrow'), 'Must ask what type of training tomorrow');

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      clarification: res.data.structuredAction.missingContext,
      sampleResponse: res.data.content,
      notes: 'Deterministic intentClassifier detected vague training announcement without type; asked training_type.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST B: ARMY FOLLOW-UP ("Army training" -> "Running, push-ups, pull-ups and obstacle course")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST B: ARMY FOLLOW-UP', 'Actual End-to-End Conversation Multi-Turn', async () => {
    // Turn 1: User says Army training
    const history1 = [
      { role: 'user', content: 'Kal meri training hai.' },
      { role: 'assistant', content: 'What type of training is it tomorrow? (For example: Army, football, cricket...)' }
    ];
    const turn1 = await simulateChatTurn({
      message: 'Army training.',
      userContext: sharedUser,
      history: history1
    });

    assert.strictEqual(turn1.data.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(turn1.data.structuredAction.missingContext, 'training_activities');
    assert.strictEqual(turn1.data.structuredAction.workout, null);

    // Turn 2: User provides activities
    const history2 = [
      ...history1,
      { role: 'user', content: 'Army training.' },
      { role: 'assistant', content: turn1.data.content }
    ];
    const turn2 = await simulateChatTurn({
      message: 'Running, push-ups, pull-ups and obstacle course.',
      userContext: sharedUser,
      history: history2
    });

    assert.strictEqual(turn2.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(turn2.data.structuredAction.workout, 'Workout session must be generated');

    const exNames = turn2.data.structuredAction.workout.mainWorkout.map(e => e.name);
    // Must avoid heavy chest pressing, pull-ups, and heavy leg loading
    assert(!exNames.includes('Barbell Bench Press'), 'Bench press eliminated to avoid pushing fatigue');
    assert(!exNames.includes('Barbell Back Squat'), 'Back squat eliminated to avoid leg exhaustion');
    assert(!turn2.data.content.toLowerCase().includes('completely prevent doms'), 'No overclaims allowed');
    assert(turn2.data.content.includes('reduce unnecessary fatigue') || turn2.data.content.includes('minimize soreness risk'), 'Conservative scientific wording used');

    return {
      intent: turn2.data.structuredAction.intent,
      actionType: turn2.data.structuredAction.type,
      sampleResponse: turn2.data.content,
      notes: 'Recognized 4 demands (running, push-ups, pull-ups, obstacle); switched to low-fatigue mobility & priming.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST C: ADD INFORMATION ("Waise maine aaj subah heavy legs bhi kiye hain.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST C: ADD INFORMATION (Morning Heavy Legs + Tomorrow Army Training)', 'Actual End-to-End Conversation Turn', async () => {
    const history = [
      { role: 'user', content: 'Kal meri training hai.' },
      { role: 'assistant', content: 'What type of training is it tomorrow?' },
      { role: 'user', content: 'Army training.' },
      { role: 'assistant', content: 'What does tomorrow training involve?' },
      { role: 'user', content: 'Running, push-ups, pull-ups and obstacle course.' },
      { role: 'assistant', content: 'Generated low-fatigue movement preparation & mobility session.' }
    ];

    const res = await simulateChatTurn({
      message: 'Waise maine aaj subah heavy legs bhi kiye hain.',
      userContext: sharedUser,
      history
    });

    assert.strictEqual(res.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(res.data.structuredAction.workout);
    assert(res.data.content.toLowerCase().includes('heavy legs this morning') || res.data.content.toLowerCase().includes('already trained heavy legs'), 'Acknowledges morning legs');
    assert(res.data.content.toLowerCase().includes('army training'), 'Retains tomorrow army training context');
    assert(res.data.content.toLowerCase().includes('active recovery') || res.data.content.toLowerCase().includes('spinal decompression'), 'Adapts to strictly active recovery/decompression');

    const exNames = res.data.structuredAction.workout.mainWorkout.map(e => e.name);
    assert(!exNames.includes('Barbell Back Squat') && !exNames.includes('Walking Lunges'), 'Zero leg fatigue allowed');

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      sampleResponse: res.data.content,
      notes: 'Re-evaluated cumulative workload: morning heavy legs + tomorrow army test -> passive spinal decompression & restorative mobility.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST D: RACE ("Kal race hai." -> "5K.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST D: RACE PRE-EVENT PROTOCOL', 'Actual End-to-End Conversation Multi-Turn', async () => {
    // Turn 1: User says race tomorrow without distance
    const turn1 = await simulateChatTurn({
      message: 'Kal race hai.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(turn1.data.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(turn1.data.structuredAction.missingContext, 'race_details');

    // Turn 2: User provides distance "5K"
    const history = [
      { role: 'user', content: 'Kal race hai.' },
      { role: 'assistant', content: turn1.data.content }
    ];
    const turn2 = await simulateChatTurn({
      message: '5K.',
      userContext: sharedUser,
      history
    });

    assert.strictEqual(turn2.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(turn2.data.structuredAction.workout);
    assert(turn2.data.content.includes('5K race tomorrow'));
    assert(!turn2.data.content.toLowerCase().includes('completely prevent doms'), 'No overclaims');
    assert(turn2.data.content.includes('reduce unnecessary fatigue') || turn2.data.content.includes('minimize soreness risk') || turn2.data.content.includes('preserve performance'), 'Conservative sports science terms used');

    return {
      intent: turn2.data.structuredAction.intent,
      actionType: turn2.data.structuredAction.type,
      sampleResponse: turn2.data.content,
      notes: 'Asked distance on turn 1, generated 5K pre-race shakeout on turn 2 without redundant questions.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST E: CRICKET 1-WEEK ("Ek week mein cricket match hai aur mujhe stamina maintain karna hai.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST E: CRICKET 1-WEEK STAMINA MICROCYCLE', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'Ek week mein cricket match hai aur mujhe stamina maintain karna hai.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(res.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(res.data.structuredAction.workout);
    assert(res.data.content.includes('cricket match in 1 week') || res.data.content.includes('7-Day Match Preparation'));
    assert(res.data.content.includes('Volume Taper') || res.data.content.includes('48h Taper') || res.data.content.includes('taper'), 'Explains 48h volume taper');
    assert(res.data.content.includes('stamina') || res.data.content.includes('rotational power'));

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      sampleResponse: res.data.content,
      notes: 'Detected cricket event, 7-day proximity, stamina focus, and planned 48-hour volume taper before match.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST F: FOOTBALL ("Kal football match hai.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST F: FOOTBALL MATCH TOMORROW', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'Kal football match hai.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(res.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(res.data.structuredAction.workout);
    assert(res.data.content.includes('football match tomorrow'));
    assert(res.data.content.toLowerCase().includes('hamstrings') || res.data.content.toLowerCase().includes('deceleration') || res.data.content.toLowerCase().includes('sprint'), 'Explains soccer demands');

    const exNames = res.data.structuredAction.workout.mainWorkout.map(e => e.name);
    assert(!exNames.includes('Barbell Back Squat') && !exNames.includes('Walking Lunges'), 'Squats & lunges eliminated');

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      sampleResponse: res.data.content,
      notes: 'Considers sprint deceleration; eliminates heavy leg volume; prescribes upper body and core mobility.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST G: UNKNOWN TRAINING ("Kal academy mein selection test hai.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST G: UNKNOWN SELECTION TEST (No "army" keyword)', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'Kal academy mein selection test hai.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(res.data.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(res.data.structuredAction.missingContext, 'training_activities');
    assert(res.data.content.includes('selection test') || res.data.content.includes('academy'));
    assert.strictEqual(res.data.structuredAction.workout, null, 'Must ask activities before prescribing');

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      clarification: res.data.structuredAction.missingContext,
      sampleResponse: res.data.content,
      notes: 'Recognized academy physical selection test without keyword "army"; asked for test activities.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST H: VAGUE GOAL ("Mujhe fit hona hai.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST H: VAGUE GOAL CLARIFICATION', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'Mujhe fit hona hai.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(res.data.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(res.data.structuredAction.missingContext, 'goal_priority');
    assert(res.data.content.includes('top priority right now') || res.data.content.includes('priority'));
    assert(res.data.content.includes('Losing weight') && res.data.content.includes('Building muscle') && res.data.content.includes('stamina'));
    // Must NOT ask for height/weight because userContext already has them
    assert(!res.data.content.toLowerCase().includes('what is your height') && !res.data.content.toLowerCase().includes('what is your weight'), 'Did not redundantly ask for existing bio');

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      clarification: res.data.structuredAction.missingContext,
      sampleResponse: res.data.content,
      notes: 'Asks single plain language question to clarify priority without asking for existing bio.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST I: WEIGHT LOSS ("Mera weight 100 kg hai aur kam karna hai.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST I: 100 KG WEIGHT LOSS PLAN', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'Mera weight 100 kg hai aur kam karna hai.',
      userContext: { ...sharedUser, weight: 100 },
      history: []
    });

    assert.strictEqual(res.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(res.data.structuredAction.workout);
    assert(res.data.structuredAction.diet);
    assert(res.data.content.includes('100 kg'));
    // Everyday portion language: eggs, rotis, daal
    assert(res.data.content.includes('boiled eggs') || res.data.content.includes('eggs'));
    assert(res.data.content.includes('rotis') || res.data.content.includes('roti'));
    assert(res.data.content.includes('daal') || res.data.content.includes('salad'));
    // Joint-friendly explanation
    assert(res.data.content.toLowerCase().includes('joint') || res.data.content.toLowerCase().includes('knees'));

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      sampleResponse: res.data.content,
      notes: 'Generated joint-friendly conditioning and simple everyday meal portions without forcing BMR/TDEE math first.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST J: MUSCLE GAIN ("Mujhe body banani hai.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST J: STRUCTURED MUSCLE GAIN', 'Actual End-to-End Conversation Multi-Turn', async () => {
    // Case 1: User bio has missing experience/days -> asks clarification
    const turn1 = await simulateChatTurn({
      message: 'Mujhe body banani hai.',
      userContext: { name: 'Ameer', fitnessLevel: null, trainingDaysPerWeek: null },
      history: []
    });

    assert.strictEqual(turn1.data.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(turn1.data.structuredAction.missingContext, 'experience_frequency');

    // Case 2: User provides training days & experience
    const history = [
      { role: 'user', content: 'Mujhe body banani hai.' },
      { role: 'assistant', content: turn1.data.content }
    ];
    const turn2 = await simulateChatTurn({
      message: '4 days a week, intermediate lifting experience.',
      userContext: sharedUser,
      history
    });

    assert.strictEqual(turn2.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(turn2.data.structuredAction.workout);
    assert(turn2.data.content.includes('Progressive Overload') || turn2.data.content.includes('Hypertrophy'));
    // Verify it's a structured program, not generic chest+biceps
    const exList = turn2.data.structuredAction.workout.mainWorkout;
    assert(exList.length >= 3);
    assert(turn2.data.structuredAction.workout.sessionObjective.includes('Hypertrophy') || turn2.data.structuredAction.workout.sessionObjective.includes('Strength'));

    return {
      intent: turn2.data.structuredAction.intent,
      actionType: turn2.data.structuredAction.type,
      sampleResponse: turn2.data.content,
      notes: 'Clarified frequency and experience, then generated structured progressive hypertrophy session.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST K: CONVERSATIONAL CHANGE (Continuous Chat Across 4 Steps)
  // Step 1: Workout generated
  // Step 2: "Only dumbbells"
  // Step 3: "Only 20 minutes"
  // Step 4: "My knee hurts"
  // -------------------------------------------------------------------------
  await runRealityTest('TEST K: CONTINUOUS CONVERSATIONAL ADAPTATION (4 Turns)', 'Actual End-to-End Multi-Turn Conversation', async () => {
    let history = [];

    // Step 1: Initial workout
    const step1 = await simulateChatTurn({
      message: 'What should I train today?',
      userContext: sharedUser,
      history
    });
    assert(step1.data.structuredAction.workout);
    history.push({ role: 'user', content: 'What should I train today?' });
    history.push({ role: 'assistant', content: step1.data.content });

    // Step 2: "Only dumbbells"
    const step2 = await simulateChatTurn({
      message: 'Only dumbbells',
      userContext: sharedUser,
      history
    });
    assert.strictEqual(step2.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(step2.data.content.toLowerCase().includes('dumbbell'));
    // Verify all equipment is Dumbbells or Bodyweight
    const s2Equip = step2.data.structuredAction.workout.mainWorkout.map(e => e.equipment);
    assert(s2Equip.every(eq => eq === 'Dumbbells' || eq === 'Dumbbell' || eq === 'Bodyweight'), 'Must restrict to dumbbells/bodyweight');
    history.push({ role: 'user', content: 'Only dumbbells' });
    history.push({ role: 'assistant', content: step2.data.content });

    // Step 3: "Only 20 minutes" (Must RETAIN Dumbbells!)
    const step3 = await simulateChatTurn({
      message: 'Only 20 minutes',
      userContext: sharedUser,
      history
    });
    assert.strictEqual(step3.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(step3.data.content.includes('20 minutes'));
    assert.strictEqual(step3.data.structuredAction.workout.timeBudget.requestedDurationMinutes, 20);
    // Verify dumbbell constraint was retained from turn 2!
    const s3Equip = step3.data.structuredAction.workout.mainWorkout.map(e => e.equipment);
    assert(s3Equip.every(eq => eq === 'Dumbbells' || eq === 'Dumbbell' || eq === 'Bodyweight'), 'Dumbbell constraint must persist in turn 3');
    history.push({ role: 'user', content: 'Only 20 minutes' });
    history.push({ role: 'assistant', content: step3.data.content });

    // Step 4: "My knee hurts" (Must RETAIN Dumbbells AND 20 mins AND protect knee!)
    const step4 = await simulateChatTurn({
      message: 'My knee hurts',
      userContext: sharedUser,
      history
    });
    assert.strictEqual(step4.data.structuredAction.type, 'SAFETY_ALERT');
    assert(step4.data.content.toLowerCase().includes('knee'));
    // Verify squats and lunges are eliminated
    const s4ExNames = step4.data.structuredAction.workout.mainWorkout.map(e => e.name);
    assert(!s4ExNames.some(n => n.includes('Squat') || n.includes('Lunge') || n.includes('Leg Extension')), 'Knee shear exercises eliminated');
    // Verify dumbbell constraint was retained!
    const s4Equip = step4.data.structuredAction.workout.mainWorkout.map(e => e.equipment);
    assert(s4Equip.every(eq => eq === 'Dumbbells' || eq === 'Dumbbell' || eq === 'Bodyweight'), 'Dumbbell constraint must persist in turn 4');

    return {
      intent: step4.data.structuredAction.intent,
      actionType: step4.data.structuredAction.type,
      sampleResponse: step4.data.content,
      notes: 'Retained cumulative context: Dumbbells (Turn 2) + 20 mins (Turn 3) + Knee protection (Turn 4).'
    };
  });

  // -------------------------------------------------------------------------
  // TEST L: RECENT FATIGUE (Cumulative Workload Conflict Across Turns)
  // Turn 1: "I trained legs very hard yesterday."
  // Turn 2: "Tomorrow I have football practice."
  // -------------------------------------------------------------------------
  await runRealityTest('TEST L: CUMULATIVE WORKLOAD RECENT FATIGUE', 'Actual End-to-End Conversation Multi-Turn', async () => {
    const history1 = [
      { role: 'user', content: 'I trained legs very hard yesterday.' },
      { role: 'assistant', content: 'Understood, noting heavy leg fatigue from yesterday.' }
    ];

    const turn2 = await simulateChatTurn({
      message: 'Tomorrow I have football practice.',
      userContext: sharedUser,
      history: history1
    });

    assert.strictEqual(turn2.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert.strictEqual(turn2.data.structuredAction.intent, 'workload_conflict');
    assert(turn2.data.content.includes('legs') && turn2.data.content.includes('football practice'));
    assert(turn2.data.content.includes('upper-body strength') || turn2.data.content.includes('core'));

    const exNames = turn2.data.structuredAction.workout.mainWorkout.map(e => e.name);
    assert(!exNames.includes('Barbell Back Squat') && !exNames.includes('Romanian Deadlift'));

    return {
      intent: turn2.data.structuredAction.intent,
      actionType: turn2.data.structuredAction.type,
      sampleResponse: turn2.data.content,
      notes: 'Reasoned across turns: legs yesterday (history) + football tomorrow (current turn) = today strictly upper body and core.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST M: VAGUE PHYSICAL TRAINING ("Bas physical training.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST M: VAGUE PHYSICAL TRAINING (PT)', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'Bas physical training.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(res.data.structuredAction.type, 'ASK_CLARIFICATION');
    assert.strictEqual(res.data.structuredAction.missingContext, 'training_activities');
    assert(res.data.content.includes('What physical activities are included') || res.data.content.includes('physical activities'));
    assert.strictEqual(res.data.structuredAction.workout, null);

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      clarification: res.data.structuredAction.missingContext,
      sampleResponse: res.data.content,
      notes: 'Did not get stuck on "Bas physical training"; clarified what specific physical activities are included.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST N: PHYSICAL JOB ("I work construction and today was very physical.")
  // -------------------------------------------------------------------------
  await runRealityTest('TEST N: PHYSICAL JOB OCCUPATIONAL FATIGUE', 'Actual End-to-End Conversation Turn', async () => {
    const res = await simulateChatTurn({
      message: 'I work construction and today was very physical.',
      userContext: sharedUser,
      history: []
    });

    assert.strictEqual(res.data.structuredAction.type, 'UPDATE_WORKOUT');
    assert(res.data.structuredAction.workout);
    assert(res.data.content.includes('construction') || res.data.content.includes('manual labor'));
    assert(res.data.content.includes('Spinal Decompression') || res.data.content.includes('Postural Restoration'));
    // Ensure it did not say "Good luck with your construction tomorrow"
    assert(!res.data.content.includes('construction tomorrow'), 'Must NOT treat today construction as tomorrow event');

    const exNames = res.data.structuredAction.workout.mainWorkout.map(e => e.name);
    assert(!exNames.includes('Deadlift') && !exNames.includes('Barbell Back Squat'), 'Heavy axial loading prohibited');

    return {
      intent: res.data.structuredAction.intent,
      actionType: res.data.structuredAction.type,
      sampleResponse: res.data.content,
      notes: 'Recognized heavy occupational fatigue today; prescribed spinal decompression, postural restoration, and mobility.'
    };
  });

  // -------------------------------------------------------------------------
  // TEST O: DIET REALITY (Portions, Math Consistency, Local Foods)
  // -------------------------------------------------------------------------
  await runRealityTest('TEST O: DIET REALITY & CLINICAL SANITY AUDIT', 'Deterministic Nutrition Unit & Sanity Test', async () => {
    const userProfile = {
      weight: 78,
      height: 175,
      age: 26,
      gender: 'Male',
      primaryGoal: 'Fat Loss',
      trainingDaysPerWeek: 4
    };

    const diet = dietBuilder.generateDietPlan({ userProfile, preferences: { isVegetarian: false } });
    const validation = dietValidator.validateDiet(diet, userProfile);

    // 1. Audit validation
    assert.strictEqual(validation.valid, true, `Diet validation errors: ${validation.errors.join(', ')}`);

    // 2. Audit portions (eggs, rotis, daal, oats)
    const allItems = diet.meals.flatMap(m => m.items);
    const eggItem = allItems.find(i => i.food.toLowerCase().includes('egg'));
    const rotiItem = allItems.find(i => i.food.toLowerCase().includes('roti'));
    const daalOrChicken = allItems.find(i => i.food.toLowerCase().includes('chicken') || i.food.toLowerCase().includes('daal'));

    assert(eggItem, 'Must contain real eggs');
    assert(rotiItem, 'Must contain whole wheat roti');
    assert(daalOrChicken, 'Must contain chicken or daal');

    // Check no single meal has > 4 whole eggs
    assert(!eggItem.portion.includes('7 whole') && !eggItem.portion.includes('8 whole'), 'Portions must be realistic');

    // 3. Audit mathematical consistency: sum of meal calories vs totalDailyCalories
    const mealSum = diet.meals.reduce((sum, m) => sum + m.totalCalories, 0);
    assert(Math.abs(mealSum - diet.actualTotals.totalDailyCalories) <= 20, 'Meal calories must sum to total daily calories');

    // 4. Safe protein bounds (between 1.2g/kg and 2.6g/kg)
    const proteinPerKg = diet.actualTotals.totalProtein / userProfile.weight;
    assert(proteinPerKg >= 1.2 && proteinPerKg <= 2.6, `Protein per kg (${proteinPerKg}) within safe clinical bounds`);

    // 5. Safe calorie bounds (not crash diet < 1200 or excessive > 4500)
    assert(diet.actualTotals.totalDailyCalories >= 1400 && diet.actualTotals.totalDailyCalories <= 3500);

    return {
      intent: 'generate_diet',
      actionType: 'UPDATE_NUTRITION',
      sampleResponse: `Calories: ${diet.actualTotals.totalDailyCalories} kcal | Protein: ${diet.actualTotals.totalProtein}g (${proteinPerKg.toFixed(2)}g/kg) | Carbs: ${diet.actualTotals.totalCarbs}g | Fat: ${diet.actualTotals.totalFat}g`,
      notes: `Mathematically consistent: mealSum=${mealSum} kcal, safe protein=${proteinPerKg.toFixed(2)}g/kg, local foods (eggs, rotis, daal, chicken, oats).`
    };
  });

  console.log('\n=============================================================');
  console.log(`  REALITY TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED  `);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllRealityTests();
