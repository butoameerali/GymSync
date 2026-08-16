import assert from 'assert';
import fetch from 'node-fetch';
import { RunningV1Tracker } from '../frontend/src/ai-detectors/running-v1/index.js';
import { REGISTERED_DETECTORS, getDetectorById, isValidDetectorId } from '../frontend/src/ai-detectors/registry.js';

const PORT = process.env.PORT || 5005;
const BASE_URL = `http://localhost:${PORT}`;

console.log('====================================================');
console.log('🏃 GymSync Phase 14 Running/GPS Tracker Test Suite');
console.log('====================================================\n');

// Mock browser navigator in Node.js test environment
if (typeof global.navigator === 'undefined') {
  global.navigator = {
    geolocation: {
      getCurrentPosition: (success) => success({ coords: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 }, timestamp: Date.now() }),
      watchPosition: (success) => { success({ coords: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 }, timestamp: Date.now() }); return 1; },
      clearWatch: () => {}
    }
  };
}

let passCount = 0;
let failCount = 0;

function logPass(title) {
  passCount++;
  console.log(`[PASS] ✅ ${title}`);
}

function logFail(title, err) {
  failCount++;
  console.error(`[FAIL] ❌ ${title}:`, err.message || err);
}

async function getAuthToken() {
  const email = `instructor_gps_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'GPS Test Instructor', email, password: 'Password123!', role: 'FitnessInstructor' })
  });
  const regData = await regRes.json();
  return regData.token;
}

async function runTests() {
  try {
    // TEST 1: running_v1 exists in registry metadata
    try {
      const meta = getDetectorById('running_v1');
      assert.ok(meta, 'running_v1 metadata should exist in registry');
      assert.strictEqual(meta.id, 'running_v1');
      assert.strictEqual(meta.type, 'gps');
      assert.strictEqual(meta.version, '1.0');
      logPass('TEST 1: running_v1 exists in registry metadata');
    } catch (e) { logFail('TEST 1', e); }

    // TEST 2: Valid detector ID accepted by registry helper
    try {
      assert.strictEqual(isValidDetectorId('running_v1'), true);
      logPass('TEST 2: Valid detector ID (running_v1) accepted');
    } catch (e) { logFail('TEST 2', e); }

    // TEST 3: Invalid detector ID rejected by registry helper
    try {
      assert.strictEqual(isValidDetectorId('malicious_gps_tracker.js'), false);
      logPass('TEST 3: Invalid detector ID rejected');
    } catch (e) { logFail('TEST 3', e); }

    // TEST 4: Backend API accepts exercise creation with aiDetection.detectorId = 'running_v1'
    try {
      const token = await getAuthToken();

      const res = await fetch(`${BASE_URL}/api/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Outdoor Track Run Test',
          targetMuscles: ['Quads', 'Hamstrings', 'Cardio'],
          equipmentRequired: 'None',
          aiDetection: {
            enabled: true,
            detectorId: 'running_v1',
            detectorVersion: '1.0'
          }
        })
      });

      assert.strictEqual(res.status, 201, `Status should be 201 Created but got ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.aiDetection.enabled, true);
      assert.strictEqual(data.aiDetection.detectorId, 'running_v1');
      logPass('TEST 4: Exercise created with aiDetection.detectorId = running_v1');
    } catch (e) { logFail('TEST 4', e); }

    // TEST 5: Exercise can disable AI
    try {
      const token = await getAuthToken();

      const res = await fetch(`${BASE_URL}/api/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Manual Treadmill Run Test',
          targetMuscles: ['Cardio'],
          equipmentRequired: 'Treadmill',
          aiDetection: {
            enabled: false,
            detectorId: null
          }
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.aiDetection.enabled, false);
      assert.strictEqual(data.aiDetection.detectorId, null);
      logPass('TEST 5: Exercise can disable AI Detection');
    } catch (e) { logFail('TEST 5', e); }

    // TEST 6: Detector state transitions
    try {
      const states = [];
      const tracker = new RunningV1Tracker({
        onStateChange: ({ status }) => states.push(status)
      });
      tracker.start();
      tracker.pause();
      tracker.resume();
      tracker.stop();
      assert.ok(states.includes('running'));
      assert.ok(states.includes('paused'));
      assert.ok(states.includes('completed'));
      logPass('TEST 6: Detector state transitions (running -> paused -> completed)');
    } catch (e) { logFail('TEST 6', e); }

    // TEST 7: Haversine calculation accuracy
    try {
      const tracker = new RunningV1Tracker();
      // Distance between (40.7128, -74.0060) and (40.7200, -74.0060) is ~800.5 meters
      const dist = tracker.calculateHaversineDistance(40.7128, -74.0060, 40.7200, -74.0060);
      assert.ok(dist > 790 && dist < 810, `Expected distance ~800.5m but got ${dist}m`);
      logPass('TEST 7: Haversine calculation accuracy (~800.5m)');
    } catch (e) { logFail('TEST 7', e); }

    // TEST 8: Duplicate GPS point produces zero distance
    try {
      const tracker = new RunningV1Tracker();
      tracker.start();
      const now = Date.now();
      // Point 1
      tracker.processGpsPoint(40.7128, -74.0060, 10, now);
      // Point 2: Duplicate location (<0.5m)
      tracker.processGpsPoint(40.71280001, -74.00600001, 10, now + 1000);
      assert.strictEqual(tracker.distanceMeters, 0, 'Duplicate GPS point should produce 0 distance');
      tracker.stop();
      logPass('TEST 8: Duplicate GPS point produces zero distance');
    } catch (e) { logFail('TEST 8', e); }

    // TEST 9: Invalid GPS point (> 25m accuracy threshold) is rejected
    try {
      const tracker = new RunningV1Tracker({ accuracyThreshold: 25 });
      tracker.start();
      const now = Date.now();
      tracker.processGpsPoint(40.7128, -74.0060, 10, now);
      // High inaccuracy point (50m uncertainty)
      tracker.processGpsPoint(40.7150, -74.0060, 50, now + 5000);
      assert.strictEqual(tracker.distanceMeters, 0, 'Uncertain GPS point with accuracy > 25m should be rejected');
      tracker.stop();
      logPass('TEST 9: Invalid GPS point (>25m accuracy) rejected');
    } catch (e) { logFail('TEST 9', e); }

    // TEST 10: Unrealistic GPS speed jump is rejected
    try {
      const tracker = new RunningV1Tracker({ maxSpeedThreshold: 12 });
      tracker.start();
      const now = Date.now();
      // Baseline point
      tracker.processGpsPoint(40.7128, -74.0060, 10, now);
      // Impossible jump: 500 meters in 1 second (500 m/s = 1800 km/h)
      tracker.processGpsPoint(40.7173, -74.0060, 10, now + 1000);
      assert.strictEqual(tracker.distanceMeters, 0, 'Unrealistic speed jump should be rejected');
      tracker.stop();
      logPass('TEST 10: Unrealistic GPS speed jump rejected');
    } catch (e) { logFail('TEST 10', e); }

    // TEST 11: Pause stops distance accumulation
    try {
      const tracker = new RunningV1Tracker();
      tracker.start();
      const now = Date.now();
      tracker.processGpsPoint(40.7128, -74.0060, 10, now);
      tracker.processGpsPoint(40.7138, -74.0060, 10, now + 10000); // ~111m
      const distBeforePause = tracker.distanceMeters;
      assert.ok(distBeforePause > 100);

      tracker.pause();
      // Point during paused state
      tracker.processGpsPoint(40.7158, -74.0060, 10, now + 20000);
      assert.strictEqual(tracker.distanceMeters, distBeforePause, 'Distance must not accumulate while paused');
      tracker.stop();
      logPass('TEST 11: Pause stops distance accumulation');
    } catch (e) { logFail('TEST 11', e); }

    // TEST 12: Resume continues tracking without distance jump
    try {
      const tracker = new RunningV1Tracker();
      tracker.start();
      const now = Date.now();
      tracker.processGpsPoint(40.7128, -74.0060, 10, now);
      tracker.processGpsPoint(40.7138, -74.0060, 10, now + 10000);
      const initialDist = tracker.distanceMeters;

      tracker.pause();
      // Simulated movement while paused (e.g. took bus 1km)
      tracker.resume();

      // First point after resume sets new baseline
      tracker.processGpsPoint(40.7228, -74.0060, 10, now + 30000);
      assert.strictEqual(tracker.distanceMeters, initialDist, 'First point after resume must set baseline without distance jump');

      // Next valid step adds distance
      tracker.processGpsPoint(40.7238, -74.0060, 10, now + 40000);
      assert.ok(tracker.distanceMeters > initialDist, 'Subsequent point after resume adds new distance');
      tracker.stop();
      logPass('TEST 12: Resume continues tracking without distance jump');
    } catch (e) { logFail('TEST 12', e); }

    // TEST 13: Permission denied handled gracefully
    try {
      const tracker = new RunningV1Tracker();
      tracker.setState('location_denied', 'Location access denied');
      assert.strictEqual(tracker.status, 'location_denied');
      assert.strictEqual(tracker.errorMessage, 'Location access denied');
      logPass('TEST 13: Permission denied handled gracefully');
    } catch (e) { logFail('TEST 13', e); }

    // TEST 14: GPS unavailable handled gracefully
    try {
      const tracker = new RunningV1Tracker();
      tracker.setState('gps_unavailable', 'GPS signal lost');
      assert.strictEqual(tracker.status, 'gps_unavailable');
      assert.strictEqual(tracker.errorMessage, 'GPS signal lost');
      logPass('TEST 14: GPS unavailable handled gracefully');
    } catch (e) { logFail('TEST 14', e); }

    // TEST 15: Completion returns correct result contract
    try {
      const tracker = new RunningV1Tracker();
      tracker.start();
      const now = Date.now();
      tracker.processGpsPoint(40.7128, -74.0060, 10, now);
      tracker.processGpsPoint(40.7218, -74.0060, 10, now + 100000); // ~1000m
      tracker.activeDurationSecs = 300; // 5 mins

      const result = tracker.stop();
      assert.strictEqual(result.completed, true);
      assert.strictEqual(result.duration, 300);
      assert.strictEqual(result.detectorId, 'running_v1');
      assert.strictEqual(result.detectorVersion, '1.0');
      assert.ok(result.distanceMeters > 900);
      assert.ok(result.distanceKm > 0.9);
      assert.ok(result.averagePaceSecondsPerKm > 0);
      logPass('TEST 15: Completion returns correct result contract');
    } catch (e) { logFail('TEST 15', e); }

  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passCount}/${passCount + failCount} Passed (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
  console.log('====================================================\n');
  process.exit(failCount === 0 ? 0 : 1);
}

runTests();
