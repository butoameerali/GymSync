/**
 * Progressive Overload & Calibration Engine
 * Calibrates sets, reps, RPE, rest intervals, and volume overload based on user baseline,
 * fitness level, streak, and recent workout fatigue.
 */

export const progressionEngine = {
  /**
   * Determine safe, goal-aligned sets, reps, and RPE for a given exercise
   *
   * @param {Object} options
   * @param {Object} options.exercise - The exercise object
   * @param {string} options.fitnessLevel - 'Beginner' | 'Intermediate' | 'Advanced'
   * @param {string} options.goal - Primary fitness goal
   * @param {number} options.pushupBaseline - User pushup benchmark
   * @param {string} options.phase - Current microcycle phase ('base' | 'overload' | 'peak' | 'deload')
   * @param {boolean} options.isPreEvent - If competition is tomorrow
   * @returns {Object} { sets, reps, rpe, restSec, progressionNotes }
   */
  calibrateSetsAndReps({
    exercise,
    fitnessLevel = 'Beginner',
    goal = 'General Fitness',
    pushupBaseline = 10,
    phase = 'base',
    isPreEvent = false
  } = {}) {
    const isBeginner = fitnessLevel.toLowerCase() === 'beginner';
    const isAdvanced = fitnessLevel.toLowerCase() === 'advanced';
    const pattern = (exercise.movementPattern || '').toLowerCase();
    const g = goal.toLowerCase();

    // Base sets
    let sets = 3;
    if (isBeginner && (pattern === 'anti-extension' || pattern === 'mobility' || pattern === 'rotation')) {
      sets = 2;
    }
    if (isAdvanced && phase !== 'deload') sets = 4;
    if (phase === 'peak') sets = Math.min(4, sets + 1);
    if (phase === 'deload' || isPreEvent) sets = Math.max(2, sets - 1);

    // Reps based on movement pattern and goal
    let reps = 10;
    let rpe = 'RPE 7 (3 reps in reserve)';
    let restSec = 60;

    if (pattern === 'locomotion' || pattern === 'anti-extension') {
      // Timed or isometric
      reps = isBeginner ? 30 : 45; // seconds
      rpe = isBeginner ? 'RPE 6' : 'RPE 7.5';
      restSec = 45;
    } else if (pattern === 'sprinting' || pattern === 'jumping') {
      // Power / explosive
      reps = isBeginner ? 5 : 8;
      rpe = isBeginner ? 'RPE 7' : 'RPE 8';
      restSec = 90;
    } else if (g.includes('strength') || g.includes('power')) {
      reps = isBeginner ? 8 : 5;
      rpe = isBeginner ? 'RPE 7' : 'RPE 8';
      restSec = isBeginner ? 75 : 120;
    } else if (g.includes('endurance') || g.includes('fat burn') || g.includes('weight loss')) {
      reps = Math.min(20, Math.max(12, Math.round(pushupBaseline * 1.2)));
      rpe = isBeginner ? 'RPE 6.5' : 'RPE 8';
      restSec = 45;
    } else if (g.includes('hypertrophy') || g.includes('muscle')) {
      reps = isBeginner ? 10 : 12;
      rpe = isBeginner ? 'RPE 7' : 'RPE 8';
      restSec = 60;
    }

    // Adapt for microcycle phase
    if (phase === 'overload') {
      reps = typeof reps === 'number' ? Math.round(reps * 1.15) : reps;
      rpe = isBeginner ? 'RPE 7.5' : 'RPE 8.5';
    } else if (phase === 'peak') {
      reps = typeof reps === 'number' ? Math.round(reps * 1.25) : reps;
      rpe = isBeginner ? 'RPE 8' : 'RPE 9';
    } else if (phase === 'deload') {
      reps = typeof reps === 'number' ? Math.max(6, Math.round(reps * 0.8)) : reps;
      rpe = 'RPE 6 (Active recovery)';
      restSec = 45;
    }

    if (isPreEvent) {
      rpe = 'RPE 6 (Submaximal activation, zero DOMS)';
      sets = 2;
    }

    return {
      sets,
      reps,
      rpe,
      restSec,
      progressionNotes: `Calibrated for ${fitnessLevel} level under ${phase} progression phase.`
    };
  },

  /**
   * Analyze recent workout history to detect accumulated fatigue and prevent repeating high-fatigue muscle groups
   *
   * @param {Array} history - Array of previous completed workout records
   * @returns {Object} { trainedLegsRecently, trainedPushRecently, trainedPullRecently, suggestedFocus }
   */
  analyzeFatigueState(history = []) {
    if (!Array.isArray(history) || history.length === 0) {
      return {
        trainedLegsRecently: false,
        trainedPushRecently: false,
        trainedPullRecently: false,
        highFatigueDetected: false,
        suggestedFocus: 'balanced'
      };
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const recentWorkouts = history.filter(h => {
      const d = new Date(h.date || h.createdAt || h.completedAt || 0).getTime();
      return (now - d) <= (oneDayMs * 1.5); // last ~36 hours
    });

    let trainedLegsRecently = false;
    let trainedPushRecently = false;
    let trainedPullRecently = false;

    recentWorkouts.forEach(w => {
      const name = (w.name || w.exerciseName || '').toLowerCase();
      const pattern = (w.movementPattern || '').toLowerCase();
      const target = (w.target || w.targetMuscles || []).toString().toLowerCase();

      if (pattern === 'squat' || pattern === 'lunge' || pattern === 'hinge' || target.includes('quad') || target.includes('leg') || name.includes('squat') || name.includes('deadlift')) {
        trainedLegsRecently = true;
      }
      if (pattern === 'horizontal push' || pattern === 'vertical push' || target.includes('chest') || name.includes('bench') || name.includes('push-up')) {
        trainedPushRecently = true;
      }
      if (pattern === 'horizontal pull' || pattern === 'vertical pull' || target.includes('back') || name.includes('row') || name.includes('pull-up')) {
        trainedPullRecently = true;
      }
    });

    let suggestedFocus = 'balanced';
    if (trainedLegsRecently && !trainedPushRecently) {
      suggestedFocus = 'upper_push_pull';
    } else if (trainedPushRecently && !trainedLegsRecently) {
      suggestedFocus = 'lower_mobility';
    } else if (trainedLegsRecently && trainedPushRecently) {
      suggestedFocus = 'active_recovery_core';
    }

    return {
      trainedLegsRecently,
      trainedPushRecently,
      trainedPullRecently,
      highFatigueDetected: trainedLegsRecently && trainedPushRecently,
      suggestedFocus
    };
  }
};

export default progressionEngine;
