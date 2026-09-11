import { computeRecoveryAdjustment } from '../services/workout/recoveryStateEngine.js';
import eventAwarenessEngine from '../services/workout/eventAwarenessEngine.js';

console.log('--- Testing Recovery State Engine ---');

const testCases = [
  {
    name: 'Normal recovery',
    checkIns: [{ sleepHours: 8, lastSessionRPE: 6 }, { sleepHours: 7, lastSessionRPE: 5 }]
  },
  {
    name: 'Low sleep',
    checkIns: [{ sleepHours: 4, lastSessionRPE: 5 }, { sleepHours: 5, lastSessionRPE: 6 }]
  },
  {
    name: 'High fatigue (RPE 9+)',
    checkIns: [{ sleepHours: 8, lastSessionRPE: 9 }, { sleepHours: 8, lastSessionRPE: 8 }]
  }
];

testCases.forEach(tc => {
  const result = computeRecoveryAdjustment({ recentCheckIns: tc.checkIns });
  console.log(`Test: ${tc.name} => Flag: ${result.recoveryFlag}`);
  if (tc.name === 'Low sleep' && result.recoveryFlag !== 'LowSleep') console.error('FAILED Low sleep');
  if (tc.name === 'High fatigue (RPE 9+)' && result.recoveryFlag !== 'HighFatigue') console.error('FAILED High fatigue');
});

console.log('Tests finished.');
