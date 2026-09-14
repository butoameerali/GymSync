import GoalGroup from '../../models/GoalGroup.js';
import SavedAIPlan from '../../models/SavedAIPlan.js';
import WorkoutProgress from '../../models/WorkoutProgress.js';
import ActivityLog from '../../models/ActivityLog.js';
import User from '../../models/User.js';

/**
 * GoalCompletionEngine — Authoritative Goal Lifecycle & Next Goal Architecture
 * 
 * Orchestrates:
 * 1. Criterion evaluation for active GoalGroup completion.
 * 2. Statistical calculation of before/after weights, workout volume, consistency, steps.
 * 3. Authoritative database update on GoalGroup and active SavedAIPlan.
 * 4. Next Goal creation and lifecycle transition.
 */

export const goalCompletionEngine = {
  /**
   * Evaluate if an active goal has met its completion criteria
   */
  async evaluateGoalCompletion(userId) {
    if (!userId) return { canComplete: false, reason: 'No user ID provided' };

    const activeGoalGroup = await GoalGroup.findOne({ userId, status: 'Active' });
    if (!activeGoalGroup) {
      return { canComplete: false, reason: 'No active GoalGroup found for user' };
    }

    const user = await User.findById(userId).select('bioData').lean();
    const currentWeight = user?.bioData?.weight || activeGoalGroup.startWeightKg;
    const targetWeight = activeGoalGroup.targetWeightKg;

    const activePlan = await SavedAIPlan.findOne({ userId, isActive: true }).lean();
    const completedSessions = activePlan?.progress?.completedSessions || [];
    const totalSessions = (activePlan?.calendar || []).length || 28;
    const consistencyPercent = totalSessions > 0 ? Math.round((completedSessions.length / totalSessions) * 100) : 0;

    let targetMet = false;
    if (targetWeight) {
      if (activeGoalGroup.primaryGoalType === 'WeightLoss' && currentWeight <= targetWeight) targetMet = true;
      if (activeGoalGroup.primaryGoalType === 'WeightGain' && currentWeight >= targetWeight) targetMet = true;
      if (Math.abs(currentWeight - targetWeight) <= 0.5) targetMet = true;
    }

    const calendarCompleted = completedSessions.length >= totalSessions && totalSessions > 0;
    const deadlineArrived = activeGoalGroup.deadline ? new Date() >= new Date(activeGoalGroup.deadline) : false;

    return {
      canComplete: targetMet || calendarCompleted || deadlineArrived,
      activeGoalGroup,
      currentWeight,
      targetWeight,
      consistencyPercent,
      completedSessionsCount: completedSessions.length,
      totalSessions,
      targetMet,
      calendarCompleted,
      deadlineArrived
    };
  },

  /**
   * Finalize and archive an active GoalGroup with verified metrics
   */
  async finalizeGoalCompletion({ userId, notes = '' }) {
    if (!userId) throw new Error('User ID is required');

    const activeGoalGroup = await GoalGroup.findOne({ userId, status: 'Active' });
    if (!activeGoalGroup) {
      throw new Error('No active GoalGroup to complete');
    }

    const user = await User.findById(userId).select('name bioData').lean();
    const currentWeight = user?.bioData?.weight || activeGoalGroup.startWeightKg;

    // 1. Gather all activity and workout logs
    const activityLogs = await ActivityLog.find({ userId }).lean();
    const totalSteps = activityLogs.reduce((sum, log) => sum + (log.steps || 0), 0);
    const totalCaloriesBurned = activityLogs.reduce((sum, log) => sum + (log.totalCaloriesBurned || 0), 0);

    const activePlan = await SavedAIPlan.findOne({ userId, isActive: true });
    const completedCount = activePlan?.progress?.completedSessions?.length || 0;
    const totalCount = (activePlan?.calendar || []).length || 28;
    const consistency = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    const completionSummary = {
      startWeightKg: activeGoalGroup.startWeightKg,
      endWeightKg: currentWeight,
      weightDelta: Number((currentWeight - activeGoalGroup.startWeightKg).toFixed(1)),
      totalWorkouts: completedCount,
      totalSteps,
      totalCaloriesBurned,
      consistencyPercent: consistency,
      completedDate: new Date(),
      notes
    };

    // 2. Authoritative update on GoalGroup
    activeGoalGroup.status = 'Completed';
    activeGoalGroup.completedAt = new Date();
    activeGoalGroup.completionSummary = completionSummary;
    await activeGoalGroup.save();

    // 3. Mark current active plan as completed/archived
    if (activePlan) {
      activePlan.isActive = false;
      await activePlan.save();
    }

    // 4. Achievement payload for UI
    const achievementPayload = {
      title: `${activeGoalGroup.title} Complete!`,
      subtitle: `Congratulations ${user?.name || 'Athlete'}! You crushed your program.`,
      beforeWeight: activeGoalGroup.startWeightKg,
      afterWeight: currentWeight,
      totalWorkouts: completedCount,
      totalSteps,
      consistencyPercent: consistency,
      nextGoalsAvailable: [
        { key: 'MuscleBuilding', label: '💪 Build Muscle', desc: 'Hypertrophy & strength progression' },
        { key: 'Endurance', label: '🏃 Improve Endurance', desc: 'Cardiovascular capacity & stamina' },
        { key: 'MaintainWeight', label: '⚖️ Maintain Weight', desc: 'Metabolic equilibrium & habit longevity' },
        { key: 'Strength', label: '⚡ Increase Strength', desc: 'Power, rate of force development & heavy compounds' },
        { key: 'CustomGoal', label: '🎯 Custom Goal', desc: 'Design an adaptive custom roadmap with AI Coach' }
      ]
    };

    return {
      success: true,
      goalGroup: activeGoalGroup,
      completionSummary,
      achievementPayload
    };
  },

  /**
   * Authoritatively initiate next goal and establish new GoalGroup
   */
  async initiateNextGoal({ userId, nextGoalKey, customDetails = {} }) {
    if (!userId) throw new Error('User ID is required');

    const user = await User.findById(userId).select('name bioData');
    if (!user) throw new Error('User not found');

    const currentWeight = user.bioData?.weight || 70;

    // Map goal key to canonical GoalGroup primaryGoalType
    const canonicalGoalMap = {
      'MuscleBuilding': { type: 'MuscleBuilding', title: 'Muscle Building & Hypertrophy' },
      'Endurance': { type: 'Endurance', title: 'Endurance & Stamina Conditioning' },
      'MaintainWeight': { type: 'GeneralFitness', title: 'Weight Maintenance & Longevity' },
      'WeightLoss': { type: 'WeightLoss', title: 'Weight Loss & Fat Reduction' },
      'Strength': { type: 'Strength', title: 'Maximum Strength Development' },
      'CustomGoal': { type: 'GeneralFitness', title: customDetails.title || 'Custom Fitness Goal' }
    };

    const targetConfig = canonicalGoalMap[nextGoalKey] || canonicalGoalMap['GeneralFitness'];

    // Ensure any stale active goals are archived
    await GoalGroup.updateMany({ userId, status: 'Active' }, { status: 'Abandoned' });

    // Create fresh authoritative GoalGroup
    const newGoalGroup = await GoalGroup.create({
      userId,
      userName: user.name,
      title: targetConfig.title,
      primaryGoalType: targetConfig.type,
      startWeightKg: currentWeight,
      targetWeightKg: customDetails.targetWeightKg || null,
      deadline: customDetails.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      status: 'Active',
      weeklyTrainingLoad: {
        plannedSessionsPerWeek: customDetails.daysPerWeek || 4,
        plannedWeeklyCalorieBurn: 1500
      }
    });

    // Update user bioData.mainGoalArea
    if (user.bioData) {
      user.bioData.mainGoalArea = targetConfig.title;
      user.markModified('bioData');
      await user.save();
    }

    return {
      success: true,
      newGoalGroup,
      message: `Fresh Goal established: **${newGoalGroup.title}**. Ready to generate your customized training schedule!`
    };
  }
};

export default goalCompletionEngine;
