/**
 * Sport-Specific Physiological Demands & Adaptation Engine
 * Translates athletic disciplines into targeted physical qualities, movement priorities,
 * and pre-competition workload adjustments.
 */

export const SPORT_PROFILES = {
  cricket: {
    sportName: 'Cricket',
    keyQualities: ['rotational power', 'shoulder stability', 'lower-body driving power', 'trunk anti-rotation', 'deceleration'],
    priorityPatterns: ['rotation', 'anti-rotation', 'lunge', 'hinge', 'horizontal pull'],
    warmupFocus: ['shoulder dislocates', 'thoracic spine mobility', 'hip openers', 'glute activation'],
    preferredExercises: ['Russian Twists', 'Face Pulls', 'Single-Arm Dumbbell Row', 'Walking Lunges', 'Romanian Deadlifts', 'Push-ups'],
    matchEveStrategy: {
      allowedFocus: ['movement preparation', 'thoracic mobility', 'core stability', 'upper-body activation'],
      forbiddenQualities: ['heavy maximal leg squats', 'heavy axial spinal deadlifts', 'high-volume leg burnout'],
      rationale: 'Avoid delayed-onset muscle soreness (DOMS) in hamstrings and quadriceps to preserve bowling run-up speed and batting footwork.'
    }
  },
  football: {
    sportName: 'Football / Soccer',
    keyQualities: ['repeated sprint capacity', 'adductor resilience', 'unilateral single-leg power', 'change of direction', 'core stability'],
    priorityPatterns: ['lunge', 'squat', 'sprinting', 'anti-rotation', 'locomotion'],
    warmupFocus: ['adductor groin mobility', 'ankle dorsiflexion', 'hamstring active sweeps', 'lateral hops'],
    preferredExercises: ['Walking Lunges', 'Romanian Deadlifts', 'Forearm Plank', 'Barbell Back Squats', 'Push-ups'],
    matchEveStrategy: {
      allowedFocus: ['activation', 'glute medius stabilization', 'light core', 'mobility'],
      forbiddenQualities: ['heavy leg press', 'maximal sprint intervals', 'high-eccentric leg training'],
      rationale: 'Preserve sprint acceleration and reduce adductor/hamstring strain before competitive match.'
    }
  },
  running: {
    sportName: 'Running / Track',
    keyQualities: ['aerobic base', 'cadence economy', 'ankle stiffness', 'gluteus medius tracking', 'core posture endurance'],
    priorityPatterns: ['locomotion', 'hinge', 'lunge', 'activation', 'anti-extension'],
    warmupFocus: ['calf and achilles prep', 'hip flexor dynamic opening', 'glute bridge activation', 'tibialis dorsiflexion'],
    preferredExercises: ['Outdoor Running (GPS)', 'Romanian Deadlifts', 'Walking Lunges', 'Forearm Plank', 'Glute Bridges & Clamshells'],
    matchEveStrategy: {
      allowedFocus: ['light aerobic flush', 'dynamic mobility', 'postural core'],
      forbiddenQualities: ['heavy leg resistance', 'long distance exhaustion'],
      rationale: 'Taper lower extremity neuromuscular fatigue before race or tempo run.'
    }
  },
  combat: {
    sportName: 'Combat Sports / Boxing / MMA',
    keyQualities: ['rotational hip power', 'punch kinetic chain', 'shoulder muscular endurance', 'neck stability', 'anaerobic recovery'],
    priorityPatterns: ['rotation', 'horizontal push', 'horizontal pull', 'conditioning', 'anti-rotation'],
    warmupFocus: ['wrist & hand mobility', 'neck circles with resistance', 'rotational hip snaps', 'shoulder circles'],
    preferredExercises: ['Push-ups', 'Single-Arm Dumbbell Row', 'Russian Twists', 'Face Pulls', 'Burpees'],
    matchEveStrategy: {
      allowedFocus: ['hand speed activation', 'rotational mobility', 'cardiorespiratory priming'],
      forbiddenQualities: ['extreme heavy eccentric lifting', 'deep muscular exhaustion'],
      rationale: 'Maintain explosive twitch speed and central nervous system sharpness.'
    }
  },
  basketball: {
    sportName: 'Basketball',
    keyQualities: ['vertical jump power', 'landing mechanics', 'lateral agility', 'reactive ankle stiffness', 'shoulder endurance'],
    priorityPatterns: ['jumping', 'squat', 'lunge', 'horizontal push', 'anti-rotation'],
    warmupFocus: ['patellar tendon priming', 'ankle mobility', 'glute activation', 'lateral band walks'],
    preferredExercises: ['Barbell Back Squats', 'Walking Lunges', 'Push-ups', 'Forearm Plank'],
    matchEveStrategy: {
      allowedFocus: ['light jumping rehearsal', 'hip mobility', 'upper body push'],
      forbiddenQualities: ['heavy squats to failure', 'plyometric overload'],
      rationale: 'Preserve tendon elasticity and vertical jump freshness for game day.'
    }
  },
  general: {
    sportName: 'General Fitness & Transformation',
    keyQualities: ['balanced posture', 'hypertrophy', 'fat loss', 'functional strength', 'joint health'],
    priorityPatterns: ['squat', 'hinge', 'horizontal push', 'horizontal pull', 'vertical push', 'anti-extension'],
    warmupFocus: ['general dynamic movement', 'shoulder mobility', 'hip openers'],
    preferredExercises: ['Push-ups', 'Barbell Back Squats', 'Single-Arm Dumbbell Row', 'Romanian Deadlifts', 'Forearm Plank'],
    matchEveStrategy: {
      allowedFocus: ['full body balanced workout'],
      forbiddenQualities: [],
      rationale: 'Standard progressive training protocol.'
    }
  }
};

export const sportProfileEngine = {
  /**
   * Identify sport profile from user bio or message context
   */
  detectSport(profile = {}, contextStr = '') {
    const combined = [
      profile.sport || '',
      profile.primaryGoal || '',
      ...(profile.goals || []),
      contextStr || ''
    ].join(' ').toLowerCase();

    if (combined.includes('cricket') || combined.includes('cricketer') || combined.includes('bowling') || combined.includes('batting')) {
      return SPORT_PROFILES.cricket;
    }
    if (combined.includes('football') || combined.includes('soccer')) {
      return SPORT_PROFILES.football;
    }
    if (combined.includes('running') || combined.includes('marathon') || combined.includes('runner') || combined.includes('jogging') || combined.includes('5k') || combined.includes('10k')) {
      return SPORT_PROFILES.running;
    }
    if (combined.includes('boxing') || combined.includes('combat') || combined.includes('mma') || combined.includes('martial') || combined.includes('wrestling')) {
      return SPORT_PROFILES.combat;
    }
    if (combined.includes('basketball') || combined.includes('hoops')) {
      return SPORT_PROFILES.basketball;
    }

    return SPORT_PROFILES.general;
  },

  /**
   * Evaluate if a user has an impending competition/match and adapt session priorities
   */
  evaluateEventFatigueRisk(userContext = {}, message = '') {
    const text = (message + ' ' + (userContext.notes || '')).toLowerCase();
    const hasMatchTomorrow = text.includes('match tomorrow') || text.includes('game tomorrow') || text.includes('tournament tomorrow') || text.includes('playing tomorrow') || text.includes('event tomorrow') || text.includes('race tomorrow');

    if (hasMatchTomorrow) {
      return {
        isPreEvent: true,
        recommendedLoad: 'Low-Fatigue Activation & Mobility',
        maxRPE: 6.5,
        avoidHighCNSFatigue: true,
        guidance: 'You have a competitive match tomorrow! Today’s session will focus on dynamic movement preparation, rotational mobility, and light neural activation rather than exhausting strength work that causes DOMS.'
      };
    }

    return {
      isPreEvent: false,
      recommendedLoad: 'Standard Progressive Overload',
      maxRPE: 8.5,
      avoidHighCNSFatigue: false,
      guidance: 'Standard athletic adaptation protocol.'
    };
  }
};

export default sportProfileEngine;
