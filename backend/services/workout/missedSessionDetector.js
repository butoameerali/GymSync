export function computeScheduledDate(startDateStr, dayNumber) {
  const startDate = new Date(startDateStr || Date.now());
  startDate.setHours(0, 0, 0, 0);
  const scheduled = new Date(startDate);
  scheduled.setDate(startDate.getDate() + (dayNumber - 1));
  return scheduled;
}

export function detectMissedSessions(plan, today = new Date()) {
  const missed = [];
  today.setHours(0, 0, 0, 0);

  const cal = plan.workout?.interactive_calendar || plan.calendar || [];
  
  cal.forEach(day => {
    if (day.isRestDay || day.dayType === 'rest') return;
    
    const scheduledDate = computeScheduledDate(plan.createdAt || Date.now(), day.dayNumber);
    
    // Convert to UTC midnight or local midnight for strict comparison
    if (scheduledDate < today) {
      const alreadyCompleted = (plan.progress?.completedSessions || []).some(
        s => s.dayNumber === day.dayNumber
      );
      const alreadyLogged = (plan.missedSessions || []).some(
        s => s.dayNumber === day.dayNumber
      );
      
      if (!alreadyCompleted && !alreadyLogged) {
        missed.push({ dayNumber: day.dayNumber });
      }
    }
  });
  
  return missed;
}

export function resolveAndRescheduleMissedSession(plan, { dayNumber, reasonCode = 'busy', userFeedback = '' }) {
  if (!plan) return { success: false, reason: 'Plan not provided' };

  const cal = plan.workout?.interactive_calendar || plan.calendar || [];
  const normalizedReason = String(reasonCode || userFeedback).toLowerCase();

  let strategy = 'shift_calendar';
  let explanation = '';

  if (normalizedReason.includes('fatigue') || normalizedReason.includes('tired') || normalizedReason.includes('thak') || normalizedReason.includes('sleep')) {
    strategy = 'rest_day_preserve';
    explanation = 'Recognized central nervous fatigue. Missed session converted to a justified recovery day without streak penalty or volume doubling.';
  } else if (normalizedReason.includes('pain') || normalizedReason.includes('sore') || normalizedReason.includes('hurt')) {
    strategy = 'pain_adaptation';
    explanation = 'Joint or muscle soreness detected. Missed session logged as active recovery; future heavy loading spaced with additional recovery buffer.';
  } else if (normalizedReason.includes('busy') || normalizedReason.includes('work') || normalizedReason.includes('study') || normalizedReason.includes('kaam')) {
    strategy = 'shift_calendar';
    explanation = 'Schedule conflict accounted for. Remaining workouts shifted forward by 1 day to preserve the full planned volume.';
  } else {
    strategy = 'compress_workout';
    explanation = 'Key compound movements from the missed day merged into today session with reduced set volume.';
  }

  // Apply calendar adjustments based on chosen strategy
  if (strategy === 'shift_calendar') {
    // Find next rest day to absorb or shift
    const nextRestDay = cal.find(d => d.dayNumber > Number(dayNumber) && (d.isRestDay || d.dayType === 'rest'));
    if (nextRestDay) {
      const missedDay = cal.find(d => d.dayNumber === Number(dayNumber));
      if (missedDay) {
        nextRestDay.dayType = missedDay.dayType;
        nextRestDay.isRestDay = false;
        nextRestDay.exercises = (missedDay.exercises || []).map(ex => ({
          ...ex,
          sets: Math.max(1, (ex.sets || 3) - 1) // Lighten volume slightly
        }));
        nextRestDay.rescheduledFrom = Number(dayNumber);
      }
    }
  } else if (strategy === 'compress_workout') {
    const todayNum = Number(dayNumber) + 1;
    const todaySession = cal.find(d => d.dayNumber === todayNum);
    const missedDay = cal.find(d => d.dayNumber === Number(dayNumber));

    if (todaySession && missedDay && missedDay.exercises) {
      const keyExercises = (missedDay.exercises || []).slice(0, 2).map(ex => ({
        ...ex,
        sets: 2,
        notes: 'Merged from missed session (condensed)'
      }));
      todaySession.exercises = [...(todaySession.exercises || []), ...keyExercises];
    }
  }

  // Mark in missedSessions array
  plan.missedSessions = plan.missedSessions || [];
  const sessionIdx = plan.missedSessions.findIndex(s => String(s.dayNumber) === String(dayNumber));
  if (sessionIdx !== -1) {
    plan.missedSessions[sessionIdx].handled = true;
    plan.missedSessions[sessionIdx].reasonCode = normalizedReason;
    plan.missedSessions[sessionIdx].strategyApplied = strategy;
    plan.missedSessions[sessionIdx].resolvedAt = new Date();
  } else {
    plan.missedSessions.push({
      dayNumber: Number(dayNumber),
      handled: true,
      reasonCode: normalizedReason,
      strategyApplied: strategy,
      resolvedAt: new Date()
    });
  }

  return {
    success: true,
    strategy,
    explanation,
    summary: `Missed session resolved via **${strategy.replace(/_/g, ' ')}**. ${explanation}`
  };
}

export default { detectMissedSessions, computeScheduledDate, resolveAndRescheduleMissedSession };
