import React from 'react';
import {
  Bot,
  CheckCircle,
  ShieldAlert,
  Lock,
  Moon,
  AlertTriangle,
  Activity,
  Bookmark,
  Layers,
  Trash2,
  Play,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

/**
 * AITrainerAIMode
 *
 * Renders the full 'ai' activeMode section of the Workout Hub, including:
 *   • Active instructor-program banner with scheduled session
 *   • Bio-incomplete prompt
 *   • AI plan header with Save / My Plans actions
 *   • Generating spinner
 *   • Medical-safety hard-filter warnings
 *   • Interactive calendar grid (7-column)
 *   • Side-drawer day detail panel:
 *       – Adaptation goal, coach rationale, warm-up, main work,
 *         cool-down, quick coach recalculate actions, diet plan,
 *         workout start/complete controls
 *   • Saved AI Plans modal
 *
 * Props
 * ─────
 * All state values and handlers are forwarded from AITrainer (parent).
 */
const AITrainerAIMode = ({
  // bio / subscription
  isBioFilled,
  isGuest,

  // plan state
  aiPlan,
  isGeneratingPlan,
  selectedCalendarDay,
  setSelectedCalendarDay,

  // workout progress
  workoutProgress,
  activeWorkoutDay,
  setActiveWorkoutDay,

  // saved plans modal
  savedPlans,
  showSavedPlansModal,
  setShowSavedPlansModal,
  isSavingPlan,
  isLoadingSavedPlans,

  // active instructor program
  activeUserProgram,

  // recalculate loading state
  isRecalculating,

  // helpers / handlers
  getDayScheduleInfo,
  isExerciseCompletedInState,
  isExerciseUnlockedInState,
  startExercise,
  completeActiveWorkout,
  handleCoachAction,
  handleSaveCurrentPlan,
  loadSavedPlans,
  handleActivateSavedPlan,
  handleDeleteSavedPlan,
  handleLogProgramSession,
}) => {
  const navigate = useNavigate();

  return (
    <div className="ai-plan-view glass-panel">
      {/* ── ACTIVE INSTRUCTOR PROGRAM BANNER ─────────────────────────────── */}
      {activeUserProgram && (
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
            border: '1px solid #3b82f6',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'inline-block',
                  marginBottom: '6px',
                }}
              >
                ACTIVE INSTRUCTOR PROGRAM (v{activeUserProgram.programVersion || 1})
              </span>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                {activeUserProgram.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
                Goal: <strong>{activeUserProgram.goal}</strong> • Difficulty:{' '}
                <strong>{activeUserProgram.difficulty}</strong> •{' '}
                {activeUserProgram.durationWeeks} Weeks
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Schedule Status
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#10b981' }}>
                Week {activeUserProgram.progress?.currentWeek || 1} • Day{' '}
                {activeUserProgram.progress?.currentDay || 1}
              </div>
            </div>
          </div>

          {/* Scheduled routine session */}
          {(() => {
            const currentWk =
              activeUserProgram.weeks?.find(
                (w) => w.weekNumber === (activeUserProgram.progress?.currentWeek || 1)
              ) || activeUserProgram.weeks?.[0];
            const currentDayObj =
              currentWk?.days?.find(
                (d) => d.dayNumber === (activeUserProgram.progress?.currentDay || 1)
              ) || currentWk?.days?.[0];
            if (!currentDayObj) return null;

            return (
              <div
                style={{
                  marginTop: '16px',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
                      Scheduled Today: {currentDayObj.focus || 'Core Routine'}
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {(currentDayObj.exercises || []).length} structured exercises
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      handleLogProgramSession(
                        activeUserProgram._id,
                        activeUserProgram.progress?.currentWeek || 1,
                        activeUserProgram.progress?.currentDay || 1
                      )
                    }
                  >
                    <CheckCircle size={14} style={{ marginRight: '4px' }} /> Complete Session
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {(currentDayObj.exercises || []).map((ex, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (ex.exerciseId && typeof ex.exerciseId === 'object')
                          startExercise(ex.exerciseId);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        cursor: ex.exerciseId ? 'pointer' : 'default',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontSize: '0.88rem',
                          }}
                        >
                          {ex.exerciseId?.name || ex.name || `Exercise ${idx + 1}`}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {ex.sets} sets × {ex.reps} reps {ex.rpe ? `• RPE ${ex.rpe}` : ''}
                        </div>
                      </div>
                      {ex.exerciseId && <Play size={14} color="#3b82f6" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── BIO INCOMPLETE PROMPT ─────────────────────────────────────────── */}
      {!isBioFilled ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '20px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            margin: '10px 0',
          }}
        >
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <Activity size={36} color="#f59e0b" />
          </div>
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
            Profile Bio Details Incomplete
          </h3>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              maxWidth: '520px',
              margin: '0 auto 25px auto',
              lineHeight: 1.6,
            }}
          >
            To generate your personalized AI workout calendar and 100% natural nutrition plan,
            please complete your bio details in your Profile.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '1rem' }}
            onClick={() => navigate('/profile')}
          >
            Complete Profile Bio Assessment Now
          </button>
        </div>
      ) : (
        <>
          {/* ── PLAN HEADER ─────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '15px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Bot size={40} color="#3b82f6" />
              <div>
                <h2>Dynamic AI Calendar &amp; Workout Engine</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Sequential progressive overload &amp; schedule-aware workout state machine
                </p>
              </div>
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
            >
              <span
                className="category-badge"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                }}
              >
                Plan Active: {aiPlan?.planDuration || 'Custom'}
              </span>
              {!isGuest && aiPlan && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleSaveCurrentPlan}
                  disabled={isSavingPlan}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Bookmark size={14} /> {isSavingPlan ? 'Saving...' : 'Save Plan'}
                </button>
              )}
              {!isGuest && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setShowSavedPlansModal(true);
                    loadSavedPlans();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Layers size={14} /> My Saved Plans ({savedPlans.length})
                </button>
              )}
            </div>
          </div>

          {/* ── GENERATING SPINNER ──────────────────────────────────────── */}
          {isGeneratingPlan ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '4px solid #3b82f6',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px auto',
                }}
              />
              <p style={{ color: 'var(--text-secondary)' }}>
                Ingesting GymSync Datasets &amp; Building Dynamic Overload Calendar...
              </p>
            </div>
          ) : aiPlan ? (
            <div className="ai-structured-plan">
              {/* ── MEDICAL SAFETY HARD FILTERS ─────────────────────────── */}
              {aiPlan.medical_warnings && aiPlan.medical_warnings.length > 0 && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <h3
                    style={{
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <ShieldAlert size={20} /> Medical Safety Hard-Filters Active
                  </h3>
                  <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    {aiPlan.medical_warnings.map((warn, i) => (
                      <li
                        key={i}
                        style={{
                          color: 'var(--text-secondary)',
                          marginBottom: '5px',
                          fontSize: '0.9rem',
                        }}
                      >
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── INTERACTIVE CALENDAR & SIDE-DRAWER ──────────────────── */}
              <h3
                style={{
                  marginBottom: '15px',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📅 Interactive Workout Schedule Dashboard
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Workouts unlock on their scheduled dates. Complete required exercises sequentially to
                unlock daily achievements.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px',
                }}
              >
                {/* CALENDAR GRID VIEW */}
                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          paddingBottom: '5px',
                        }}
                      >
                        {d}
                      </div>
                    ))}

                    {(aiPlan.interactive_calendar || []).map((dayItem) => {
                      const isSelected =
                        selectedCalendarDay?.dayNumber === dayItem.dayNumber;
                      const { status, scheduledDate } = getDayScheduleInfo(dayItem);

                      let bg = 'rgba(255, 255, 255, 0.04)';
                      let border = '1px solid transparent';
                      let textColor = 'var(--text-secondary)';

                      if (status === 'COMPLETED') {
                        bg = 'rgba(16, 185, 129, 0.25)';
                        border = '1px solid #10b981';
                        textColor = '#10b981';
                      } else if (status === 'AVAILABLE') {
                        bg = 'rgba(59, 130, 246, 0.25)';
                        border = '1px solid #3b82f6';
                        textColor = '#60a5fa';
                      } else if (status === 'MISSED') {
                        bg = 'rgba(239, 68, 68, 0.2)';
                        border = '1px solid #ef4444';
                        textColor = '#ef4444';
                      } else if (status === 'REST') {
                        bg = 'rgba(255, 255, 255, 0.05)';
                        border = '1px dashed rgba(255,255,255,0.15)';
                        textColor = 'var(--text-secondary)';
                      }

                      if (isSelected) {
                        border = '2px solid white';
                      }

                      return (
                        <div
                          key={dayItem.dayNumber}
                          onClick={() => setSelectedCalendarDay(dayItem)}
                          title={`Day ${dayItem.dayNumber} - ${status} (${scheduledDate.toLocaleDateString()})`}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: bg,
                            border: border,
                            position: 'relative',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 'bold',
                              fontSize: '0.95rem',
                              display: 'block',
                              color: isSelected ? 'white' : textColor,
                            }}
                          >
                            {dayItem.dayNumber}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              marginTop: '2px',
                              color: isSelected ? 'white' : 'var(--text-secondary)',
                            }}
                          >
                            {status === 'LOCKED' ? (
                              <Lock size={9} />
                            ) : status === 'COMPLETED' ? (
                              <CheckCircle size={9} color="#10b981" />
                            ) : (
                              `Wk ${dayItem.weekNumber}`
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '15px',
                      fontSize: '0.75rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#10b981',
                        }}
                      />
                      Completed
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                        }}
                      />
                      Available Today
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#ef4444',
                        }}
                      />
                      Missed
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.3)',
                        }}
                      />
                      Rest
                    </span>
                  </div>
                </div>

                {/* SIDE-DRAWER / DETAIL PANEL */}
                {selectedCalendarDay &&
                  (() => {
                    const { status, scheduledDate } = getDayScheduleInfo(selectedCalendarDay);

                    return (
                      <div
                        style={{
                          background: 'var(--panel-bg)',
                          padding: '20px',
                          borderRadius: '16px',
                          border: '1px solid #3b82f6',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            borderBottom: '1px solid var(--card-border)',
                            paddingBottom: '12px',
                            marginBottom: '15px',
                          }}
                        >
                          <div>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                              Day {selectedCalendarDay.dayNumber} Details
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#3b82f6' }}>
                              {selectedCalendarDay.phaseName || 'Routine'} •{' '}
                              {scheduledDate.toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className="category-badge"
                            style={{
                              background:
                                status === 'COMPLETED'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : status === 'AVAILABLE'
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : status === 'MISSED'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'var(--card-border)',
                              color:
                                status === 'COMPLETED'
                                  ? '#10b981'
                                  : status === 'AVAILABLE'
                                  ? '#60a5fa'
                                  : status === 'MISSED'
                                  ? '#ef4444'
                                  : 'var(--text-secondary)',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                            }}
                          >
                            {status === 'COMPLETED'
                              ? '✅ Completed'
                              : status === 'AVAILABLE'
                              ? '▶️ Available Today'
                              : status === 'MISSED'
                              ? '🔴 Missed'
                              : status === 'REST'
                              ? '😴 Rest & Recovery'
                              : '🔒 Locked'}
                          </span>
                        </div>

                        {/* 1. TODAY'S GOAL / ADAPTATION OBJECTIVE */}
                        <div
                          style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            marginBottom: '14px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              color: '#60a5fa',
                              fontWeight: 600,
                            }}
                          >
                            🎯 Today's Adaptation Goal
                          </div>
                          <div
                            style={{
                              fontSize: '0.95rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              marginTop: '2px',
                            }}
                          >
                            {selectedCalendarDay.sessionObjective ||
                              selectedCalendarDay.focusArea}
                          </div>
                        </div>

                        {/* 1B. COACH RATIONALE & EVENT AWARENESS */}
                        {selectedCalendarDay.rationale && (
                          <div
                            style={{
                              background: 'rgba(99, 102, 241, 0.08)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              marginBottom: '14px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: '#818cf8',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              🧠 Coach Rationale &amp; Life Context
                            </div>
                            {selectedCalendarDay.rationale.constraints?.length > 0 && (
                              <div
                                style={{
                                  fontSize: '0.76rem',
                                  color: 'var(--text-secondary)',
                                  marginTop: '4px',
                                }}
                              >
                                <strong style={{ color: '#cbd5e1' }}>Context:</strong>{' '}
                                {selectedCalendarDay.rationale.constraints.join(' • ')}
                              </div>
                            )}
                            {selectedCalendarDay.rationale.rejectedExercises?.length > 0 && (
                              <div
                                style={{
                                  fontSize: '0.74rem',
                                  color: '#f87171',
                                  marginTop: '4px',
                                }}
                              >
                                <strong>Fatigue Protected:</strong>{' '}
                                {selectedCalendarDay.rationale.rejectedExercises
                                  .map((r) => `${r.name} (${r.reason})`)
                                  .join('; ')}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. REASONED WARM-UP SECTION */}
                        {selectedCalendarDay.warmup?.warmupExercises?.length > 0 && (
                          <div
                            style={{
                              background: 'rgba(245, 158, 11, 0.08)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              marginBottom: '16px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px',
                              }}
                            >
                              <span
                                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}
                              >
                                🔥 Reasoned Warm-Up (
                                {selectedCalendarDay.warmup.totalEstimatedMinutes || 5} Mins)
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {selectedCalendarDay.warmup.warmupExercises.map((w, wi) => (
                                <div
                                  key={wi}
                                  style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                                >
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    {w.phase}:
                                  </strong>{' '}
                                  {w.name} ({w.repsOrDuration || w.duration})
                                  <div
                                    style={{
                                      fontSize: '0.7rem',
                                      color: '#94a3b8',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    {w.purpose}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. MAIN WORKOUT SPLIT FOR SELECTED DAY */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                          }}
                        >
                          <h4 style={{ fontSize: '0.95rem', color: '#3b82f6', margin: 0 }}>
                            🏋️ Main Resistance Work
                          </h4>
                          {selectedCalendarDay.timeBudget?.totalEstimatedMinutes && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              ⏱️ Est. {selectedCalendarDay.timeBudget.totalEstimatedMinutes} Mins
                              Total
                            </span>
                          )}
                        </div>

                        {status === 'LOCKED' ? (
                          <div
                            style={{
                              textAlign: 'center',
                              padding: '30px 20px',
                              background: 'rgba(0,0,0,0.3)',
                              borderRadius: '12px',
                              border: '1px dashed var(--card-border)',
                              marginBottom: '20px',
                            }}
                          >
                            <Lock
                              size={32}
                              color="var(--text-secondary)"
                              style={{ marginBottom: '8px' }}
                            />
                            <h4
                              style={{
                                color: 'var(--text-primary)',
                                marginBottom: '6px',
                                fontSize: '1rem',
                              }}
                            >
                              Workout Locked
                            </h4>
                            <p
                              style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem',
                                margin: 0,
                              }}
                            >
                              This workout split unlocks on{' '}
                              <strong>{scheduledDate.toLocaleDateString()}</strong>.
                            </p>
                          </div>
                        ) : typeof selectedCalendarDay.workoutSplit === 'string' ? (
                          <p
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem',
                              background: 'var(--card-bg)',
                              padding: '12px',
                              borderRadius: '8px',
                              marginBottom: '20px',
                            }}
                          >
                            {selectedCalendarDay.workoutSplit}
                          </p>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              marginBottom: '20px',
                              maxHeight: '300px',
                              overflowY: 'auto',
                            }}
                          >
                            {selectedCalendarDay.workoutSplit.map((ex, idx) => {
                              const targetEx = {
                                ...ex,
                                category: ex.category || 'AI Custom',
                                instructions:
                                  ex.instructions || 'Follow AI targets',
                                points: ex.points || 1,
                              };
                              const isExDone = isExerciseCompletedInState(
                                selectedCalendarDay.dayNumber,
                                idx
                              );
                              const isUnlocked = isExerciseUnlockedInState(
                                selectedCalendarDay.dayNumber,
                                idx
                              );

                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    const { toast } = require('react-toastify');
                                    if (status === 'LOCKED') {
                                      toast.info(
                                        `Workout Day ${selectedCalendarDay.dayNumber} is locked until ${scheduledDate.toLocaleDateString()}`
                                      );
                                      return;
                                    }
                                    if (status === 'REST') {
                                      toast.info(
                                        `Day ${selectedCalendarDay.dayNumber} is a scheduled Rest & Recovery Day.`
                                      );
                                      return;
                                    }
                                    if (status === 'MISSED') {
                                      toast.error(
                                        `Workout Day ${selectedCalendarDay.dayNumber} was missed and cannot be started.`
                                      );
                                      return;
                                    }
                                    if (!isUnlocked && status !== 'COMPLETED') {
                                      toast.warning(
                                        `Please complete previous exercises in order first!`
                                      );
                                      return;
                                    }
                                    startExercise({ ...targetEx, ...ex, aiWorkoutIndex: idx });
                                  }}
                                  className="ai-exercise-card"
                                  style={{
                                    background: isExDone
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : !isUnlocked && status !== 'COMPLETED'
                                      ? 'rgba(0,0,0,0.3)'
                                      : 'var(--card-bg)',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: isExDone
                                      ? '1px solid #10b981'
                                      : isUnlocked
                                      ? '1px solid #3b82f6'
                                      : '1px solid var(--card-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    cursor:
                                      status !== 'MISSED' &&
                                      status !== 'REST' &&
                                      (isUnlocked || status === 'COMPLETED')
                                        ? 'pointer'
                                        : 'not-allowed',
                                    opacity:
                                      status === 'MISSED' ||
                                      status === 'REST' ||
                                      (!isUnlocked && status !== 'COMPLETED')
                                        ? 0.6
                                        : 1,
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          border: '2px solid',
                                          borderColor: isExDone
                                            ? '#10b981'
                                            : isUnlocked
                                            ? '#3b82f6'
                                            : 'var(--text-secondary)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        {isExDone ? (
                                          <CheckCircle size={16} color="#10b981" />
                                        ) : !isUnlocked && status !== 'COMPLETED' ? (
                                          <Lock size={12} color="var(--text-secondary)" />
                                        ) : (
                                          <span
                                            style={{ fontSize: '0.75rem', color: '#3b82f6' }}
                                          >
                                            {idx + 1}
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <h5
                                          style={{
                                            fontSize: '0.92rem',
                                            margin: 0,
                                            color: isExDone
                                              ? '#10b981'
                                              : 'var(--text-primary)',
                                            textDecoration: isExDone
                                              ? 'line-through'
                                              : 'none',
                                          }}
                                        >
                                          {ex.name}
                                        </h5>
                                        <span
                                          style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                          }}
                                        >
                                          {ex.target} • {ex.equipment}
                                        </span>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <span
                                        style={{
                                          fontSize: '0.82rem',
                                          fontWeight: 'bold',
                                          color: isExDone
                                            ? '#10b981'
                                            : 'var(--primary-accent)',
                                          display: 'block',
                                        }}
                                      >
                                        {ex.sets} Sets × {ex.reps} Reps
                                      </span>
                                      <span
                                        style={{ fontSize: '0.7rem', color: '#f59e0b' }}
                                      >
                                        {ex.rpe}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Why Selected & Purpose */}
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      color: '#94a3b8',
                                      background: 'rgba(255,255,255,0.03)',
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    💡{' '}
                                    <strong style={{ color: '#38bdf8' }}>Why Selected:</strong>{' '}
                                    {ex.purpose ||
                                      ex.reasonForSelection ||
                                      'Compound movement aligned with session objective.'}
                                  </div>

                                  {/* Interactive Action Bar */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginTop: '2px',
                                      paddingTop: '6px',
                                      borderTop: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCoachAction('Why this exercise', ex);
                                        }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#38bdf8',
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          textDecoration: 'underline',
                                        }}
                                      >
                                        Why this?
                                      </button>
                                      <span
                                        style={{
                                          color: 'var(--text-secondary)',
                                          fontSize: '0.7rem',
                                        }}
                                      >
                                        •
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCoachAction('Replace this exercise', ex);
                                        }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#f59e0b',
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          textDecoration: 'underline',
                                        }}
                                      >
                                        Replace
                                      </button>
                                    </div>

                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                      }}
                                    >
                                      {(ex.isAiTrackable || ex.aiDetection?.enabled) && (
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            color: '#10b981',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                          }}
                                        >
                                          🎯 AI Vision
                                        </span>
                                      )}
                                      <button
                                        className="btn btn-outline btn-sm"
                                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                        disabled={
                                          status === 'MISSED' ||
                                          (!isUnlocked && status !== 'COMPLETED')
                                        }
                                      >
                                        {status === 'MISSED'
                                          ? 'Missed'
                                          : isExDone
                                          ? 'Completed'
                                          : 'Start'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 4. REASONED COOL-DOWN SECTION */}
                        {selectedCalendarDay.cooldown?.cooldownExercises?.length > 0 && (
                          <div
                            style={{
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              marginBottom: '16px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: '#10b981',
                                display: 'block',
                                marginBottom: '6px',
                              }}
                            >
                              🧘 Reasoned Cool-Down &amp; Recovery
                            </span>
                            <div
                              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                            >
                              {selectedCalendarDay.cooldown.cooldownExercises.map((c, ci) => (
                                <div
                                  key={ci}
                                  style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                                >
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    {c.name}:
                                  </strong>{' '}
                                  {c.duration}
                                  <div
                                    style={{
                                      fontSize: '0.7rem',
                                      color: '#94a3b8',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    {c.purpose}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 5. QUICK COACH RECALCULATE ACTIONS */}
                        <div
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--card-border)',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            marginBottom: '18px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              marginBottom: '8px',
                            }}
                          >
                            ⚡ Real-Time Coach Session Adjustments:
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                              { label: '🏋️ Dumbbells Only', prompt: 'I only have dumbbells today' },
                              { label: '⏱️ 20 Mins', prompt: 'I only have 20 minutes today' },
                              { label: '🩺 Knee Discomfort', prompt: 'My knee hurts today' },
                              { label: '🏏 Match Tomorrow', prompt: 'I have a match tomorrow' },
                              { label: '🎖️ Army Training', prompt: 'I have army training tomorrow' },
                              { label: '⚽ Football Tomorrow', prompt: 'I have football practice tomorrow' },
                              { label: '🏃 5K Race Tomorrow', prompt: '5K race tomorrow' },
                            ].map(({ label, prompt }) => (
                              <button
                                key={prompt}
                                type="button"
                                disabled={isRecalculating}
                                onClick={() => handleCoachAction(prompt)}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* DIET PLAN FOR SELECTED DAY */}
                        <h4
                          style={{
                            fontSize: '0.95rem',
                            color: '#10b981',
                            marginBottom: '10px',
                          }}
                        >
                          🥗 Natural Whole Food Diet
                        </h4>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            maxHeight: '180px',
                            overflowY: 'auto',
                          }}
                        >
                          {(aiPlan.daily_diet_plan || []).map((diet, dIdx) => (
                            <div
                              key={dIdx}
                              style={{
                                background: 'var(--card-bg)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                              }}
                            >
                              <strong style={{ color: 'var(--primary-accent)' }}>
                                {diet.meal}:{' '}
                              </strong>
                              <span style={{ color: 'var(--text-secondary)' }}>{diet.food}</span>
                            </div>
                          ))}
                        </div>

                        {/* WORKOUT CONTROLS */}
                        <div
                          style={{
                            marginTop: '20px',
                            borderTop: '1px solid var(--card-border)',
                            paddingTop: '15px',
                          }}
                        >
                          {status === 'COMPLETED' ? (
                            <div
                              style={{
                                textAlign: 'center',
                                padding: '12px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                borderRadius: '8px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              <CheckCircle size={24} style={{ marginBottom: '5px' }} />
                              <div style={{ fontWeight: 'bold' }}>Workout Completed</div>
                            </div>
                          ) : status === 'REST' ? (
                            <div
                              style={{
                                textAlign: 'center',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-secondary)',
                                borderRadius: '8px',
                                border: '1px solid var(--card-border)',
                              }}
                            >
                              <Moon size={22} style={{ marginBottom: '4px' }} />
                              <div style={{ fontWeight: 'bold' }}>
                                Scheduled Rest &amp; Recovery Day
                              </div>
                            </div>
                          ) : status === 'MISSED' ? (
                            <div
                              style={{
                                textAlign: 'center',
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              <AlertTriangle size={22} style={{ marginBottom: '4px' }} />
                              <div style={{ fontWeight: 'bold' }}>🔴 Workout Missed</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                Scheduled for {scheduledDate.toLocaleDateString()}
                              </div>
                            </div>
                          ) : status === 'LOCKED' ? (
                            <div
                              style={{
                                textAlign: 'center',
                                padding: '12px',
                                background: 'rgba(0,0,0,0.4)',
                                color: 'var(--text-secondary)',
                                borderRadius: '8px',
                                border: '1px solid var(--card-border)',
                              }}
                            >
                              <Lock size={20} style={{ marginBottom: '4px' }} />
                              <div>Workout Locked</div>
                              <div style={{ fontSize: '0.78rem' }}>
                                Unlocks on {scheduledDate.toLocaleDateString()}
                              </div>
                            </div>
                          ) : activeWorkoutDay === selectedCalendarDay.dayNumber ? (
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%', background: '#10b981' }}
                              onClick={completeActiveWorkout}
                            >
                              <CheckCircle size={18} /> Complete Today's Workout (+50 XP)
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%' }}
                              onClick={() => {
                                setActiveWorkoutDay(selectedCalendarDay.dayNumber);
                                const { toast } = require('react-toastify');
                                toast.info(
                                  `Started Day ${selectedCalendarDay.dayNumber} workout! Complete exercises in order.`
                                );
                              }}
                            >
                              ▶️ Start Today's Workout
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ── SAVED AI PLANS MODAL ─────────────────────────────────────────── */}
      {showSavedPlansModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowSavedPlansModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--panel-bg, #0f172a)',
              borderRadius: '16px',
              border: '1px solid var(--card-border, rgba(255, 255, 255, 0.1))',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={24} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>My Saved AI Workout Plans</h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowSavedPlansModal(false)}
              >
                ✕
              </button>
            </div>

            {isLoadingSavedPlans ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '3px solid #3b82f6',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px auto',
                  }}
                />
                <p style={{ color: 'var(--text-secondary)' }}>Loading your saved plans...</p>
              </div>
            ) : savedPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Bookmark
                  size={40}
                  color="var(--text-secondary)"
                  style={{ margin: '0 auto 12px auto', opacity: 0.5 }}
                />
                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  No saved plans found in your cloud account.
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Generate an AI workout and click "Save Plan" to store your favorite routines.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {savedPlans.map((plan) => {
                  const daysCount =
                    plan.calendar?.length ||
                    plan.workout?.interactive_calendar?.length ||
                    0;
                  return (
                    <div
                      key={plan._id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <h4
                          style={{
                            margin: '0 0 6px 0',
                            fontSize: '1.05rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {plan.title}
                        </h4>
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span
                            className="category-badge"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          >
                            {plan.goal || 'Fitness'}
                          </span>
                          <span>• Level: {plan.fitnessLevel || 'All'}</span>
                          {daysCount > 0 && <span>• {daysCount} Days Schedule</span>}
                          <span>
                            • Saved: {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleActivateSavedPlan(plan)}
                        >
                          Load Plan
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={(e) => handleDeleteSavedPlan(plan._id, e)}
                          style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                          title="Delete this saved plan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITrainerAIMode;
