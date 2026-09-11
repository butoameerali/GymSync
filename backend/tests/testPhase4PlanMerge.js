import planMergeEngine from '../services/ai/planMergeEngine.js';
import weeklyLoadBalancer from '../services/workout/weeklyLoadBalancer.js';

// Simple mock models
const MockSavedAIPlan = {
  data: [],
  findOne(query) {
    const docs = this.data.filter(d => {
      for (const k in query) {
        if (d[k] !== query[k]) return false;
      }
      return true;
    });
    return { sort: () => docs[docs.length - 1] };
  },
  find(query) {
    return Promise.resolve(this.data.filter(d => {
      for (const k in query) {
        if (d[k] !== query[k]) return false;
      }
      return true;
    }));
  }
};

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 GYMSYNC PHASE 4: MULTI-GOAL PLAN MERGE & WEEKLY LOAD BALANCER');
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

  // TEST 1: detectExistingActivePlan
  MockSavedAIPlan.data = [
    { _id: '1', userId: 'user1', title: 'Old Plan', goal: 'Weight Loss', isActive: false, supersededBy: null },
    { _id: '2', userId: 'user1', title: 'Active Plan', goal: 'Muscle Gain', isActive: true, supersededBy: null }
  ];

  const existing = await planMergeEngine.detectExistingActivePlan('user1', MockSavedAIPlan);
  assert(existing && existing._id === '2', 'detectExistingActivePlan finds the active plan and ignores inactive');

  // TEST 2: mergePlans creates combined goal
  const mergeRes = await planMergeEngine.mergePlans({ existingPlan: existing, newGoalRequest: { mainGoalArea: 'Marathon' } });
  assert(mergeRes.combinedGoal === 'Muscle Gain + Marathon', 'mergePlans creates combined string goal');

  // TEST 3: weeklyLoadBalancer combined schedule
  MockSavedAIPlan.data = [
    { _id: '1', goalGroupId: 'group1', isActive: true, workout: { interactive_calendar: [{ dayNumber: 1, dayType: 'workout', timeBudget: { totalEstimatedMinutes: 45 } }, { dayNumber: 2, dayType: 'rest' }] } },
    { _id: '2', goalGroupId: 'group1', isActive: true, workout: { interactive_calendar: [{ dayNumber: 1, dayType: 'workout', timeBudget: { totalEstimatedMinutes: 30 } }, { dayNumber: 3, dayType: 'workout', timeBudget: { totalEstimatedMinutes: 60 } }] } }
  ];

  const schedule = await weeklyLoadBalancer.computeCombinedWeeklySchedule('group1', { SavedAIPlan: MockSavedAIPlan });
  const day1 = schedule.find(d => d.dayNumber === 1);
  assert(day1.sessions.length === 2, 'weeklyLoadBalancer correctly combines two sessions onto Day 1');
  assert(day1.totalMinutes === 75, 'weeklyLoadBalancer correctly sums duration (45+30 = 75)');
  
  const day2 = schedule.find(d => d.dayNumber === 2);
  assert(day2.sessions.length === 0 && day2.isRestDay, 'weeklyLoadBalancer correctly handles rest days');

  const day3 = schedule.find(d => d.dayNumber === 3);
  assert(day3.sessions.length === 1 && day3.totalMinutes === 60, 'weeklyLoadBalancer correctly isolates single-session days');

  console.log('\n===============================================================');
  if (failed === 0) {
    console.log(`📊 PHASE 4 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
  } else {
    console.error(`📊 PHASE 4 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
    process.exit(1);
  }
}

runTests().catch(console.error);
