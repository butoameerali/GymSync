import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, Zap, Activity, CheckCircle, CameraOff, Play, 
  RotateCcw, Plus, SkipForward, ArrowRight, Video, Sparkles, 
  ChevronRight, Dumbbell, Clock, ThumbsUp, Flame, Award, X
} from 'lucide-react';
import './MissionRunner.css';
import AIDetectorContainer from '../../ai-detectors/AIDetectorContainer';

export const MissionRunner = ({ dayTitle, exercises = [], onComplete, onCancel }) => {
  // Overall Workout Phases:
  // 'brief' -> 'active' -> 'rest' -> 'celebration'
  const [phase, setPhase] = useState('brief');
  
  // Exercise & Set Tracking State
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [repsDone, setRepsDone] = useState(10);
  const [aiModeChoice, setAiModeChoice] = useState(null); // null | 'with_ai' | 'without_ai'
  
  // Rest Timer State
  const [restCountdown, setRestCountdown] = useState(45);
  const restTimerRef = useRef(null);

  // Time & Gamification State
  const [startTime, setStartTime] = useState(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [burnedKcal, setBurnedKcal] = useState(0);
  const [completedSetsCount, setCompletedSetsCount] = useState(0);

  // Feedback State
  const [workoutFeeling, setWorkoutFeeling] = useState('good'); // 'easy' | 'good' | 'hard'
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Issue report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportMsg, setReportMsg] = useState('');

  // Fallback if no exercises passed
  const safeExercises = Array.isArray(exercises) && exercises.length > 0 
    ? exercises 
    : [{ name: 'Full Body Movement', sets: 3, reps: 10, targetMuscle: 'Full Body' }];

  const currentEx = safeExercises[currentExIndex] || safeExercises[0];
  const totalExercises = safeExercises.length;
  const totalSetsForCurrent = Number(currentEx.sets || currentEx.defaultSets || 3);
  const targetRepsForCurrent = Number(currentEx.reps || currentEx.defaultReps || 10);

  // Helper: check if the current exercise has AI computer vision support
  const checkExerciseSupportsAI = (ex) => {
    if (!ex) return false;
    const id = String(ex.exerciseId || ex.id || '').toLowerCase();
    const name = String(ex.name || ex.exerciseName || ex.title || '').toLowerCase();
    return Boolean(
      ex.aiDetection?.enabled ||
      ex.isAiTrackable ||
      id.includes('pushup') ||
      name.includes('pushup') ||
      name.includes('push-up') ||
      id.includes('push_up') ||
      id.includes('running') ||
      name.includes('run')
    );
  };

  const isCurrentExAiSupported = checkExerciseSupportsAI(currentEx);

  // Calculate Initial Estimates
  useEffect(() => {
    const totalSetsAll = safeExercises.reduce((acc, ex) => acc + (Number(ex.sets || ex.defaultSets) || 3), 0);
    setEarnedXP(totalSetsAll * 25 + 50); // Base 50 XP + 25 per set
    setBurnedKcal(Math.round(totalSetsAll * 12.5)); // ~12.5 kcal per completed set
  }, [exercises]);

  // Sync target reps when exercise changes
  useEffect(() => {
    setRepsDone(targetRepsForCurrent);
    // If exercise doesn't have AI support, default directly to manual game mode
    if (!isCurrentExAiSupported) {
      setAiModeChoice('without_ai');
    } else {
      setAiModeChoice(null); // Prompt choice for AI-enabled exercise
    }
  }, [currentExIndex, targetRepsForCurrent, isCurrentExAiSupported]);

  // Workout Duration Timer
  useEffect(() => {
    let interval = null;
    if (phase === 'active' || phase === 'rest') {
      interval = setInterval(() => {
        setElapsedSecs(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Rest Countdown Interval
  useEffect(() => {
    if (phase === 'rest') {
      restTimerRef.current = setInterval(() => {
        setRestCountdown(prev => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current);
            advanceToNextSetOrExercise();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(restTimerRef.current);
  }, [phase, currentSet, currentExIndex]);

  // Start the Workout Session
  const handleStartWorkout = () => {
    setStartTime(Date.now());
    setPhase('active');
  };

  // Complete a Set (Manual or AI)
  const handleCompleteSet = (mode = 'manual', detectedReps = null) => {
    const loggedReps = typeof detectedReps === 'number' ? detectedReps : repsDone;
    setCompletedSetsCount(prev => prev + 1);

    const hasMoreSets = currentSet < totalSetsForCurrent;
    const hasMoreExercises = currentExIndex < totalExercises - 1;

    if (hasMoreSets || hasMoreExercises) {
      // Trigger Game-Style Rest Countdown
      const restDuration = Number(currentEx.restTime) || (hasMoreSets ? 45 : 60);
      setRestCountdown(restDuration);
      setPhase('rest');
    } else {
      // All sets of all exercises completed!
      setPhase('celebration');
    }
  };

  // Advance logic after Rest finishes or is skipped
  const advanceToNextSetOrExercise = () => {
    if (currentSet < totalSetsForCurrent) {
      // Next set of same exercise
      setCurrentSet(prev => prev + 1);
      if (isCurrentExAiSupported) {
        setAiModeChoice(null); // Re-prompt or keep choice
      } else {
        setAiModeChoice('without_ai');
      }
      setPhase('active');
    } else if (currentExIndex < totalExercises - 1) {
      // Next exercise in mission
      setCurrentExIndex(prev => prev + 1);
      setCurrentSet(1);
      setPhase('active');
    } else {
      // Finished
      setPhase('celebration');
    }
  };

  // Rest controls
  const handleAddRestTime = (seconds = 15) => {
    setRestCountdown(prev => prev + seconds);
  };

  const handleSkipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    advanceToNextSetOrExercise();
  };

  // Skip current exercise entirely
  const handleSkipCurrentExercise = () => {
    if (currentExIndex < totalExercises - 1) {
      setCurrentExIndex(prev => prev + 1);
      setCurrentSet(1);
      setPhase('active');
    } else {
      setPhase('celebration');
    }
  };

  // Format MM:SS helper
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Final completion handler
  const handleFinishMission = () => {
    if (onComplete) {
      onComplete({
        xp: earnedXP,
        calories: burnedKcal,
        durationMinutes: Math.max(1, Math.round(elapsedSecs / 60)),
        feeling: workoutFeeling,
        completedExercisesCount: totalExercises
      });
    }
  };

  // ── 1. BRIEF PHASE (Mission Overview) ──────────────────────────────────
  if (phase === 'brief') {
    return (
      <div className="mission-runner-overlay">
        <div className="mission-runner-content glass-panel">
          <button 
            className="mission-close-btn"
            onClick={onCancel}
            title="Exit Workout"
          >
            <X size={20} />
          </button>
          
          <div className="mission-badge">
            <Target size={16} /> READY TO TRAIN
          </div>
          
          <h2 className="mission-title">{dayTitle || "Today's Active Mission"}</h2>
          
          <div className="mission-details">
            <div className="mission-detail-item">
              <span className="mission-detail-label">Exercises to Complete</span>
              <span className="mission-detail-value">{totalExercises} Movements</span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">Target Volume</span>
              <span className="mission-detail-value">
                {safeExercises.reduce((acc, ex) => acc + (Number(ex.sets || ex.defaultSets) || 3), 0)} Total Sets
              </span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">Estimated Energy Burn</span>
              <span className="mission-detail-value" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={16} /> ~{burnedKcal} kcal
              </span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">Reward Points</span>
              <span className="mission-detail-value" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Award size={16} /> +{earnedXP} XP
              </span>
            </div>
          </div>

          {/* Exercise Preview List */}
          <div className="mission-exercise-preview-list">
            <p className="mission-preview-heading">SESSION MOVEMENTS</p>
            {safeExercises.map((ex, idx) => {
              const hasAi = checkExerciseSupportsAI(ex);
              return (
                <div key={idx} className="mission-preview-card">
                  <div className="mission-preview-number">{idx + 1}</div>
                  <div className="mission-preview-info">
                    <span className="mission-preview-name">{ex.name || ex.exerciseName || ex.title || 'Exercise'}</span>
                    <span className="mission-preview-sub">
                      {ex.sets || ex.defaultSets || 3} sets × {ex.reps || ex.defaultReps || 10} reps • {ex.targetMuscle || ex.muscle || 'Full Body'}
                    </span>
                  </div>
                  {hasAi && (
                    <span className="mission-ai-tag">
                      <Sparkles size={12} /> AI Available
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <button className="mission-btn mission-btn-start" onClick={handleStartWorkout}>
            <Play size={20} /> START WORKOUT NOW
          </button>
        </div>
      </div>
    );
  }

  // ── 2. ACTIVE EXERCISE PHASE ──────────────────────────────────────────
  if (phase === 'active') {
    const progressPercent = Math.round(((currentExIndex) / totalExercises) * 100);

    return (
      <div className="mission-runner-overlay" style={{ padding: '10px' }}>
        <div className="mission-runner-content active-exercise-card glass-panel">
          
          {/* Top Header Bar */}
          <div className="mission-active-header">
            <div className="mission-header-info">
              <span className="mission-step-counter">
                EXERCISE {currentExIndex + 1} OF {totalExercises}
              </span>
              <div className="mission-time-badge">
                <Clock size={14} /> {formatTime(elapsedSecs)}
              </div>
            </div>
            
            <button 
              className="mission-exit-btn"
              onClick={() => setShowExitConfirm(true)}
              title="Exit Workout"
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mission-progress-bar-bg">
            <div 
              className="mission-progress-bar-fill" 
              style={{ width: `${Math.max(5, progressPercent)}%` }} 
            />
          </div>

          {/* Exit Confirmation Modal */}
          {showExitConfirm && (
            <div className="mission-exit-confirm-overlay">
              <div className="mission-exit-confirm-card">
                <h3>Leave Workout?</h3>
                <p>Your session is in progress. Are you sure you want to stop now?</p>
                <div className="mission-confirm-actions">
                  <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>
                    Keep Training
                  </button>
                  <button className="btn btn-danger" onClick={onCancel}>
                    Exit Workout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Exercise Heading */}
          <div className="mission-active-title-block">
            <h2 className="mission-exercise-name">
              {currentEx.name || currentEx.exerciseName || currentEx.title || 'Exercise'}
            </h2>
            <div className="mission-active-tags">
              <span className="mission-tag-badge">
                <Dumbbell size={14} /> {currentEx.targetMuscle || currentEx.muscle || 'Target Muscle'}
              </span>
              <span className="mission-tag-badge highlight">
                Set {currentSet} of {totalSetsForCurrent}
              </span>
              {isCurrentExAiSupported && (
                <span className="mission-tag-badge ai-badge">
                  <Sparkles size={14} /> AI Trackable
                </span>
              )}
            </div>
          </div>

          {/* ── SCENARIO A: AI Choice Mode for AI-Supported Exercises ── */}
          {isCurrentExAiSupported && aiModeChoice === null && (
            <div className="mission-ai-choice-panel">
              <div className="mission-ai-choice-header">
                <Sparkles size={28} color="#10b981" />
                <h3>Choose How to Track Set {currentSet}</h3>
                <p>This exercise supports automatic real-time camera pose tracking.</p>
              </div>

              <div className="mission-ai-choice-cards">
                <button 
                  className="mission-choice-card ai-choice"
                  onClick={() => setAiModeChoice('with_ai')}
                >
                  <div className="choice-icon-wrap">
                    <Video size={28} color="#10b981" />
                  </div>
                  <div className="choice-text">
                    <h4>Track with AI Camera</h4>
                    <p>Automatic rep counting, posture form accuracy & audio cues.</p>
                  </div>
                  <ChevronRight size={20} color="#10b981" />
                </button>

                <button 
                  className="mission-choice-card manual-choice"
                  onClick={() => setAiModeChoice('without_ai')}
                >
                  <div className="choice-icon-wrap">
                    <Play size={28} color="#3b82f6" />
                  </div>
                  <div className="choice-text">
                    <h4>Track Manually (Without AI)</h4>
                    <p>Standard workout tracker with rep logger & rest timer.</p>
                  </div>
                  <ChevronRight size={20} color="#3b82f6" />
                </button>
              </div>
            </div>
          )}

          {/* ── SCENARIO B: AI Camera Mode Active ── */}
          {isCurrentExAiSupported && aiModeChoice === 'with_ai' && (
            <div className="mission-camera-container">
              <div className="mission-camera-top-action">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => setAiModeChoice('without_ai')}
                >
                  <CameraOff size={14} /> Switch to Manual Mode
                </button>
              </div>

              <AIDetectorContainer
                detectorId="pushup_v1"
                exerciseName={currentEx.name || 'Pushup'}
                onCompleteSession={(result) => {
                  const detectedCount = typeof result?.count === 'number' 
                    ? result.count 
                    : (result?.repCount || targetRepsForCurrent);
                  handleCompleteSet('ai', detectedCount);
                }}
                onFallbackToManual={() => setAiModeChoice('without_ai')}
              />
            </div>
          )}

          {/* ── SCENARIO C: Manual Game Mode (For all exercises without AI or chosen manual) ── */}
          {aiModeChoice === 'without_ai' && (
            <div className="mission-manual-game-container">
              
              {/* Exercise Demo Animation / Illustration Placeholder */}
              <div className="mission-manual-visual-card">
                {currentEx.gifUrl ? (
                  <img 
                    src={currentEx.gifUrl} 
                    alt={currentEx.name} 
                    className="mission-exercise-gif"
                  />
                ) : (
                  <div className="mission-exercise-icon-placeholder">
                    <Dumbbell size={52} color="#3b82f6" />
                    <p>Focus on controlled movement & full range of motion</p>
                  </div>
                )}
              </div>

              {/* Set Tracker & Rep Controller */}
              <div className="mission-set-controller-card">
                <span className="mission-set-title">SET {currentSet} OF {totalSetsForCurrent}</span>
                
                <div className="mission-reps-counter-wrap">
                  <button 
                    className="mission-counter-btn"
                    onClick={() => setRepsDone(Math.max(1, repsDone - 1))}
                    title="Decrease Reps"
                  >
                    -
                  </button>

                  <div className="mission-reps-number-block">
                    <span className="mission-reps-number">{repsDone}</span>
                    <span className="mission-reps-label">REPS COMPLETED</span>
                  </div>

                  <button 
                    className="mission-counter-btn"
                    onClick={() => setRepsDone(repsDone + 1)}
                    title="Increase Reps"
                  >
                    +
                  </button>
                </div>

                <span className="mission-target-hint">
                  Target for this set: <strong>{targetRepsForCurrent} reps</strong>
                </span>
              </div>

              {/* Main Interactive Action Buttons */}
              <div className="mission-action-bar">
                <button 
                  className="mission-btn mission-btn-start mission-btn-log"
                  onClick={() => handleCompleteSet('manual', repsDone)}
                >
                  <CheckCircle size={22} /> COMPLETE SET {currentSet}
                </button>

                <div className="mission-sub-actions">
                  <button 
                    className="mission-text-action-btn"
                    onClick={handleSkipCurrentExercise}
                  >
                    <SkipForward size={16} /> Skip This Exercise
                  </button>
                  
                  {isCurrentExAiSupported && (
                    <button 
                      className="mission-text-action-btn highlight"
                      onClick={() => setAiModeChoice('with_ai')}
                    >
                      <Video size={16} /> Turn on AI Camera
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    );
  }

  // ── 3. REST COUNTDOWN PHASE ───────────────────────────────────────────
  if (phase === 'rest') {
    const hasMoreSetsForCurrent = currentSet < totalSetsForCurrent;
    const nextExerciseObj = safeExercises[currentExIndex + 1];

    return (
      <div className="mission-runner-overlay">
        <div className="mission-runner-content mission-rest-card glass-panel">
          
          <div className="mission-badge" style={{ color: '#3b82f6' }}>
            <Activity size={16} /> RECOVERY PERIOD
          </div>
          
          <h2 className="mission-rest-title">Take a Breath</h2>
          <p className="mission-rest-subtitle">Rest fuels muscle recovery and maximum power output.</p>

          {/* Large Game-Style Countdown Circle */}
          <div className="mission-rest-timer-circle">
            <span className="mission-rest-countdown-digits">
              {formatTime(restCountdown)}
            </span>
            <span className="mission-rest-countdown-label">REST REMAINING</span>
          </div>

          {/* Up Next Preview */}
          <div className="mission-up-next-banner">
            <span className="up-next-label">UP NEXT:</span>
            <span className="up-next-value">
              {hasMoreSetsForCurrent 
                ? `Set ${currentSet + 1} of ${totalSetsForCurrent} • ${currentEx.name || 'Exercise'}`
                : `Next Movement: ${nextExerciseObj?.name || 'Next Exercise'}`
              }
            </span>
          </div>

          {/* Rest Control Buttons */}
          <div className="mission-rest-actions-row">
            <button 
              className="mission-btn mission-btn-fallback"
              onClick={() => handleAddRestTime(15)}
            >
              <Plus size={18} /> +15 SECONDS
            </button>

            <button 
              className="mission-btn mission-btn-start"
              style={{ background: '#3b82f6' }}
              onClick={handleSkipRest}
            >
              <SkipForward size={18} /> SKIP REST & START
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── 4. CELEBRATION PHASE (Mission Complete) ───────────────────────────
  if (phase === 'celebration') {
    return (
      <div className="mission-runner-overlay">
        <div className="mission-runner-content mission-celebration glass-panel">
          
          <div className="mission-celebration-trophy">
            <CheckCircle size={72} color="#10b981" />
          </div>

          <h2 className="mission-celebration-heading">MISSION COMPLETE!</h2>
          <p className="mission-celebration-sub">
            Incredible dedication. Every set brings you closer to your fitness goals.
          </p>

          {/* Gamification Stats Card */}
          <div className="mission-stats-summary-grid">
            <div className="mission-stat-box">
              <Flame size={24} color="#f59e0b" />
              <span className="stat-number">~{burnedKcal}</span>
              <span className="stat-label">KCAL BURNED</span>
            </div>

            <div className="mission-stat-box">
              <Award size={24} color="#10b981" />
              <span className="stat-number">+{earnedXP}</span>
              <span className="stat-label">XP EARNED</span>
            </div>

            <div className="mission-stat-box">
              <Clock size={24} color="#3b82f6" />
              <span className="stat-number">{Math.max(1, Math.round(elapsedSecs / 60))}m</span>
              <span className="stat-label">TOTAL TIME</span>
            </div>
          </div>

          {/* Quick Feeling Feedback (Easy / Good / Hard) */}
          <div className="mission-feedback-section">
            <p className="feedback-question">HOW DID THIS WORKOUT FEEL?</p>
            <div className="feedback-options-row">
              <button 
                className={`feedback-chip ${workoutFeeling === 'easy' ? 'active easy' : ''}`}
                onClick={() => setWorkoutFeeling('easy')}
              >
                🟢 Too Easy
              </button>
              <button 
                className={`feedback-chip ${workoutFeeling === 'good' ? 'active good' : ''}`}
                onClick={() => setWorkoutFeeling('good')}
              >
                🔵 Just Right
              </button>
              <button 
                className={`feedback-chip ${workoutFeeling === 'hard' ? 'active hard' : ''}`}
                onClick={() => setWorkoutFeeling('hard')}
              >
                🔴 Very Hard
              </button>
            </div>
          </div>

          <button 
            className="mission-btn mission-btn-start" 
            style={{ fontSize: '1.2rem', padding: '18px' }}
            onClick={handleFinishMission}
          >
            <CheckCircle size={22} /> LOG & COMPLETE SESSION
          </button>

          {/* Issue Report Option */}
          <div style={{ marginTop: '20px' }}>
            {!showReportForm ? (
              <button
                onClick={() => setShowReportForm(true)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Did something go wrong? Report an issue
              </button>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px', marginTop: '8px', textAlign: 'left' }}>
                <p style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.85rem' }}>Report Completion Discrepancy</p>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15,23,42,0.8)', color: 'white', border: '1px solid #334155', borderRadius: '8px', padding: '8px', marginBottom: '8px', fontSize: '0.85rem' }}
                >
                  <option value="">Select reason…</option>
                  <option value="MinorIssue">Minor issue (display glitch or wrong rep count)</option>
                  <option value="FormFraud">Marked done but did not complete exercises</option>
                  <option value="CalorieAdjustment">Adjust calories down</option>
                </select>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Additional details (optional)…"
                  rows={2}
                  style={{ width: '100%', background: 'rgba(15,23,42,0.8)', color: 'white', border: '1px solid #334155', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', resize: 'none' }}
                />
                <button 
                  className="btn btn-sm btn-secondary" 
                  style={{ marginTop: '8px' }}
                  onClick={() => {
                    setShowReportForm(false);
                    setReportMsg('Thank you for your report.');
                  }}
                >
                  Submit Feedback
                </button>
                {reportMsg && <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '6px' }}>{reportMsg}</p>}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  return null;
};

export default MissionRunner;
