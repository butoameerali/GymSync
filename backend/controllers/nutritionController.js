import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import UserDietPlan from '../models/UserDietPlan.js';
import ActivityLog from '../models/ActivityLog.js';
import { computeTodaysEnergy } from '../services/nutrition/dailyEnergyAggregator.js';

export const getPlanVsReality = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.status(400).json({ error: 'date is required' });
    
    const userId = req.user._id;

    // 1. Plan
    // Diet Plan calories
    const dietPlan = await UserDietPlan.findOne({ userId, isActive: true });
    const plannedDietKcal = dietPlan ? dietPlan.dailyTargets?.calories || 2000 : 2000;

    // Workout Plan calories (estimate)
    const workoutPlan = await UserWorkoutProgram.findOne({ userId, isActive: true });
    let plannedWorkoutKcal = 0;
    if (workoutPlan && workoutPlan.weeklySchedule) {
      const dayOfWeek = new Date(date).getDay(); // 0-6
      // Map JS day (0=Sun) to plan day if needed. For simplicity, just find a day in schedule.
      const daySchedule = workoutPlan.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);
      if (daySchedule && daySchedule.exercises) {
        plannedWorkoutKcal = daySchedule.exercises.reduce((acc, ex) => acc + (ex.estimatedCalories || 50), 0);
      } else {
        plannedWorkoutKcal = 300; // fallback avg
      }
    }

    const plannedSteps = 10000; // Default goal

    // 2. Reality
    const energy = await computeTodaysEnergy(userId, date);

    // AI generated sentence based on delta
    const dietDelta = energy.totalIntakeKcal - plannedDietKcal;
    const workoutDelta = energy.totalBurnedKcal - plannedWorkoutKcal;

    let insight = "You're right on track with today's targets.";
    if (dietDelta > 200 && workoutDelta < -100) {
      insight = "You were above today's intake target and your activity was lower than planned. Let's aim to move more tomorrow!";
    } else if (dietDelta < -200 && workoutDelta > 100) {
      insight = "Great activity today, but you're under your calorie target! Ensure you refuel properly for recovery.";
    } else if (dietDelta > 200 && workoutDelta > 200) {
      insight = "High energy burn today! The extra calories will fuel your recovery.";
    }

    res.json({
      planned: {
        dietKcal: plannedDietKcal,
        workoutKcal: plannedWorkoutKcal,
        steps: plannedSteps
      },
      actual: {
        dietKcal: energy.totalIntakeKcal,
        workoutKcal: energy.totalBurnedKcal,
        steps: energy.totalSteps
      },
      insight
    });
  } catch (error) {
    console.error('getPlanVsReality Error:', error);
    res.status(500).json({ error: 'Failed to fetch plan vs reality data' });
  }
};
