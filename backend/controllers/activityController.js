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

    // Keep totalCaloriesBurned unified
    log.totalCaloriesBurned = (log.estimatedWalkingCalories || 0) + (log.workoutCalories || 0);
    await log.save();

    return res.status(200).json(log);
  } catch (error) {
    console.error('syncActivity error:', error);
    return res.status(500).json({ error: 'Failed to sync activity data' });
  }
};

export const getDailyHistory = async (req, res) => {
  try {
    const history = await ActivityLog.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(90);

    return res.status(200).json(history);
  } catch (error) {
    console.error('getDailyHistory error:', error);
    return res.status(500).json({ error: 'Failed to fetch activity history' });
  }
};

export const logWorkoutExercise = async (req, res) => {
  try {
    const {
      date = new Date().toISOString().split('T')[0],
      exerciseName,
      sets = 1,
      reps = 10,
      caloriesBurned = 25,
      mode = 'manual'
    } = req.body;

    if (!exerciseName) {
      return res.status(400).json({ error: 'Exercise name is required' });
    }

    const calculatedCalories = Number(caloriesBurned) > 0 
      ? Number(caloriesBurned) 
      : Math.max(15, Math.round((Number(sets) || 1) * (Number(reps) || 10) * 0.4));

    let log = await ActivityLog.findOne({ userId: req.user._id, date });
    if (!log) {
      log = new ActivityLog({
        userId: req.user._id,
        date,
        steps: 0,
        distanceKm: 0,
        activeMinutes: 0,
        estimatedWalkingCalories: 0,
        workoutCalories: 0,
        totalCaloriesBurned: 0,
        exercises: []
      });
    }

    log.exercises.push({
      name: exerciseName,
      sets: Number(sets) || 1,
      reps: Number(reps) || 10,
      caloriesBurned: calculatedCalories,
      mode: mode === 'ai' ? 'ai' : 'manual',
      completedAt: new Date()
    });

    log.workoutCalories = (log.workoutCalories || 0) + calculatedCalories;
    log.totalCaloriesBurned = (log.estimatedWalkingCalories || 0) + log.workoutCalories;
    log.lastSyncedAt = new Date();

    await log.save();
    return res.status(201).json(log);
  } catch (error) {
    console.error('logWorkoutExercise error:', error);
    return res.status(500).json({ error: 'Failed to log workout exercise' });
  }
};

export const deleteDailyHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await ActivityLog.findOne({ _id: id, userId: req.user._id });
    if (!log) {
      return res.status(404).json({ error: 'Activity record not found' });
    }

    await ActivityLog.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Activity record deleted successfully' });
  } catch (error) {
    console.error('deleteDailyHistory error:', error);
    return res.status(500).json({ error: 'Failed to delete activity record' });
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
