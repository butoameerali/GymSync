/**
 * Running GPS Tracker Module (running_v1)
 * Version: 1.0 (Production GPS Tracker)
 * 
 * Local browser-based GPS running distance and pace tracker.
 * Uses Geolocation API watchPosition and Haversine distance calculations.
 * Camera, TensorFlow, and MediaPipe are NOT used.
 */

export class RunningV1Tracker {
  constructor(options = {}) {
    this.id = 'running_v1';
    this.version = '1.0';
    this.type = 'gps';
    this.status = 'loading'; // loading | ready | location_permission_required | location_denied | gps_unavailable | running | paused | completed | error
    this.errorMessage = '';

    this.onStateChange = options.onStateChange || (() => {});
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});

    this.distanceMeters = 0;
    this.activeDurationSecs = 0;
    this.lastValidPoint = null; // { lat, lng, timestamp, accuracy }
    
    this.accuracyThreshold = options.accuracyThreshold || 25; // meters
    this.maxSpeedThreshold = options.maxSpeedThreshold || 12; // m/s (~43 km/h unrealistic speed spike cutoff)

    this.watchId = null;
    this.timerInterval = null;
    this.startTime = null;
    this.endTime = null;
  }

  setState(newState, msg = '') {
    this.status = newState;
    if (msg) this.errorMessage = msg;
    this.onStateChange({
      status: this.status,
      error: this.errorMessage,
      distanceMeters: Math.round(this.distanceMeters),
      distanceKm: Number((this.distanceMeters / 1000).toFixed(2)),
      duration: this.activeDurationSecs
    });
  }

  // Calculate distance between two GPS coordinates using Haversine formula
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  // Initialize Geolocation checks
  async initialize() {
    this.setState('loading');

    if (!('geolocation' in navigator)) {
      this.setState('gps_unavailable', 'Geolocation API is not supported by your browser or device.');
      this.onError('Geolocation API unsupported.');
      return false;
    }

    this.setState('location_permission_required');

    // Perform an initial single location request to prompt/check permission
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.setState('ready');
          resolve(true);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            this.setState('location_denied', 'Location access is required to track your running distance.');
            this.onError('Location permission denied.');
          } else {
            this.setState('gps_unavailable', 'GPS signal unavailable. Please ensure GPS/Location is enabled.');
            this.onError('GPS signal unavailable.');
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  // Process incoming GPS coordinate point
  processGpsPoint(lat, lng, accuracy, timestamp) {
    if (this.status !== 'running') return;

    // Filter 1: Reject points with poor accuracy (e.g. > 25m uncertainty)
    if (typeof accuracy === 'number' && accuracy > this.accuracyThreshold) {
      console.warn(`[RunningV1Tracker] Rejected point due to high accuracy uncertainty: ${accuracy}m`);
      return;
    }

    const currentPoint = { lat, lng, accuracy, timestamp: timestamp || Date.now() };

    if (this.lastValidPoint) {
      const dist = this.calculateHaversineDistance(
        this.lastValidPoint.lat,
        this.lastValidPoint.lng,
        currentPoint.lat,
        currentPoint.lng
      );

      const timeDeltaSecs = (currentPoint.timestamp - this.lastValidPoint.timestamp) / 1000;

      // Filter 2: Ignore duplicate/stationary points (< 0.5m)
      if (dist < 0.5 || timeDeltaSecs <= 0) {
        this.lastValidPoint = currentPoint;
        return;
      }

      // Filter 3: Reject unrealistic speed jumps (> 12 m/s ~ 43 km/h)
      const speedMs = dist / timeDeltaSecs;
      if (speedMs > this.maxSpeedThreshold) {
        console.warn(`[RunningV1Tracker] Rejected unrealistic speed jump: ${speedMs.toFixed(1)} m/s (${dist.toFixed(1)}m in ${timeDeltaSecs.toFixed(1)}s)`);
        return;
      }

      // Add valid distance
      this.distanceMeters += dist;
      this.lastValidPoint = currentPoint;
    } else {
      // First baseline GPS point
      this.lastValidPoint = currentPoint;
    }

    this.emitUpdate();
  }

  emitUpdate() {
    const distKm = Number((this.distanceMeters / 1000).toFixed(2));
    const avgPaceSecsPerKm = distKm > 0 ? Math.round(this.activeDurationSecs / distKm) : 0;

    this.onUpdate({
      distanceMeters: Math.round(this.distanceMeters),
      distanceKm: distKm,
      duration: this.activeDurationSecs,
      averagePaceSecondsPerKm: avgPaceSecsPerKm
    });
  }

  // Start continuous GPS tracking session
  start() {
    if (this.status === 'running') return;

    this.startTime = this.startTime || Date.now();
    this.lastValidPoint = null; // Reset baseline for continuous run
    this.setState('running');

    // Active duration timer
    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => {
        if (this.status === 'running') {
          this.activeDurationSecs += 1;
          this.emitUpdate();
        }
      }, 1000);
    }

    // Geolocation watchPosition loop
    if ('geolocation' in navigator && !this.watchId) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          this.processGpsPoint(latitude, longitude, accuracy, pos.timestamp);
        },
        (err) => {
          console.warn('[RunningV1Tracker] Watch position error:', err.message);
          if (err.code === err.PERMISSION_DENIED) {
            this.pause();
            this.setState('location_denied', 'Location permission lost during run.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  }

  // Pause session: stop accumulating distance, preserve values
  pause() {
    this.setState('paused');
    this.lastValidPoint = null; // Clear point so resume starts fresh baseline
  }

  // Resume session: continue from next GPS coordinate without distance jump
  resume() {
    if (this.status === 'running') return;
    this.lastValidPoint = null;
    this.setState('running');
  }

  // Complete session and generate standard result contract
  stop() {
    this.endTime = Date.now();
    this.setState('completed');

    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const distKm = Number((this.distanceMeters / 1000).toFixed(2));
    const avgPaceSecsPerKm = distKm > 0 ? Math.round(this.activeDurationSecs / distKm) : 0;

    const resultContract = {
      completed: true,
      duration: this.activeDurationSecs,
      distanceMeters: Math.round(this.distanceMeters),
      distanceKm: distKm,
      averagePaceSecondsPerKm: avgPaceSecsPerKm,
      detectorId: this.id,
      detectorVersion: this.version
    };

    this.onComplete(resultContract);
    return resultContract;
  }

  destroy() {
    this.pause();
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.lastValidPoint = null;
  }
}
