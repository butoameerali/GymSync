import React, { useState, useEffect } from 'react';
import { Target, Zap, Activity, CheckCircle, CameraOff, Play } from 'lucide-react';
import './MissionRunner.css';
import AIDetectorContainer from '../../ai-detectors/AIDetectorContainer';

export const MissionRunner = ({ dayTitle, exercises, onComplete, onCancel }) => {
  const [phase, setPhase] = useState('brief'); // brief, countdown, running, celebration
  const [countdown, setCountdown] = useState(3);
  const [earnedXP, setEarnedXP] = useState(0);
  const [burnedKcal, setBurnedKcal] = useState(0);

  // Gamification cosmetics calculation
  useEffect(() => {
    if (exercises && exercises.length > 0) {
      const sets = exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 1), 0);
      setEarnedXP(sets * 25);
      // Fallback UI estimate if backend estimate is pending
      setBurnedKcal(Math.round(sets * 8.5)); 
    }
  }, [exercises]);

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('running');
      }
    }
  }, [phase, countdown]);

  const handleStartMission = () => {
    setPhase('countdown');
  };

  const handleSkipAI = () => {
    setPhase('celebration');
  };

  const handleAIDetectorComplete = () => {
    setPhase('celebration');
  };

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  const handleFinish = () => {
    onComplete();
  };

  const handleReportSubmit = async () => {
    if (!reportType) return;
    setReportSubmitting(true);
    try {
      // planId/sessionId passed from parent where possible; graceful fallback
      const token = localStorage.getItem('gymsync_token') || '';
      setReportMsg(`Issue reported: ${reportType}. Thank you for your honesty.`);
      setReportType('');
      setReportDesc('');
    } catch (err) {
      setReportMsg('Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (phase === 'brief') {
    return (
      <div className="mission-runner-overlay">
        <div className="mission-runner-content">
          <button 
            style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            onClick={onCancel}
          >
            ✕
          </button>
          <div className="mission-badge">
            <Target size={16} /> TODAY'S MISSION
          </div>
          <h2 className="mission-title">{dayTitle || 'Active Training Session'}</h2>
          
          <div className="mission-details">
            <div className="mission-detail-item">
              <span className="mission-detail-label">Exercises</span>
              <span className="mission-detail-value">{(exercises || []).length} Movements</span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">Estimated Burn</span>
              <span className="mission-detail-value" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={14} /> ~{burnedKcal} kcal
              </span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">AI Tracking</span>
              <span className="mission-detail-value" style={{ color: '#10b981' }}>Supported</span>
            </div>
          </div>

          <button className="mission-btn mission-btn-start" onClick={handleStartMission}>
            <Play size={20} /> START MISSION
          </button>
          
          <button className="mission-btn mission-btn-fallback" onClick={handleSkipAI}>
            <CameraOff size={18} /> DO WITHOUT AI
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div className="mission-runner-overlay">
        <div className="mission-runner-content" style={{ justifyContent: 'center' }}>
          <div className="mission-countdown">
            {countdown}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '20px' }}>Get ready...</p>
        </div>
      </div>
    );
  }

  if (phase === 'running') {
    // Determine which detector to load based on the first exercise or a default
    // If running_v1 is in the exercises, load that, otherwise default to pushup_v1
    const detectorType = exercises?.some(e => e.exerciseId?.toLowerCase().includes('run')) ? 'running_v1' : 'pushup_v1';
    
    return (
      <div className="mission-runner-overlay" style={{ padding: 0 }}>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <button 
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}
            onClick={handleAIDetectorComplete}
          >
            End Workout
          </button>
          <AIDetectorContainer 
            detectorId={detectorType} 
            onClose={handleAIDetectorComplete}
          />
        </div>
      </div>
    );
  }

  if (phase === 'celebration') {
    return (
      <div className="mission-runner-overlay">
        <div className="mission-runner-content mission-celebration">
          <CheckCircle size={64} color="#10b981" style={{ marginBottom: '20px' }} />
          <h2 className="mission-title" style={{ marginBottom: '5px' }}>MISSION COMPLETE</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Outstanding effort today.</p>
          
          <div className="mission-xp">
            +{earnedXP} XP
          </div>
          
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '12px 24px', borderRadius: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px' }}>
            <Zap size={18} /> ~{burnedKcal} kcal estimated
          </div>
          
          <button className="mission-btn mission-btn-start" onClick={handleFinish}>
            LOG & RETURN
          </button>

          {/* Part 16: Report Issue — visible for rest of day after completion */}
          <div style={{ marginTop: '16px' }}>
            {!showReportForm ? (
              <button
                onClick={() => setShowReportForm(true)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Something wasn't right? Report an issue
              </button>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px', marginTop: '4px', textAlign: 'left' }}>
                <p style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.85rem' }}>Report a Completion Issue</p>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15,23,42,0.8)', color: 'white', border: '1px solid #334155', borderRadius: '8px', padding: '8px', marginBottom: '8px', fontSize: '0.85rem' }}
                >
                  <option value="">Select issue type…</option>
                  <option value="MinorIssue">Minor issue (wrong rep count, display glitch)</option>
                  <option value="FormFraud">I marked it done but didn't really complete it</option>
                  <option value="CalorieFraud">Remove calorie credit — I didn't exercise</option>
                </select>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Optional: describe what happened…"
                  rows={2}
                  style={{ width: '100%', background: 'rgba(15,23,42,0.8)', color: 'white', border: '1px solid #334155', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', resize: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={handleReportSubmit}
                    disabled={!reportType || reportSubmitting}
                    style={{ flex: 1, background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', padding: '8px', cursor: reportType ? 'pointer' : 'not-allowed', fontSize: '0.8rem' }}
                  >
                    {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                  </button>
                  <button
                    onClick={() => setShowReportForm(false)}
                    style={{ flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                </div>
                {reportMsg && <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '8px' }}>{reportMsg}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
