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

export default { detectMissedSessions, computeScheduledDate };
