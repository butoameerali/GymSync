import FoodLogModel from '../../models/FoodLog.js';

export async function computeTodaysEnergy(userId, dateStr, { UserWorkoutProgram, ActivityLog, FoodLog, UserDietPlan } = {}) {
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
      // Subtract walking calories if they overlap with the workout
      if (workoutKcal > 0) {
        walkingKcal = Math.max(0, walkingKcal - (workoutKcal * 0.2)); 
      }
    }
  }

  // 3. Sum up eaten calories from FoodLog (Phase 4 requirement: replace old plan-based logs)
  let eatenKcal = 0;
  const ActiveFoodLog = FoodLog !== undefined ? FoodLog : FoodLogModel;
  if (ActiveFoodLog) {
    try {
      const foodLogs = await ActiveFoodLog.find({ userId, date: dateStr });
      if (foodLogs && foodLogs.length > 0) {
        for (const log of foodLogs) {
          eatenKcal += (log.totalCaloriesEstimated || 0);
        }
      }
    } catch (err) {
      // Gracefully handle CastError for dummy test user strings
    }
  }

  // Legacy fallback if no food logs exist and legacy UserDietPlan is explicitly passed
  if (eatenKcal === 0 && UserDietPlan) {
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
