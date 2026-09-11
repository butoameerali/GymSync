export async function computeTodaysEnergy(userId, dateStr, { UserWorkoutProgram, ActivityLog, UserDietPlan }) {
  // 1. Sum up workout calories
  let workoutKcal = 0;
  if (UserWorkoutProgram) {
    const activePrograms = await UserWorkoutProgram.find({ userId, isActive: true });
    
    for (const prog of activePrograms) {
      const completed = prog.progress?.completedSessions || [];
      const todaysSessions = completed.filter(s => {
        if (!s.completedAt) return false;
        const sDate = new Date(s.completedAt).toISOString().split('T')[0];
        return sDate === dateStr;
      });
      
      for (const session of todaysSessions) {
        workoutKcal += (session.caloriesBurned || 0);
      }
    }
  }

  // 2. Sum up walking calories, safeguarding against double counting
  let walkingKcal = 0;
  if (ActivityLog) {
    const activity = await ActivityLog.findOne({ userId, date: dateStr });
    if (activity) {
      walkingKcal = activity.estimatedWalkingCalories || 0;
      // Subtract walking calories if they overlap with the workout.
      // For now, if there is a workout, we halve the walking calories as an estimation of overlap
      // unless proper timestamp overlap logic is present.
      if (workoutKcal > 0) {
        walkingKcal = Math.max(0, walkingKcal - (workoutKcal * 0.2)); 
      }
    }
  }

  // 3. Sum up eaten calories
  let eatenKcal = 0;
  if (UserDietPlan) {
    const dietPlan = await UserDietPlan.findOne({ userId, isActive: true });
    if (dietPlan && dietPlan.logs) {
      const todaysLogs = dietPlan.logs.filter(l => l.date === dateStr);
      for (const log of todaysLogs) {
        eatenKcal += (log.calories || 0);
      }
    }
  }

  return {
    workoutKcal: Math.round(workoutKcal),
    walkingKcal: Math.round(walkingKcal),
    eatenKcal: Math.round(eatenKcal),
    estimatedExpenditure: Math.round(workoutKcal + walkingKcal),
    balance: Math.round(eatenKcal - (workoutKcal + walkingKcal))
  };
}

export default { computeTodaysEnergy };
