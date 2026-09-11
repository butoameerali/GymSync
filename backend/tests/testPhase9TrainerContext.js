import { resolveTrainerContext } from '../services/ai/coachConversationEngine.js';

function runTests() {
  console.log('--- Phase 9 Trainer Context Tests ---');

  // Test 1: No gym at all -> ai_full
  const t1 = resolveTrainerContext({ name: 'User' }, null);
  if (t1.hasHumanTrainer === false && t1.mode === 'ai_full') {
    console.log('✅ Test 1 Passed: No Gym -> ai_full');
  } else {
    console.error('❌ Test 1 Failed:', t1);
  }

  // Test 2: Gym with trainerIncluded -> ai_supportive
  const t2 = resolveTrainerContext({ name: 'User' }, { name: 'Golds', trainerIncluded: true });
  if (t2.hasHumanTrainer === true && t2.mode === 'ai_supportive') {
    console.log('✅ Test 2 Passed: trainerIncluded -> ai_supportive');
  } else {
    console.error('❌ Test 2 Failed:', t2);
  }

  // Test 3: Gym without trainerIncluded, user opted in via bioData -> ai_supportive
  const t3 = resolveTrainerContext(
    { name: 'User', bioData: { gymTrainerOptIn: true } }, 
    { name: 'Golds', trainerIncluded: false }
  );
  if (t3.hasHumanTrainer === true && t3.mode === 'ai_supportive') {
    console.log('✅ Test 3 Passed: User opt-in -> ai_supportive');
  } else {
    console.error('❌ Test 3 Failed:', t3);
  }

  // Test 4: Gym without trainerIncluded, user NOT opted in -> ai_full
  const t4 = resolveTrainerContext(
    { name: 'User', bioData: { gymTrainerOptIn: false } }, 
    { name: 'Golds', trainerIncluded: false }
  );
  if (t4.hasHumanTrainer === false && t4.mode === 'ai_full') {
    console.log('✅ Test 4 Passed: No opt-in -> ai_full');
  } else {
    console.error('❌ Test 4 Failed:', t4);
  }

  console.log('--- All Tests Complete ---');
}

runTests();
