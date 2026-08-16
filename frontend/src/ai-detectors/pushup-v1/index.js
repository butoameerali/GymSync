/**
 * Push-Up Detector Module (pushup_v1)
 * Version: 1.0 (Beta / Experimental)
 * 
 * Local browser processing for Push-up rep counting and form tracking.
 * Dynamically loads TensorFlow / PoseDetection on demand.
 */

export class PushupV1Detector {
  constructor(options = {}) {
    this.id = 'pushup_v1';
    this.version = '1.0';
    this.status = 'loading'; // loading | ready | camera_permission_required | camera_denied | running | paused | completed | error
    this.errorMessage = '';
    
    this.videoElement = options.videoElement || null;
    this.onStateChange = options.onStateChange || (() => {});
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});

    this.count = 0;
    this.stage = 'up'; // 'up' | 'down'
    this.confidence = 0.0;
    this.formIssues = [];
    this.startTime = null;
    this.endTime = null;

    this.detector = null;
    this.animFrameId = null;
    this.stream = null;
  }

  setState(newState, msg = '') {
    this.status = newState;
    if (msg) this.errorMessage = msg;
    this.onStateChange({ status: this.status, error: this.errorMessage, count: this.count, stage: this.stage });
  }

  // Calculate angle between three joint points (A, B, C)
  calculateAngle(pointA, pointB, pointC) {
    const radians =
      Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
      Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }

  // Initialize camera and pose detection model on demand
  async initialize(videoEl) {
    if (videoEl) this.videoElement = videoEl;
    this.setState('loading');

    try {
      // 1. Request camera permission locally
      this.setState('camera_permission_required');
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        if (this.videoElement) {
          this.videoElement.srcObject = this.stream;
          await new Promise(resolve => {
            this.videoElement.onloadedmetadata = () => {
              this.videoElement.play();
              resolve();
            };
          });
        }
      } catch (camErr) {
        console.warn('[PushupV1Detector] Camera permission error:', camErr.message);
        this.setState('camera_denied', 'Camera access denied or unavailable. Please check camera permissions.');
        this.onError('Camera access denied or unavailable.');
        return false;
      }

      // 2. Dynamically import TensorFlow & Pose Detection models lazy on demand via CDN/runtime
      let tf, poseDetection;
      try {
        tf = await import(/* @vite-ignore */ '@tensorflow/tfjs');
        poseDetection = await import(/* @vite-ignore */ '@tensorflow-models/pose-detection');
      } catch (importErr) {
        if (window.tf && window.poseDetection) {
          tf = window.tf;
          poseDetection = window.poseDetection;
        } else {
          throw new Error('TensorFlow libraries not available in current browser environment.');
        }
      }

      await tf.ready();
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );

      this.setState('ready');
      return true;
    } catch (err) {
      console.error('[PushupV1Detector] Initialization error:', err.message);
      this.setState('error', 'Failed to initialize AI detection model. Network or browser incompatibilities detected.');
      this.onError('AI model loading failed.');
      return false;
    }
  }

  // Start real-time frame estimation loop
  start() {
    if (!this.detector || !this.videoElement) {
      this.setState('error', 'Detector not ready to start session.');
      return;
    }

    this.startTime = this.startTime || Date.now();
    this.setState('running');
    this.detectLoop();
  }

  detectLoop = async () => {
    if (this.status !== 'running') return;

    try {
      if (
        this.videoElement &&
        this.videoElement.readyState === 4 &&
        this.detector
      ) {
        const poses = await this.detector.estimatePoses(this.videoElement);

        if (poses && poses.length > 0) {
          const keypoints = poses[0].keypoints;
          const shoulder = keypoints.find(kp => kp.name === 'left_shoulder' || kp.name === 'right_shoulder');
          const elbow = keypoints.find(kp => kp.name === 'left_elbow' || kp.name === 'right_elbow');
          const wrist = keypoints.find(kp => kp.name === 'left_wrist' || kp.name === 'right_wrist');

          if (shoulder && elbow && wrist && shoulder.score > 0.3 && elbow.score > 0.3 && wrist.score > 0.3) {
            // Joint model confidence average
            this.confidence = Math.round(((shoulder.score + elbow.score + wrist.score) / 3) * 100) / 100;
            const angle = this.calculateAngle(shoulder, elbow, wrist);

            // Rep Stage Detection Logic
            if (angle > 160) {
              if (this.stage === 'down') {
                this.count += 1;
              }
              this.stage = 'up';
            } else if (angle < 90) {
              this.stage = 'down';
            }

            this.onUpdate({
              count: this.count,
              stage: this.stage,
              confidence: this.confidence,
              formIssues: this.formIssues
            });
          }
        }
      }
    } catch (loopErr) {
      console.warn('[PushupV1Detector] Loop warning:', loopErr.message);
    }

    if (this.status === 'running') {
      this.animFrameId = requestAnimationFrame(this.detectLoop);
    }
  };

  pause() {
    this.setState('paused');
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  // Complete session and generate standard result contract
  stop() {
    this.endTime = Date.now();
    this.setState('completed');

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Stop camera stream track
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    const durationSecs = Math.max(1, Math.round(((this.endTime || Date.now()) - (this.startTime || Date.now())) / 1000));

    const resultContract = {
      reps: this.count,
      duration: durationSecs,
      completed: true,
      detectorId: this.id,
      detectorVersion: this.version,
      confidence: this.confidence || 0.85,
      formIssues: this.formIssues
    };

    this.onComplete(resultContract);
    return resultContract;
  }

  destroy() {
    this.pause();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.detector = null;
  }
}
