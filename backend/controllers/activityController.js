import ActivityLog from '../models/ActivityLog.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import UserDietPlan from '../models/UserDietPlan.js';
import GoalGroup from '../models/GoalGroup.js';
import { computeTodaysEnergy } from '../services/nutrition/dailyEnergyAggregator.js';

export const syncActivity = async (req, res) => {
  try {
    const { date, stepsDelta = 0, distanceKmDelta = 0, activeMinutesDelta = 0 } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) is required' });
    }

    // Estimate walking calories server-side (approx 0.04 kcal per step)
    const estimatedCaloriesDelta = Math.round((Number(stepsDelta) || 0) * 0.04);

    const log = await ActivityLog.findOneAndUpdate(
      { userId: req.user._id, date },
      { 
        $inc: { 
          steps: Number(stepsDelta) || 0, 
          distanceKm: Number(distanceKmDelta) || 0, 
          activeMinutes: Number(activeMinutesDelta) || 0,
          estimatedWalkingCalories: estimatedCaloriesDelta
        },
        $set: { lastSyncedAt: new Date() } 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(log);
  } catch (error) {
    console.error('syncActivity error:', error);
    return res.status(500).json({ error: 'Failed to sync activity data' });
  }
};

export const getTodayEnergy = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) query parameter is required' });
    }

    const energy = await computeTodaysEnergy(req.user._id, date, {
      UserWorkoutProgram,
      ActivityLog,
      UserDietPlan
    });

    // Also get GoalGroup progress data
    const activeGoalGroup = await GoalGroup.findOne({ userId: req.user._id, status: 'Active' });
    
    return res.status(200).json({
      energy,
      goal: activeGoalGroup ? {
        title: activeGoalGroup.title,
        startWeightKg: activeGoalGroup.startWeightKg,
        targetWeightKg: activeGoalGroup.targetWeightKg,
        currentWeightKg: req.user.bioData?.weight || activeGoalGroup.startWeightKg
      } : null
    });
  } catch (error) {
    console.error('getTodayEnergy error:', error);
    return res.status(500).json({ error: 'Failed to fetch energy data' });
  }
};
