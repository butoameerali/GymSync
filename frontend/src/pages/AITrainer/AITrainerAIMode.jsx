import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Sparkles,
  Dumbbell,
  Award,
  ArrowRight,
  ArrowLeft,
  Plus,
  RotateCcw,
  Check,
  Flame,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { MissedSessionCard } from './MissedSessionCard';
import { MissionRunner } from './MissionRunner';
import { SwapMealItemModal } from './SwapMealItemModal';
import { AchievementCard } from './AchievementCard';
import { NextGoalPrompt } from './NextGoalPrompt';
import PlanVsRealityCard from './PlanVsRealityCard';
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
  completeDayManually,
  undoDayCompletion,
  toggleExerciseCompletion,
  handleCoachAction,
  handleSaveCurrentPlan,
  loadSavedPlans,
  handleActivateSavedPlan,
  handleDeleteSavedPlan,
  handleCreateNewPlan,
  handleCreateStarterPlan,
  handleLogProgramSession,
  selectedPlanForView,
  setSelectedPlanForView,
  onBuildAIPlan,
  onBrowsePrograms
}) => {
  const navigate = useNavigate();
  const [showMissionRunner, setShowMissionRunner] = useState(false);
  const [swapModalInfo, setSwapModalInfo] = useState(null);
  const [completedGoalGroup, setCompletedGoalGroup] = useState(null); // Part 19
  const [showNextGoalPrompt, setShowNextGoalPrompt] = useState(false); // Part 20
  const [activeCoachTick, setActiveCoachTick] = useState(null);
  const [activeWeek, setActiveWeek] = useState(1);

  useEffect(() => {
    if (aiPlan?.interactive_calendar?.length) {
      const currentDay = aiPlan.interactive_calendar.find(d => getDayScheduleInfo(d).isToday) ||
        aiPlan.interactive_calendar.find(d => d.isWorkoutDay && !(workoutProgress?.completedDays || []).includes(d.dayNumber));
      if (currentDay) {
        const w = currentDay.weekNumber || Math.ceil(currentDay.dayNumber / 7);
        if (w) setActiveWeek(w);
      }
    }
  }, [aiPlan, workoutProgress?.completedDays]);

  const triggerOpenCoach = (sourceId, command = null) => {
    setActiveCoachTick(sourceId);
    setTimeout(() => {
      setActiveCoachTick(prev => (prev === sourceId ? null : prev));
    }, 1800);

    const detail = {
      userName: 'ai',
      initialMessage: command || '',
      command: command || ''
    };
    window.dispatchEvent(new CustomEvent('open_chat', { detail }));
    window.dispatchEvent(new CustomEvent('gymsync_open_coach', { detail }));
    if (command) {
      window.dispatchEvent(new CustomEvent('gymsync_open_coach_command', { detail }));
    }
  };

  const rawWorkoutPlans = (savedPlans || []).filter(p => p.planKind !== 'Diet');
  const seenPlanKeys = new Set();
  const savedWorkoutPlans = rawWorkoutPlans.filter(p => {
    const key = `${(p.title || '').trim().toLowerCase()}___${(p.goal || '').trim().toLowerCase()}`;
    if (seenPlanKeys.has(key)) return false;
    seenPlanKeys.add(key);
    return true;
  });
  const displayPlans = savedWorkoutPlans.length > 0 
    ? savedWorkoutPlans 
    : (aiPlan ? [{ ...aiPlan, title: aiPlan.title || 'My AI Workout Plan', _id: aiPlan.planId || 'active_plan' }] : []);

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
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                    onClick={() => setShowMissionRunner(true)}
                  >
                    <Play size={14} style={{ marginRight: '4px' }} /> Start Mission
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
                        {(() => {
                          const completedSession = (activeUserProgram.progress?.completedSessions || []).find(
                            s => s.weekNumber === (activeUserProgram.progress?.currentWeek || 1) && s.dayNumber === (activeUserProgram.progress?.currentDay || 1)
                          );
                          const loggedEx = completedSession?.exerciseLogs?.find(
                            l => (l.exerciseId && (l.exerciseId === ex.exerciseId?._id || l.exerciseId === ex.exerciseId)) ||
                                 (l.exerciseName && l.exerciseName === (ex.exerciseId?.name || ex.name))
                          );
                          const burned = Number(ex.caloriesBurned) > 0 ? Number(ex.caloriesBurned) : (Number(loggedEx?.caloriesBurned) > 0 ? Number(loggedEx?.caloriesBurned) : null);
                          return (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {ex.sets} sets × {ex.reps} reps {ex.rpe ? `• RPE ${ex.rpe}` : ''} • {burned ? `~${Math.round(burned)} kcal estimated` : 'Calorie estimate unavailable'}
                            </div>
                          );
                        })()}
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
      ) : isGeneratingPlan ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '4px solid #3b82f6',
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px auto',
            }}
          />
          <h3 style={{ color: '#ffffff', marginBottom: '8px' }}>Designing Your AI Workout Plan...</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Building progressive overload schedule &amp; matching exercises...
          </p>
        </div>
      ) : !selectedPlanForView ? (
        /* ── SCREEN 1: MY AI WORKOUT PLANS HUB (Buttons & Options) ── */
        <div className="ai-plans-hub" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Header Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '18px',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa'
                }}
              >
                <Bot size={32} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#ffffff', fontWeight: 800 }}>
                  My AI Workout Plans Hub
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                  Select a plan below to begin your training session, or build a new custom plan with AI Coach.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderColor: activeCoachTick === 'header' ? '#10b981' : '#3b82f6',
                  color: activeCoachTick === 'header' ? '#10b981' : '#60a5fa',
                  background: activeCoachTick === 'header' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onClick={() => triggerOpenCoach('header')}
              >
                {activeCoachTick === 'header' ? (
                  <>
                    <CheckCircle size={16} color="#10b981" />
                    <span>✓ Opened</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Open AI Coach</span>
                  </>
                )}
              </button>
              {handleCreateNewPlan && (
                <button
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  }}
                  onClick={handleCreateNewPlan}
                >
                  <Plus size={16} /> New Plan
                </button>
              )}
            </div>
          </div>

          {/* ── SECTION 1: YOUR WORKOUT PLANS (Buttons & Cards) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dumbbell size={20} color="#3b82f6" /> Your Workout Plans ({savedWorkoutPlans.length})
              </h3>
            </div>

            {savedWorkoutPlans.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '18px'
                }}
              >
                {savedWorkoutPlans.map((plan) => {
                  const planTitle = plan.title || 'Workout Plan';
                  const slug = planTitle.toLowerCase().replace(/lost/g, 'loss').replace(/[^a-z0-9]/g, '');
                  const duration = plan.calendar?.length || plan.workout?.interactive_calendar?.length || 28;
                  const isWeightLoss = planTitle.toLowerCase().includes('weight') || planTitle.toLowerCase().includes('fat') || planTitle.toLowerCase().includes('loss');
                  const isBodyDev = planTitle.toLowerCase().includes('body') || planTitle.toLowerCase().includes('muscle') || planTitle.toLowerCase().includes('hypertrophy') || planTitle.toLowerCase().includes('development');

                  return (
                    <div
                      key={plan._id || planTitle}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '16px',
                        padding: '22px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '16px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                      }}
                    >
                      <div>
                        {/* Top Badge & Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: isWeightLoss ? 'rgba(239, 68, 68, 0.15)' : isBodyDev ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: isWeightLoss ? '#f87171' : isBodyDev ? '#34d399' : '#60a5fa',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                          >
                            {isWeightLoss ? '🔥 Weight Loss' : isBodyDev ? '💪 Body Development' : '⚡ Strength & Fitness'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {duration} Days
                          </span>
                        </div>

                        {/* Title */}
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>
                          {planTitle}
                        </h4>

                        {/* Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          <div><strong>Goal:</strong> {plan.goal || 'General Fitness'}</div>
                          <div><strong>Level:</strong> {plan.fitnessLevel || 'All Levels'}</div>
                          {plan.notes && (
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                              {plan.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Primary Button to Open & Start */}
                        <button
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
                          }}
                          onClick={() => {
                            handleActivateSavedPlan(plan);
                            setSelectedPlanForView(plan);
                          }}
                        >
                          <Play size={16} /> Open &amp; Start Routine
                        </button>

                        {/* Secondary Button Row */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-outline"
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.82rem',
                              color: activeCoachTick === `plan_${plan._id}` ? '#10b981' : '#60a5fa',
                              borderColor: activeCoachTick === `plan_${plan._id}` ? '#10b981' : 'rgba(59, 130, 246, 0.3)',
                              background: activeCoachTick === `plan_${plan._id}` ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => triggerOpenCoach(`plan_${plan._id}`, `/${slug} `)}
                            title={`Edit this plan with AI Coach using /${slug}`}
                          >
                            {activeCoachTick === `plan_${plan._id}` ? (
                              <>
                                <CheckCircle size={13} color="#10b981" />
                                <span>✓ Opened</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} />
                                <span>Edit (/{slug})</span>
                              </>
                            )}
                          </button>

                          <button
                            className="btn btn-outline"
                            style={{
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '0.82rem',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px'
                            }}
                            onClick={(e) => {
                              handleDeleteSavedPlan(plan._id, e);
                              setSelectedPlanForView(null);
                            }}
                            title="Delete this plan"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* No saved plans yet - render starter buttons */
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '28px',
                  textAlign: 'center'
                }}
              >
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#ffffff' }}>
                  No Active AI Workout Plans Yet
                </h4>
                <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Click one of the starter plan buttons below to immediately create and launch your personalized routine:
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '16px',
                    textAlign: 'left'
                  }}
                >
                  {/* Starter Button 1: Weight Loss */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.03) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '14px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>🔥</span>
                        <h4 style={{ margin: 0, color: '#f87171', fontSize: '1.15rem' }}>Weight Loss Plan</h4>
                      </div>
                      <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0 }}>
                        High-calorie burn, HIIT &amp; progressive metabolic conditioning split for rapid fat loss.
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.88rem'
                      }}
                      onClick={() => handleCreateStarterPlan && handleCreateStarterPlan('weight_loss')}
                    >
                      + Start Weight Loss Plan
                    </button>
                  </div>

                  {/* Starter Button 2: Body Development */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.03) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '14px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>💪</span>
                        <h4 style={{ margin: 0, color: '#34d399', fontSize: '1.15rem' }}>Body Development Plan</h4>
                      </div>
                      <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Hypertrophy &amp; progressive muscle growth split (Chest, Back, Legs, Arms &amp; Shoulders).
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.88rem'
                      }}
                      onClick={() => handleCreateStarterPlan && handleCreateStarterPlan('body_dev')}
                    >
                      + Start Body Development Plan
                    </button>
                  </div>

                  {/* Starter Button 3: Strength & Power */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.03) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '14px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>⚡</span>
                        <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '1.15rem' }}>Strength &amp; Muscle Plan</h4>
                      </div>
                      <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Compound lift strength periodization with progressive overload benchmarks.
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.88rem'
                      }}
                      onClick={() => handleCreateStarterPlan && handleCreateStarterPlan('strength')}
                    >
                      + Start Strength Plan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 2: CHOOSE HOW YOU WANT TO TRAIN (Options A & B) ── */}
          {savedWorkoutPlans.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                Choose How You Want to Train
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '20px'
                }}
              >
                {/* Option A: AI Assistance */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '18px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '18px'
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                        marginBottom: '14px'
                      }}
                    >
                      <Sparkles size={28} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Option A • AI Assistance
                    </span>
                    <h3 style={{ fontSize: '1.3rem', color: '#ffffff', margin: '6px 0 10px 0' }}>
                      Build &amp; Adjust with AI Coach
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      Chat directly with your AI coach. Ask to design a plan for any goal (Weight Loss, Muscle Building, Athletic conditioning), or link existing plans with slash commands like <code>/weightloss</code> to swap exercises or increase sets.
                    </p>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{
                      background: activeCoachTick === 'option_a'
                        ? 'linear-gradient(135deg, #059669, #047857)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      padding: '14px',
                      fontWeight: 700,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => triggerOpenCoach('option_a')}
                  >
                    {activeCoachTick === 'option_a' ? (
                      <>
                        <CheckCircle size={18} color="#ffffff" />
                        <span>✓ AI Coach Opened</span>
                      </>
                    ) : (
                      <>
                        <Bot size={18} />
                        <span>Chat with AI Coach</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Option B: Fitness Trainer Programs */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '18px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '18px'
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6',
                        marginBottom: '14px'
                      }}
                    >
                      <Dumbbell size={28} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Option B • Trainer Uploaded
                    </span>
                    <h3 style={{ fontSize: '1.3rem', color: '#ffffff', margin: '6px 0 10px 0' }}>
                      Fitness Trainer Programs
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      Browse proven programs created by certified fitness trainers. Choose from 1-month, 6-month, or 1-year training tracks with direct connected diet plans.
                    </p>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      padding: '14px',
                      fontWeight: 700,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => {
                      if (onBrowsePrograms) onBrowsePrograms();
                    }}
                  >
                    <Dumbbell size={18} /> Explore Trainer Programs
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── SCREEN 2: ACTIVE PLAN ROUTINE & CALENDAR VIEW ── */
        <div className="ai-structured-plan">
          {/* Top Bar with Back Button, Plan Switcher & Quick Actions */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--card-border, rgba(255, 255, 255, 0.1))',
              borderRadius: '16px',
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            {/* Left: Back to Hub Button & Sibling Plan Switchers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  background: 'rgba(255, 255, 255, 0.08)'
                }}
                onClick={() => setSelectedPlanForView(null)}
              >
                <ArrowLeft size={16} /> ← Back to All Plans
              </button>

              {/* Sibling Plan Buttons if user has multiple plans */}
              {savedWorkoutPlans.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Switch:
                  </span>
                  {savedWorkoutPlans.map(p => {
                    const isCurrent = (selectedPlanForView?._id === p._id || selectedPlanForView?.title === p.title);
                    return (
                      <button
                        key={p._id || p.title}
                        onClick={() => {
                          handleActivateSavedPlan(p);
                          setSelectedPlanForView(p);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: isCurrent ? 700 : 500,
                          background: isCurrent ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255, 255, 255, 0.06)',
                          color: isCurrent ? '#ffffff' : 'var(--text-secondary)',
                          border: isCurrent ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer'
                        }}
                      >
                        {p.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Quick Actions (Edit with AI & Delete) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-sm"
                style={{
                  background: activeCoachTick === 'detail_edit' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: activeCoachTick === 'detail_edit' ? '#10b981' : '#60a5fa',
                  border: activeCoachTick === 'detail_edit' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(59, 130, 246, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  const planTitle = selectedPlanForView?.title || aiPlan?.title || 'Workout Plan';
                  const slug = planTitle.toLowerCase().replace(/lost/g, 'loss').replace(/[^a-z0-9]/g, '');
                  triggerOpenCoach('detail_edit', `/${slug} `);
                }}
                title="Edit with AI Coach"
              >
                {activeCoachTick === 'detail_edit' ? (
                  <>
                    <CheckCircle size={14} color="#10b981" />
                    <span>✓ Opened</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Edit with AI</span>
                  </>
                )}
              </button>

              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={(e) => {
                  const planId = selectedPlanForView?._id || aiPlan?.planId || aiPlan?._id;
                  handleDeleteSavedPlan(planId, e);
                  setSelectedPlanForView(null);
                }}
                title="Delete this plan"
              >
                <Trash2 size={14} /> Delete Plan
              </button>
            </div>
          </div>

          {/* Plan Header Info */}
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
                <h2>{selectedPlanForView?.title || aiPlan?.title || 'Dynamic AI Calendar & Workout Engine'}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Target Goal: {selectedPlanForView?.goal || aiPlan?.primary_goal || 'Fitness'} • Level: {selectedPlanForView?.fitnessLevel || aiPlan?.experience_level || 'All'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                Plan Active: {aiPlan?.planDuration || `${aiPlan?.interactive_calendar?.length || 28} Days`}
              </span>
              {!isGuest && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleSaveCurrentPlan}
                  disabled={isSavingPlan}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Bookmark size={14} /> {isSavingPlan ? 'Saving...' : 'Save Plan'}
                </button>
              )}
            </div>
          </div>
              {aiPlan.missedSessions && aiPlan.missedSessions.some(m => !m.handled) && (
                <MissedSessionCard 
                  planId={aiPlan._id} 
                  missedSession={aiPlan.missedSessions.find(m => !m.handled)} 
                  onResolved={() => {
                    // Trigger a re-fetch of saved plans to clear the modal
                    window.dispatchEvent(new Event('gymsync_bio_updated'));
                    // Wait 500ms and reload the page as fallback
                    setTimeout(() => window.location.reload(), 500);
                  }} 
                />
              )}
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

              {/* ── TODAY'S WORKOUT STATION HERO ───────────────────────── */}
              {(() => {
                const calendarDays = aiPlan.interactive_calendar || [];
                const todayWorkoutDay = calendarDays.find(d => getDayScheduleInfo(d).isToday) ||
                  calendarDays.find(d => d.isWorkoutDay && !(workoutProgress?.completedDays || []).includes(d.dayNumber)) ||
                  selectedCalendarDay ||
                  calendarDays[0];

                if (!todayWorkoutDay) return null;

                const todayInfo = getDayScheduleInfo(todayWorkoutDay);
                const todayExercises = Array.isArray(todayWorkoutDay.workoutSplit)
                  ? todayWorkoutDay.workoutSplit
                  : (todayWorkoutDay.exercises || todayWorkoutDay.mainWorkout || []);
                const isTodayCompleted = todayInfo.status === 'COMPLETED' || (workoutProgress?.completedDays || []).includes(todayWorkoutDay.dayNumber);
                const isTodayRest = !todayWorkoutDay.isWorkoutDay || todayInfo.status === 'REST';

                return (
                  <div
                    className="today-workout-station glass-panel"
                    style={{
                      padding: '22px 26px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(37, 99, 235, 0.08) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.45)',
                      marginBottom: '24px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1.35rem' }}>🎯</span>
                          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                            Today's Workout Station
                          </h2>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            background: isTodayCompleted ? 'rgba(16, 185, 129, 0.2)' : isTodayRest ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.25)',
                            color: isTodayCompleted ? '#10b981' : isTodayRest ? '#cbd5e1' : '#60a5fa',
                            border: `1px solid ${isTodayCompleted ? '#10b981' : isTodayRest ? 'rgba(255,255,255,0.2)' : '#3b82f6'}`
                          }}>
                            {isTodayCompleted ? '✓ Completed' : isTodayRest ? 'Rest & Recovery' : `Day ${todayWorkoutDay.dayNumber} Ready`}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          {todayWorkoutDay.phaseName || todayWorkoutDay.focus || 'Target Resistance Session'} • {todayExercises.length} {todayExercises.length === 1 ? 'Exercise' : 'Exercises'} • ~{todayWorkoutDay.timeBudget?.totalEstimatedMinutes || 45} Mins
                        </p>
                      </div>

                      {/* Primary Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {!isTodayRest && isTodayCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => undoDayCompletion && undoDayCompletion(todayWorkoutDay.dayNumber)}
                              style={{
                                padding: '10px 18px',
                                borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid #ef4444',
                                color: '#f87171',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              🔄 Reset / Undo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCalendarDay(todayWorkoutDay);
                                setShowMissionRunner(true);
                              }}
                              style={{
                                padding: '10px 22px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)'
                              }}
                            >
                              <Play size={16} fill="#ffffff" />
                              Replay Workout
                            </button>
                          </>
                        )}

                        {!isTodayRest && !isTodayCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => completeDayManually && completeDayManually(todayWorkoutDay.dayNumber)}
                              style={{
                                padding: '10px 18px',
                                borderRadius: '12px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid #10b981',
                                color: '#10b981',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              ✓ Mark Done
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCalendarDay(todayWorkoutDay);
                                setShowMissionRunner(true);
                              }}
                              style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '1rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                boxShadow: '0 4px 18px rgba(59, 130, 246, 0.4)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Play size={18} fill="#ffffff" />
                              Start Today's Workout
                            </button>
                          </>
                        )}

                        {isTodayRest && (
                          <button
                            type="button"
                            onClick={() => triggerOpenCoach('active_recovery', 'Suggest a light mobility & stretching routine for my rest day')}
                            style={{
                              padding: '10px 18px',
                              borderRadius: '10px',
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#f8fafc',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            ⚡ Light Recovery Session
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Today's Exercises Preview Pills */}
                    {!isTodayRest && todayExercises.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                        {todayExercises.map((ex, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.78rem',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <strong>{i + 1}.</strong> {ex.name || ex} {ex.sets ? `(${ex.sets}×${ex.reps})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── 1. FULL-WIDTH INTERACTIVE WORKOUT SCHEDULE BAR ──────── */}
              <div
                className="glass-panel"
                style={{
                  width: '100%',
                  padding: '22px 24px',
                  borderRadius: '16px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  marginBottom: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
              >
                {(() => {
                  const calendarDays = aiPlan.interactive_calendar || [];
                  const totalWeeks = Math.max(1, Math.ceil(calendarDays.length / 7));
                  const weekDays = calendarDays.filter(d => {
                    const w = d.weekNumber || Math.ceil(d.dayNumber / 7);
                    return w === activeWeek;
                  });
                  const daysToRender = weekDays.length > 0 ? weekDays : calendarDays.slice(0, 7);

                  const todayItem = calendarDays.find(d => getDayScheduleInfo(d).isToday);
                  const todayWeekNum = todayItem ? (todayItem.weekNumber || Math.ceil(todayItem.dayNumber / 7)) : 1;

                  return (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '18px',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: '1.2rem',
                              fontWeight: 800,
                              color: '#f8fafc',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Calendar size={20} color="#3b82f6" /> Interactive Workout Schedule
                          </h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                            Select any day below to inspect scheduled exercises, live dates, and set targets.
                          </p>
                        </div>

                        {/* Week Navigator & Jump to Today */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={activeWeek <= 1}
                            onClick={() => setActiveWeek(prev => Math.max(1, prev - 1))}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              background: activeWeek <= 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: activeWeek <= 1 ? '#64748b' : '#f8fafc',
                              cursor: activeWeek <= 1 ? 'not-allowed' : 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            ← Prev Week
                          </button>

                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#3b82f6', padding: '0 4px' }}>
                            Week {activeWeek} of {totalWeeks}
                          </span>

                          <button
                            type="button"
                            disabled={activeWeek >= totalWeeks}
                            onClick={() => setActiveWeek(prev => Math.min(totalWeeks, prev + 1))}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              background: activeWeek >= totalWeeks ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: activeWeek >= totalWeeks ? '#64748b' : '#f8fafc',
                              cursor: activeWeek >= totalWeeks ? 'not-allowed' : 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            Next Week →
                          </button>

                          {todayItem && (activeWeek !== todayWeekNum || selectedCalendarDay?.dayNumber !== todayItem.dayNumber) && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveWeek(todayWeekNum);
                                setSelectedCalendarDay(todayItem);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(59, 130, 246, 0.2)',
                                border: '1px solid #3b82f6',
                                color: '#60a5fa',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ⚡ Jump to Today
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 7-Day Responsive Strip */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                          gap: '10px',
                          marginBottom: '16px',
                        }}
                      >
                        {daysToRender.map((dayItem) => {
                          const isSelected = selectedCalendarDay?.dayNumber === dayItem.dayNumber;
                          const { status, scheduledDate, isToday, isTomorrow, isCompleted } = getDayScheduleInfo(dayItem);
                          const dayName = scheduledDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                          const dateStr = scheduledDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                          let bg = 'rgba(255, 255, 255, 0.03)';
                          let border = '1px solid rgba(255, 255, 255, 0.08)';
                          let badgeBg = 'rgba(255, 255, 255, 0.08)';
                          let badgeColor = 'var(--text-secondary)';
                          let badgeText = `Day ${dayItem.dayNumber}`;

                          if (isCompleted) {
                            bg = 'rgba(16, 185, 129, 0.12)';
                            border = '1px solid #10b981';
                            badgeBg = 'rgba(16, 185, 129, 0.25)';
                            badgeColor = '#10b981';
                            badgeText = '✓ Done';
                          } else if (isToday) {
                            bg = 'rgba(59, 130, 246, 0.16)';
                            border = '1px solid #3b82f6';
                            badgeBg = 'rgba(59, 130, 246, 0.3)';
                            badgeColor = '#60a5fa';
                            badgeText = '🚀 Today';
                          } else if (isTomorrow) {
                            bg = 'rgba(99, 102, 241, 0.12)';
                            border = '1px solid rgba(99, 102, 241, 0.35)';
                            badgeBg = 'rgba(99, 102, 241, 0.25)';
                            badgeColor = '#a5b4fc';
                            badgeText = '🌅 Tomorrow';
                          } else if (status === 'REST') {
                            bg = 'rgba(255, 255, 255, 0.02)';
                            border = '1px dashed rgba(255, 255, 255, 0.12)';
                            badgeBg = 'rgba(255, 255, 255, 0.05)';
                            badgeColor = 'var(--text-secondary)';
                            badgeText = '😴 Rest';
                          } else if (status === 'MISSED') {
                            bg = 'rgba(239, 68, 68, 0.12)';
                            border = '1px solid #ef4444';
                            badgeBg = 'rgba(239, 68, 68, 0.25)';
                            badgeColor = '#ef4444';
                            badgeText = '🔴 Missed';
                          }

                          if (isSelected) {
                            border = '2px solid #ffffff';
                            bg = isToday
                              ? 'rgba(59, 130, 246, 0.32)'
                              : isCompleted
                              ? 'rgba(16, 185, 129, 0.25)'
                              : 'rgba(255, 255, 255, 0.14)';
                          }

                          return (
                            <div
                              key={dayItem.dayNumber}
                              onClick={() => setSelectedCalendarDay(dayItem)}
                              style={{
                                padding: '12px 8px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                background: bg,
                                border: border,
                                position: 'relative',
                                transition: 'all 0.18s ease',
                                boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.35)' : 'none',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                  letterSpacing: '0.5px',
                                }}
                              >
                                {dayName} • {dateStr}
                              </div>
                              <div
                                style={{
                                  fontSize: '1.25rem',
                                  fontWeight: 800,
                                  margin: '6px 0 4px 0',
                                  color: isSelected
                                    ? '#ffffff'
                                    : isCompleted
                                    ? '#10b981'
                                    : isToday
                                    ? '#60a5fa'
                                    : 'var(--text-primary)',
                                }}
                              >
                                Day {dayItem.dayNumber}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  display: 'inline-block',
                                  background: badgeBg,
                                  color: badgeColor,
                                }}
                              >
                                {badgeText}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '14px',
                          fontSize: '0.74rem',
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                          Completed
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                          Today's Routine
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }} />
                          Tomorrow
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                          Rest &amp; Recovery
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                          Missed
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* ── 2. FULL-WIDTH SELECTED DAY AGENDA / WORKOUT INDEX ─────── */}
              {selectedCalendarDay &&
                (() => {
                  const { status, scheduledDate, isToday, isTomorrow, isCompleted } = getDayScheduleInfo(selectedCalendarDay);
                  const daySplit = Array.isArray(selectedCalendarDay.workoutSplit)
                    ? selectedCalendarDay.workoutSplit
                    : (selectedCalendarDay.exercises || selectedCalendarDay.mainWorkout || []);
                  const isRest = !selectedCalendarDay.isWorkoutDay || status === 'REST';

                  return (
                    <div
                      className="day-details-panel glass-panel"
                      style={{
                        width: '100%',
                        padding: '24px 28px',
                        borderRadius: '16px',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--card-border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        marginBottom: '32px',
                      }}
                    >
                      {/* Top Header Row with Day Number, Date, Status, and Primary Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          borderBottom: '1px solid var(--card-border)',
                          paddingBottom: '16px',
                          marginBottom: '18px',
                          flexWrap: 'wrap',
                          gap: '14px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.4rem' }}>{isCompleted ? '✅' : isRest ? '😴' : '🏋️'}</span>
                            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              Day {selectedCalendarDay.dayNumber}: {selectedCalendarDay.sessionObjective || selectedCalendarDay.focusArea || selectedCalendarDay.focus || selectedCalendarDay.phaseName || 'Target Training Routine'}
                            </h3>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                background: isCompleted
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : isToday
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : isTomorrow
                                  ? 'rgba(99, 102, 241, 0.2)'
                                  : isRest
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : status === 'MISSED'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(255, 255, 255, 0.05)',
                                color: isCompleted
                                  ? '#10b981'
                                  : isToday
                                  ? '#60a5fa'
                                  : isTomorrow
                                  ? '#a5b4fc'
                                  : isRest
                                  ? 'var(--text-secondary)'
                                  : status === 'MISSED'
                                  ? '#ef4444'
                                  : 'var(--text-secondary)',
                                border: `1px solid ${isCompleted ? '#10b981' : isToday ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                              }}
                            >
                              {isCompleted
                                ? '✅ Completed'
                                : isToday
                                ? '🚀 Available Today'
                                : isTomorrow
                                ? '🌅 Tomorrow'
                                : isRest
                                ? '😴 Rest & Recovery'
                                : status === 'MISSED'
                                ? '🔴 Missed'
                                : '🔒 Scheduled'}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#60a5fa', fontWeight: 600 }}>
                            {selectedCalendarDay.phaseName || `Week ${selectedCalendarDay.weekNumber || 1}`} • 📅{' '}
                            {scheduledDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {isToday ? ' (Today)' : isTomorrow ? ' (Tomorrow)' : ''}
                          </p>
                        </div>

                        {/* Top Quick Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {!isRest && isCompleted && (
                            <>
                              <button
                                type="button"
                                onClick={() => undoDayCompletion && undoDayCompletion(selectedCalendarDay.dayNumber)}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: '10px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid #ef4444',
                                  color: '#f87171',
                                  fontSize: '0.84rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                🔄 Reset / Undo Day
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveWorkoutDay(selectedCalendarDay.dayNumber);
                                  setShowMissionRunner(true);
                                }}
                                style={{
                                  padding: '8px 18px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontSize: '0.84rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                                }}
                              >
                                <Play size={15} fill="#ffffff" /> Replay Workout
                              </button>
                            </>
                          )}

                          {!isRest && !isCompleted && (
                            <>
                              <button
                                type="button"
                                onClick={() => completeDayManually && completeDayManually(selectedCalendarDay.dayNumber)}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: '10px',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  fontSize: '0.84rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                ✓ Mark Complete (Manual)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveWorkoutDay(selectedCalendarDay.dayNumber);
                                  setShowMissionRunner(true);
                                }}
                                style={{
                                  padding: '8px 20px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontSize: '0.88rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                                }}
                              >
                                <Play size={16} fill="#ffffff" /> Start Workout
                              </button>
                            </>
                          )}

                          {isRest && (
                            <button
                              type="button"
                              onClick={() => triggerOpenCoach('active_recovery', 'Suggest a light mobility & stretching routine for my rest day')}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#f8fafc',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              ⚡ Rest Day Mobility Routine
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1. ADAPTATION OBJECTIVE & COACH RATIONALE */}
                      <div
                        style={{
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#60a5fa',
                            fontWeight: 700,
                            marginBottom: '4px',
                          }}
                        >
                          🎯 Today's Adaptation Goal
                        </div>
                        <div
                          style={{
                            fontSize: '0.98rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {selectedCalendarDay.sessionObjective || selectedCalendarDay.focusArea || selectedCalendarDay.focus}
                        </div>
                      </div>

                      {selectedCalendarDay.appliedRecoveryNote && (
                        <div
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            marginBottom: '16px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              display: 'block',
                              color: '#ef4444',
                              marginBottom: '4px',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                            }}
                          >
                            <AlertCircle size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} /> Recovery Adjustment
                          </span>
                          {selectedCalendarDay.appliedRecoveryNote}
                        </div>
                      )}

                      {selectedCalendarDay.rationale && (
                        <div
                          style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            marginBottom: '16px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              color: '#818cf8',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '4px',
                            }}
                          >
                            🧠 Coach Rationale &amp; Life Context
                          </div>
                          {selectedCalendarDay.rationale.constraints?.length > 0 && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              <strong style={{ color: '#cbd5e1' }}>Context:</strong>{' '}
                              {selectedCalendarDay.rationale.constraints.join(' • ')}
                            </div>
                          )}
                          {selectedCalendarDay.rationale.rejectedExercises?.length > 0 && (
                            <div style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '4px' }}>
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
                            background: 'rgba(245, 158, 11, 0.06)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            marginBottom: '18px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '10px',
                            }}
                          >
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>
                              🔥 Reasoned Warm-Up ({selectedCalendarDay.warmup.totalEstimatedMinutes || 5} Mins)
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                            {selectedCalendarDay.warmup.warmupExercises.map((w, wi) => (
                              <div
                                key={wi}
                                style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.84rem',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                }}
                              >
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {wi + 1}. {w.name}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#f59e0b', margin: '2px 0' }}>
                                  {w.reps || w.duration}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {w.instructions || w.purpose}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. MAIN RESISTANCE WORK (THE EXERCISE INDEX) */}
                      {isRest ? (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '30px 20px',
                            background: 'rgba(255,255,255,0.02)',
                            color: 'var(--text-secondary)',
                            borderRadius: '12px',
                            border: '1px dashed rgba(255,255,255,0.12)',
                            marginBottom: '20px',
                          }}
                        >
                          <Moon size={36} color="#60a5fa" style={{ marginBottom: '8px' }} />
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Scheduled Rest &amp; Recovery Day
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.86rem' }}>
                            Active recovery, muscle protein synthesis, and nervous system replenishment.
                          </p>
                        </div>
                      ) : (
                        <div style={{ marginBottom: '22px' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '12px',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                color: '#38bdf8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              🏋️ Main Resistance Work ({daySplit.length} Movements)
                            </h4>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              ⏱️ Est. {selectedCalendarDay.timeBudget?.totalEstimatedMinutes || 45} Mins Total
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {daySplit.map((ex, idx) => {
                              const targetEx = {
                                ...ex,
                                category: ex.category || 'AI Custom',
                                instructions: ex.instructions || 'Follow AI targets',
                                points: ex.points || 1,
                              };
                              const isExDone = isExerciseCompletedInState(selectedCalendarDay.dayNumber, idx);

                              return (
                                <div
                                  key={idx}
                                  className="ai-exercise-card"
                                  style={{
                                    background: isExDone ? 'rgba(16, 185, 129, 0.1)' : 'var(--card-bg)',
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    border: isExDone ? '1px solid #10b981' : '1px solid var(--card-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div
                                        style={{
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '50%',
                                          border: '2px solid',
                                          borderColor: isExDone ? '#10b981' : '#3b82f6',
                                          background: isExDone ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {isExDone ? (
                                          <CheckCircle size={16} color="#10b981" />
                                        ) : (
                                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#60a5fa' }}>
                                            {idx + 1}
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <h5
                                          style={{
                                            fontSize: '0.98rem',
                                            margin: 0,
                                            fontWeight: 700,
                                            color: isExDone ? '#10b981' : 'var(--text-primary)',
                                            textDecoration: isExDone ? 'line-through' : 'none',
                                          }}
                                        >
                                          {ex.name}
                                        </h5>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                          {ex.target || 'General'} • {ex.equipment || 'Full Equipment'}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                      <span
                                        style={{
                                          fontSize: '0.9rem',
                                          fontWeight: 'bold',
                                          color: isExDone ? '#10b981' : 'var(--primary-accent)',
                                          display: 'block',
                                        }}
                                      >
                                        {ex.sets} Sets × {ex.reps} Reps
                                      </span>
                                      <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 600 }}>
                                        {ex.rpe || 'RPE 7-8'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Why Selected & Purpose */}
                                  <div
                                    style={{
                                      fontSize: '0.76rem',
                                      color: '#94a3b8',
                                      background: 'rgba(255,255,255,0.02)',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    💡 <strong style={{ color: '#38bdf8' }}>Why Selected:</strong>{' '}
                                    {ex.purpose || ex.reasonForSelection || 'Movement aligned with hypertrophy and volume target.'}
                                  </div>

                                  {/* Interactive Action Bar */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginTop: '4px',
                                      paddingTop: '8px',
                                      borderTop: '1px solid rgba(255,255,255,0.05)',
                                      flexWrap: 'wrap',
                                      gap: '8px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                          fontSize: '0.72rem',
                                          cursor: 'pointer',
                                          textDecoration: 'underline',
                                        }}
                                      >
                                        Why this?
                                      </button>
                                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>•</span>
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
                                          fontSize: '0.72rem',
                                          cursor: 'pointer',
                                          textDecoration: 'underline',
                                        }}
                                      >
                                        Replace
                                      </button>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {(ex.isAiTrackable || ex.aiDetection?.enabled) && (
                                        <span
                                          style={{
                                            fontSize: '0.7rem',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            color: '#10b981',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            fontWeight: 700,
                                          }}
                                        >
                                          🎯 AI Vision
                                        </span>
                                      )}

                                      {isExDone ? (
                                        <>
                                          <span
                                            style={{
                                              fontSize: '0.78rem',
                                              fontWeight: 700,
                                              color: '#10b981',
                                              background: 'rgba(16, 185, 129, 0.15)',
                                              padding: '4px 10px',
                                              borderRadius: '6px',
                                              border: '1px solid #10b981',
                                            }}
                                          >
                                            ✓ Completed
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => toggleExerciseCompletion && toggleExerciseCompletion(selectedCalendarDay.dayNumber, idx, ex.name)}
                                            style={{
                                              background: 'transparent',
                                              border: '1px solid rgba(239, 68, 68, 0.4)',
                                              color: '#f87171',
                                              fontSize: '0.72rem',
                                              padding: '4px 8px',
                                              borderRadius: '6px',
                                              cursor: 'pointer',
                                            }}
                                            title="Mark this exercise as incomplete"
                                          >
                                            🔄 Undo
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => startExercise({ ...targetEx, ...ex, aiWorkoutIndex: idx })}
                                            className="btn btn-outline btn-sm"
                                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                          >
                                            ▶️ Practice Form
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => toggleExerciseCompletion && toggleExerciseCompletion(selectedCalendarDay.dayNumber, idx, ex.name)}
                                            style={{
                                              background: 'rgba(16, 185, 129, 0.12)',
                                              border: '1px solid #10b981',
                                              color: '#10b981',
                                              fontSize: '0.74rem',
                                              fontWeight: 700,
                                              padding: '4px 10px',
                                              borderRadius: '6px',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            ✓ Mark Done
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => startExercise({ ...targetEx, ...ex, aiWorkoutIndex: idx })}
                                            className="btn btn-primary btn-sm"
                                            style={{ padding: '4px 12px', fontSize: '0.76rem', background: '#3b82f6', borderColor: '#3b82f6' }}
                                          >
                                            ▶️ Start
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. REASONED COOL-DOWN SECTION */}
                      {selectedCalendarDay.cooldown?.cooldownExercises?.length > 0 && (
                        <div
                          style={{
                            background: 'rgba(16, 185, 129, 0.06)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            marginBottom: '18px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#10b981',
                              display: 'block',
                              marginBottom: '8px',
                            }}
                          >
                            🧘 Reasoned Cool-Down &amp; Recovery
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                            {selectedCalendarDay.cooldown.cooldownExercises.map((c, ci) => (
                              <div
                                key={ci}
                                style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                }}
                              >
                                <strong style={{ color: 'var(--text-primary)' }}>{c.name}</strong> • {c.duration}
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
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
                          padding: '12px 16px',
                          borderRadius: '12px',
                          marginBottom: '20px',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
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
                              style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '8px' }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 6. DAILY NUTRITION PROTOCOL CARD */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🥗</span> Daily Fuel &amp; Meal Protocol
                          </div>
                          <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Target macros and personalized meal plan tailored specifically for this training day.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/ai-trainer', { state: { tab: 'diet' } });
                            window.dispatchEvent(new CustomEvent('gymsync_switch_tab', { detail: { tab: 'diet' } }));
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.18)',
                            border: '1px solid #10b981',
                            color: '#10b981',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🍽️ View My AI Diet Plan →
                        </button>
                      </div>

                      {/* 7. BOTTOM ACTION CONTROLS */}
                      <div
                        style={{
                          borderTop: '1px solid var(--card-border)',
                          paddingTop: '16px',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {!isRest && isCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => undoDayCompletion && undoDayCompletion(selectedCalendarDay.dayNumber)}
                              style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid #ef4444',
                                color: '#f87171',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              🔄 Reset / Undo Day
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveWorkoutDay(selectedCalendarDay.dayNumber);
                                setShowMissionRunner(true);
                              }}
                              style={{
                                padding: '10px 22px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <Play size={16} fill="#ffffff" /> Replay Workout
                            </button>
                          </>
                        )}

                        {!isRest && !isCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => completeDayManually && completeDayManually(selectedCalendarDay.dayNumber)}
                              style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid #10b981',
                                color: '#10b981',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✓ Mark Complete (Manual)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveWorkoutDay(selectedCalendarDay.dayNumber);
                                setShowMissionRunner(true);
                              }}
                              style={{
                                padding: '10px 24px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '0.92rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                              }}
                            >
                              <Play size={17} fill="#ffffff" /> Start Workout
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
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
                {savedPlans.filter(p => p.planKind !== 'Diet').map((plan) => {
                  const daysCount =
                    plan.calendar?.length ||
                    plan.workout?.interactive_calendar?.length ||
                    0;
                  const linkedCount = plan.goalGroupId ? savedPlans.filter(p => p.goalGroupId === plan.goalGroupId && p.isActive).length : 0;
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
                        {linkedCount > 1 && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>🔗 Linked Load</span>
                        )}
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

      {/* ── GAMIFIED MISSION RUNNER OVERLAY ─────────────────────────────────── */}
      {showMissionRunner && (
        <MissionRunner
          dayTitle={
            activeUserProgram
              ? `Week ${activeUserProgram.progress?.currentWeek || 1} • Day ${activeUserProgram.progress?.currentDay || 1} Routine`
              : selectedCalendarDay
              ? `Day ${selectedCalendarDay.dayNumber}: ${selectedCalendarDay.focus || 'Training Session'}`
              : "Today's Mission"
          }
          exercises={
            activeUserProgram
              ? (activeUserProgram.weeks?.[0]?.days?.find(d => d.dayNumber === activeUserProgram.progress?.currentDay)?.exercises || [])
              : (selectedCalendarDay?.workoutSplit || [])
          }
          onCancel={() => setShowMissionRunner(false)}
          onComplete={(summary) => {
            setShowMissionRunner(false);
            if (activeUserProgram) {
              handleLogProgramSession(
                activeUserProgram._id,
                activeUserProgram.progress?.currentWeek || 1,
                activeUserProgram.progress?.currentDay || 1
              );
            } else if (completeActiveWorkout) {
              completeActiveWorkout();
            }
          }}
        />
      )}

      {/* ── INTERACTIVE DIET SWAP MODAL ────────────────────────────────────── */}
      <SwapMealItemModal
        isOpen={!!swapModalInfo}
        itemName={swapModalInfo?.itemName}
        mealId={swapModalInfo?.mealId}
        planId={swapModalInfo?.planId}
        onClose={() => setSwapModalInfo(null)}
        onSwapComplete={(updatedPlan, message) => {
          toast.success(message);
          // A full refresh would be ideal or triggering parent update:
          setTimeout(() => window.location.reload(), 2000);
        }}
      />

      {/* ── GOAL COMPLETION (Parts 19 & 20) ──────────────────────────────── */}
      {aiPlan && !completedGoalGroup && (
        <div style={{ textAlign: 'center', marginTop: '12px', paddingBottom: '8px' }}>
          <button
            onClick={async () => {
              try {
                const token = localStorage.getItem('gymsync_token') || '';
                // Fetch active GoalGroup
                const goalRes = await fetch('/api/goals/active', { headers: { 'Authorization': `Bearer ${token}` } });
                if (goalRes.ok) {
                  const goalData = await goalRes.json();
                  if (goalData?.goalGroup?._id) {
                    const complRes = await fetch(`/api/goals/${goalData.goalGroup._id}/complete`, {
                      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (complRes.ok) {
                      const complData = await complRes.json();
                      setCompletedGoalGroup(complData.goalGroup);
                    }
                  } else {
                    toast.info('No active goal found. Set a goal in the Mini-Coach first.');
                  }
                }
              } catch { toast.error('Failed to complete goal. Please try again.'); }
            }}
            style={{ background: 'none', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            🏆 Mark Goal as Complete
          </button>
        </div>
      )}

      {completedGoalGroup && !showNextGoalPrompt && (
        <AchievementCard
          goalGroup={completedGoalGroup}
          onDismiss={() => {
            setShowNextGoalPrompt(true);
          }}
        />
      )}

      {showNextGoalPrompt && (
        <NextGoalPrompt
          onSelectGoal={(goalType) => {
            setShowNextGoalPrompt(false);
            setCompletedGoalGroup(null);
            // Open MiniCoach with pre-selected goal type
            window.dispatchEvent(new CustomEvent('gymsync_open_minicoach', { detail: { preselectedGoal: goalType } }));
          }}
          onSkip={() => {
            setShowNextGoalPrompt(false);
            setCompletedGoalGroup(null);
          }}
        />
      )}
    </div>
  );
};

export default AITrainerAIMode;
