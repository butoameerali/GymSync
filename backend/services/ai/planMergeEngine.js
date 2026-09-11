import workoutDecisionEngine from '../workout/workoutDecisionEngine.js';
import nutritionCalculator from '../nutrition/nutritionCalculator.js';
import GoalGroup from '../../models/GoalGroup.js';

export const planMergeEngine = {
  async detectExistingActivePlan(userId, SavedAIPlanModel) {
    return SavedAIPlanModel.findOne({ userId, isActive: true, supersededBy: null }).sort({ createdAt: -1 });
  },

  async mergePlans({ existingPlan, newGoalRequest }) {
    // In a fully built out merge, this would run workoutDecisionEngine with combined constraints.
    // For Phase 4, we generate the combined string goal and rely on the existing 
    // generation engine to handle the merged goal string (e.g. "Weight Loss + Muscle Gain").
    const combinedGoal = `${existingPlan.goal} + ${newGoalRequest.mainGoalArea || newGoalRequest.goal}`;
    
    return {
      combinedGoal,
      message: `I can merge your existing plan (${existingPlan.title}) with your new goal.`
    };
  }
};

export default planMergeEngine;
