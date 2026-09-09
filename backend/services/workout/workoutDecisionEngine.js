import exerciseRegistry from './exerciseRegistry.js';
import exerciseSafetyValidator from '../safety/exerciseSafetyValidator.js';
import sportProfileEngine from './sportProfileEngine.js';
import warmupEngine from './warmupEngine.js';
import progressionEngine from '../progression/progressionEngine.js';
import eventAwarenessEngine, { EVENT_TYPES } from './eventAwarenessEngine.js';

/**
 * 17-Step Structured Workout Decision Pipeline with External Event & Workload Reasoning
 *
 * USER PROFILE -> GOAL ANALYSIS -> SPORT/EVENT DEMANDS -> FITNESS LEVEL ->
 * MEDICAL / INJURY SAFETY SCREEN -> EQUIPMENT FILTER -> TIME BUDGET ->
 * CUMULATIVE FATIGUE (YESTERDAY & TOMORROW) -> EXERCISE HIERARCHY ->
 * SETS / REPS / RPE / REST -> 4-PHASE WARM-UP -> MAIN WORK -> ACCESSORY ->
 * COOLDOWN -> REJECTED EXERCISES AUDIT -> EXPLAINABLE RATIONALE.
 */

export const workoutDecisionEngine = {
  /**
   * Generates a fully reasoned, clinically screened workout session
   *
   * @param {Object} input
   * @param {Object} input.userProfile - Complete bio data
   * @param {Array} input.recentWorkoutHistory - Past completed workout records
   * @param {string} input.contextMessage - Any real-time user instructions
   * @param {Object} input.externalActivity - External event / competition details
   * @param {string} input.microcyclePhase - 'base' | 'overload' | 'peak' | 'deload'
   * @param {number} input.dayNumber - Calendar day sequence number (1-28)
   * @returns {Object} Reasoned workout session with explainable rationale
   */
  generateSession({
    userProfile = {},
    recentWorkoutHistory = [],
    contextMessage = '',
    externalActivity = null,
    microcyclePhase = 'base',
    dayNumber = 1
  } = {}) {
    const rawContext = (contextMessage || '').toLowerCase();

    // 1. USER PROFILE INTAKE & NORMALIZATION
    const fitnessLevel = userProfile.fitnessLevel || 'Beginner';
    const primaryGoal = userProfile.mainGoalArea || userProfile.primaryGoal || (userProfile.goals && userProfile.goals[0]) || 'General Fitness';
    const equipmentAccess = userProfile.equipmentAccess || 'Full Gym';
    const sessionDurationMins = parseInt(userProfile.sessionDurationMins || userProfile.sessionDuration || 45, 10);
    const pushupBaseline = parseInt(userProfile.pushupBaseline || 10, 10);

    // 2. EXTERNAL EVENT & SPORT DETECTION
    const detectedEvent = externalActivity || eventAwarenessEngine.detectEvent(contextMessage);
    const eventDemands = detectedEvent ? eventAwarenessEngine.getEventDemands(detectedEvent) : null;
    const sportProfile = sportProfileEngine.detectSport(userProfile, contextMessage);
    const eventFatigueAnalysis = sportProfileEngine.evaluateEventFatigueRisk(userProfile, contextMessage);

    // 3. RECOVERY & CUMULATIVE WORKLOAD ANALYSIS
    const fatigueState = progressionEngine.analyzeFatigueState(recentWorkoutHistory);

    // Check for explicit multi-day workload conflict (e.g. yesterday legs, tomorrow football)
    const trainedLegsYesterday = rawContext.includes('trained legs heavily yesterday') ||
      rawContext.includes('heavy legs yesterday') ||
      (rawContext.includes('yesterday') && (rawContext.includes('leg') || rawContext.includes('squat'))) ||
      fatigueState.trainedLegsRecently;

    const hasEventTomorrow = (detectedEvent && detectedEvent.proximityDays <= 1) ||
      eventFatigueAnalysis.isPreEvent ||
      rawContext.includes('match tomorrow') ||
      rawContext.includes('football practice') ||
      rawContext.includes('race tomorrow') ||
      rawContext.includes('army training tomorrow');

    // 4. ASSIGN SESSION ADAPTATION PURPOSE & SPLIT
    let sessionObjective = 'General Muscular & Postural Conditioning';
    let sessionType = 'full'; // 'upper', 'lower', 'full', 'core_cardio'
    let decisionRejectedExercises = [];

    if (trainedLegsYesterday && hasEventTomorrow) {
      // Conflict resolution: Legs yesterday + sport tomorrow -> Strictly Upper Body / Core / Mobility
      sessionObjective = detectedEvent
        ? `Upper Body & Core Stability (${detectedEvent.name} Preparation - Lower Body Protected)`
        : 'Upper Body & Core Stabilization (Lower Body Protected for Tomorrow)';
      sessionType = 'upper';
      decisionRejectedExercises.push(
        { name: 'Barbell Back Squats / Heavy Lunges', reason: 'Rejected: Heavy leg work yesterday + upcoming external activity tomorrow requires strict lower-body fatigue protection.' }
      );
    } else if (eventDemands && eventDemands.isTomorrow) {
      // Event tomorrow (e.g. Army training, 5K race, Football match, Cricket)
      sessionObjective = eventDemands.priorityFocus;
      if (detectedEvent.type === EVENT_TYPES.FOOTBALL_MATCH) {
        sessionType = 'upper';
        decisionRejectedExercises.push({ name: 'Barbell Back Squats', reason: 'Rejected to preserve hamstrings and adductors for tomorrow\'s football match.' });
      } else if (detectedEvent.type === EVENT_TYPES.RUNNING_RACE) {
        sessionType = 'core_cardio';
        decisionRejectedExercises.push({ name: 'Leg Press & Sprints', reason: 'Rejected to preserve muscle glycogen and tendon elasticity for tomorrow\'s race.' });
      } else if (detectedEvent.type === EVENT_TYPES.ARMY_TRAINING || detectedEvent.type === EVENT_TYPES.POLICE_TEST) {
        sessionType = 'core_cardio';
        decisionRejectedExercises.push(
          { name: 'Heavy Bench Press & Weighted Pull-ups', reason: 'Rejected: Preserving upper-body pushing/pulling strength for tomorrow\'s calisthenics test.' },
          { name: 'Heavy Barbell Squats', reason: 'Rejected: Preserving leg freshness for running and obstacle course.' }
        );
      } else {
        sessionType = 'core_cardio';
      }
    } else if (eventFatigueAnalysis.isPreEvent) {
      sessionObjective = `Match-Eve Priming & Rotational Activation (${sportProfile.sportName})`;
      sessionType = 'core_cardio';
    } else if (trainedLegsYesterday) {
      sessionObjective = 'Upper-Body Strength & Trunk Stabilization (Lower-Body Recovery)';
      sessionType = 'upper';
      decisionRejectedExercises.push({ name: 'Heavy Squats & Deadlifts', reason: 'Rejected: Legs trained within last 36 hours.' });
    } else if (fatigueState.trainedPushRecently) {
      sessionObjective = 'Lower-Body Power, Posterior Chain & Mobility';
      sessionType = 'lower';
    } else if (sportProfile.sportName === 'Cricket') {
      sessionObjective = dayNumber % 2 === 1
        ? 'Cricket Lower-Body Drive, Deceleration & Rotational Core'
        : 'Cricket Scapular Stability, Rotational Power & Kinetic Chain';
      sessionType = dayNumber % 2 === 1 ? 'lower' : 'upper';
    } else if (sportProfile.sportName === 'Running / Track') {
      sessionObjective = 'Running Cadence Economy, Gluteus Medius Activation & Core Endurance';
      sessionType = 'lower';
    } else if (primaryGoal.toLowerCase().includes('weight loss') || primaryGoal.toLowerCase().includes('fat burn')) {
      sessionObjective = 'High-Density Metabolic Conditioning & Total Body Resistance';
      sessionType = 'full';
    } else if (primaryGoal.toLowerCase().includes('muscle') || primaryGoal.toLowerCase().includes('hypertrophy')) {
      sessionObjective = dayNumber % 2 === 1
        ? 'Upper-Body Hypertrophy & Progressive Volume'
        : 'Lower-Body Hypertrophy & Unilateral Stability';
      sessionType = dayNumber % 2 === 1 ? 'upper' : 'lower';
    }

    // 5. EXERCISE CANDIDATE GENERATION & EQUIPMENT FILTERING
    let allCandidates = exerciseRegistry.getAll();
    allCandidates = exerciseRegistry.filterByEquipment(allCandidates, equipmentAccess);

    // 6. MEDICAL & JOINT SAFETY SCREENING (Zero Tolerance)
    const { safeExercises, excludedExercises, safetyWarnings, requiresMedicalReferral } =
      exerciseSafetyValidator.filterSafeExercises(allCandidates, userProfile);

    // 7. TIME BUDGETING
    const targetExerciseCount = sessionDurationMins <= 25 ? 3 : sessionDurationMins <= 35 ? 4 : 5;
    const isPreEvent = hasEventTomorrow || (eventDemands && eventDemands.isTomorrow);

    const selectedExercises = [];
    const usedMovementPatterns = new Set();
    const usedMuscles = new Set();

    const isExerciseProhibitedByEvent = (ex) => {
      if (!eventDemands?.heavyExercisesProhibited) return false;
      return eventDemands.heavyExercisesProhibited.some(p =>
        ex.name.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(ex.name.toLowerCase())
      );
    };

    // Priority 1: Main Priority Movement
    let priority1Candidates = safeExercises.filter(ex => {
      if (isExerciseProhibitedByEvent(ex)) return false;
      if (sessionType !== 'core_cardio' && !ex.mainWorkSuitability) return false;
      if (isPreEvent && ex.fatigueCost === 'high') return false;
      if (trainedLegsYesterday && ['squat', 'hinge', 'lunge'].includes(ex.movementPattern)) return false;

      if (sessionType === 'upper') {
        return ex.movementPattern === 'horizontal push' || ex.movementPattern === 'vertical pull' || ex.movementPattern === 'horizontal pull';
      }
      if (sessionType === 'lower') {
        return ex.movementPattern === 'squat' || ex.movementPattern === 'hinge';
      }
      if (sessionType === 'core_cardio') {
        return ex.movementPattern === 'anti-rotation' || ex.movementPattern === 'rotation' || ex.movementPattern === 'mobility' || ex.movementPattern === 'conditioning' || ex.movementPattern === 'activation';
      }
      return ex.fatigueCost === 'high' || ex.difficulty === 'Intermediate' || ex.equipment === 'Barbell' || ex.movementPattern === 'squat' || ex.movementPattern === 'horizontal push';
    });

    if (sportProfile.sportName !== 'General Fitness & Transformation') {
      const sportSpecific = priority1Candidates.filter(ex => ex.sportRelevance.includes(sportProfile.sportName.toLowerCase().split(' ')[0]));
      if (sportSpecific.length > 0) priority1Candidates = sportSpecific;
    }

    const priority1 = priority1Candidates[0] ||
      safeExercises.find(e => !isExerciseProhibitedByEvent(e) && (sessionType === 'core_cardio' ? (e.movementPattern === 'anti-rotation' || e.movementPattern === 'rotation' || e.movementPattern === 'mobility' || e.movementPattern === 'activation') : e.mainWorkSuitability)) ||
      safeExercises.find(e => !isExerciseProhibitedByEvent(e)) ||
      safeExercises[0];

    if (priority1) {
      selectedExercises.push({
        ...priority1,
        hierarchyRole: 'Main Priority Movement',
        purpose: `Primary compound driver for ${sessionObjective}. Trained first when central nervous system is fresh.`
      });
      usedMovementPatterns.add(priority1.movementPattern);
      (priority1.primaryMuscles || []).forEach(m => usedMuscles.add(m));
    }

    // Priority 2: Secondary Movement (Antagonist or complementary movement)
    let priority2Candidates = safeExercises.filter(ex => {
      if (isExerciseProhibitedByEvent(ex)) return false;
      if (sessionType !== 'core_cardio' && !ex.mainWorkSuitability) return false;
      if (ex.exerciseId === selectedExercises[0]?.exerciseId) return false;
      if (usedMovementPatterns.has(ex.movementPattern)) return false;
      if (isPreEvent && ex.fatigueCost === 'high') return false;
      if (trainedLegsYesterday && ['squat', 'hinge', 'lunge'].includes(ex.movementPattern)) return false;

      if (sessionType === 'upper') {
        if (selectedExercises[0]?.movementPattern.includes('push')) {
          return ex.movementPattern === 'horizontal pull' || ex.movementPattern === 'vertical pull';
        }
        return ex.movementPattern === 'horizontal push' || ex.movementPattern === 'vertical push';
      }
      if (sessionType === 'lower') {
        if (selectedExercises[0]?.movementPattern === 'squat') {
          return ex.movementPattern === 'hinge' || ex.movementPattern === 'lunge';
        }
        return ex.movementPattern === 'squat' || ex.movementPattern === 'lunge';
      }
      if (sessionType === 'core_cardio') {
        return ex.movementPattern === 'mobility' || ex.movementPattern === 'activation' || ex.movementPattern === 'anti-extension';
      }
      return !usedMovementPatterns.has(ex.movementPattern);
    });

    const priority2 = priority2Candidates[0] ||
      safeExercises.find(e => !isExerciseProhibitedByEvent(e) && e.exerciseId !== selectedExercises[0]?.exerciseId && (sessionType === 'core_cardio' ? true : e.mainWorkSuitability)) ||
      safeExercises.find(e => !isExerciseProhibitedByEvent(e) && e.exerciseId !== selectedExercises[0]?.exerciseId);

    if (priority2) {
      selectedExercises.push({
        ...priority2,
        hierarchyRole: 'Secondary Compound Movement',
        purpose: 'Complementary movement to balance joint loading and prevent muscle imbalances.'
      });
      usedMovementPatterns.add(priority2.movementPattern);
      (priority2.primaryMuscles || []).forEach(m => usedMuscles.add(m));
    }

    // Priority 3: Supporting / Unilateral Movement
    if (targetExerciseCount >= 3) {
      let priority3Candidates = safeExercises.filter(ex => {
        if (isExerciseProhibitedByEvent(ex)) return false;
        if (selectedExercises.some(s => s.exerciseId === ex.exerciseId)) return false;
        if (isPreEvent && ex.fatigueCost === 'high') return false;
        if (trainedLegsYesterday && ['squat', 'hinge', 'lunge'].includes(ex.movementPattern)) return false;

        if (sessionType === 'core_cardio') {
          return ex.movementPattern === 'rotation' || ex.movementPattern === 'anti-rotation' || ex.movementPattern === 'mobility';
        }
        return ex.movementPattern === 'lunge' || ex.movementPattern === 'horizontal pull' || ex.movementPattern === 'vertical push' || ex.accessorySuitability;
      });

      const priority3 = priority3Candidates[0] ||
        safeExercises.find(e => !isExerciseProhibitedByEvent(e) && !selectedExercises.some(s => s.exerciseId === e.exerciseId));
      if (priority3) {
        selectedExercises.push({
          ...priority3,
          hierarchyRole: 'Supporting Movement',
          purpose: 'Unilateral stability and joint integrity to build functional resilience.'
        });
        usedMovementPatterns.add(priority3.movementPattern);
        (priority3.primaryMuscles || []).forEach(m => usedMuscles.add(m));
      }
    }

    // Priority 4: Core / Rotational Finisher
    if (targetExerciseCount >= 4) {
      let coreCandidates = safeExercises.filter(ex => {
        if (selectedExercises.some(s => s.exerciseId === ex.exerciseId)) return false;
        if (sportProfile.sportName === 'Cricket' || sportProfile.sportName === 'Combat Sports / Boxing / MMA') {
          return ex.movementPattern === 'rotation' || ex.movementPattern === 'anti-rotation';
        }
        return ex.movementPattern === 'anti-extension' || ex.movementPattern === 'anti-rotation' || ex.movementPattern === 'rotation' || ex.movementPattern === 'conditioning';
      });

      const coreEx = coreCandidates[0] || safeExercises.find(e => e.movementPattern.includes('anti-') || e.movementPattern === 'rotation') || safeExercises[0];
      if (coreEx && !selectedExercises.some(s => s.exerciseId === coreEx.exerciseId)) {
        selectedExercises.push({
          ...coreEx,
          hierarchyRole: 'Core & Trunk Stability',
          purpose: 'Reinforces spinal neutrality and rotational kinetic transfer.'
        });
      }
    }

    // Priority 5: Accessory / Shoulder Health / Posture
    if (targetExerciseCount >= 5 && selectedExercises.length < 5) {
      const accessory = safeExercises.find(ex =>
        !selectedExercises.some(s => s.exerciseId === ex.exerciseId) &&
        (ex.name.toLowerCase().includes('face pull') || ex.accessorySuitability || ex.movementPattern === 'conditioning' || ex.movementPattern === 'mobility')
      );
      if (accessory) {
        selectedExercises.push({
          ...accessory,
          hierarchyRole: 'Accessory / Health Finisher',
          purpose: 'Accessory work targeting rotator cuff, postural endurance, and joint health.'
        });
      }
    }

    // 8. CALIBRATE SETS, REPS, RPE, REST & TIME BUDGETING
    let calculatedWorkSec = 0;
    const finalExercises = selectedExercises.map((ex) => {
      const { sets, reps, rpe, restSec, progressionNotes } = progressionEngine.calibrateSetsAndReps({
        exercise: ex,
        fitnessLevel,
        goal: primaryGoal,
        pushupBaseline,
        phase: microcyclePhase,
        isPreEvent
      });

      const secPerRep = ex.estimatedSecPerRep || 3.5;
      const repCount = typeof reps === 'number' ? reps : 10;
      const exerciseTimeSec = (sets * (repCount * secPerRep)) + ((sets - 1) * restSec) + 60;
      calculatedWorkSec += exerciseTimeSec;

      const reasonForSelection = `Selected as ${ex.hierarchyRole} to train ${ex.movementPattern} for ${sessionObjective}. Matches ${equipmentAccess} equipment and cleared all medical safety screens.`;

      return {
        exerciseId: ex.exerciseId,
        id: ex.exerciseId,
        name: ex.name,
        hierarchyRole: ex.hierarchyRole,
        purpose: ex.purpose,
        targetMuscles: ex.primaryMuscles || ['Full Body'],
        target: (ex.primaryMuscles || []).join(', '),
        movementPattern: ex.movementPattern,
        trainingQuality: ex.trainingQualities?.[0] || 'strength',
        difficulty: ex.difficulty,
        equipment: ex.equipment,
        equipmentCategory: ex.equipmentCategory || ex.equipment,
        medicalSafety: `Cleared safety screen for ${userProfile.jointPain?.join(', ') || 'clear joints'}.`,
        progressionLevel: `${microcyclePhase.toUpperCase()} Phase`,
        fatigueCost: ex.fatigueCost,
        sportRelevance: ex.sportRelevance,
        reasonForSelection,
        sets,
        reps,
        rpe,
        restSec,
        progressionNotes,
        isAiTrackable: ex.isAiTrackable || false,
        aiDetection: ex.aiDetection || { enabled: false },
        points: ex.difficulty === 'Advanced' ? 3 : ex.difficulty === 'Intermediate' ? 2 : 1
      };
    });

    // 9. REASONED WARM-UP & COOL-DOWN
    const musclesInSession = Array.from(usedMuscles);
    const warmup = warmupEngine.generateReasonedWarmup({
      sessionType,
      targetMuscles: musclesInSession,
      sport: sportProfile,
      jointPain: userProfile.jointPain || [],
      sessionDurationMins
    });

    const cooldown = warmupEngine.generateReasonedCooldown({
      sessionType,
      targetMuscles: musclesInSession,
      sessionDurationMins
    });

    const totalEstimatedMinutes = Math.round((calculatedWorkSec / 60) + warmup.totalEstimatedMinutes + cooldown.totalEstimatedMinutes);

    // 10. STRUCTURED EXPLAINABLE RATIONALE
    const exerciseReasonsMap = {};
    finalExercises.forEach(e => {
      exerciseReasonsMap[e.name] = e.purpose;
    });

    const rationale = {
      sessionGoal: sessionObjective,
      constraints: [
        `Equipment: ${equipmentAccess}`,
        `Duration: ${sessionDurationMins} minutes`,
        ...(detectedEvent ? [`Upcoming Event: ${detectedEvent.name} (${detectedEvent.dateDescription})`] : []),
        ...(trainedLegsYesterday ? ['Recent Heavy Leg Workload (Yesterday)'] : [])
      ],
      risks: [
        ...(isPreEvent ? ['Risk of muscle soreness or fatigue compromising tomorrow\'s external physical performance'] : []),
        ...(userProfile.jointPain?.length ? [`Risk of joint aggravation for ${userProfile.jointPain.join(', ')}`] : [])
      ],
      selectedExercises: finalExercises.map(e => e.name),
      rejectedExercises: decisionRejectedExercises,
      exerciseReasons: exerciseReasonsMap,
      expectedFatigue: isPreEvent ? 'low' : 'moderate',
      recoveryConsiderations: [
        'Hydrate adequately (minimum 2.5-3L water)',
        'Ensure 7-8 hours of sleep for neuromuscular restoration',
        ...(isPreEvent ? ['Do not perform extra unscheduled sprints or lifting today'] : [])
      ]
    };

    return {
      sessionTitle: `Day ${dayNumber}: ${sessionObjective}`,
      sessionObjective,
      sessionType,
      sport: detectedEvent ? detectedEvent.name : sportProfile.sportName,
      timeBudget: {
        requestedDurationMinutes: sessionDurationMins,
        totalEstimatedMinutes,
        warmupMinutes: warmup.totalEstimatedMinutes,
        mainWorkMinutes: Math.round(calculatedWorkSec / 60),
        cooldownMinutes: cooldown.totalEstimatedMinutes,
        isWithinBudget: Math.abs(totalEstimatedMinutes - sessionDurationMins) <= 8
      },
      preEventStrategy: eventDemands || (eventFatigueAnalysis.isPreEvent ? eventFatigueAnalysis : null),
      externalActivity: detectedEvent,
      warmup,
      mainWorkout: finalExercises,
      exercises: finalExercises,
      cooldown,
      rationale,
      medicalSafetyReview: {
        safeExercisesCount: safeExercises.length,
        excludedCount: excludedExercises.length,
        excludedExercises,
        safetyWarnings,
        requiresMedicalReferral
      }
    };
  }
};

export default workoutDecisionEngine;
