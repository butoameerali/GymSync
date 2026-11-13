import PreMadePlan from '../../models/PreMadePlan.js';
import Exercise from '../../models/Exercise.js';
import { findRelevantPrograms } from '../fitnessContentService.js';

/**
 * Program & Exercise Matcher
 * Enforces Product Rule R1: AI NEVER authors or edits workout programs.
 * Finds matching human-authored PreMadePlans and library exercises with sourceAttribution.
 */
export async function findMatchingPrograms(userProfile = {}, query = '') {
  const goal = userProfile.mainGoalArea || userProfile.goal || '';
  const difficulty = userProfile.fitnessLevel || '';
  const equipment = userProfile.equipmentAccess || '';
  const sport = userProfile.sport || '';

  // 1. Search existing human-authored published PreMadePlans
  const programs = await findRelevantPrograms({
    query,
    goal,
    difficulty,
    sport,
    equipment,
    limit: 6,
    onlyPublished: true
  });

  // 2. Search library exercises if specific query or target muscles are specified
  let matchingExercises = [];
  try {
    const exerciseConditions = [{ isActive: { $ne: false } }];

    if (query && typeof query === 'string' && query.trim().length > 0) {
      const qEscaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const qRegex = new RegExp(qEscaped, 'i');
      exerciseConditions.push({
        $or: [
          { name: qRegex },
          { targetMuscleGroup: qRegex },
          { movementPattern: qRegex }
        ]
      });
    }

    if (Array.isArray(userProfile.targetMuscles) && userProfile.targetMuscles.length > 0) {
      exerciseConditions.push({
        targetMuscleGroup: { $in: userProfile.targetMuscles }
      });
    }

    const rawExercises = await Exercise.find({ $and: exerciseConditions }).limit(6).lean();
    matchingExercises = rawExercises.map(ex => ({
      _id: ex._id,
      id: ex._id,
      name: ex.name,
      targetMuscleGroup: ex.targetMuscleGroup,
      movementPattern: ex.movementPattern,
      equipmentRequired: ex.equipmentRequired,
      sourceType: 'exercise_library',
      sourceAttribution: {
        sourceType: 'exercise_library',
        sourceId: ex._id.toString(),
        sourceTitle: ex.name
      }
    }));
  } catch (err) {
    console.warn('Exercise search error in programMatcher:', err.message);
  }

  return {
    matchingPrograms: programs,
    matchingExercises,
    sourceAttribution: {
      sourceType: 'human_authored_catalog',
      totalProgramsFound: programs.length,
      totalExercisesFound: matchingExercises.length
    }
  };
}

export default { findMatchingPrograms };
