import React, { useState, useEffect, useRef } from 'react';
import { getDetectorById } from './registry.js';
import { Play, Pause, CheckCircle, AlertTriangle, Video, Sparkles, RefreshCw, XCircle, MapPin, Navigation } from 'lucide-react';
import './AIDetectorContainer.css';

const AIDetectorContainer = ({ detectorId, exerciseName, onCompleteSession, onFallbackToManual }) => {
  const videoRef = useRef(null);
  const detectorInstanceRef = useRef(null);

  const [detectorMeta, setDetectorMeta] = useState(null);
  const [detectorState, setDetectorState] = useState('loading'); // loading | ready | camera_denied | location_denied | gps_unavailable | running | paused | completed | error
  const [errorMsg, setErrorMsg] = useState('');
  
  // Camera metrics
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState('up');
  const [confidence, setConfidence] = useState(0.85);

  // GPS metrics
  const [distanceKm, setDistanceKm] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSecs, setDurationSecs] = useState(0);
  const [paceSecsPerKm, setPaceSecsPerKm] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const meta = getDetectorById(detectorId);
    setDetectorMeta(meta);

    if (!meta) {
      setDetectorState('error');
      setErrorMsg(`No supported AI detector registered for ID '${detectorId}'.`);
      return;
    }

    // Lazy load detector module on demand
    meta.loader()
      .then(module => {
        if (!isMounted) return;
        const DetectorClass = Object.values(module)[0];
        if (!DetectorClass) throw new Error('Detector class export not found');

        const instance = new DetectorClass({
          videoElement: videoRef.current,
          onStateChange: ({ status, error, count: c, stage: st, distanceKm: dKm, duration: dur }) => {
            if (!isMounted) return;
            setDetectorState(status);
            if (error) setErrorMsg(error);
            if (typeof c === 'number') setCount(c);
            if (st) setStage(st);
            if (typeof dKm === 'number') setDistanceKm(dKm);
            if (typeof dur === 'number') setDurationSecs(dur);
          },
          onUpdate: ({ count: c, stage: st, confidence: conf, distanceKm: dKm, distanceMeters: dM, duration: dur, averagePaceSecondsPerKm: pace }) => {
            if (!isMounted) return;
            if (typeof c === 'number') setCount(c);
            if (st) setStage(st);
            if (typeof conf === 'number') setConfidence(conf);
            if (typeof dKm === 'number') setDistanceKm(dKm);
            if (typeof dM === 'number') setDistanceMeters(dM);
            if (typeof dur === 'number') setDurationSecs(dur);
            if (typeof pace === 'number') setPaceSecsPerKm(pace);
          },
          onComplete: (resultContract) => {
            if (!isMounted) return;
            onCompleteSession(resultContract);
          },
          onError: (errText) => {
            if (!isMounted) return;
            setErrorMsg(errText);
            setDetectorState('error');
          }
        });

        detectorInstanceRef.current = instance;

        // Initialize camera/GPS
        instance.initialize(videoRef.current);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('[AIDetectorContainer] Lazy load error:', err);
        setDetectorState('error');
        setErrorMsg('AI detector dynamic module could not be loaded.');
      });

    return () => {
      isMounted = false;
      if (detectorInstanceRef.current) {
        detectorInstanceRef.current.destroy();
        detectorInstanceRef.current = null;
      }
    };
  }, [detectorId]);

  const handleStart = () => {
    if (detectorInstanceRef.current) {
      detectorInstanceRef.current.start();
    }
  };

  const handlePause = () => {
    if (detectorInstanceRef.current) {
      detectorInstanceRef.current.pause();
    }
  };

  const handleResume = () => {
    if (detectorInstanceRef.current) {
      if (typeof detectorInstanceRef.current.resume === 'function') {
        detectorInstanceRef.current.resume();
      } else {
        detectorInstanceRef.current.start();
      }
    }
  };

  const handleFinish = () => {
    if (detectorInstanceRef.current) {
      detectorInstanceRef.current.stop();
    } else {
      onCompleteSession({
        completed: true,
        duration: durationSecs || 30,
        distanceMeters: distanceMeters || 1000,
        distanceKm: distanceKm || 1.0,
        averagePaceSecondsPerKm: paceSecsPerKm || 300,
        detectorId: detectorId || 'running_v1',
        detectorVersion: '1.0'
      });
    }
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatPace = (secsPerKm) => {
    if (!secsPerKm || secsPerKm <= 0 || secsPerKm > 3600) return '--:-- /km';
    const mins = Math.floor(secsPerKm / 60);
    const s = secsPerKm % 60;
    return `${mins}'${String(s).padStart(2, '0')}" /km`;
  };

  const isGpsDetector = detectorMeta?.type === 'gps' || detectorId === 'running_v1';

  return (
    <div className="ai-detector-container">
      {/* Header Badge */}
      <div className="ai-detector-header">
        <div className="ai-badge">
          {isGpsDetector ? <Navigation size={16} color="#3b82f6" /> : <Sparkles size={16} />}
          <span>{isGpsDetector ? 'GPS Running Tracker' : 'AI Detection Mode'} — <strong>{exerciseName}</strong></span>
          {detectorMeta?.status === 'experimental' && (
            <span className="beta-tag">BETA / EXPERIMENTAL</span>
          )}
        </div>
        <button className="btn btn-outline btn-sm" onClick={onFallbackToManual}>
          Switch to Manual Mode
        </button>
      </div>

      {/* Camera / GPS Viewport */}
      <div className="ai-video-viewport">
        {!isGpsDetector && (
          <video
            ref={videoRef}
            className="ai-video-feed"
            playsInline
            muted
            style={{ display: ['running', 'paused', 'ready'].includes(detectorState) ? 'block' : 'none' }}
          />
        )}

        {/* GPS Active Display Viewport */}
        {isGpsDetector && ['ready', 'running', 'paused'].includes(detectorState) && (
          <div className="gps-active-canvas" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <MapPin size={48} color="#3b82f6" style={{ marginBottom: '10px' }} />
            <h2 style={{ fontSize: '3rem', margin: '10px 0', color: '#fff' }}>{distanceKm.toFixed(2)} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>km</span></h2>
            <p style={{ color: '#10b981', fontWeight: 600 }}>GPS High Accuracy Signal Active</p>
          </div>
        )}

        {/* State Overlay: Loading / Permission */}
        {['loading', 'camera_permission_required', 'location_permission_required'].includes(detectorState) && (
          <div className="ai-overlay-status">
            <RefreshCw className="spin-icon" size={36} />
            <p>{isGpsDetector ? 'Connecting to GPS Location Signal...' : 'Loading AI Model & Camera Stream...'}</p>

            <span className="sub-text">
              {isGpsDetector 
                ? 'Location access is required to track your running distance. Please allow location permissions.' 
                : 'Please allow camera access if prompted by your browser.'}
            </span>
          </div>
        )}

        {/* State Overlay: Permission Denied */}
        {['camera_denied', 'location_denied'].includes(detectorState) && (
          <div className="ai-overlay-status error">
            <AlertTriangle size={40} color="#f59e0b" />
            <h4>{isGpsDetector ? 'Location Access Required' : 'Camera Permission Required'}</h4>
            <p>{errorMsg || (isGpsDetector ? 'Location access was denied. Please enable GPS location access.' : 'Camera access was denied or is unavailable.')}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-outline" onClick={() => detectorInstanceRef.current?.initialize()}>
                Try Again
              </button>
              <button className="btn btn-primary" onClick={onFallbackToManual}>
                Continue Without AI
              </button>
            </div>
          </div>
        )}

        {/* State Overlay: Error / Unregistered / GPS Unavailable */}
        {['error', 'gps_unavailable'].includes(detectorState) && (
          <div className="ai-overlay-status error">
            <XCircle size={40} color="#ef4444" />
            <h4>{isGpsDetector ? 'GPS Signal Unavailable' : 'AI Detection Unavailable'}</h4>
            <p>{errorMsg || 'The fitness tracker encountered an error.'}</p>
            <button className="btn btn-primary mt-12" onClick={onFallbackToManual}>
              Continue Without AI
            </button>
          </div>
        )}

        {/* Ready Overlay */}
        {detectorState === 'ready' && (
          <div className="ai-overlay-status ready">
            {isGpsDetector ? <MapPin size={40} color="#3b82f6" /> : <Video size={40} color="#10b981" />}
            <h4>{isGpsDetector ? 'GPS Signal Locked & Ready!' : 'Camera & AI Model Ready!'}</h4>
            <p>{isGpsDetector ? 'Ready to begin outdoor running session.' : 'Position yourself clearly in front of your camera.'}</p>
            <button className="btn btn-primary btn-lg mt-12" onClick={handleStart}>
              <Play size={18} /> {isGpsDetector ? 'Start GPS Run' : 'Start AI Session'}
            </button>
          </div>
        )}

        {/* Live HUD Overlay when Running / Paused */}
        {['running', 'paused'].includes(detectorState) && (
          <div className="ai-hud-overlay">
            {isGpsDetector ? (
              <>
                <div className="hud-metric">
                  <span className="hud-label">DISTANCE</span>
                  <span className="hud-value">{distanceKm.toFixed(2)} km</span>
                </div>
                <div className="hud-metric">
                  <span className="hud-label">TIME</span>
                  <span className="hud-value">{formatDuration(durationSecs)}</span>
                </div>
                <div className="hud-metric">
                  <span className="hud-label">AVG PACE</span>
                  <span className="hud-value conf">{formatPace(paceSecsPerKm)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="hud-metric">
                  <span className="hud-label">REPS COUNTED</span>
                  <span className="hud-value">{count}</span>
                </div>
                <div className="hud-metric">
                  <span className="hud-label">STAGE</span>
                  <span className="hud-value stage">{stage.toUpperCase()}</span>
                </div>
                <div className="hud-metric">
                  <span className="hud-label">CONFIDENCE</span>
                  <span className="hud-value conf">{(confidence * 100).toFixed(0)}%</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      {['running', 'paused'].includes(detectorState) && (
        <div className="ai-controls-bar">
          {detectorState === 'running' ? (
            <button className="btn btn-outline" onClick={handlePause}>
              <Pause size={18} /> Pause Session
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleResume}>
              <Play size={18} /> Resume Session
            </button>
          )}

          <button className="btn btn-success" onClick={handleFinish}>
            <CheckCircle size={18} /> Complete & Save Run
          </button>
        </div>
      )}
    </div>
  );
};

export default AIDetectorContainer;
