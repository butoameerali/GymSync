/**
 * External Activity & Event Awareness Engine
 * Models and reasons about physical activities and competitive events outside GymSync
 * (e.g. Cricket, Football, 5K/10K Races, Army/Police/Academy Selection Tests, Construction/Physical Jobs).
 */

export const EVENT_TYPES = {
  ARMY_TRAINING: 'army_training',
  POLICE_TEST: 'police_test',
  CRICKET_MATCH: 'cricket_match',
  FOOTBALL_MATCH: 'football_match',
  RUNNING_RACE: 'running_race',
  COMBAT_SPORTS: 'combat_sports',
  HIKING: 'hiking',
  SWIMMING: 'swimming',
  BASKETBALL: 'basketball',
  TENNIS: 'tennis',
  PHYSICAL_LABOR: 'heavy_physical_job',
  GENERAL_SPORTS: 'general_sports'
};

export const eventAwarenessEngine = {
  /**
   * Parse text and conversation history to detect external events, proximity, and activities
   * Supports English and Roman Urdu/Hindi ("kal", "aaj", "ek week mein", "selection test").
   *
   * @param {string} text - Current message
   * @param {Array} history - Prior conversation turns
   * @returns {Object|null} event model or null
   */
  detectEvent(text = '', history = []) {
    const raw = (text || '').toLowerCase();
    const historyText = (history || [])
      .map(h => (h.content || h.text || '').toLowerCase())
      .join(' ');
    const fullText = `${historyText} ${raw}`;

    let eventType = null;
    let eventName = '';
    let expectedActivities = [];
    let distance = null;

    // Detect Construction / Heavy Physical Job
    if (raw.includes('construction') || raw.includes('physical job') || raw.includes('manual labor') ||
        raw.includes('hard physical work') || raw.includes('demanding job') ||
        (raw.includes('very physical') && (raw.includes('today') || raw.includes('job') || raw.includes('work')))) {
      eventType = EVENT_TYPES.PHYSICAL_LABOR;
      eventName = 'High-Demand Physical Job / Construction Work';
    }
    // Detect Army / Military / Armed Forces
    else if (raw.includes('army') || raw.includes('military') || raw.includes('armed forces') || raw.includes('ssb') || raw.includes('commando')) {
      eventType = EVENT_TYPES.ARMY_TRAINING;
      eventName = 'Army / Military Physical Training';
    }
    // Detect Police Test / Academy Selection Test / Physical Trials (Without needing explicit word "army")
    else if (raw.includes('police') || raw.includes('constable') || raw.includes('selection test') ||
             raw.includes('academy') || raw.includes('trials') || raw.includes('fitness test') || raw.includes('physical test')) {
      eventType = EVENT_TYPES.POLICE_TEST;
      eventName = 'Academy Selection & Performance Test';
    }
    // Detect Cricket
    else if (raw.includes('cricket') || (raw.includes('match') && !raw.includes('football') && !raw.includes('soccer'))) {
      eventType = EVENT_TYPES.CRICKET_MATCH;
      eventName = 'Cricket Match';
    }
    // Detect Football / Soccer
    else if (raw.includes('football') || raw.includes('soccer')) {
      eventType = EVENT_TYPES.FOOTBALL_MATCH;
      eventName = 'Football / Soccer Session';
    }
    // Detect Race / Running
    else if (raw.includes('race') || raw.includes('marathon') || raw.includes('5k') || raw.includes('10k') || raw.includes('half marathon')) {
      eventType = EVENT_TYPES.RUNNING_RACE;
      eventName = 'Running Race / Time Trial';
    }
    // Combat / Sparring
    else if (raw.includes('boxing') || raw.includes('sparring') || raw.includes('mma') || raw.includes('fight') || raw.includes('wrestling')) {
      eventType = EVENT_TYPES.COMBAT_SPORTS;
      eventName = 'Combat Sports / Sparring';
    }
    // Hiking
    else if (raw.includes('hike') || raw.includes('hiking') || raw.includes('trekking')) {
      eventType = EVENT_TYPES.HIKING;
      eventName = 'Outdoor Hiking / Trekking';
    }
    // Swimming
    else if (raw.includes('swim') || raw.includes('swimming')) {
      eventType = EVENT_TYPES.SWIMMING;
      eventName = 'Swimming Event';
    }
    // Basketball / Tennis
    else if (raw.includes('basketball')) {
      eventType = EVENT_TYPES.BASKETBALL;
      eventName = 'Basketball Game';
    } else if (raw.includes('tennis')) {
      eventType = EVENT_TYPES.TENNIS;
      eventName = 'Tennis Match';
    }

    // Physical Training / PT session
    else if (raw.includes('physical training') || raw.includes('pt test') || raw.includes('pt training') ||
             raw.includes('pt session') || raw.includes('bas physical training')) {
      eventType = EVENT_TYPES.GENERAL_SPORTS;
      eventName = 'Physical Training Session';
    }

    if (!eventType) {
      // General external training / practice mentioned
      if (raw.includes('training tomorrow') || raw.includes('practice tomorrow') || raw.includes('event tomorrow') ||
          (raw.includes('kal') && (raw.includes('training') || raw.includes('practice') || raw.includes('test')))) {
        eventType = EVENT_TYPES.GENERAL_SPORTS;
        eventName = 'Upcoming External Training';
      } else {
        return null;
      }
    }

    // Proximity extraction (supports English and Roman Urdu)
    let proximityDays = 1;
    let dateDescription = 'tomorrow';

    if (raw.includes('today') || raw.includes('tonight') || raw.includes('aaj')) {
      proximityDays = 0;
      dateDescription = 'today';
    } else if (raw.includes('tomorrow') || historyText.includes('tomorrow') || raw.includes('kal') || historyText.includes('kal')) {
      proximityDays = 1;
      dateDescription = 'tomorrow';
    } else if (raw.includes('day after tomorrow') || raw.includes('in 2 days') || raw.includes('parson')) {
      proximityDays = 2;
      dateDescription = 'in 2 days';
    } else if (raw.includes('in 3 days') || raw.includes('in three days')) {
      proximityDays = 3;
      dateDescription = 'in 3 days';
    } else if (raw.includes('next week') || raw.includes('in 7 days') || raw.includes('in a week') || raw.includes('7 days') ||
               raw.includes('ek week') || raw.includes('1 week') || raw.includes('one week')) {
      proximityDays = 7;
      dateDescription = 'in 1 week';
    }

    // Distance extraction for races
    const distMatch = (fullText.match(/\b(5k|10k|21k|42k|half marathon|marathon|100m|200m|400m|800m|1600m|1 mile)\b/i));
    if (distMatch) {
      distance = distMatch[1].toUpperCase();
    }

    // Activity breakdown extraction
    if (fullText.includes('push-up') || fullText.includes('push up') || fullText.includes('pushups')) {
      expectedActivities.push('push-ups');
    }
    if (fullText.includes('pull-up') || fullText.includes('pull up') || fullText.includes('pullups') || fullText.includes('chin-up')) {
      expectedActivities.push('pull-ups');
    }
    if (fullText.includes('running') || fullText.includes('run') || fullText.includes('sprint')) {
      expectedActivities.push('running');
    }
    if (fullText.includes('obstacle') || fullText.includes('obstacle course')) {
      expectedActivities.push('obstacle course');
    }
    if (fullText.includes('march') || fullText.includes('marching') || fullText.includes('drills')) {
      expectedActivities.push('marching & drills');
    }
    if (fullText.includes('bowling') || fullText.includes('batting') || fullText.includes('fielding')) {
      expectedActivities.push('cricket match play');
    }

    return {
      type: eventType,
      name: eventName,
      dateDescription,
      proximityDays,
      distance,
      expectedActivities,
      userProvidedDetails: raw
    };
  },

  /**
   * Determine physiological demands and muscular protection rules
   * Uses conservative sports science language (no overclaims).
   *
   * @param {Object} event
   * @returns {Object} demands & constraints
   */
  getEventDemands(event) {
    if (!event) return null;

    const { type, proximityDays, expectedActivities = [], distance } = event;
    const isTomorrow = proximityDays <= 1;

    let protectedMuscleGroups = [];
    let heavyExercisesProhibited = [];
    let priorityFocus = 'Mobility & Conditioning';
    let rationale = '';

    switch (type) {
      case EVENT_TYPES.PHYSICAL_LABOR:
        // Physical job creates spinal axial compression, grip fatigue, and systemic lower-back/leg exhaustion
        protectedMuscleGroups = ['Lower Back', 'Spine', 'Grip', 'Shoulders', 'Legs'];
        heavyExercisesProhibited = ['Deadlift', 'Barbell Back Squat', 'Barbell Rows', 'Clean and Press'];
        priorityFocus = 'Postural Restoration, Spinal Decompression & Restorative Mobility';
        rationale = 'Today involved heavy physical labor on the job. Prescribing heavy lifting would compound spinal fatigue and elevate strain risk. Today focuses on active recovery, spinal decompression, and restorative mobility.';
        return {
          eventType: type,
          eventName: event.name,
          proximityDays,
          isTomorrow: false,
          protectedMuscleGroups,
          heavyExercisesProhibited,
          priorityFocus,
          rationale,
          capRpe: 6.0,
          maxSets: 2,
          suppressEccentrics: true
        };

      case EVENT_TYPES.ARMY_TRAINING:
      case EVENT_TYPES.POLICE_TEST:
        protectedMuscleGroups = ['Chest', 'Shoulders', 'Triceps', 'Lats', 'Quads', 'Calves'];
        heavyExercisesProhibited = ['Barbell Bench Press', 'Dumbbell Bench Press', 'Push-ups', 'Pull-ups', 'Barbell Back Squat', 'Lunges'];
        priorityFocus = isTomorrow
          ? 'Neuromuscular Priming, Core Stability & Thoracic Mobility (Tactical Test Preparation)'
          : 'Military Calisthenics & Tactical Endurance Progression';
        rationale = isTomorrow
          ? 'Tomorrow involves high physical demands (push-ups, pull-ups, obstacle course, and running). Today we prioritize low-fatigue movement to reduce unnecessary fatigue and minimize soreness risk for tomorrow.'
          : 'Progressive preparation for military physical standards.';
        break;

      case EVENT_TYPES.FOOTBALL_MATCH:
        protectedMuscleGroups = ['Hamstrings', 'Quads', 'Adductors', 'Calves'];
        heavyExercisesProhibited = ['Barbell Back Squat', 'Romanian Deadlift', 'Walking Lunges', 'Bulgarian Split Squat'];
        priorityFocus = isTomorrow
          ? 'Upper Body Strength, Core Anti-Rotation & Hip Mobility (Preserving Leg Freshness)'
          : 'High-Speed Deceleration & Sport Agility Conditioning';
        rationale = isTomorrow
          ? 'Tomorrow\'s football session creates massive sprint and deceleration demands on your hamstrings and quads. Today\'s workout is shifted strictly to upper body and core to preserve leg freshness and minimize fatigue.'
          : 'Building match-ready change of direction and soccer conditioning.';
        break;

      case EVENT_TYPES.CRICKET_MATCH:
        if (proximityDays >= 5) {
          priorityFocus = 'Cricket Match Conditioning & Stamina Maintenance (7-Day Microcycle)';
          rationale = 'With your match 1 week away, today focuses on cricket-specific stamina (rotational core power and interval endurance). We structure high-quality work now and taper volume 48 hours before match day to minimize soreness risk.';
          return {
            eventType: type,
            eventName: event.name,
            proximityDays,
            isTomorrow: false,
            protectedMuscleGroups: ['Rotator Cuff'],
            heavyExercisesProhibited: [],
            priorityFocus,
            rationale,
            capRpe: 7.5,
            maxSets: 3,
            suppressEccentrics: false
          };
        }
        protectedMuscleGroups = ['Shoulders', 'Rotator Cuff', 'Quads', 'Spinal Flexion'];
        heavyExercisesProhibited = ['Heavy Overhead Press', 'Upright Rows', 'Barbell Back Squat'];
        priorityFocus = isTomorrow
          ? 'Thoracic Spine Mobility, Rotational Core Priming & Scapular Activation'
          : 'Rotational Power & Shoulder Durability';
        rationale = isTomorrow
          ? 'With your cricket match tomorrow, heavy pressing or leg exhaustion can compromise bowling rhythm and batting footwork. Today primes rotational core and thoracic mobility while minimizing soreness risk.'
          : 'Sport-specific power transfer for batting and bowling speed.';
        break;

      case EVENT_TYPES.RUNNING_RACE:
        protectedMuscleGroups = ['Quads', 'Hamstrings', 'Calves', 'Tibialis'];
        heavyExercisesProhibited = ['Barbell Back Squat', 'Leg Press', 'Lunges', 'Calf Raises', 'Sprint Intervals'];
        priorityFocus = isTomorrow
          ? `Pre-Race Shakeout & Dynamic Mobility (${distance || 'Race'} Priming)`
          : 'Aerobic Base & Running Mechanics Taper';
        rationale = isTomorrow
          ? `With your ${distance || 'race'} tomorrow, hard leg resistance today would deplete glycogen and elevate heavy-leg sensation. Today is dedicated to light nervous system priming and mobility to preserve performance.`
          : 'Tapering training volume to peak for race day.';
        break;

      default:
        protectedMuscleGroups = isTomorrow ? ['Legs', 'Lower Back'] : [];
        priorityFocus = isTomorrow ? 'Submaximal Movement & Active Preparation' : 'Athletic Preparation';
        rationale = isTomorrow
          ? 'Pre-event preparation session: keeping central nervous system fresh and reducing fatigue.'
          : 'Balancing external sport activities with strength training.';
    }

    return {
      eventType: type,
      eventName: event.name,
      proximityDays,
      isTomorrow,
      protectedMuscleGroups,
      heavyExercisesProhibited,
      priorityFocus,
      rationale,
      capRpe: isTomorrow ? 6.5 : 8.0,
      maxSets: isTomorrow ? 2 : 4,
      suppressEccentrics: isTomorrow
    };
  }
};

export default eventAwarenessEngine;
