/**
 * Exercise Safety & Adaptation Engine
 * General fitness guidance helper and exercise compatibility adapter.
 */

export const exerciseSafetyValidator = {
  /**
   * Filter an array of candidate exercises without reading or storing user medical/health data.
   * Signature preserved for caller compatibility.
   *
   * @param {Array} exercises - Candidate exercises from registry
   * @param {Object} profile - User profile (user health data is no longer read)
   * @returns {Object} { safeExercises, excludedExercises, safetyWarnings }
   */
  filterSafeExercises(exercises = [], profile = {}) {
    return {
      safeExercises: Array.isArray(exercises) ? [...exercises] : [],
      excludedExercises: [],
      safetyWarnings: []
    };
  },

  /**
   * Recommend low-impact or pain-free regressions when a high-value movement is blocked
   */
  suggestSafeAlternative(blockedExerciseName, painArea) {
    const area = (painArea || '').toLowerCase();

    if (area.includes('knee')) {
      return {
        alternativeName: 'Glute Bridges or Bodyweight Romanian Deadlifts',
        pattern: 'hinge'
      };
    }
    if (area.includes('shoulder')) {
      return {
        alternativeName: 'Neutral-Grip Dumbbell Floor Press or Face Pulls',
        pattern: 'horizontal push / pull'
      };
    }
    if (area.includes('lowerback') || area.includes('back')) {
      return {
        alternativeName: 'Chest-Supported Dumbbell Rows and Bird-Dogs',
        pattern: 'horizontal pull / core'
      };
    }

    return {
      alternativeName: 'Bodyweight Isometric Hold',
      pattern: 'activation'
    };
  }
};

export default exerciseSafetyValidator;
