// A simple peak-detection step counter over the device's accelerometer
// magnitude signal. Low-precision approach. Output should be "Estimated Steps".

export function createStepDetector({ onStepCount }) {
  let lastMagnitude = 0;
  let stepCount = 0;
  let lastStepTime = 0;
  let active = false;
  
  const STEP_THRESHOLD = 1.2; // g-force delta, tune empirically
  const MIN_STEP_INTERVAL_MS = 250; // reject > 4 steps/sec as noise

  function handleMotion(event) {
    if (!active) return;
    const { x, y, z } = event.accelerationIncludingGravity || {};
    if (x == null || y == null || z == null) return;
    
    // Calculate magnitude (standard gravity is ~9.8 m/s^2, but some devices report in Gs where resting is ~1)
    // If the API returns m/s^2, we divide by 9.8 to normalize to Gs for our threshold, 
    // but typically we can just tune the threshold. Let's assume it's roughly in m/s^2.
    // Actually, let's normalize to ~1G baseline if it looks like m/s^2.
    const rawMag = Math.sqrt(x * x + y * y + z * z);
    const isMetersPerSecondSquared = rawMag > 5; 
    const magnitude = isMetersPerSecondSquared ? (rawMag / 9.80665) : rawMag;
    
    const delta = magnitude - lastMagnitude;
    const now = Date.now();
    
    // Only detect peaks
    if (delta > STEP_THRESHOLD && (now - lastStepTime) > MIN_STEP_INTERVAL_MS) {
      stepCount += 1;
      lastStepTime = now;
      if (typeof onStepCount === 'function') {
        onStepCount(stepCount);
      }
    }
    lastMagnitude = magnitude;
  }

  async function start() {
    active = true;
    // iOS 13+ requires an explicit permission prompt triggered by a user gesture
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const state = await DeviceMotionEvent.requestPermission();
        if (state !== 'granted') {
          active = false;
          throw new Error('Motion permission denied');
        }
      } catch (e) {
        active = false;
        throw e;
      }
    }
    window.addEventListener('devicemotion', handleMotion);
  }
  
  function stop() { 
    active = false;
    window.removeEventListener('devicemotion', handleMotion); 
  }
  
  function getCount() {
    return stepCount;
  }

  return { start, stop, getCount };
}

export default createStepDetector;
