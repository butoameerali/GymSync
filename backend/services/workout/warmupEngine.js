/**
 * Reasoned Warm-Up & Cool-Down Engine
 * Dynamically constructs physiological preparation and post-workout recovery routines
 * tailored to target session anatomy, sport discipline, user injuries, and time budget.
 */

export const warmupEngine = {
  /**
   * Generate a phased, clinically reasoned warm-up routine
   *
   * @param {Object} options
   * @param {string} options.sessionType - 'upper' | 'lower' | 'full' | 'core_cardio'
   * @param {Array} options.targetMuscles - Muscle groups in main workout
   * @param {Object} options.sport - Sport profile object
   * @param {Array} options.jointPain - Joint restrictions
   * @param {number} options.sessionDurationMins - Total workout time
   * @returns {Object} { warmupExercises, totalEstimatedMinutes, reasoning }
   */
  generateReasonedWarmup({
    sessionType = 'full',
    targetMuscles = [],
    sport = null,
    jointPain = [],
    sessionDurationMins = 45
  } = {}) {
    const isShortSession = sessionDurationMins <= 30;
    const items = [];
    const sportName = sport?.sportName || 'General Fitness';

    // Phase 1: General Core Temperature & Systemic Blood Flow (60-90s)
    if (!jointPain.includes('knees') && !jointPain.includes('ankles')) {
      items.push({
        name: 'Light Dynamic Jumping Jacks or High Knee March',
        phase: '1. Temperature Elevation',
        duration: isShortSession ? '60 sec' : '90 sec',
        purpose: 'Elevate core body temperature, increase synovial joint fluid viscosity, and prime heart rate.',
        repsOrDuration: '60-90 sec'
      });
    } else {
      items.push({
        name: 'Standing Arm Swings & Torso Rotations',
        phase: '1. Temperature Elevation (Low Impact)',
        duration: '60 sec',
        purpose: 'Low-impact core temperature elevation avoiding knee/ankle impact.',
        repsOrDuration: '60 sec'
      });
    }

    // Phase 2: Joint-Specific Dynamic Mobility
    const involvesUpper = sessionType === 'upper' || sessionType === 'full' || targetMuscles.some(m => ['Chest', 'Back', 'Shoulders'].includes(m));
    const involvesLower = sessionType === 'lower' || sessionType === 'full' || targetMuscles.some(m => ['Quadriceps', 'Hamstrings', 'Glutes'].includes(m));

    if (involvesUpper || sportName === 'Cricket' || sportName === 'Combat Sports / Boxing / MMA') {
      items.push({
        name: 'Arm Circles & Controlled Shoulder Dislocates',
        phase: '2. Dynamic Joint Mobility (Upper)',
        duration: '60 sec',
        purpose: 'Mobilize glenohumeral joint capsule and improve thoracic extension.',
        repsOrDuration: '10 reps each direction'
      });
    }

    if (involvesLower || sportName === 'Running / Track' || sportName === 'Football / Soccer') {
      items.push({
        name: 'Ankle & Hip 90/90 Mobility Rotations',
        phase: '2. Dynamic Joint Mobility (Lower)',
        duration: '60 sec',
        purpose: 'Increase hip internal/external rotation and ankle dorsiflexion for clean squat/lunge mechanics.',
        repsOrDuration: '8 reps per side'
      });
    }

    // Phase 3: Neuromuscular Activation (Firing the prime stabilizers)
    if (involvesUpper) {
      items.push({
        name: 'Scapular Squeeze / Band Pull-Aparts',
        phase: '3. Stabilizer Activation',
        duration: '45 sec',
        purpose: 'Activate lower trapezius, rhomboids, and rotator cuff to secure the scapula during pressing/pulling.',
        repsOrDuration: '12 controlled reps'
      });
    }

    if (involvesLower) {
      items.push({
        name: 'Bodyweight Glute Bridges & Clamshells',
        phase: '3. Stabilizer Activation',
        duration: '45 sec',
        purpose: 'Awaken the gluteus maximus and medius to prevent knee valgus collapse during compound loading.',
        repsOrDuration: '10-12 reps'
      });
    }

    // Phase 4: Movement-Specific Rehearsal
    if (involvesLower) {
      items.push({
        name: 'Slow Tempo Bodyweight Squat Rehearsal',
        phase: '4. Movement Pattern Rehearsal',
        duration: '45 sec',
        purpose: 'Rehearse squat depth, foot torque, and hip hinge trajectory without external load.',
        repsOrDuration: '8 slow reps (3 sec descent)'
      });
    } else if (involvesUpper) {
      items.push({
        name: 'Incline Push-up / Light Push Rehearsal',
        phase: '4. Movement Pattern Rehearsal',
        duration: '45 sec',
        purpose: 'Rehearse pressing groove and core brace before loaded work.',
        repsOrDuration: '6-8 light reps'
      });
    }

    // Time calculations
    const estimatedMinutes = isShortSession ? 4 : 6;
    const reasoning = `Warm-up structured in 4 physiological phases for ${sportName} targeting ${targetMuscles.join(', ') || sessionType}.`;

    return {
      warmupExercises: items,
      totalEstimatedMinutes: estimatedMinutes,
      reasoning
    };
  },

  /**
   * Generate a targeted cool-down and recovery routine
   */
  generateReasonedCooldown({
    sessionType = 'full',
    targetMuscles = [],
    sessionDurationMins = 45
  } = {}) {
    const items = [];

    // Static stretches for muscles worked
    if (targetMuscles.some(m => ['Chest', 'Shoulders'].includes(m)) || sessionType === 'upper' || sessionType === 'full') {
      items.push({
        name: 'Doorway Chest & Anterior Shoulder Stretch',
        targetArea: 'Chest & Shoulders',
        duration: '30 sec per side',
        purpose: 'Elongate shortened pectoralis major and anterior deltoid fibers to restore resting length.'
      });
    }

    if (targetMuscles.some(m => ['Quadriceps', 'Hamstrings', 'Glutes'].includes(m)) || sessionType === 'lower' || sessionType === 'full') {
      items.push({
        name: 'Standing Quad & Hamstring Sweep Hold',
        targetArea: 'Legs & Hips',
        duration: '30 sec per leg',
        purpose: 'Relieve tension along the rectus femoris and posterior chain.'
      });
    }

    // Universal Parasympathetic Downregulation
    items.push({
      name: 'Child’s Pose & Deep Diaphragmatic Breathing',
      targetArea: 'Spine & Autonomic Nervous System',
      duration: '60 sec',
      purpose: 'Shift the nervous system from sympathetic (fight-or-flight) to parasympathetic (rest-and-repair) via deep 4-second box breaths.'
    });

    const estimatedMinutes = 3;

    return {
      cooldownExercises: items,
      totalEstimatedMinutes: estimatedMinutes,
      reasoning: 'Cool-down designed for muscle fiber realignment and nervous system recovery.'
    };
  }
};

export default warmupEngine;
