import React, { useState, useEffect, useRef } from 'react';
import { getDetectorById } from './registry.js';
import { Play, Pause, CheckCircle, AlertTriangle, Video, Sparkles, RefreshCw, XCircle } from 'lucide-react';
import './AIDetectorContainer.css';

const AIDetectorContainer = ({ detectorId, exerciseName, onCompleteSession, onFallbackToManual }) => {
  const videoRef = useRef(null);
  const detectorInstanceRef = useRef(null);

  const [detectorMeta, setDetectorMeta] = useState(null);
  const [detectorState, setDetectorState] = useState('loading'); // loading | ready | camera_denied | running | paused | completed | error
  const [errorMsg, setErrorMsg] = useState('');
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState('up');
  const [confidence, setConfidence] = useState(0.85);

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
          onStateChange: ({ status, error, count: c, stage: st }) => {
            if (!isMounted) return;
            setDetectorState(status);
            if (error) setErrorMsg(error);
            if (typeof c === 'number') setCount(c);
            if (st) setStage(st);
          },
          onUpdate: ({ count: c, stage: st, confidence: conf }) => {
            if (!isMounted) return;
            if (typeof c === 'number') setCount(c);
            if (st) setStage(st);
            if (typeof conf === 'number') setConfidence(conf);
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

        // Initialize camera & model
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

  const handleFinish = () => {
    if (detectorInstanceRef.current) {
      detectorInstanceRef.current.stop();
    } else {
      onCompleteSession({
        reps: count,
        duration: 30,
        completed: true,
        detectorId: detectorId || 'manual',
        detectorVersion: '1.0',
        confidence: 0.90,
        formIssues: []
      });
    }
  };

  return (
    <div className="ai-detector-container">
      {/* Header Badge */}
      <div className="ai-detector-header">
        <div className="ai-badge">
          <Sparkles size={16} />
          <span>AI Detection Mode — <strong>{exerciseName}</strong></span>
          {detectorMeta?.status === 'experimental' && (
            <span className="beta-tag">BETA / EXPERIMENTAL</span>
          )}
        </div>
        <button className="btn btn-outline btn-sm" onClick={onFallbackToManual}>
          Switch to Manual Mode
        </button>
      </div>

      {/* Camera & Detection Viewport */}
      <div className="ai-video-viewport">
        <video
          ref={videoRef}
          className="ai-video-feed"
          playsInline
          muted
          style={{ display: ['running', 'paused', 'ready'].includes(detectorState) ? 'block' : 'none' }}
        />

        {/* State Overlay: Loading / Camera Permission */}
        {['loading', 'camera_permission_required'].includes(detectorState) && (
          <div className="ai-overlay-status">
            <RefreshCw className="spin-icon" size={36} />
            <p>Loading AI Model & Camera Stream...</p>
            <span className="sub-text">Please allow camera access if prompted by your browser.</span>
          </div>
        )}

        {/* State Overlay: Camera Denied */}
        {detectorState === 'camera_denied' && (
          <div className="ai-overlay-status error">
            <AlertTriangle size={40} color="#f59e0b" />
            <h4>Camera Permission Required</h4>
            <p>{errorMsg || 'Camera access was denied or is unavailable on your device.'}</p>
            <button className="btn btn-primary mt-12" onClick={onFallbackToManual}>
              Continue Without AI
            </button>
          </div>
        )}

        {/* State Overlay: Error / Unregistered */}
        {detectorState === 'error' && (
          <div className="ai-overlay-status error">
            <XCircle size={40} color="#ef4444" />
            <h4>AI Detection Unavailable</h4>
            <p>{errorMsg || 'The AI detection algorithm encountered an error.'}</p>
            <button className="btn btn-primary mt-12" onClick={onFallbackToManual}>
              Continue Without AI
            </button>
          </div>
        )}

        {/* Ready Overlay */}
        {detectorState === 'ready' && (
          <div className="ai-overlay-status ready">
            <Video size={40} color="#10b981" />
            <h4>Camera & AI Model Ready!</h4>
            <p>Position yourself clearly in front of your camera.</p>
            <button className="btn btn-primary btn-lg mt-12" onClick={handleStart}>
              <Play size={18} /> Start AI Session
            </button>
          </div>
        )}

        {/* Live HUD Overlay when Running / Paused */}
        {['running', 'paused'].includes(detectorState) && (
          <div className="ai-hud-overlay">
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
          </div>
        )}
      </div>

      {/* Control Buttons */}
      {['running', 'paused'].includes(detectorState) && (
        <div className="ai-controls-bar">
          {detectorState === 'running' ? (
            <button className="btn btn-outline" onClick={handlePause}>
              <Pause size={18} /> Pause AI Session
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleStart}>
              <Play size={18} /> Resume AI Session
            </button>
          )}

          <button className="btn btn-success" onClick={handleFinish}>
            <CheckCircle size={18} /> Complete & Save Workout
          </button>
        </div>
      )}
    </div>
  );
};

export default AIDetectorContainer;
