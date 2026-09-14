/**
 * Plan Editor Service
 * 
 * Inspects natural language instructions and applies updates (exercise swaps, sets/reps adjustments,
 * day splits) to SavedAIPlan documents and their interactive calendars.
 */

export function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Swaps an old exercise with a new exercise across all days of the plan
 */
export function swapExerciseInPlan(plan, oldName, newName) {
  const normOld = normalizeName(oldName);
  let swapCount = 0;

  const updateList = (exerciseList) => {
    if (!Array.isArray(exerciseList)) return;
    exerciseList.forEach(ex => {
      const currentNorm = normalizeName(ex.name || ex.exerciseName || '');
      if (currentNorm.includes(normOld) || normOld.includes(currentNorm)) {
        ex.name = newName;
        if (ex.exerciseName) ex.exerciseName = newName;
        swapCount++;
      }
    });
  };

  // 1. Update calendar days
  if (Array.isArray(plan.calendar)) {
    plan.calendar.forEach(day => {
      updateList(day.workoutSplit);
      updateList(day.warmup);
      updateList(day.cooldown);
    });
  }

  // 2. Update nested workout structure
  if (plan.workout) {
    if (Array.isArray(plan.workout.interactive_calendar)) {
      plan.workout.interactive_calendar.forEach(day => {
        updateList(day.workoutSplit);
        updateList(day.warmup);
        updateList(day.cooldown);
      });
    }
  }

  return swapCount;
}

/**
 * Adjusts sets and/or reps for exercises in the plan
 */
export function adjustVolumeInPlan(plan, targetSets = null, targetReps = null) {
  let modifiedCount = 0;

  const updateList = (exerciseList) => {
    if (!Array.isArray(exerciseList)) return;
    exerciseList.forEach(ex => {
      if (targetSets !== null) {
        ex.sets = targetSets;
        if (ex.defaultSets) ex.defaultSets = targetSets;
      }
      if (targetReps !== null) {
        ex.reps = targetReps;
        if (ex.defaultReps) ex.defaultReps = targetReps;
      }
      modifiedCount++;
    });
  };

  if (Array.isArray(plan.calendar)) {
    plan.calendar.forEach(day => updateList(day.workoutSplit));
  }
  if (plan.workout && Array.isArray(plan.workout.interactive_calendar)) {
    plan.workout.interactive_calendar.forEach(day => updateList(day.workoutSplit));
  }

  return modifiedCount;
}

/**
 * Parses user instruction and applies changes to the plan
 */
export function applyPlanEdits(plan, instructionText) {
  const text = (instructionText || '').trim();
  const lower = text.toLowerCase();
  const changeNotes = [];

  // Check for Exercise Swap
  // Matches: "swap X with Y", "replace X for Y", "change X to Y"
  const swapMatch = lower.match(/(?:swap|replace|change|substitute)\s+([a-zA-Z0-9\s]+?)\s+(?:for|with|to|instead of)\s+([a-zA-Z0-9\s]+)/i);
  if (swapMatch) {
    const rawOld = swapMatch[1].trim();
    const rawNew = swapMatch[2].trim();
    const formattedNew = rawNew.charAt(0).toUpperCase() + rawNew.slice(1);
    const count = swapExerciseInPlan(plan, rawOld, formattedNew);
    if (count > 0) {
      changeNotes.push(`Replaced **${rawOld}** with **${formattedNew}** in ${count} session(s)`);
    } else {
      changeNotes.push(`Could not find an exercise matching "${rawOld}" to replace`);
    }
  }

  // Check for Sets/Reps Adjustment
  // Matches: "3 sets", "3 sets of 12", "12 reps", "3x12"
  const setsMatch = lower.match(/(\d+)\s*(?:sets|set)/i);
  const repsMatch = lower.match(/(\d+)\s*(?:reps|rep)/i);
  const combinedMatch = lower.match(/(\d+)\s*(?:x|by)\s*(\d+)/i);

  let newSets = null;
  let newReps = null;

  if (combinedMatch) {
    newSets = parseInt(combinedMatch[1], 10);
    newReps = parseInt(combinedMatch[2], 10);
  } else {
    if (setsMatch) newSets = parseInt(setsMatch[1], 10);
    if (repsMatch) newReps = parseInt(repsMatch[1], 10);
  }

  if (newSets !== null || newReps !== null) {
    const count = adjustVolumeInPlan(plan, newSets, newReps);
    if (count > 0) {
      const volumeDesc = [
        newSets !== null ? `${newSets} sets` : null,
        newReps !== null ? `${newReps} reps` : null
      ].filter(Boolean).join(', ');
      changeNotes.push(`Updated workout volume to **${volumeDesc}** across your exercises`);
    }
  }

  return {
    success: changeNotes.length > 0,
    changeNotes,
    summary: changeNotes.length > 0 ? changeNotes.join('. ') : 'Plan updated with your preferences.'
  };
}

export default {
  swapExerciseInPlan,
  adjustVolumeInPlan,
  applyPlanEdits
};
