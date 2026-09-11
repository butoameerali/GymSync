import { computeTodaysEnergy } from '../services/nutrition/dailyEnergyAggregator.js';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 GYMSYNC PHASE 6: DAILY ENERGY AGGREGATOR');
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

  // Mocks
  const UserWorkoutProgramMock = {
    find: async () => [{
      progress: {
        completedSessions: [
          { completedAt: new Date().toISOString(), caloriesBurned: 350 },
          { completedAt: new Date(Date.now() - 86400000).toISOString(), caloriesBurned: 200 } // yesterday
        ]
      }
    }]
  };

  const ActivityLogMock = {
    findOne: async () => ({
      estimatedWalkingCalories: 150
    })
  };

  const UserDietPlanMock = {
    findOne: async () => ({
      logs: [
        { date: new Date().toISOString().split('T')[0], calories: 2200 },
        { date: '2020-01-01', calories: 500 }
      ]
    })
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const energy = await computeTodaysEnergy('user1', todayStr, {
    UserWorkoutProgram: UserWorkoutProgramMock,
    ActivityLog: ActivityLogMock,
    UserDietPlan: UserDietPlanMock
  });

  assert(energy.workoutKcal === 350, 'Extracts today\'s workout calories correctly (ignores yesterday)');
  assert(energy.walkingKcal === 80, 'Safeguards walking calories against overlap (150 - (350*0.2) = 80)');
  assert(energy.eatenKcal === 2200, 'Extracts today\'s eaten calories correctly');
  assert(energy.estimatedExpenditure === 430, 'Total expenditure is correct (350 + 80 = 430)');
  assert(energy.balance === 1770, 'Energy balance is correct (2200 - 430 = 1770)');

  console.log('\n===============================================================');
  if (failed === 0) {
    console.log(`📊 PHASE 6 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
  } else {
    console.error(`📊 PHASE 6 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
    process.exit(1);
  }
}

runTests().catch(console.error);
