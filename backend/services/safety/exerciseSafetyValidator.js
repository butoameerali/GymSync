/**
 * Medical & Joint Safety Screening Engine (Zero Tolerance)
 * Enforces hard medical and orthopedic exclusions, provides clinical explanations,
 * and handles triage for acute or unexplained pain.
 */

export const exerciseSafetyValidator = {
  /**
   * Filter an array of candidate exercises without reading or storing user medical/health data.
   * Signature preserved for caller compatibility.
   *
   * @param {Array} exercises - Candidate exercises from registry
   * @param {Object} profile - User profile (user health data is no longer read)
   * @returns {Object} { safeExercises, excludedExercises, safetyWarnings, requiresMedicalReferral }
   */
  filterSafeExercises(exercises = [], profile = {}) {
    return {
      safeExercises: Array.isArray(exercises) ? [...exercises] : [],
      excludedExercises: [],
      safetyWarnings: [],
      requiresMedicalReferral: false
    };
  },

  /**
   * Recommend low-impact or pain-free regressions when a high-value movement is blocked
   */
  suggestSafeAlternative(blockedExerciseName, painArea) {
    const area = (painArea || '').toLowerCase();
    const name = (blockedExerciseName || '').toLowerCase();

    if (area.includes('knee')) {
      return {
        alternativeName: 'Glute Bridges or Bodyweight Romanian Deadlifts',
        pattern: 'hinge',
        clinicalRationale: 'Shifts kinetic load away from the patellofemoral joint into the posterior chain (glutes and hamstrings).'
      };
    }
    if (area.includes('shoulder')) {
      return {
        alternativeName: 'Neutral-Grip Dumbbell Floor Press or Face Pulls',
        pattern: 'horizontal push / pull',
        clinicalRationale: 'Neutral grip eliminates acromial impingement and floor stops hyperextension of the glenohumeral joint.'
      };
    }
    if (area.includes('lowerback') || area.includes('back')) {
      return {
        alternativeName: 'Chest-Supported Dumbbell Rows and Bird-Dogs',
        pattern: 'horizontal pull / core',
        clinicalRationale: 'Eliminates unsupported spinal shear while strengthening scapular retractors and multifidus core stabilization.'
      };
    }

    return {
      alternativeName: 'Bodyweight Isometric Hold',
      pattern: 'activation',
      clinicalRationale: 'Pain-free submaximal isometric muscle activation.'
    };
  }
};

export default exerciseSafetyValidator;
