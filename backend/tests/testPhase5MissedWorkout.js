import { detectMissedSessions, computeScheduledDate } from '../services/workout/missedSessionDetector.js';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 GYMSYNC PHASE 5: MISSED WORKOUT DETECTION ENGINE');
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

  // 1. Setup mock dates
  const today = new Date('2026-09-11T12:00:00Z');
  today.setHours(0,0,0,0);
  
  // Create a plan that started 3 days ago (Sept 8)
  const planStart = new Date('2026-09-08T12:00:00Z');
  
  const mockPlan = {
    createdAt: planStart,
    workout: {
      interactive_calendar: [
        { dayNumber: 1, dayType: 'workout' }, // Sept 8 (Past)
        { dayNumber: 2, dayType: 'rest' },    // Sept 9 (Past)
        { dayNumber: 3, dayType: 'workout' }, // Sept 10 (Past)
        { dayNumber: 4, dayType: 'workout' }, // Sept 11 (Today)
        { dayNumber: 5, dayType: 'workout' }  // Sept 12 (Future)
      ]
    },
    progress: { completedSessions: [] },
    missedSessions: []
  };

  // TEST 1: detectMissedSessions identifies past uncompleted workout days
  const missed1 = detectMissedSessions(mockPlan, new Date(today));
  assert(missed1.length === 2, 'detectMissedSessions returns exactly 2 missed sessions');
  assert(missed1.some(m => m.dayNumber === 1), 'Day 1 (past workout) is marked missed');
  assert(missed1.some(m => m.dayNumber === 3), 'Day 3 (past workout) is marked missed');
  assert(!missed1.some(m => m.dayNumber === 2), 'Day 2 (past rest day) is ignored');
  assert(!missed1.some(m => m.dayNumber === 4), 'Day 4 (today) is ignored');
  assert(!missed1.some(m => m.dayNumber === 5), 'Day 5 (future) is ignored');

  // TEST 2: Completed sessions are ignored
  mockPlan.progress.completedSessions.push({ dayNumber: 1 });
  const missed2 = detectMissedSessions(mockPlan, new Date(today));
  assert(missed2.length === 1, 'detectMissedSessions ignores completed sessions');
  assert(missed2[0].dayNumber === 3, 'Day 3 is still missed');

  // TEST 3: Already handled/logged missed sessions are ignored
  mockPlan.missedSessions.push({ dayNumber: 3 });
  const missed3 = detectMissedSessions(mockPlan, new Date(today));
  assert(missed3.length === 0, 'detectMissedSessions ignores already tracked missed sessions');

  console.log('\n===============================================================');
  if (failed === 0) {
    console.log(`📊 PHASE 5 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
  } else {
    console.error(`📊 PHASE 5 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
    process.exit(1);
  }
}

runTests().catch(console.error);
