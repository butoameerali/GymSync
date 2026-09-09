import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Exercise from '../../models/Exercise.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory enriched registry
let registry = [];
let registryMap = new Map();

/**
 * Determine movement pattern from exercise name, target muscles, and equipment
 */
function inferMovementPattern(name = '', target = '', equipment = '') {
  const n = name.toLowerCase();
  const t = target.toLowerCase();
  const eq = equipment.toLowerCase();

  // Warmup & Mobility
  if (n.includes('circle') || n.includes('mobility') || n.includes('stretch') || n.includes('dislocate') || n.includes('child') || n.includes('cat-cow') || n.includes('foam roll') || n.includes('thoracic') || n.includes('swing leg') || n.includes('arm swing')) {
    return 'mobility';
  }
  // Activation
  if (n.includes('activation') || n.includes('band walk') || n.includes('monster walk') || n.includes('glute bridge') || n.includes('clamshell') || n.includes('scapular') || n.includes('bird-dog') || n.includes('deadbug') || n.includes('fire hydrant')) {
    return 'activation';
  }
  // Locomotion & Cardio
  if (n.includes('running') || n.includes('jogging') || n.includes('treadmill') || n.includes('cycling') || n.includes('rowing') || n.includes('elliptical') || n.includes('stair') || n.includes('walk')) {
    return 'locomotion';
  }
  if (n.includes('sprint') || n.includes('shuttle run') || n.includes('suicide') || n.includes('acceleration')) {
    return 'sprinting';
  }
  if (n.includes('jump') || n.includes('box jump') || n.includes('plyo') || n.includes('hop') || n.includes('skipping') || n.includes('skater')) {
    return 'jumping';
  }
  if (n.includes('burpee') || n.includes('battle rope') || n.includes('kettlebell swing') || n.includes('clean and press') || n.includes('mountain climber') || n.includes('jumping jack') || n.includes('high knees')) {
    return 'conditioning';
  }

  // Core Patterns
  if (n.includes('russian twist') || n.includes('woodchop') || n.includes('rotational') || n.includes('windmill') || n.includes('oblique twist')) {
    return 'rotation';
  }
  if (n.includes('pallof') || n.includes('side plank') || n.includes('bird dog') || n.includes('renegade row')) {
    return 'anti-rotation';
  }
  if (n.includes('plank') || n.includes('rollout') || n.includes('hollow body') || n.includes('leg raise') || n.includes('crunch') || n.includes('sit-up') || n.includes('v-up')) {
    return 'anti-extension';
  }
  if (n.includes('carry') || n.includes('farmer') || n.includes('suitcase') || n.includes('waiter walk')) {
    return 'carry';
  }

  // Squat & Lower Body Push
  if (n.includes('squat') || n.includes('leg press') || n.includes('hack squat') || n.includes('step up') || n.includes('wall sit')) {
    return 'squat';
  }
  // Lunge
  if (n.includes('lunge') || n.includes('split squat') || n.includes('bulgarian')) {
    return 'lunge';
  }
  // Hinge & Lower Body Pull
  if (n.includes('deadlift') || n.includes('good morning') || n.includes('hip thrust') || n.includes('hamstring curl') || n.includes('leg curl') || n.includes('hyperextension') || n.includes('kettlebell swing')) {
    return 'hinge';
  }

  // Horizontal Push
  if (n.includes('bench press') || n.includes('push-up') || n.includes('pushup') || n.includes('chest press') || n.includes('chest fly') || n.includes('floor press') || n.includes('pec deck')) {
    return 'horizontal push';
  }
  // Vertical Push
  if (n.includes('overhead press') || n.includes('shoulder press') || n.includes('military press') || n.includes('arnold press') || n.includes('handstand') || n.includes('lateral raise') || n.includes('front raise') || n.includes('dip') || n.includes('push press')) {
    return 'vertical push';
  }
  // Vertical Pull
  if (n.includes('pull-up') || n.includes('pullup') || n.includes('chin-up') || n.includes('chinup') || n.includes('lat pulldown') || n.includes('lat pull down')) {
    return 'vertical pull';
  }
  // Horizontal Pull
  if (n.includes('row') || n.includes('face pull') || n.includes('reverse fly') || n.includes('rear delt')) {
    return 'horizontal pull';
  }

  // Fallbacks by target muscles
  if (t.includes('chest')) return 'horizontal push';
  if (t.includes('back')) return 'horizontal pull';
  if (t.includes('shoulder')) return 'vertical push';
  if (t.includes('quadriceps') || t.includes('thighs') || t.includes('quad')) return 'squat';
  if (t.includes('hamstring') || t.includes('glute')) return 'hinge';
  if (t.includes('abs') || t.includes('core')) return 'anti-extension';
  if (t.includes('calves')) return 'locomotion';

  return 'conditioning';
}

/**
 * Infer primary and secondary muscle groups from text
 */
function parseMuscles(targetStr = '', pattern = '') {
  const t = (targetStr || '').toLowerCase();
  const primary = [];
  const secondary = [];

  if (t.includes('chest') || pattern === 'horizontal push') primary.push('Chest');
  if (t.includes('back') || t.includes('lats') || pattern === 'vertical pull' || pattern === 'horizontal pull') primary.push('Back');
  if (t.includes('shoulder') || t.includes('deltoid') || pattern === 'vertical push') primary.push('Shoulders');
  if (t.includes('quad') || t.includes('thigh') || pattern === 'squat' || pattern === 'lunge') primary.push('Quadriceps');
  if (t.includes('hamstring') || pattern === 'hinge') primary.push('Hamstrings');
  if (t.includes('glute') || pattern === 'hinge' || pattern === 'squat') primary.push('Glutes');
  if (t.includes('bicep')) primary.push('Biceps');
  if (t.includes('tricep')) primary.push('Triceps');
  if (t.includes('ab') || t.includes('core') || pattern.includes('anti-') || pattern === 'rotation') primary.push('Core');
  if (t.includes('calf') || t.includes('calves')) primary.push('Calves');

  // Secondary muscles
  if (primary.includes('Chest') && !primary.includes('Triceps')) secondary.push('Triceps', 'Anterior Deltoids');
  if (primary.includes('Back') && !primary.includes('Biceps')) secondary.push('Biceps', 'Rear Deltoids');
  if (primary.includes('Quadriceps') && !primary.includes('Glutes')) secondary.push('Glutes', 'Core');
  if (primary.includes('Hamstrings') && !primary.includes('Lower Back')) secondary.push('Glutes', 'Lower Back');

  return {
    primaryMuscles: primary.length > 0 ? primary : ['Full Body'],
    secondaryMuscles: secondary
  };
}

/**
 * Infer joint stress areas based on movement pattern and target muscles
 */
function inferJointStress(pattern = '', name = '', target = '') {
  const p = pattern.toLowerCase();
  const n = name.toLowerCase();
  const stress = [];

  if (p === 'squat' || p === 'lunge' || n.includes('jump') || n.includes('leg extension') || n.includes('running')) {
    stress.push('knees');
  }
  if (p === 'hinge' || n.includes('deadlift') || n.includes('good morning') || n.includes('bent-over')) {
    stress.push('lowerback');
  }
  if (p === 'horizontal push' || p === 'vertical push' || n.includes('dip') || n.includes('overhead')) {
    stress.push('shoulders');
  }
  if (n.includes('curl') || n.includes('pushup') || n.includes('press') || n.includes('clean')) {
    stress.push('wrists');
  }
  if (n.includes('jump') || n.includes('sprint') || n.includes('running') || n.includes('calf')) {
    stress.push('ankles');
  }
  if (n.includes('neck') || n.includes('shrug')) {
    stress.push('neck');
  }

  return stress;
}

/**
 * Infer fatigue cost: high (heavy compound), medium (moderate compound/volume), low (isolation/mobility/warmup)
 */
function inferFatigueCost(pattern = '', equipment = '', difficulty = 'Beginner') {
  const p = pattern.toLowerCase();
  const eq = (equipment || '').toLowerCase();

  if (p === 'mobility' || p === 'activation') return 'low';
  if (p === 'hinge' && (eq.includes('barbell') || eq.includes('plate'))) return 'high';
  if (p === 'squat' && (eq.includes('barbell') || eq.includes('smith'))) return 'high';
  if (p === 'sprinting' || p === 'jumping' || p === 'conditioning') return 'high';
  if (p === 'horizontal push' && eq.includes('barbell')) return 'high';
  if (p === 'vertical pull' && eq.includes('pull-up')) return 'high';

  if (p === 'lunge' || p === 'horizontal pull' || p === 'vertical push' || p === 'carry') return 'medium';
  if (difficulty === 'Advanced') return 'high';
  if (difficulty === 'Intermediate') return 'medium';

  return 'low';
}

/**
 * Infer sport relevance tags
 */
function inferSportRelevance(pattern = '', name = '', muscles = []) {
  const sports = ['general'];
  const n = name.toLowerCase();
  const p = pattern.toLowerCase();

  // Cricket
  if (p === 'rotation' || p === 'anti-rotation' || p === 'sprinting' || p === 'jumping' || p === 'lunge' || p === 'hinge' || n.includes('shoulder') || n.includes('rotator') || n.includes('thoracic') || n.includes('band walk') || n.includes('pallof')) {
    sports.push('cricket');
  }
  // Football / Soccer
  if (p === 'sprinting' || p === 'locomotion' || p === 'lunge' || p === 'squat' || p === 'jumping' || p === 'anti-rotation' || n.includes('adductor') || n.includes('groin') || n.includes('calf')) {
    sports.push('football');
  }
  // Running
  if (p === 'locomotion' || p === 'sprinting' || p === 'hinge' || p === 'lunge' || p === 'activation' || n.includes('calf') || n.includes('glute bridge') || n.includes('single-leg') || n.includes('plank') || n.includes('tibialis')) {
    sports.push('running');
  }
  // Combat Sports / Boxing
  if (p === 'rotation' || p === 'horizontal push' || p === 'jumping' || p === 'conditioning' || n.includes('core') || n.includes('neck') || n.includes('wrist') || n.includes('burpee')) {
    sports.push('combat');
  }
  // Basketball
  if (p === 'jumping' || p === 'squat' || p === 'lunge' || p === 'sprinting' || p === 'locomotion') {
    sports.push('basketball');
  }
  // Tennis
  if (p === 'rotation' || p === 'anti-rotation' || p === 'lunge' || p === 'locomotion' || n.includes('shoulder') || n.includes('wrist')) {
    sports.push('tennis');
  }

  return sports;
}

/**
 * Curated core exercise list with certified metadata and AI detector links
 */
const CURATED_EXERCISES = [
  {
    exerciseId: 'ex_1',
    name: 'Barbell Bench Press',
    movementPattern: 'horizontal push',
    primaryMuscles: ['Chest'],
    secondaryMuscles: ['Triceps', 'Shoulders'],
    trainingQualities: ['strength', 'hypertrophy'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'combat', 'cricket'],
    equipment: 'Full Gym',
    equipmentCategory: 'Barbell, Bench',
    difficulty: 'Intermediate',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'moderate',
    fatigueCost: 'high',
    injuryExclusions: ['shoulders', 'wrists'],
    jointStress: ['shoulders', 'wrists'],
    progressionOptions: ['Pause Bench Press', 'Close-Grip Bench Press'],
    regressionOptions: ['Dumbbell Floor Press', 'Push-ups'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: false,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 4,
    defaultRestSec: 90
  },
  {
    exerciseId: 'ex_2',
    name: 'Incline Dumbbell Press',
    movementPattern: 'horizontal push',
    primaryMuscles: ['Chest', 'Shoulders'],
    secondaryMuscles: ['Triceps'],
    trainingQualities: ['hypertrophy', 'strength'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'combat'],
    equipment: 'Dumbbells',
    equipmentCategory: 'Dumbbells, Incline Bench',
    difficulty: 'Intermediate',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'moderate',
    fatigueCost: 'medium',
    injuryExclusions: ['shoulders'],
    jointStress: ['shoulders'],
    progressionOptions: ['Incline Barbell Press'],
    regressionOptions: ['Incline Push-ups'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3.5,
    defaultRestSec: 75
  },
  {
    exerciseId: 'ex_3',
    name: 'Push-ups',
    movementPattern: 'horizontal push',
    primaryMuscles: ['Chest'],
    secondaryMuscles: ['Triceps', 'Core', 'Shoulders'],
    trainingQualities: ['endurance', 'hypertrophy', 'strength'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'football', 'combat', 'running'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'low',
    fatigueCost: 'medium',
    injuryExclusions: ['wrists'],
    jointStress: ['wrists', 'shoulders'],
    progressionOptions: ['Decline Push-ups', 'Diamond Push-ups', 'Weighted Push-ups'],
    regressionOptions: ['Incline Push-ups', 'Knee Push-ups', 'Wall Push-ups'],
    warmUpSuitability: true,
    mainWorkSuitability: true,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: true,
    aiDetection: { enabled: true, detectorId: 'pushup_v1', detectorVersion: '1.0' },
    estimatedSecPerRep: 3,
    defaultRestSec: 60
  },
  {
    exerciseId: 'ex_7',
    name: 'Pull-ups',
    movementPattern: 'vertical pull',
    primaryMuscles: ['Back'],
    secondaryMuscles: ['Biceps', 'Forearms', 'Core'],
    trainingQualities: ['strength', 'hypertrophy'],
    fitnessLevels: ['Intermediate', 'Advanced'],
    sportRelevance: ['general', 'combat', 'cricket'],
    equipment: 'Full Gym',
    equipmentCategory: 'Pull-up Bar',
    difficulty: 'Intermediate',
    stabilityRequirement: 'high',
    mobilityRequirement: 'moderate',
    fatigueCost: 'high',
    injuryExclusions: ['shoulders'],
    jointStress: ['shoulders', 'elbows'],
    progressionOptions: ['Weighted Pull-ups', 'L-Sit Pull-ups'],
    regressionOptions: ['Band-Assisted Pull-ups', 'Inverted Rows', 'Lat Pulldowns'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: false,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3.5,
    defaultRestSec: 90
  },
  {
    exerciseId: 'ex_8',
    name: 'Barbell Bent-Over Rows',
    movementPattern: 'horizontal pull',
    primaryMuscles: ['Back'],
    secondaryMuscles: ['Biceps', 'Lower Back', 'Hamstrings'],
    trainingQualities: ['strength', 'hypertrophy'],
    fitnessLevels: ['Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'combat'],
    equipment: 'Full Gym',
    equipmentCategory: 'Barbell',
    difficulty: 'Intermediate',
    stabilityRequirement: 'high',
    mobilityRequirement: 'moderate',
    fatigueCost: 'high',
    injuryExclusions: ['lowerback'],
    jointStress: ['lowerback'],
    progressionOptions: ['Pendlay Rows'],
    regressionOptions: ['Chest-Supported Dumbbell Rows', 'Seated Cable Rows'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: false,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3.5,
    defaultRestSec: 90
  },
  {
    exerciseId: 'ex_12',
    name: 'Single-Arm Dumbbell Row',
    movementPattern: 'horizontal pull',
    primaryMuscles: ['Back'],
    secondaryMuscles: ['Biceps', 'Core'],
    trainingQualities: ['hypertrophy', 'strength'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'combat', 'football'],
    equipment: 'Dumbbells',
    equipmentCategory: 'Dumbbell, Bench',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'medium',
    injuryExclusions: [],
    jointStress: [],
    progressionOptions: ['Kroc Rows', 'Heavy Unilateral DB Row'],
    regressionOptions: ['Resistance Band Row'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3,
    defaultRestSec: 60
  },
  {
    exerciseId: 'ex_13',
    name: 'Barbell Back Squats',
    movementPattern: 'squat',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Calves', 'Core'],
    trainingQualities: ['strength', 'hypertrophy', 'power'],
    fitnessLevels: ['Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'football', 'basketball'],
    equipment: 'Full Gym',
    equipmentCategory: 'Barbell, Squat Rack',
    difficulty: 'Intermediate',
    stabilityRequirement: 'high',
    mobilityRequirement: 'high',
    fatigueCost: 'high',
    injuryExclusions: ['knees', 'lowerback'],
    jointStress: ['knees', 'lowerback'],
    progressionOptions: ['Pause Squats', 'Front Squats'],
    regressionOptions: ['Goblet Squats', 'Box Squats', 'Bodyweight Squats'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: false,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 4,
    defaultRestSec: 120
  },
  {
    exerciseId: 'ex_14',
    name: 'Romanian Deadlifts',
    movementPattern: 'hinge',
    primaryMuscles: ['Hamstrings', 'Glutes'],
    secondaryMuscles: ['Lower Back', 'Core', 'Forearms'],
    trainingQualities: ['strength', 'hypertrophy'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'football', 'running'],
    equipment: 'Dumbbells',
    equipmentCategory: 'Barbell or Dumbbells',
    difficulty: 'Intermediate',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'moderate',
    fatigueCost: 'medium',
    injuryExclusions: ['lowerback'],
    jointStress: ['lowerback'],
    progressionOptions: ['Conventional Deadlifts', 'Deficit RDLs'],
    regressionOptions: ['Glute Bridges', 'Single-Leg RDL (Bodyweight)'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3.5,
    defaultRestSec: 75
  },
  {
    exerciseId: 'ex_16',
    name: 'Walking Lunges',
    movementPattern: 'lunge',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Calves', 'Core'],
    trainingQualities: ['hypertrophy', 'endurance', 'power'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'football', 'running', 'tennis'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Dumbbells or Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'moderate',
    fatigueCost: 'medium',
    injuryExclusions: ['knees'],
    jointStress: ['knees'],
    progressionOptions: ['Dumbbell Walking Lunges', 'Deficit Reverse Lunges'],
    regressionOptions: ['Static Split Squats', 'Reverse Lunges with Support'],
    warmUpSuitability: true,
    mainWorkSuitability: true,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3,
    defaultRestSec: 60
  },
  {
    exerciseId: 'ex_20',
    name: 'Overhead Barbell Press',
    movementPattern: 'vertical push',
    primaryMuscles: ['Shoulders'],
    secondaryMuscles: ['Triceps', 'Upper Chest', 'Core'],
    trainingQualities: ['strength', 'power'],
    fitnessLevels: ['Intermediate', 'Advanced'],
    sportRelevance: ['general', 'combat', 'cricket'],
    equipment: 'Full Gym',
    equipmentCategory: 'Barbell',
    difficulty: 'Intermediate',
    stabilityRequirement: 'high',
    mobilityRequirement: 'high',
    fatigueCost: 'high',
    injuryExclusions: ['shoulders', 'lowerback'],
    jointStress: ['shoulders', 'lowerback'],
    progressionOptions: ['Push Press'],
    regressionOptions: ['Seated Dumbbell Shoulder Press', 'Landmine Press'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: false,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3.5,
    defaultRestSec: 90
  },
  {
    exerciseId: 'ex_22',
    name: 'Face Pulls',
    movementPattern: 'horizontal pull',
    primaryMuscles: ['Shoulders', 'Back'],
    secondaryMuscles: ['Rotator Cuff', 'Upper Back'],
    trainingQualities: ['endurance', 'mobility', 'strength'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'tennis', 'combat'],
    equipment: 'Full Gym',
    equipmentCategory: 'Cable Machine, Rope',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    progressionOptions: ['Heavy Cable Face Pulls with External Rotation'],
    regressionOptions: ['Resistance Band Face Pulls', 'Band Pull-Aparts'],
    warmUpSuitability: true,
    mainWorkSuitability: false,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3,
    defaultRestSec: 45
  },
  {
    exerciseId: 'ex_30',
    name: 'Forearm Plank',
    movementPattern: 'anti-extension',
    primaryMuscles: ['Core'],
    secondaryMuscles: ['Glutes', 'Shoulders'],
    trainingQualities: ['endurance', 'stability'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'football', 'running', 'combat'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    progressionOptions: ['Long Lever Plank', 'Stir-the-Pot Plank'],
    regressionOptions: ['Knee Plank', 'Incline Plank'],
    warmUpSuitability: true,
    mainWorkSuitability: false,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 1, // timed
    defaultRestSec: 45
  },
  {
    exerciseId: 'ex_32',
    name: 'Russian Twists',
    movementPattern: 'rotation',
    primaryMuscles: ['Core'],
    secondaryMuscles: ['Hip Flexors'],
    trainingQualities: ['power', 'endurance'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['cricket', 'football', 'tennis', 'combat', 'general'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight or Medicine Ball',
    difficulty: 'Beginner',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'moderate',
    fatigueCost: 'low',
    injuryExclusions: ['lowerback'],
    jointStress: ['lowerback'],
    progressionOptions: ['Weighted Russian Twists', 'Medicine Ball Rotational Slams'],
    regressionOptions: ['Feet-Down Russian Twists', 'Pallof Press'],
    warmUpSuitability: false,
    mainWorkSuitability: false,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 2,
    defaultRestSec: 45
  },
  {
    exerciseId: 'ex_34',
    name: 'Outdoor Running (GPS)',
    movementPattern: 'locomotion',
    primaryMuscles: ['Quadriceps', 'Hamstrings', 'Calves'],
    secondaryMuscles: ['Glutes', 'Core', 'Cardiovascular'],
    trainingQualities: ['endurance', 'aerobic base'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['running', 'cricket', 'football', 'general'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Running Shoes, GPS',
    difficulty: 'Beginner',
    stabilityRequirement: 'moderate',
    mobilityRequirement: 'moderate',
    fatigueCost: 'high',
    injuryExclusions: ['knees', 'ankles'],
    jointStress: ['knees', 'ankles', 'lowerback'],
    progressionOptions: ['Interval Running', 'Tempo Running', 'Long Slow Distance'],
    regressionOptions: ['Brisk Walking', 'Walk-Run Intervals', 'Stationary Bike'],
    warmUpSuitability: false,
    mainWorkSuitability: true,
    accessorySuitability: false,
    cooldownSuitability: false,
    isAiTrackable: true,
    aiDetection: { enabled: true, detectorId: 'running_v1', detectorVersion: '1.0' },
    estimatedSecPerRep: 60,
    defaultRestSec: 0
  },
  // Dedicated Reasoned Warm-up / Activation / Mobility items
  {
    exerciseId: 'wm_01',
    name: 'Arm Circles & Shoulder Dislocates',
    movementPattern: 'mobility',
    primaryMuscles: ['Shoulders'],
    secondaryMuscles: ['Upper Back', 'Chest'],
    trainingQualities: ['mobility'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'combat', 'tennis'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight or Resistance Band',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    warmUpSuitability: true,
    mainWorkSuitability: false,
    accessorySuitability: false,
    cooldownSuitability: true,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 2,
    defaultRestSec: 15
  },
  {
    exerciseId: 'wm_02',
    name: 'Cat-Cow & Thoracic Rotations',
    movementPattern: 'mobility',
    primaryMuscles: ['Back'],
    secondaryMuscles: ['Core', 'Neck'],
    trainingQualities: ['mobility'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'running'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    warmUpSuitability: true,
    mainWorkSuitability: false,
    accessorySuitability: false,
    cooldownSuitability: true,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3,
    defaultRestSec: 15
  },
  {
    exerciseId: 'wm_03',
    name: 'Band Pull-Aparts / Scapular Squeeze',
    movementPattern: 'activation',
    primaryMuscles: ['Back', 'Shoulders'],
    secondaryMuscles: ['Rotator Cuff'],
    trainingQualities: ['mobility', 'strength'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'combat'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Resistance Bands or Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    warmUpSuitability: true,
    mainWorkSuitability: false,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 2.5,
    defaultRestSec: 20
  },
  {
    exerciseId: 'wm_04',
    name: 'Glute Bridges & Clamshells',
    movementPattern: 'activation',
    primaryMuscles: ['Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    trainingQualities: ['mobility', 'endurance'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'running', 'cricket', 'football'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    warmUpSuitability: true,
    mainWorkSuitability: false,
    accessorySuitability: true,
    cooldownSuitability: false,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 2.5,
    defaultRestSec: 20
  },
  {
    exerciseId: 'wm_05',
    name: 'Ankle & Hip 90/90 Mobility Rotations',
    movementPattern: 'mobility',
    primaryMuscles: ['Glutes', 'Hips'],
    secondaryMuscles: ['Calves', 'Groin'],
    trainingQualities: ['mobility'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'running', 'cricket', 'football'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'moderate',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    warmUpSuitability: true,
    mainWorkSuitability: false,
    accessorySuitability: false,
    cooldownSuitability: true,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 3,
    defaultRestSec: 15
  },
  {
    exerciseId: 'cd_01',
    name: 'Child’s Pose & Deep Diaphragmatic Breathing',
    movementPattern: 'mobility',
    primaryMuscles: ['Back', 'Shoulders'],
    secondaryMuscles: ['Hips'],
    trainingQualities: ['mobility'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'cricket', 'running', 'football'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    warmUpSuitability: false,
    mainWorkSuitability: false,
    accessorySuitability: false,
    cooldownSuitability: true,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 1,
    defaultRestSec: 0
  },
  {
    exerciseId: 'cd_02',
    name: 'Standing Quad & Hamstring Stretch',
    movementPattern: 'mobility',
    primaryMuscles: ['Quadriceps', 'Hamstrings'],
    secondaryMuscles: ['Calves'],
    trainingQualities: ['mobility'],
    fitnessLevels: ['Beginner', 'Intermediate', 'Advanced'],
    sportRelevance: ['general', 'running', 'football', 'cricket'],
    equipment: 'Bodyweight',
    equipmentCategory: 'Bodyweight',
    difficulty: 'Beginner',
    stabilityRequirement: 'low',
    mobilityRequirement: 'low',
    fatigueCost: 'low',
    injuryExclusions: [],
    jointStress: [],
    warmUpSuitability: false,
    mainWorkSuitability: false,
    accessorySuitability: false,
    cooldownSuitability: true,
    isAiTrackable: false,
    aiDetection: { enabled: false },
    estimatedSecPerRep: 1,
    defaultRestSec: 0
  }
];

/**
 * Initialize and load registry from dataset.json and curated list
 */
function initRegistry() {
  if (registry.length > 0) return;

  const datasetPath = path.join(__dirname, '../../data/dataset.json');
  let rawItems = [];
  try {
    if (fs.existsSync(datasetPath)) {
      const data = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
      rawItems = data['LLM_7_Step_Dataset'] || [];
    }
  } catch (err) {
    console.warn('Could not read dataset.json for exerciseRegistry:', err.message);
  }

  // 1. Add curated exercises first
  CURATED_EXERCISES.forEach(ex => {
    registryMap.set(ex.exerciseId, ex);
    registry.push(ex);
  });

  // 2. Ingest raw items from 664-exercise dataset
  rawItems.forEach(item => {
    const id = item.Exercise_ID;
    if (registryMap.has(id)) return;

    const name = item.Exercise_Name || 'Exercise';
    const target = item.Step_5_Target_Muscles || '';
    const rawEquip = item.Equipment_Required || 'Bodyweight';
    const pattern = inferMovementPattern(name, target, rawEquip);
    const { primaryMuscles, secondaryMuscles } = parseMuscles(target, pattern);

    // Normalize equipment
    let equipment = 'Bodyweight';
    const eqLower = rawEquip.toLowerCase();
    if (eqLower.includes('barbell') || eqLower.includes('cable') || eqLower.includes('machine') || eqLower.includes('smith') || eqLower.includes('rowing') || eqLower.includes('treadmill')) {
      equipment = 'Full Gym';
    } else if (eqLower.includes('dumbbell') || eqLower.includes('kettlebell') || eqLower.includes('bench')) {
      equipment = 'Dumbbells';
    } else if (eqLower.includes('band')) {
      equipment = 'Resistance Bands';
    }

    const difficulty = item.Step_7_Experience_Level || 'Beginner';
    const isWarmupRehab = item.WarmUp_Rehab_Flag === 'Yes' || pattern === 'mobility' || pattern === 'activation';

    // Parse medical & joint pain avoid flags
    const injuryExclusions = [];
    if (item.Step_6_Joint_Pain_Avoid_If) {
      injuryExclusions.push(item.Step_6_Joint_Pain_Avoid_If.toLowerCase().replace(/\s+/g, ''));
    }
    const jointStress = inferJointStress(pattern, name, target);

    const enriched = {
      exerciseId: id,
      name,
      movementPattern: pattern,
      primaryMuscles,
      secondaryMuscles,
      trainingQualities: [pattern === 'sprinting' || pattern === 'jumping' ? 'power' : isWarmupRehab ? 'mobility' : 'hypertrophy'],
      fitnessLevels: [difficulty],
      sportRelevance: inferSportRelevance(pattern, name, primaryMuscles),
      equipment,
      equipmentCategory: rawEquip,
      difficulty,
      stabilityRequirement: difficulty === 'Advanced' ? 'high' : 'moderate',
      mobilityRequirement: pattern === 'squat' || pattern === 'hinge' ? 'moderate' : 'low',
      fatigueCost: inferFatigueCost(pattern, rawEquip, difficulty),
      injuryExclusions,
      jointStress,
      progressionOptions: [],
      regressionOptions: [],
      warmUpSuitability: isWarmupRehab || pattern === 'mobility' || pattern === 'activation',
      mainWorkSuitability: !isWarmupRehab && pattern !== 'mobility',
      accessorySuitability: pattern === 'rotation' || pattern === 'anti-rotation' || pattern === 'anti-extension' || isWarmupRehab,
      cooldownSuitability: isWarmupRehab || pattern === 'mobility',
      isAiTrackable: id === 'EX-0003' || name.toLowerCase().includes('push-up'),
      aiDetection: name.toLowerCase().includes('push-up')
        ? { enabled: true, detectorId: 'pushup_v1', detectorVersion: '1.0' }
        : { enabled: false },
      estimatedSecPerRep: pattern === 'locomotion' || pattern === 'anti-extension' ? 1 : 3.5,
      defaultRestSec: isWarmupRehab ? 15 : difficulty === 'Advanced' ? 90 : 60
    };

    registryMap.set(id, enriched);
    registry.push(enriched);
  });
}

let lastSyncTime = 0;
const DEFAULT_SYNC_TTL_MS = 30000;

/**
 * Synchronize custom exercises from MongoDB into the in-memory AI registry
 */
export async function syncDatabaseExercises({ force = false, ttlMs = DEFAULT_SYNC_TTL_MS } = {}) {
  try {
    initRegistry();
    if (!Exercise) return registry.length;
    if (!force && lastSyncTime && (Date.now() - lastSyncTime < ttlMs)) {
      return registry.length;
    }
    const dbItems = await Exercise.find({ status: 'active' }).lean().catch(() => []);
    if (!dbItems) return registry.length;

    const activeDbIds = new Set(dbItems.map(item => item.exerciseId || String(item._id)));

    // Prune custom DB exercises that are no longer active or have been deleted
    registry = registry.filter(ex => {
      if (ex.source === 'custom_db') {
        if (!activeDbIds.has(ex.exerciseId)) {
          registryMap.delete(ex.exerciseId);
          return false;
        }
      }
      return true;
    });

    let added = 0;
    let updated = 0;
    for (const item of dbItems) {
      const id = item.exerciseId || String(item._id);
      const name = item.name || 'Custom Exercise';
      const target = Array.isArray(item.targetMuscles) ? item.targetMuscles.join(', ') : (item.targetMuscles || '');
      const rawEquip = item.equipmentRequired || 'Bodyweight';

      // 1. Movement pattern: prioritize explicit author choice, otherwise heuristic
      let pattern = '';
      if (Array.isArray(item.movementPatterns) && item.movementPatterns.length > 0 && item.movementPatterns[0]) {
        pattern = item.movementPatterns[0].toLowerCase();
      } else if (item.movementPattern) {
        pattern = String(item.movementPattern).toLowerCase();
      } else {
        pattern = inferMovementPattern(name, target, rawEquip);
      }

      // 2. Muscles: prioritize explicit targetMuscles / secondaryMuscles
      const parsed = parseMuscles(target, pattern);
      const primaryMuscles = (Array.isArray(item.targetMuscles) && item.targetMuscles.length > 0)
        ? item.targetMuscles
        : parsed.primaryMuscles;
      const secondaryMuscles = (Array.isArray(item.secondaryMuscles) && item.secondaryMuscles.length > 0)
        ? item.secondaryMuscles
        : parsed.secondaryMuscles;

      let equipment = 'Bodyweight';
      const eqLower = rawEquip.toLowerCase();
      if (eqLower.includes('barbell') || eqLower.includes('cable') || eqLower.includes('machine') || eqLower.includes('smith') || eqLower.includes('rowing') || eqLower.includes('treadmill')) {
        equipment = 'Full Gym';
      } else if (eqLower.includes('dumbbell') || eqLower.includes('kettlebell') || eqLower.includes('bench')) {
        equipment = 'Dumbbells';
      } else if (eqLower.includes('band')) {
        equipment = 'Resistance Bands';
      }

      const difficulty = item.difficulty || 'Beginner';
      const isWarmupRehab = pattern === 'mobility' || pattern === 'activation';

      const injuryExclusions = [];
      if (Array.isArray(item.jointPainAvoidIf)) {
        item.jointPainAvoidIf.forEach(j => injuryExclusions.push(j.toLowerCase().replace(/\s+/g, '')));
      }
      if (Array.isArray(item.medicalAvoidIf)) {
        item.medicalAvoidIf.forEach(m => injuryExclusions.push(m.toLowerCase().replace(/\s+/g, '')));
      }
      if (Array.isArray(item.contraindications)) {
        item.contraindications.forEach(c => injuryExclusions.push(c.toLowerCase().replace(/\s+/g, '')));
      }

      const jointStress = inferJointStress(pattern, name, target);

      // 3. Sport relevance: prioritize instructor sportTags
      let sportRelevance = ['general'];
      if (Array.isArray(item.sportTags) && item.sportTags.length > 0) {
        sportRelevance = Array.from(new Set(['general', ...item.sportTags.map(s => s.toLowerCase())]));
      } else {
        sportRelevance = inferSportRelevance(pattern, name, primaryMuscles);
      }

      const metVal = item.calorieEstimation?.metValue || (pattern === 'sprinting' ? 9.0 : pattern === 'squat' || pattern === 'hinge' ? 6.0 : 4.5);

      const enriched = {
        exerciseId: id,
        name,
        aliases: item.aliases || [],
        tags: item.tags || [],
        movementPattern: pattern,
        movementPatterns: item.movementPatterns || [pattern],
        primaryMuscles,
        secondaryMuscles,
        trainingGoals: item.trainingGoals || [],
        trainingQualities: item.trainingQualities || [pattern === 'sprinting' || pattern === 'jumping' ? 'power' : isWarmupRehab ? 'mobility' : 'hypertrophy'],
        fitnessLevels: item.experienceLevels || [difficulty],
        sportRelevance,
        equipment,
        equipmentCategory: rawEquip,
        difficulty,
        stabilityRequirement: difficulty === 'Advanced' ? 'high' : 'moderate',
        mobilityRequirement: pattern === 'squat' || pattern === 'hinge' ? 'moderate' : 'low',
        fatigueCost: inferFatigueCost(pattern, rawEquip, difficulty),
        injuryExclusions,
        jointStress,
        primaryPurpose: item.primaryPurpose || '',
        secondaryPurpose: item.secondaryPurpose || '',
        recommendedFor: item.recommendedFor || [],
        notRecommendedFor: item.notRecommendedFor || [],
        precautions: item.precautions || [],
        commonMistakes: item.commonMistakes || [],
        coachingCues: item.coachingCues || (item.instructions ? [item.instructions] : []),
        progressionOptions: item.progressions || [],
        regressionOptions: item.regressions || [],
        programming: item.programming || null,
        calorieEstimation: {
          metValue: metVal,
          intensity: item.calorieEstimation?.intensity || 'moderate',
          estimatedKcalPerMinute: item.calorieEstimation?.estimatedKcalPerMinute || 6.0
        },
        warmUpSuitability: isWarmupRehab || pattern === 'mobility' || pattern === 'activation',
        mainWorkSuitability: !isWarmupRehab && pattern !== 'mobility',
        accessorySuitability: pattern === 'rotation' || pattern === 'anti-rotation' || pattern === 'anti-extension' || isWarmupRehab,
        cooldownSuitability: isWarmupRehab || pattern === 'mobility',
        isAiTrackable: Boolean(item.isAiTrackable),
        aiDetection: item.aiDetection || { enabled: false },
        estimatedSecPerRep: pattern === 'locomotion' || pattern === 'anti-extension' ? 1 : 3.5,
        defaultRestSec: isWarmupRehab ? 15 : difficulty === 'Advanced' ? 90 : 60,
        mediaUrl: item.mediaUrl || '',
        thumbnailUrl: item.thumbnailUrl || '',
        videoUrl: item.videoUrl || '',
        gifUrl: item.gifUrl || '',
        source: 'custom_db'
      };

      const existingIndex = registry.findIndex(e => e.exerciseId === id);
      if (existingIndex >= 0) {
        registry[existingIndex] = enriched;
        updated++;
      } else {
        registry.push(enriched);
        added++;
      }
      registryMap.set(id, enriched);
    }

    if (added > 0 || updated > 0) {
      console.log(`[ExerciseRegistry] Ingested ${added} new and updated ${updated} custom exercises from database into AI registry.`);
    }
    lastSyncTime = Date.now();
    return registry.length;
  } catch (err) {
    console.warn('[ExerciseRegistry] DB sync skipped:', err.message);
    return registry.length;
  }
}

/**
 * Standard ACSM formula for exercise calorie expenditure:
 * kcal = (MET * 3.5 * weightInKg / 200) * durationInMinutes
 */
export function estimateExerciseCalories(exerciseIdOrName, durationMinutes = 30, bodyweightKg = 70) {
  initRegistry();
  const ex = typeof exerciseIdOrName === 'string' 
    ? (registryMap.get(exerciseIdOrName) || exerciseRegistry.findByName(exerciseIdOrName))
    : exerciseIdOrName;
  
  let met = ex?.calorieEstimation?.metValue;
  if (!met) {
    const pattern = (ex?.movementPattern || (typeof exerciseIdOrName === 'string' ? exerciseIdOrName : '')).toLowerCase();
    if (pattern.includes('sprint') || pattern === 'conditioning' || pattern.includes('hiit')) met = 9.0;
    else if (pattern.includes('jump') || pattern.includes('run') || pattern === 'locomotion') met = 7.5;
    else if (pattern.includes('squat') || pattern.includes('hinge') || pattern.includes('lunge') || pattern.includes('deadlift')) met = 6.0;
    else if (pattern.includes('mobility') || pattern.includes('stretch') || pattern === 'activation') met = 2.8;
    else met = 5.0;
  }
  const kcal = (met * 3.5 * (bodyweightKg || 70) / 200) * (durationMinutes || 30);
  return Math.round(kcal);
}

// Initial boot
initRegistry();
syncDatabaseExercises().catch(() => {});

export const exerciseRegistry = {
  getAll() {
    initRegistry();
    return registry;
  },

  getById(id) {
    initRegistry();
    return registryMap.get(id) || null;
  },

  findByName(name) {
    initRegistry();
    const clean = (name || '').toLowerCase().trim();
    return registry.find(ex => ex.name.toLowerCase() === clean || ex.name.toLowerCase().includes(clean)) || null;
  },

  getByMovementPattern(pattern) {
    initRegistry();
    return registry.filter(ex => ex.movementPattern === pattern);
  },

  filterByEquipment(exercises, equipmentAccess = 'Full Gym') {
    const eq = (equipmentAccess || 'Full Gym').toLowerCase();
    if (eq.includes('bodyweight') || eq.includes('no equipment') || eq.includes('none')) {
      return exercises.filter(ex => ex.equipment === 'Bodyweight');
    }
    if (eq.includes('dumbbell')) {
      return exercises.filter(ex => ex.equipment === 'Bodyweight' || ex.equipment === 'Dumbbells');
    }
    if (eq.includes('band')) {
      return exercises.filter(ex => ex.equipment === 'Bodyweight' || ex.equipment === 'Resistance Bands');
    }
    return exercises; // Full Gym allows all
  },

  estimateExerciseCalories,
  syncDatabaseExercises
};

export default exerciseRegistry;
