// Unit test for steps-v1 logic feeding a synthetic sine-wave accelerometer dataset
import { createStepDetector } from '../../frontend/src/ai-detectors/steps-v1/index.js';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 GYMSYNC PHASE 7: ACCELEROMETER FOREGROUND TRACKER');
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

  // Generate synthetic walking data (10 steps)
  // Each step is a sine wave peak > 1.2G with enough interval
  const motionEvents = [];
  let currentTime = Date.now();
  
  // 10 steps, 1 step per second
  for (let i = 0; i < 10; i++) {
    // idle
    motionEvents.push({ time: currentTime, accel: { x: 0, y: 1, z: 0 } });
    currentTime += 500;
    
    // step peak (magnitude ~ 2.5, delta ~ 1.5 > 1.2 threshold)
    motionEvents.push({ time: currentTime, accel: { x: 0, y: 2.5, z: 0 } });
    currentTime += 500;
  }

  // Mock window.addEventListener
  let motionHandler = null;
  global.window = {
    addEventListener: (event, handler) => { motionHandler = handler; },
    removeEventListener: () => { motionHandler = null; }
  };

  let detectedSteps = 0;
  const detector = createStepDetector({
    onStepCount: (count) => { detectedSteps = count; }
  });

  // Mock permissions
  global.DeviceMotionEvent = {
    requestPermission: async () => 'granted'
  };

  await detector.start();

  // Feed events
  const originalNow = Date.now;
  for (const ev of motionEvents) {
    global.Date.now = () => ev.time;
    if (motionHandler) {
      motionHandler({ accelerationIncludingGravity: ev.accel });
    }
  }
  global.Date.now = originalNow;

  detector.stop();

  assert(detectedSteps === 10, `detects exact number of synthetic steps (expected 10, got ${detectedSteps})`);

  console.log('\n===============================================================');
  if (failed === 0) {
    console.log(`📊 PHASE 7 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
  } else {
    console.error(`📊 PHASE 7 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
    process.exit(1);
  }
}

runTests().catch(console.error);
