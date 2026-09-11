import workoutDecisionEngine from './workoutDecisionEngine.js';

export const weeklyLoadBalancer = {
  // Pulls every UserWorkoutProgram/SavedAIPlan sharing a goalGroupId and produces
  // one combined 7-day view instead of two plans independently assigning "Monday".
  async computeCombinedWeeklySchedule(goalGroupId, { SavedAIPlan }) {
    if (!goalGroupId) return [];
    
    const plans = await SavedAIPlan.find({ goalGroupId, isActive: true });
    if (plans.length === 0) return [];

    // Flatten all interactive_calendars
    const combinedDays = Array.from({ length: 28 }, (_, i) => {
      const dayNum = i + 1;
      const sessionsForDay = [];
      
      for (const plan of plans) {
        const cal = plan.workout?.interactive_calendar || plan.calendar || [];
        const dayMatch = cal.find(d => d.dayNumber === dayNum);
        if (dayMatch && dayMatch.dayType !== 'rest') {
          sessionsForDay.push({
            planTitle: plan.title,
            ...dayMatch
          });
        }
      }
      
      if (sessionsForDay.length === 0) {
        return { dayNumber: dayNum, dayType: 'rest', isRestDay: true, sessions: [] };
      }
      
      return {
        dayNumber: dayNum,
        dayType: 'combined',
        isRestDay: false,
        sessions: sessionsForDay,
        totalMinutes: sessionsForDay.reduce((acc, s) => acc + (s.timeBudget?.totalEstimatedMinutes || 0), 0)
      };
    });

    return combinedDays;
  },

  computeCombinedDailyCalorieTarget(goalGroupId, plannedSessions, nutritionCalculator) {
    // Phase 8.3 target summation logic
    return plannedSessions.reduce((acc, s) => acc + (s.timeBudget?.totalEstimatedMinutes || 0) * 8, 0); // Approximation
  }
};

export default weeklyLoadBalancer;
