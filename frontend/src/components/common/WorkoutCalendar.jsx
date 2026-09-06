import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Dumbbell, Zap, Clock, CheckCircle, ClipboardList, Moon } from 'lucide-react';

/**
 * WorkoutCalendar — renders exercise history & AI Workout Plan calendar status in Profile.
 *
 * Props:
 *  - history: array of exercise entries  { name, date (ISO), pointsEarned, trackedViaAI, ... }
 *  - aiPlan : active AI plan with interactive_calendar & planStartDate
 *
 * Color logic:
 *  - GREEN  : any past/today day with completed exercise
 *  - YELLOW : today's date
 *  - RED    : past scheduled workout day with 0 completed exercises
 *  - REST   : scheduled rest day
 *  - Click  : opens inline detail panel for the selected date
 */
const WorkoutCalendar = ({ history = [], aiPlan = null }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(null); // Date object | null

  // ── helpers ──────────────────────────────────────────────────────────────
  const toKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const todayKey = toKey(today);

  // Build a map: dateKey → [exercises]
  const completedMap = {};
  history.forEach((h) => {
    if (!h || !h.date) return;
    const d = new Date(h.date);
    if (isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0);
    const key = toKey(d);
    if (!completedMap[key]) completedMap[key] = [];
    completedMap[key].push(h);
  });

  const hasAnyHistory = history.length > 0;

  // ── calendar grid ─────────────────────────────────────────────────────────
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth + 1, 0);

  // Week starts on Monday (ISO); getDay() returns 0=Sun … 6=Sat
  const isoDay = (d) => (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  const startOffset = isoDay(firstDay);
  const totalCells  = startOffset + lastDay.getDate();
  const rows        = Math.ceil(totalCells / 7);

  const cells = [];
  for (let i = 0; i < rows * 7; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(viewYear, viewMonth, dayNum));
    }
  }

  // ── day classification ────────────────────────────────────────────────────
  const classify = (date) => {
    if (!date) return 'empty';
    const key  = toKey(date);
    const isToday = key === todayKey;
    const past = date < today;
    const future = date > today;

    if (completedMap[key]?.length > 0) return 'completed';
    if (isToday) return 'today';
    if (future)  return 'future';

    if (past) {
      if (aiPlan && aiPlan.interactive_calendar) {
        const planStart = aiPlan.planStartDate ? new Date(aiPlan.planStartDate) : null;
        if (planStart) {
          planStart.setHours(0, 0, 0, 0);
          const diffTime = date.getTime() - planStart.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < (aiPlan.interactive_calendar?.length || 28)) {
            const calDay = aiPlan.interactive_calendar[diffDays];
            if (calDay && calDay.isWorkoutDay) return 'missed';
            return 'rest';
          }
        }
      }
      if (hasAnyHistory && isoDay(date) < 5) return 'missed';
    }

    return 'default';
  };

  const STATUS_COLORS = {
    completed : { bg: 'rgba(16, 185, 129, 0.2)',  border: '#10b981', dot: '#10b981', text: '#10b981' },
    today     : { bg: 'rgba(234, 179, 8, 0.18)',  border: '#eab308', dot: '#eab308', text: '#eab308' },
    missed    : { bg: 'rgba(239, 68, 68, 0.14)',  border: '#ef4444', dot: '#ef4444', text: '#ef4444' },
    rest      : { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.1)', dot: null, text: 'var(--text-secondary)' },
    future    : { bg: 'transparent', border: 'transparent', dot: null, text: 'var(--text-secondary)' },
    default   : { bg: 'transparent', border: 'transparent', dot: null, text: 'var(--text-secondary)' },
    empty     : {},
  };

  // ── navigation ────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // ── selected day ──────────────────────────────────────────────────────────
  const selectedKey       = selectedDate ? toKey(selectedDate) : null;
  const selectedExercises = selectedKey ? (completedMap[selectedKey] || []) : [];
  const classifySelected  = selectedDate ? classify(selectedDate) : 'default';

  const formatDateLabel = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const Legend = () => (
    <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {[
        { color: '#10b981', label: 'Completed Workout' },
        { color: '#eab308', label: 'Today' },
        { color: '#ef4444', label: 'Missed Workout' },
        { color: 'rgba(255,255,255,0.3)', label: 'Rest / Recovery' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
          {label}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100%' }}>

      {/* ── DETAIL PANEL ── */}
      {selectedDate && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '22px',
          marginBottom: '18px',
          animation: 'wc-fade-in 0.22s ease',
        }}>
          {/* header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setSelectedDate(null)}
                aria-label="Back to calendar"
                style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Workout Details</span>
            </div>
            <button onClick={() => setSelectedDate(null)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
              <X size={17} />
            </button>
          </div>

          {/* date label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatDateLabel(selectedDate)}</span>
            {classifySelected === 'today' && (
              <span style={{ fontSize: '0.72rem', background: 'rgba(234,179,8,0.14)', color: '#eab308', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>Today</span>
            )}
            {classifySelected === 'missed' && (
              <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>Missed Workout</span>
            )}
            {classifySelected === 'rest' && (
              <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>Rest & Recovery</span>
            )}
            {classifySelected === 'completed' && (
              <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
                {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} completed
              </span>
            )}
          </div>

          {/* exercise list */}
          {selectedExercises.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedExercises.map((ex, i) => (
                <div key={i} style={{
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.18)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}>
                  {/* top row: name + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(16,185,129,0.14)', borderRadius: 8, padding: '6px', display: 'flex', flexShrink: 0 }}>
                        <Dumbbell size={15} color="#10b981" />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ex.name || 'Exercise'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {ex.trackedViaAI && (
                        <span style={{ fontSize: '0.68rem', background: 'rgba(99,102,241,0.14)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '2px 8px' }}>AI Tracked</span>
                      )}
                      <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                        +{ex.pointsEarned || 1} pt
                      </span>
                    </div>
                  </div>

                  {/* meta */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {ex.category && (
                      <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={11} color="#10b981" /> {ex.category}
                      </span>
                    )}
                    {ex.equipment && (
                      <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Zap size={11} color="#f59e0b" /> {ex.equipment}
                      </span>
                    )}
                    {ex.completedReps && (
                      <span style={{ fontSize: '0.77rem', color: '#10b981', fontWeight: 'bold' }}>
                        Logged: {ex.completedReps} Reps
                      </span>
                    )}
                    {ex.date && (
                      <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {new Date(ex.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : classifySelected === 'rest' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 0', color: 'var(--text-secondary)', gap: '8px' }}>
              <Moon size={34} style={{ opacity: 0.5, color: '#3b82f6' }} />
              <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Scheduled Rest & Recovery Day</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rest, hydrate, and allow muscle fibers to repair.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 0', color: 'var(--text-secondary)', gap: '8px' }}>
              <ClipboardList size={34} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '0.92rem' }}>No workout logged for this date.</span>
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR GRID ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '18px 14px 14px',
      }}>
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={prevMonth} aria-label="Previous month" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.97rem', letterSpacing: '0.3px' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} aria-label="Next month" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
          {DAY_HEADERS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '4px 0', letterSpacing: '0.5px' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} style={{ minHeight: 46 }} />;

            const status = classify(date);
            const s = STATUS_COLORS[status] || STATUS_COLORS.default;
            const isSelected = selectedDate && toKey(date) === toKey(selectedDate);
            const isClickable = status !== 'future';
            const exercises  = completedMap[toKey(date)] || [];

            return (
              <button
                key={i}
                onClick={() => isClickable ? setSelectedDate(date) : undefined}
                title={
                  status === 'completed' ? `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} completed` :
                  status === 'today'     ? 'Today' :
                  status === 'missed'    ? 'Missed workout day' :
                  status === 'rest'      ? 'Rest & Recovery Day' : undefined
                }
                style={{
                  background: isSelected ? (s.bg || 'rgba(255,255,255,0.08)') : (s.bg || 'transparent'),
                  border: isSelected
                    ? `2px solid ${s.border || 'rgba(255,255,255,0.4)'}`
                    : `1px solid ${(status !== 'future' && status !== 'default') ? (s.border + '55') : 'transparent'}`,
                  borderRadius: '10px',
                  cursor: isClickable ? 'pointer' : 'default',
                  padding: '6px 2px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: '46px',
                  transition: 'background 0.12s ease, border 0.12s ease',
                  outline: 'none',
                  boxShadow: isSelected ? `0 0 0 3px ${s.border}22` : 'none',
                }}
              >
                <span style={{
                  fontSize: '0.83rem',
                  fontWeight: (status === 'today' || isSelected) ? 800 : 400,
                  color: status === 'today' ? '#eab308'
                       : status === 'completed' ? '#d1fae5'
                       : status === 'missed' ? '#fca5a5'
                       : 'var(--text-primary)',
                  lineHeight: 1,
                }}>
                  {date.getDate()}
                </span>

                {/* status dot */}
                {s.dot && (
                  <span style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: s.dot,
                    boxShadow: `0 0 5px ${s.dot}aa`,
                    display: 'inline-block',
                  }} />
                )}

                {/* exercise count for days with multiple workouts */}
                {status === 'completed' && exercises.length > 1 && (
                  <span style={{ fontSize: '0.58rem', color: '#10b981', lineHeight: 1 }}>×{exercises.length}</span>
                )}
              </button>
            );
          })}
        </div>

        <Legend />
      </div>

      <style>{`
        @keyframes wc-fade-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default WorkoutCalendar;
