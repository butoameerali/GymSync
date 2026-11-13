/**
 * ProgramIndexView.jsx
 *
 * Coursera / Book-Index style Program syllabus & Day navigation view.
 *
 * Views:
 *   1. 'index' (default): Full syllabus table-of-contents with all weeks listed.
 *      Clicking any day row navigates to that day's dedicated view.
 *   2. 'day': Dedicated full-page view for the selected day with breadcrumb back,
 *      schedule & meal timings, warm-up, full exercise list with GIFs, cool-down,
 *      and Start Mission / Mark Complete actions.
 *
 * Theme:
 *   Sleek dark UI using GymSync brand tokens (slate dark surfaces, blue accents,
 *   subtle borders, zero aggressive neon green glow).
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Play,
  Dumbbell,
  Calendar,
  Flame,
  ArrowRight,
  Info,
  Award,
  X,
  Layers,
  BookOpen,
  Lock,
  Sparkles
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSessionCompleted(prog, weekNum, dayNum) {
  return (prog?.progress?.completedSessions || []).some(
    s => Number(s.weekNumber) === Number(weekNum) && Number(s.dayNumber) === Number(dayNum)
  );
}

function isDayLocked(prog, weeks, weekNum, dayNum) {
  if (isSessionCompleted(prog, weekNum, dayNum)) return { locked: false };
  for (const wk of (weeks || [])) {
    for (const d of (wk.days || [])) {
      if (!d.isRestDay && !isSessionCompleted(prog, wk.weekNumber, d.dayNumber)) {
        if (Number(weekNum) > Number(wk.weekNumber)) {
          return { locked: true, requiredWeek: wk.weekNumber, requiredDay: d.dayNumber };
        }
        if (Number(weekNum) === Number(wk.weekNumber) && Number(dayNum) > Number(d.dayNumber)) {
          return { locked: true, requiredWeek: wk.weekNumber, requiredDay: d.dayNumber };
        }
        return { locked: false };
      }
    }
  }
  return { locked: false };
}

function getCompletedCount(prog) {
  return (prog?.progress?.completedSessions || []).length;
}

function getTotalWorkoutDays(weeksOrProg) {
  const weeks = Array.isArray(weeksOrProg) ? weeksOrProg : (weeksOrProg?.weeks || []);
  return weeks.reduce((acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length, 0);
}


// ── Main Component ───────────────────────────────────────────────────────────

const ProgramIndexView = ({
  program,
  onStartDay,
  onCompleteDay,
  onUnenroll,
  onBack,
  onOpenReview
}) => {
  const prog = program?.rawProgram || program;
  const rawWeeks = prog?.weeks || [];
  const targetDurationWeeks = Number(prog?.durationWeeks) || (rawWeeks.length > 0 ? rawWeeks.length : 4);

  // Dynamically expand weeks if trainer provided repeating block templates (e.g. 2 weeks defined for a 4-week program)
  const weeks = (() => {
    if (rawWeeks.length === 0) return [];
    if (rawWeeks.length >= targetDurationWeeks) return rawWeeks;
    const expanded = [...rawWeeks];
    const templateWeeks = [...rawWeeks];
    while (expanded.length < targetDurationWeeks) {
      const nextIndex = expanded.length;
      const source = templateWeeks[nextIndex % templateWeeks.length];
      const newWeekNum = nextIndex + 1;
      expanded.push({
        ...source,
        weekNumber: newWeekNum,
        focus: source.focus ? `${source.focus} (Progression Week ${newWeekNum})` : `Week ${newWeekNum} Progression`
      });
    }
    return expanded;
  })();

  // Consistent week count: matches actual syllabus weeks
  const totalWeeks = weeks.length > 0 ? weeks.length : targetDurationWeeks;

  // View state: 'index' (Syllabus) or 'day' (Dedicated Day Detail)
  const [viewState, setViewState] = useState('index');
  const [activeDayInfo, setActiveDayInfo] = useState(null); // { weekNum, dayObj }

  if (!prog) return null;

  const completedCount = getCompletedCount(prog);
  const totalWorkout = getTotalWorkoutDays(weeks);
  const progressPct = totalWorkout > 0 ? Math.round((completedCount / totalWorkout) * 100) : 0;
  const currentWeek = prog?.progress?.currentWeek || 1;
  const currentDay = prog?.progress?.currentDay || 1;

  // Find next incomplete session for CTA button
  const nextIncomplete = (() => {
    for (const wk of weeks) {
      for (const d of (wk.days || [])) {
        if (!d.isRestDay && !isSessionCompleted(prog, wk.weekNumber, d.dayNumber)) {
          return { weekNum: wk.weekNumber, dayNum: d.dayNumber, day: d };
        }
      }
    }
    return null;
  })();

  const activeWk = nextIncomplete?.weekNum || currentWeek || 1;
  const [expandedWeeks, setExpandedWeeks] = useState(() => ({ [activeWk]: true }));

  const toggleWeek = (wNum) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [wNum]: !prev[wNum]
    }));
  };

  const allWeeksExpanded = weeks.length > 0 && weeks.every(w => expandedWeeks[w.weekNumber]);
  const toggleAllWeeks = () => {
    if (allWeeksExpanded) {
      setExpandedWeeks({});
    } else {
      const all = {};
      weeks.forEach(w => { all[w.weekNumber] = true; });
      setExpandedWeeks(all);
    }
  };

  const handleOpenDay = (weekNum, dayObj) => {
    setActiveDayInfo({ weekNum, dayObj });
    setViewState('day');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartOrContinue = () => {
    if (nextIncomplete) {
      handleOpenDay(nextIncomplete.weekNum, nextIncomplete.day);
    } else if (weeks.length > 0 && weeks[0].days?.length > 0) {
      handleOpenDay(weeks[0].weekNumber || 1, weeks[0].days[0]);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1: DEDICATED DAY DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (viewState === 'day' && activeDayInfo) {
    const { weekNum, dayObj: day } = activeDayInfo;
    const isDone = isSessionCompleted(prog, weekNum, day.dayNumber);
    const lockInfo = isDayLocked(prog, weeks, weekNum, day.dayNumber);
    const exercises = day.exercises || [];
    const warmup = day.warmup || [];
    const cooldown = day.cooldown || [];

    // Find next and prev day for pagination
    const currentWk = weeks.find(w => w.weekNumber === weekNum);
    const dayIndexInWeek = (currentWk?.days || []).findIndex(d => d.dayNumber === day.dayNumber);
    const prevDay = dayIndexInWeek > 0 ? currentWk.days[dayIndexInWeek - 1] : null;
    const nextDay = dayIndexInWeek < (currentWk?.days || []).length - 1 ? currentWk.days[dayIndexInWeek + 1] : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

        {/* ── BREADCRUMB NAVIGATION ───────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={() => setViewState('index')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '8px 14px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            <ChevronLeft size={16} /> Back to Program Index
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <span>{prog.title}</span>
            <span>&bull;</span>
            <span>Week {weekNum}</span>
            <span>&bull;</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Day {day.dayNumber}</span>
          </div>
        </div>

        {/* ── DAY HERO HEADER ────────────────────────────────────────── */}
        <div style={{
          background: lockInfo.locked
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(30, 41, 59, 0.7) 100%)'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: lockInfo.locked
            ? '1px solid rgba(239, 68, 68, 0.25)'
            : '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Week {weekNum} &bull; Day {day.dayNumber}
              </span>
              {isDone ? (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399'
                }}>
                  ✓ Session Completed
                </span>
              ) : lockInfo.locked ? (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Lock size={12} /> Locked (Complete Week {lockInfo.requiredWeek}, Day {lockInfo.requiredDay} first)
                </span>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa'
                }}>
                  Scheduled Workout
                </span>
              )}
            </div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {day.focus || day.title || 'Workout Session'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <span><Dumbbell size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{exercises.length} Exercises</span>
              {day.estimatedCalories > 0 && (
                <span><Flame size={14} color="#f59e0b" style={{ verticalAlign: 'middle', marginRight: '4px' }} />~{day.estimatedCalories} kcal</span>
              )}
            </div>
          </div>

          {/* Quick Action in Header */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {lockInfo.locked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const reqWk = weeks.find(w => w.weekNumber === lockInfo.requiredWeek);
                    const reqDay = (reqWk?.days || []).find(d => d.dayNumber === lockInfo.requiredDay);
                    if (reqDay) handleOpenDay(lockInfo.requiredWeek, reqDay);
                  }}
                  style={{
                    padding: '11px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <ArrowRight size={15} /> Go to Week {lockInfo.requiredWeek}, Day {lockInfo.requiredDay}
                </button>
              </div>
            ) : !isDone && (
              <>
                {exercises.length > 0 && onStartDay && (
                  <button
                    type="button"
                    onClick={() => onStartDay(weekNum, day.dayNumber, exercises, day)}
                    style={{
                      padding: '12px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                    }}
                  >
                    <Play size={16} /> Start Workout
                  </button>
                )}
                {onCompleteDay && (
                  <button
                    type="button"
                    onClick={() => onCompleteDay(prog._id, weekNum, day.dayNumber)}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle size={15} color="#34d399" /> Mark Complete
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sequential Progression Warning Banner */}
        {lockInfo.locked && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(30, 41, 59, 0.6) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Lock size={18} color="#f87171" />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fca5a5' }}>
                  This workout is locked (Sequential Progression Required)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  GymSync programs follow structured periodization. You can review this session's exercises and meal schedule below, but workout logging is locked until you complete <strong>Week {lockInfo.requiredWeek}, Day {lockInfo.requiredDay}</strong>.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const reqWk = weeks.find(w => w.weekNumber === lockInfo.requiredWeek);
                const reqDay = (reqWk?.days || []).find(d => d.dayNumber === lockInfo.requiredDay);
                if (reqDay) handleOpenDay(lockInfo.requiredWeek, reqDay);
              }}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowRight size={14} /> Open Week {lockInfo.requiredWeek}, Day {lockInfo.requiredDay}
            </button>
          </div>
        )}

        {/* Trainer / Day coaching notes */}
        {day.notes && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <Info size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#60a5fa' }}>Trainer's Day Guidance:</strong> {day.notes}
            </div>
          </div>
        )}


        {/* ── SECTION 2: WARM-UP ─────────────────────────────────────── */}
        {warmup.length > 0 && (
          <div style={{
            background: 'var(--card-bg, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔥 Dynamic Warm-Up Routine
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {warmup.map((w, i) => (
                <div key={i} style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.04)',
                  border: '1px solid rgba(56, 189, 248, 0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.86rem',
                  color: 'var(--text-primary)'
                }}>
                  <span>{w.text || w}</span>
                  {w.duration && <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: 600 }}>{w.duration} min</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 3: EXERCISES ───────────────────────────────────── */}
        <div style={{
          background: 'var(--card-bg, #0f172a)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '22px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dumbbell size={18} color="#3b82f6" />
              Workout Movements ({exercises.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Follow target sets, reps &amp; tempo
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {exercises.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                {/* Exercise GIF Preview */}
                {(ex.gifUrl || ex.mediaUrl) && (
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#020617',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <img
                      src={ex.gifUrl || ex.mediaUrl}
                      alt={ex.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                {/* Exercise Details */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      #{idx + 1}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {ex.name}
                    </h4>
                    {ex.targetMuscle && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#60a5fa',
                        fontWeight: 600
                      }}>
                        {ex.targetMuscle}
                      </span>
                    )}
                  </div>

                  {/* Sets / Reps / RPE metrics */}
                  <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      Sets: {ex.sets} &bull; Reps: {ex.reps}
                    </span>
                    {ex.restSeconds > 0 && (
                      <span>Rest: {ex.restSeconds}s</span>
                    )}
                    {ex.rpe > 0 && (
                      <span>RPE: {ex.rpe}</span>
                    )}
                    {ex.intensity && (
                      <span>{ex.intensity}</span>
                    )}
                  </div>

                  {ex.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                      Tip: {ex.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 4: COOL-DOWN ───────────────────────────────────── */}
        {cooldown.length > 0 && (
          <div style={{
            background: 'var(--card-bg, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧊 Cool-Down &amp; Flexibility
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cooldown.map((c, i) => (
                <div key={i} style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(168, 85, 247, 0.04)',
                  border: '1px solid rgba(168, 85, 247, 0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.86rem',
                  color: 'var(--text-primary)'
                }}>
                  <span>{c.text || c}</span>
                  {c.duration && <span style={{ color: '#a855f7', fontSize: '0.78rem', fontWeight: 600 }}>{c.duration} min</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BOTTOM ACTIONS & PAGINATION ────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            {prevDay && (
              <button
                type="button"
                onClick={() => handleOpenDay(weekNum, prevDay)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 600
                }}
              >
                <ChevronLeft size={16} /> Day {prevDay.dayNumber}: {prevDay.focus || prevDay.title}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {lockInfo.locked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Lock size={15} color="#f87171" /> Locked Session
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const reqWk = weeks.find(w => w.weekNumber === lockInfo.requiredWeek);
                    const reqDay = (reqWk?.days || []).find(d => d.dayNumber === lockInfo.requiredDay);
                    if (reqDay) handleOpenDay(lockInfo.requiredWeek, reqDay);
                  }}
                  style={{
                    padding: '11px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                  }}
                >
                  <ArrowRight size={16} /> Complete Week {lockInfo.requiredWeek}, Day {lockInfo.requiredDay} First
                </button>
              </div>
            ) : !isDone ? (
              <>
                {exercises.length > 0 && onStartDay && (
                  <button
                    type="button"
                    onClick={() => onStartDay(weekNum, day.dayNumber, exercises, day)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                    }}
                  >
                    <Play size={16} /> Start This Workout
                  </button>
                )}

                {onCompleteDay && (
                  <button
                    type="button"
                    onClick={() => onCompleteDay(prog._id, weekNum, day.dayNumber)}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle size={15} color="#34d399" /> Mark as Complete
                  </button>
                )}
              </>
            ) : null}

            {isDone && (
              <div style={{
                padding: '12px 20px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle size={16} /> Session Completed ✓
              </div>
            )}
          </div>

          <div>
            {nextDay && (
              <button
                type="button"
                onClick={() => handleOpenDay(weekNum, nextDay)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 600
                }}
              >
                Day {nextDay.dayNumber}: {nextDay.focus || nextDay.title} <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 2: PROGRAM INDEX / SYLLABUS TABLE OF CONTENTS VIEW (Default)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

      {/* ── BACK BUTTON ─────────────────────────────────────────── */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            cursor: 'pointer',
            fontWeight: 600,
            padding: '4px 0',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ChevronLeft size={16} /> Back to My Plans
        </button>
      )}

      {/* ── PROGRAM HERO HEADER (Clean, Compact: Title + Progress + Actions) ─── */}
      <div style={{
        background: 'var(--card-bg, #0f172a)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 22px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            {/* Program Icon */}
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#60a5fa'
            }}>
              <Dumbbell size={24} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                {prog.title}
              </h2>
            </div>
          </div>

          {/* Progress stats */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Your Progress</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: progressPct === 100 ? '#34d399' : '#60a5fa', lineHeight: 1 }}>
              {progressPct}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              {completedCount} of {totalWorkout} sessions done
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '14px' }}>
          <div style={{
            height: '6px',
            borderRadius: '99px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: '99px',
              background: progressPct === 100
                ? '#10b981'
                : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <span>Week {currentWeek} &bull; Day {currentDay}</span>
            <span>{Math.max(0, totalWorkout - completedCount)} sessions remaining</span>
          </div>
        </div>

        {/* CTA Buttons: Continue & Discontinue */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          {nextIncomplete ? (
            <button
              type="button"
              onClick={handleStartOrContinue}
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
              }}
            >
              {completedCount === 0 ? (
                <><Play size={16} /> Start Program (Week 1 &bull; Day 1)</>
              ) : (
                <><ArrowRight size={16} /> Continue — Week {nextIncomplete.weekNum}, Day {nextIncomplete.dayNum}</>
              )}
            </button>
          ) : (totalWorkout > 0 && completedCount >= totalWorkout) ? (
            <>
            <div style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Award size={16} /> All {totalWeeks} Weeks Completed! 🎉
            </div>
            {onOpenReview && (
              <button
                type="button"
                onClick={() => onOpenReview(prog)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: prog.outcomeReport?.successScore
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: prog.outcomeReport?.successScore
                    ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                    : '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                {prog.outcomeReport?.successScore ? (
                  <><Award size={15} /> Outcome Report ({prog.outcomeReport.successScore}%)</>
                ) : (
                  <><Sparkles size={15} /> ✨ Review Results with AI</>
                )}
              </button>
            )}
          </>
          ) : null}

          </div>
      </div>

      {/* ── WEEKS ACCORDION (Clickable Weeks) ─────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            onClick={toggleAllWeeks}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 6px'
            }}
          >
            {allWeeksExpanded ? 'Collapse All Weeks' : 'Expand All Weeks'}
          </button>
        </div>

        {weeks.map((wk, wkIdx) => {
          const wNum = wk.weekNumber || wkIdx + 1;
          const wkDays = wk.days || [];
          const wkCompletedCount = wkDays.filter(d => !d.isRestDay && isSessionCompleted(prog, wNum, d.dayNumber)).length;
          const wkTotalWorkout = wkDays.filter(d => !d.isRestDay).length;
          const isAllDone = wkTotalWorkout > 0 && wkCompletedCount === wkTotalWorkout;
          const isCurrent = wNum === currentWeek;
          const isExpanded = Boolean(expandedWeeks[wNum]);

          return (
            <div
              key={wNum}
              style={{
                background: 'var(--card-bg, #0f172a)',
                border: isCurrent
                  ? '1px solid rgba(59, 130, 246, 0.35)'
                  : '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                overflow: 'hidden'
              }}
            >
              {/* Week Header (Clickable Accordion Trigger) */}
              <button
                type="button"
                onClick={() => toggleWeek(wNum)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.015)',
                  border: 'none',
                  borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.015)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isAllDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                    color: isAllDone ? '#34d399' : '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem'
                  }}>
                    {isAllDone ? <CheckCircle size={16} /> : `W${wNum}`}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Week {wNum}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 700 }}>
                          Current
                        </span>
                      )}
                      {isAllDone && (
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', fontWeight: 600 }}>
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    {wk.focus && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {wk.focus}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {wkCompletedCount} of {wkTotalWorkout} sessions completed
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={18} color="var(--text-secondary)" />
                  ) : (
                    <ChevronRight size={18} color="var(--text-secondary)" />
                  )}
                </div>
              </button>

              {/* Day Index Links (Shown when week is expanded) */}
              {isExpanded && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {wkDays.map(day => {
                    const isDone = !day.isRestDay && isSessionCompleted(prog, wNum, day.dayNumber);
                    const dayLock = !day.isRestDay ? isDayLocked(prog, weeks, wNum, day.dayNumber) : { locked: false };
                    const exerciseCount = (day.exercises || []).length;

                    return (
                      <button
                        key={day.dayNumber}
                        type="button"
                        onClick={() => {
                          if (day.isRestDay) {
                            if (nextIncomplete) {
                              handleOpenDay(nextIncomplete.weekNum, nextIncomplete.day);
                            }
                          } else {
                            handleOpenDay(wNum, day);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: day.isRestDay ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.02)',
                          border: day.isRestDay ? '1px dashed rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          textAlign: 'left',
                          transition: 'background 0.15s, border-color 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = day.isRestDay ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.02)';
                          e.currentTarget.style.borderColor = day.isRestDay ? '1px dashed rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.04)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          {/* Day indicator */}
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: isDone
                              ? 'rgba(16, 185, 129, 0.15)'
                              : day.isRestDay
                                ? 'rgba(255, 255, 255, 0.04)'
                                : dayLock.locked
                                  ? 'rgba(255, 255, 255, 0.04)'
                                  : 'rgba(59, 130, 246, 0.1)',
                            color: isDone
                              ? '#34d399'
                              : day.isRestDay
                                ? '#94a3b8'
                                : dayLock.locked
                                  ? '#94a3b8'
                                  : '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            flexShrink: 0
                          }}>
                            {isDone ? <CheckCircle size={14} /> : dayLock.locked ? <Lock size={12} /> : day.dayNumber}
                          </div>

                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: day.isRestDay ? '#94a3b8' : 'var(--text-primary)' }}>
                              Day {day.dayNumber}: {day.focus || day.title || (day.isRestDay ? 'Rest & Active Recovery' : 'Workout Session')}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {day.isRestDay
                                ? 'Rest & Active Recovery'
                                : `${exerciseCount} Exercise${exerciseCount !== 1 ? 's' : ''} scheduled`}
                            </div>
                          </div>
                        </div>

                        {/* Right Link arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {isDone && (
                            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                              ✓ Completed
                            </span>
                          )}
                          {!day.isRestDay && dayLock.locked && (
                            <span style={{
                              fontSize: '0.74rem',
                              color: 'rgba(255, 255, 255, 0.45)',
                              background: 'rgba(255, 255, 255, 0.04)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Lock size={11} /> Locked (Preview) <ChevronRight size={12} />
                            </span>
                          )}
                          {!day.isRestDay && !isDone && !dayLock.locked && (
                            <span style={{ color: '#60a5fa', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                              Start Routine <ChevronRight size={14} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
};

export default ProgramIndexView;
