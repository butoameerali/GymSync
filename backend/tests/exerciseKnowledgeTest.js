import { exerciseRegistry, estimateExerciseCalories } from '../services/workout/exerciseRegistry.js';

async function runExerciseKnowledgeTests() {
  console.log('====================================================');
  console.log('  EXERCISE KNOWLEDGE BASE & REGISTRY SYNC TESTS     ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Check registry initialization
  const all = exerciseRegistry.getAll();
  assert(all && all.length > 50, `Registry contains ${all?.length} baseline certified exercises`);

  // TEST 2: Calorie estimation
  // Push-ups ~ MET 3.8 to 5.0. 30 mins for 70kg -> (5.0 * 3.5 * 70 / 200) * 30 = ~184 kcal
  const cal30m70kg = estimateExerciseCalories('Push-ups', 30, 70);
  assert(cal30m70kg > 100 && cal30m70kg < 300, `Calorie burn for 30m Push-ups at 70kg is ${cal30m70kg} kcal (realistic range)`);

  // High intensity: Sprinting ~ MET 9.0. 20 mins for 80kg -> (9.0 * 3.5 * 80 / 200) * 20 = 252 kcal
  const calSprint = estimateExerciseCalories('Sprint Intervals', 20, 80);
  assert(calSprint > 180, `Calorie burn for 20m Sprint Intervals at 80kg is ${calSprint} kcal`);

  // TEST 3: Lookup by Movement Pattern
  const hinges = exerciseRegistry.getByMovementPattern('hinge');
  assert(hinges.some(e => e.name.toLowerCase().includes('deadlift')), `Hinge pattern includes Deadlifts`);

  const pushes = exerciseRegistry.getByMovementPattern('horizontal push');
  assert(pushes.some(e => e.name.toLowerCase().includes('bench')), `Horizontal push pattern includes Bench Press`);

  // TEST 4: Sport Relevance Filter
  const allExercises = exerciseRegistry.getAll();
  const cricketEx = allExercises.filter(e => (e.sportRelevance || []).includes('cricket'));
  assert(cricketEx.length > 5, `Found ${cricketEx.length} cricket-relevant exercises`);

  // TEST 5: Injury Exclusions
  const kneeExclusions = allExercises.filter(e => (e.injuryExclusions || []).includes('knees'));
  assert(kneeExclusions.length > 0, `Injury exclusions identify ${kneeExclusions.length} exercises stressing knees`);

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runExerciseKnowledgeTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
