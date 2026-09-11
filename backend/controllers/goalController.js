import GoalGroup from '../models/GoalGroup.js';
import TrainerReview from '../models/TrainerReview.js';
import User from '../models/User.js';
import { goalSafetyValidator } from '../services/safety/goalSafetyValidator.js';
import ActivityLog from '../models/ActivityLog.js';
import SavedAIPlan from '../models/SavedAIPlan.js';

/**
 * @desc    Evaluate a proposed goal target against safety rules without saving
 * @route   POST /api/goals/evaluate
 * @access  Private
 */
export const evaluateGoalController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bioData name');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      targetWeightKg,
      startWeightKg,
      deadline
    } = req.body;

    const curWeight = Number(startWeightKg) || Number(user.bioData?.weight) || 70;
    const heightCm = Number(user.bioData?.height) || 170;
    const gender = user.bioData?.gender || '';

    const evaluation = goalSafetyValidator.evaluateGoalSafety({
      currentWeightKg: curWeight,
      targetWeightKg: Number(targetWeightKg),
      heightCm,
      gender,
      deadlineDate: deadline
    });

    res.status(200).json({
      success: true,
      evaluation,
      requiresTrainerReview: evaluation.requiresTrainerReview
    });
  } catch (error) {
    console.error('evaluateGoalController Error:', error);
    res.status(500).json({ message: 'Failed to evaluate goal safety' });
  }
};

/**
 * @desc    Create a new GoalGroup (with safety gate and human trainer escalation)
 * @route   POST /api/goals
 * @access  Private
 */
export const createGoalController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      title,
      primaryGoalType,
      secondaryGoalTypes = [],
      targetWeightKg,
      startWeightKg,
      deadline,
      plannedSessionsPerWeek = 3,
      plannedWeeklyCalorieBurn = 0,
      overrideRequested = false,
      userJustification = ''
    } = req.body;

    if (!title || !primaryGoalType) {
      return res.status(400).json({ message: 'Title and primaryGoalType are required' });
    }

    const validGoalTypes = [
      'WeightLoss',
      'WeightGain',
      'MuscleBuilding',
      'Endurance',
      'Strength',
      'GeneralFitness',
      'SportsPerformance'
    ];

    if (!validGoalTypes.includes(primaryGoalType)) {
      return res.status(400).json({
        message: `Invalid primaryGoalType. Must be one of: ${validGoalTypes.join(', ')}`
      });
    }

    const curWeight = Number(startWeightKg) || Number(user.bioData?.weight) || 70;
    const heightCm = Number(user.bioData?.height) || 170;
    const tarWeight = targetWeightKg != null ? Number(targetWeightKg) : null;

    // Safety check if target weight is specified
    let safetyCheck = { flagged: false, reason: null, warningMessage: null, requiresTrainerReview: false };
    if (tarWeight != null) {
      safetyCheck = goalSafetyValidator.evaluateGoalSafety({
        currentWeightKg: curWeight,
        targetWeightKg: tarWeight,
        heightCm,
        gender: user.bioData?.gender,
        deadlineDate: deadline
      });
    }

    // 1. Goal is flagged and user has NOT explicitly insisted/requested override:
    if (safetyCheck.flagged && !overrideRequested) {
      return res.status(200).json({
        success: false,
        status: 'safety_warning',
        flagged: true,
        reason: safetyCheck.reason,
        warningMessage: safetyCheck.warningMessage,
        currentBMI: safetyCheck.currentBMI,
        projectedBMI: safetyCheck.projectedBMI,
        weeklyRateKg: safetyCheck.weeklyRateKg,
        maxSafeWeeklyKg: safetyCheck.maxSafeWeeklyKg,
        requiresTrainerReview: true,
        message: 'Goal safety warning triggered. Review required before activation.'
      });
    }

    // Generate milestones
    const milestones = tarWeight != null
      ? goalSafetyValidator.generateMilestones({
          startWeightKg: curWeight,
          targetWeightKg: tarWeight,
          deadlineDate: deadline,
          count: 4
        })
      : [];

    // 2. Goal is flagged and user insists (overrideRequested === true):
    if (safetyCheck.flagged && overrideRequested) {
      // Create GoalGroup in 'PendingReview' state
      const goalGroup = await GoalGroup.create({
        userId: user._id,
        userName: user.name,
        title: title.trim(),
        status: 'PendingReview',
        primaryGoalType,
        secondaryGoalTypes,
        startWeightKg: curWeight,
        targetWeightKg: tarWeight,
        deadline: deadline ? new Date(deadline) : null,
        milestones,
        weeklyTrainingLoad: {
          plannedSessionsPerWeek: Number(plannedSessionsPerWeek) || 3,
          plannedWeeklyCalorieBurn: Number(plannedWeeklyCalorieBurn) || 0
        }
      });

      // Create TrainerReview document for the trainer queue
      const trainerReview = await TrainerReview.create({
        userId: user._id,
        userName: user.name,
        reviewType: 'GoalTarget',
        goalGroupId: goalGroup._id,
        requestedTargetWeightKg: tarWeight,
        requestedDeadline: deadline ? new Date(deadline) : null,
        currentWeightKg: curWeight,
        currentBMI: safetyCheck.currentBMI,
        projectedBMI: safetyCheck.projectedBMI,
        flagReason: safetyCheck.reason,
        warningMessage: safetyCheck.warningMessage,
        userJustification: userJustification.trim() || 'User requested override',
        status: 'Pending'
      });

      return res.status(201).json({
        success: true,
        status: 'pending_trainer_review',
        message: 'Your goal has been escalated to our certified fitness trainers for safety verification. Plan activation is paused until approved.',
        goalGroup,
        trainerReviewId: trainerReview._id
      });
    }

    // 3. Goal is safe: activate immediately
    // Archive or complete previous active goals for this user
    await GoalGroup.updateMany(
      { userId: user._id, status: 'Active' },
      { status: 'Completed', completedAt: new Date() }
    );

    const goalGroup = await GoalGroup.create({
      userId: user._id,
      userName: user.name,
      title: title.trim(),
      status: 'Active',
      primaryGoalType,
      secondaryGoalTypes,
      startWeightKg: curWeight,
      targetWeightKg: tarWeight,
      deadline: deadline ? new Date(deadline) : null,
      milestones,
      weeklyTrainingLoad: {
        plannedSessionsPerWeek: Number(plannedSessionsPerWeek) || 3,
        plannedWeeklyCalorieBurn: Number(plannedWeeklyCalorieBurn) || 0
      }
    });

    return res.status(201).json({
      success: true,
      status: 'active',
      message: 'Goal created and activated successfully.',
      goalGroup
    });
  } catch (error) {
    console.error('createGoalController Error:', error);
    res.status(500).json({ message: 'Failed to create goal' });
  }
};

/**
 * @desc    Get the current active or pending goal for the authenticated user
 * @route   GET /api/goals/active
 * @access  Private
 */
export const getActiveGoalController = async (req, res) => {
  try {
    const activeGoal = await GoalGroup.findOne({
      userId: req.user._id,
      status: { $in: ['Active', 'PendingReview'] }
    }).sort({ createdAt: -1 });

    let pendingReview = null;
    if (activeGoal && activeGoal.status === 'PendingReview') {
      pendingReview = await TrainerReview.findOne({
        goalGroupId: activeGoal._id,
        status: 'Pending'
      }).select('-__v');
    }

    res.status(200).json({
      success: true,
      goalGroup: activeGoal || null,
      pendingReview
    });
  } catch (error) {
    console.error('getActiveGoalController Error:', error);
    res.status(500).json({ message: 'Failed to retrieve active goal' });
  }
};

/**
 * @desc    Abandon or cancel a goal group
 * @route   PUT /api/goals/:id/abandon
 * @access  Private
 */
export const abandonGoalController = async (req, res) => {
  try {
    const goalGroup = await GoalGroup.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!goalGroup) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    goalGroup.status = 'Abandoned';
    goalGroup.completedAt = new Date();
    await goalGroup.save();

    // Cancel any pending review linked to this goal
    await TrainerReview.updateMany(
      { goalGroupId: goalGroup._id, status: 'Pending' },
      { status: 'Rejected', trainerNotes: 'Goal was abandoned by user' }
    );

    res.status(200).json({
      success: true,
      message: 'Goal marked as abandoned',
      goalGroup
    });
  } catch (error) {
    console.error('abandonGoalController Error:', error);
    res.status(500).json({ message: 'Failed to abandon goal' });
  }
};

/**
 * @desc    Complete a goal — compute summary from ActivityLog + workout records
 * @route   POST /api/goals/:id/complete
 * @access  Private
 */

export const completeGoalController = async (req, res) => {
  try {
    const goalGroup = await GoalGroup.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!goalGroup) return res.status(404).json({ message: 'Goal not found' });

    const user = await User.findById(req.user._id).select('bioData name');

    // Aggregate stats since goal start date
    const startDate = (goalGroup.createdAt || new Date()).toISOString().split('T')[0];
    const activityLogs = await ActivityLog.find({
      userId: req.user._id,
      date: { $gte: startDate }
    });

    const totalSteps = activityLogs.reduce((s, l) => s + (l.steps || 0), 0);
    const completedPlans = await SavedAIPlan.find({
      userId: req.user._id,
      createdAt: { $gte: goalGroup.createdAt }
    });
    const totalWorkouts = completedPlans.reduce((s, p) =>
      s + (p.progress?.completedSessions?.length || 0), 0);

    const consistencyPercent = goalGroup.weeklyTrainingLoad?.plannedSessionsPerWeek
      ? Math.min(100, Math.round((totalWorkouts / Math.max(1, Math.ceil((Date.now() - new Date(goalGroup.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) * goalGroup.weeklyTrainingLoad.plannedSessionsPerWeek)) * 100))
      : null;

    const endWeightKg = user?.bioData?.weight || goalGroup.startWeightKg;

    goalGroup.status = 'Completed';
    goalGroup.completedAt = new Date();
    goalGroup.completionSummary = {
      startWeightKg: goalGroup.startWeightKg,
      endWeightKg,
      totalWorkouts,
      totalSteps,
      consistencyPercent
    };
    await goalGroup.save();

    return res.status(200).json({
      success: true,
      message: 'Goal completed! Great work.',
      completionSummary: goalGroup.completionSummary,
      goalGroup
    });
  } catch (error) {
    console.error('completeGoalController Error:', error);
    return res.status(500).json({ message: 'Failed to complete goal' });
  }
};
