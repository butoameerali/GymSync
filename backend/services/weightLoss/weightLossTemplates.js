import PreMadePlan from '../../models/PreMadePlan.js';

/**
 * Common 5-Minute Warm-up exercise (Exercise #1 in every workout day)
 * As defined in Section 4: March in place 1 min, arm circles 30s each way,
 * shoulder rolls 30s, hip circles 30s, 8 shallow squats.
 */
const COMMON_WARMUP = {
  exerciseId: 'warmup-5min',
  name: '5-Minute Warm-Up Routine',
  order: 1,
  sets: 1,
  reps: '5 mins',
  duration: 300,
  restSeconds: 0,
  intensity: 'Low',
  rpe: 4,
  tempo: 'Controlled',
  notes: 'March in place 1m, arm circles 30s each way, shoulder rolls 30s, hip circles 30s, 8 shallow squats.',
  isWarmup: true,
  isCooldown: false,
  isCardio: false,
  easierOption: 'Seated marching and gentle shoulder rolls',
  harderOption: 'Brisk high knees and dynamic reaches',
  keyCue: 'Gradually raise heart rate and lubricate joints. Never skip warm-up before lifting.',
  targetMuscle: 'Full Body Mobilization',
  gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif',
  mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif'
};

/**
 * Common 5-Minute Cool-down exercise (Final exercise of workout days)
 * As defined in Section 4: Slow walk 2 min, then 30s each: calf, front-thigh
 * and back-thigh stretch, chest stretch, then 1 min of slow breathing.
 */
const COMMON_COOLDOWN = (orderNum = 7) => ({
  exerciseId: 'cooldown-5min',
  name: '5-Minute Cool-Down & Stretch',
  order: orderNum,
  sets: 1,
  reps: '5 mins',
  duration: 300,
  restSeconds: 0,
  intensity: 'Very Low',
  rpe: 2,
  tempo: 'Slow',
  notes: 'Slow walk 2m, then 30s each: calf stretch, quad stretch, hamstring stretch, chest stretch, 1m slow breathing.',
  isWarmup: false,
  isCooldown: true,
  isCardio: false,
  easierOption: 'Seated stretches with deep diaphragmatic belly breathing',
  harderOption: 'Extend static stretch holds to 45s each',
  keyCue: 'Deep diaphragmatic breathing to return nervous system to resting state.',
  targetMuscle: 'Full Body Flexibility & Recovery',
  gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif',
  mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif'
});

const DEFAULT_MISSED_DAY_POLICY = {
  rule1To3Days: 'Never double up. Missed 1 to 3 days, carry on.',
  rule4To7Days: 'Missed 4 to 7 days, repeat the week.',
  ruleMoreThan7Days: 'Missed more than 7 days, restart week 1.'
};

/**
 * 6 Official Human-Authored Weight Loss Programs from Month 1 Pack:
 * H1: Home Starter (No Equipment)
 * H2: Home Steady (No Equipment)
 * H3: Home Driven (Heavy Extreme Fat Loss - No Equipment)
 * G1: Equipment Starter (Gym)
 * G2: Equipment Steady (Gym)
 * G3: Equipment Driven (Heavy Extreme Gym Shred)
 */
export const WEIGHT_LOSS_TEMPLATES = [
  // ==========================================
  // H1: HOME STARTER (NO EQUIPMENT)
  // ==========================================
  {
    key: 'home_bodyweight',
    title: 'H1: Home Starter (No Equipment) - 4-Week Weight Loss',
    type: 'Workout',
    category: 'Weight Loss',
    goal: 'Weight Loss',
    difficulty: 'Beginner',
    durationWeeks: 4,
    daysPerWeek: 4,
    targetAudience: 'Beginners walking <20 min/day or new to exercise',
    equipmentTrack: 'Home (No Equipment)',
    programLevel: 'Starter',
    isExtremeProgram: false,
    minAge: 18,
    maxAge: 75,
    minBMI: 23,
    maxBMI: 50,
    minWeightKg: 50,
    maxWeightKg: 180,
    whoCanDo: [
      'Adults (18+) with BMI 23+ looking to start weight loss safely',
      'Users who walk less than 20 min/day or exercise 0-1 days/week',
      'Users with higher starting weight (including 120kg+) seeking low-impact foundational routine'
    ],
    whoShouldNotDo: [
      'Under 18 years old',
      'BMI under 18.5 (underweight)',
      'Pregnant or breastfeeding individuals',
      'Individuals without physician clearance if suffering from cardiovascular, metabolic, or severe joint conditions'
    ],
    medicalWarningRequired: true,
    medicalWarningText: 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication. Stop at once if you feel chest pain or dizziness.',
    missedDayPolicy: DEFAULT_MISSED_DAY_POLICY,
    cardioPrescription: {
      hasWalking: true,
      hasRunning: false,
      description: 'Daily easy walking (15-25 min) + Saturday long walk (25-35 min)',
      dailyMinutes: 20,
      saturdayMinutes: 30,
      intervalRounds: 0,
      effortRPE: 'RPE 5 (Conversational pace)'
    },
    expectedLossMonth1: {
      minKg: 0.8,
      maxKg: 2.8,
      note: 'Safe planning band: 0.25% to 0.75% of body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.'
    },
    equipmentRequired: ['Bodyweight', 'Sturdy Chair', 'Wall'],
    status: 'published',
    createdBy: 'Coach Tariq',
    authorRole: 'FitnessInstructor',
    description: 'Gentle joint-friendly home starter program. Combines bodyweight chair sit-to-stands, wall push-ups, glute bridges, and structured daily walking.',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Week 1: Foundational Movement & Walking Habit (2 sets × 8-10 reps, 15m daily walk, RPE 5)',
        days: [
          {
            dayNumber: 1,
            title: 'Strength A + Walking',
            isRestDay: false,
            dayType: 'workout',
            warmup: [{ text: '5-min full body joint mobilization', duration: 5 }],
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'chair-sit-to-stand',
                name: 'Chair Sit-to-Stand',
                order: 2,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                tempo: '2-0-2',
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Lean forward, stand tall, sit down slowly.',
                easierOption: 'Higher chair or use armrests/hands on thighs',
                harderOption: 'Lower chair, hover without fully sitting',
                notes: 'Control the descent, do not flop down.',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif'
              },
              {
                exerciseId: 'wall-push-up',
                name: 'Wall Push-Up',
                order: 3,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                tempo: '2-0-2',
                targetMuscle: 'Chest, Triceps, Anterior Deltoid',
                keyCue: 'Body in one straight line, elbows at 45 degrees.',
                easierOption: 'Stand closer to the wall',
                harderOption: 'Incline push-up on kitchen counter',
                notes: 'Keep core tight, do not let lower back sag.',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0493-B1EVP9F.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0493-B1EVP9F.gif'
              },
              {
                exerciseId: 'glute-bridge',
                name: 'Glute Bridge',
                order: 4,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                tempo: '2-1-2',
                targetMuscle: 'Glutes, Hamstrings',
                keyCue: 'Push through heels, squeeze glutes, do not arch lower back.',
                easierOption: 'Smaller range of motion',
                harderOption: 'Single-leg glute bridge or 3-second hold at top',
                notes: 'Focus on feeling glutes contract.',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0489-zhMwOwE.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0489-zhMwOwE.gif'
              },
              {
                exerciseId: 'standing-march',
                name: 'Standing March (Hold the Wall)',
                order: 5,
                sets: 2,
                reps: '10 per side',
                restSeconds: 45,
                intensity: 'Low',
                rpe: 5,
                tempo: 'Controlled',
                targetMuscle: 'Hip Flexors, Core, Balance',
                keyCue: 'Tall posture, hold wall for balance, lift knee smoothly.',
                easierOption: 'Smaller knee lift',
                harderOption: 'Slower tempo with a 2-second hold at the top',
                notes: 'Keep breathing evenly.',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif'
              },
              {
                exerciseId: 'bird-dog',
                name: 'Bird-Dog',
                order: 6,
                sets: 2,
                reps: '8 per side',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                tempo: 'Slow',
                targetMuscle: 'Core, Lower Back, Glutes',
                keyCue: 'Hips stay level, extend opposite arm and leg straight.',
                easierOption: 'Arm only, or leg only',
                harderOption: 'Pause 3 seconds at top extension',
                notes: 'Do not arch back excessively.',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0489-zhMwOwE.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0489-zhMwOwE.gif'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 2,
            title: 'Easy Walk',
            isRestDay: false,
            dayType: 'active_recovery',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'daily-easy-walk',
                name: 'Daily Easy Walk (Flat / Outdoors)',
                order: 2,
                sets: 1,
                reps: '15 mins',
                duration: 900,
                restSeconds: 0,
                intensity: 'Low',
                rpe: 5,
                isCardio: true,
                targetMuscle: 'Cardiovascular System',
                keyCue: 'Conversational pace where you can easily speak full sentences.',
                easierOption: '3 mini walks of 5 minutes spread across the day',
                harderOption: 'Brisk continuous pace for 20 minutes',
                notes: 'Wear comfortable walking shoes.'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 3,
            title: 'Strength B',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'chair-sit-to-stand',
                name: 'Chair Sit-to-Stand',
                order: 2,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Lean forward, stand tall, sit down slowly.',
                easierOption: 'Higher chair or use armrests',
                harderOption: 'Hover above chair without resting',
                notes: 'Keep heels grounded.'
              },
              {
                exerciseId: 'wall-push-up',
                name: 'Wall Push-Up',
                order: 3,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Elbows at 45 degrees, body in one straight line.',
                easierOption: 'Step closer to wall',
                harderOption: 'Counter push-up',
                notes: 'Breathe out as you press away.'
              },
              {
                exerciseId: 'standing-hip-hinge',
                name: 'Standing Hip Hinge (Hands on Hips)',
                order: 4,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Hamstrings, Glutes',
                keyCue: 'Hips back, flat back, soft knees.',
                easierOption: 'Hands on thighs for support',
                harderOption: 'Hold a light backpack or water bottle',
                notes: 'Do not round the spine.'
              },
              {
                exerciseId: 'dead-bug',
                name: 'Dead Bug',
                order: 5,
                sets: 2,
                reps: '8 per side',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Core, Abdominals',
                keyCue: 'Lower back stays flat on the floor throughout.',
                easierOption: 'Shorter leg reach, knees bent at 90 degrees',
                harderOption: 'Straighter legs and reach arms fully overhead',
                notes: 'Press lower back into ground.'
              },
              {
                exerciseId: 'standing-calf-raise',
                name: 'Standing Calf Raise (Hold the Wall)',
                order: 6,
                sets: 2,
                reps: '10-12',
                restSeconds: 45,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Calves',
                keyCue: 'Slow up onto balls of feet, slow down.',
                easierOption: 'Two feet on flat floor with sturdy wall support',
                harderOption: 'Single leg calf raise',
                notes: 'Feel contraction in calves.'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 4,
            title: 'Easy Walk + 5-Min Stretching',
            isRestDay: false,
            dayType: 'active_recovery',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'recovery-walk',
                name: 'Easy Walk + Gentle Mobility',
                order: 2,
                sets: 1,
                reps: '15 mins',
                duration: 900,
                restSeconds: 0,
                intensity: 'Low',
                rpe: 4,
                isCardio: true,
                targetMuscle: 'Cardiovascular System',
                keyCue: 'Relaxed walking, swing arms gently.',
                easierOption: 'Gentle indoor walk',
                harderOption: 'Add 5 minutes of extra mobility'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 5,
            title: 'Strength A',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'chair-sit-to-stand',
                name: 'Chair Sit-to-Stand',
                order: 2,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Lean forward, stand tall, sit down slowly.',
                easierOption: 'Higher chair',
                harderOption: 'Lower chair'
              },
              {
                exerciseId: 'wall-push-up',
                name: 'Wall Push-Up',
                order: 3,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Elbows 45 degrees, body in straight plank line.',
                easierOption: 'Closer to wall',
                harderOption: 'Incline on counter'
              },
              {
                exerciseId: 'glute-bridge',
                name: 'Glute Bridge',
                order: 4,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Glutes, Hamstrings',
                keyCue: 'Drive through heels, squeeze glutes at top.',
                easierOption: 'Smaller range',
                harderOption: 'Single leg'
              },
              {
                exerciseId: 'standing-march',
                name: 'Standing March',
                order: 5,
                sets: 2,
                reps: '10 per side',
                restSeconds: 45,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Core, Balance',
                keyCue: 'Hold wall, tall posture.',
                easierOption: 'Smaller lift',
                harderOption: 'Pause at top'
              },
              {
                exerciseId: 'bird-dog',
                name: 'Bird-Dog',
                order: 6,
                sets: 2,
                reps: '8 per side',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Core, Lower Back',
                keyCue: 'Hips level, opposite arm and leg straight.',
                easierOption: 'Arm only',
                harderOption: '3s hold'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 6,
            title: 'Saturday Long Easy Walk',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'saturday-long-walk',
                name: 'Saturday Long Easy Walk',
                order: 2,
                sets: 1,
                reps: '25 mins',
                duration: 1500,
                restSeconds: 0,
                intensity: 'Moderate',
                rpe: 5,
                isCardio: true,
                targetMuscle: 'Aerobic Base, Calorie Burn',
                keyCue: 'Continuous steady aerobic walking at conversational pace.',
                easierOption: 'Take a 2-minute seated break at halfway mark',
                harderOption: 'Maintain brisk 5.0 km/h walking pace'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 7,
            title: 'Full Rest Day',
            isRestDay: true,
            dayType: 'rest',
            notes: 'Complete rest. Stay hydrated, eat regular wholesome meals, prioritize 7-9 hours of restful sleep.',
            exercises: []
          }
        ]
      }
    ]
  },

  // ==========================================
  // H2: HOME STEADY (NO EQUIPMENT)
  // ==========================================
  {
    key: 'home_steady',
    title: 'H2: Home Steady (No Equipment) - 4-Week Fat Loss',
    type: 'Workout',
    category: 'Weight Loss',
    goal: 'Weight Loss',
    difficulty: 'Intermediate',
    durationWeeks: 4,
    daysPerWeek: 5,
    targetAudience: 'Individuals who walk 20-30 min comfortably and exercise 2-3 days/week',
    equipmentTrack: 'Home (No Equipment)',
    programLevel: 'Steady',
    isExtremeProgram: false,
    minAge: 18,
    maxAge: 70,
    minBMI: 23,
    maxBMI: 40,
    minWeightKg: 50,
    maxWeightKg: 150,
    whoCanDo: [
      'Adults (18+) with BMI 23+ who can walk 20-30 min without stopping',
      'Users looking for full body tone and brisk interval walking fat loss'
    ],
    whoShouldNotDo: [
      'Under 18 years old',
      'BMI under 18.5',
      'Users with joint pain that prevents full bodyweight squatting'
    ],
    medicalWarningRequired: true,
    medicalWarningText: 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.',
    missedDayPolicy: DEFAULT_MISSED_DAY_POLICY,
    cardioPrescription: {
      hasWalking: true,
      hasRunning: false,
      description: 'Tuesday brisk walk (30-40m), Thursday interval walk (6-8 rounds: 1m brisk RPE 7 / 2m easy RPE 4), Saturday long walk (40-50m)',
      dailyMinutes: 30,
      saturdayMinutes: 45,
      intervalRounds: 6,
      effortRPE: 'RPE 6-7'
    },
    expectedLossMonth1: {
      minKg: 1.0,
      maxKg: 3.2,
      note: 'Safe planning band: 0.25% to 0.75% of body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.'
    },
    equipmentRequired: ['Bodyweight', 'Table/Counter', 'Backpack with Books', 'Water Bottles'],
    status: 'published',
    createdBy: 'Coach Tariq',
    authorRole: 'FitnessInstructor',
    description: 'Progressive home bodyweight and brisk interval walk routine. Features bodyweight squats, incline push-ups, backpack rows, and Thursday intervals.',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Week 1: Conditioning & Movement Mastery (2 sets × 10-12 reps, 30m brisk walk, 6 interval rounds, RPE 6)',
        days: [
          {
            dayNumber: 1,
            title: 'Strength A (Full Body)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'bodyweight-squat',
                name: 'Bodyweight Squat',
                order: 2,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Chest up, knees follow toes, sit hips back.',
                easierOption: 'Squat to a chair/bench',
                harderOption: 'Tempo squat (3s descent) or pause at bottom',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif'
              },
              {
                exerciseId: 'incline-push-up',
                name: 'Incline Push-Up (Hands on Table / Counter)',
                order: 3,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Hands under shoulders, body in straight line, no sagging hips.',
                easierOption: 'Higher surface (wall or high counter)',
                harderOption: 'Lower surface (coffee table or floor knees)',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0493-B1EVP9F.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0493-B1EVP9F.gif'
              },
              {
                exerciseId: 'reverse-lunge',
                name: 'Reverse Lunge (Hold Wall or Chair)',
                order: 4,
                sets: 2,
                reps: '10 per leg',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Glutes, Quads, Balance',
                keyCue: 'Step back smoothly, front knee stacked over ankle.',
                easierOption: 'Hold wall for balance, shallower lunge',
                harderOption: 'No support, slower tempo',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif'
              },
              {
                exerciseId: 'glute-bridge',
                name: 'Glute Bridge',
                order: 5,
                sets: 2,
                reps: '12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Glutes, Hamstrings',
                keyCue: 'Drive through heels, squeeze glutes at the top.',
                easierOption: 'Smaller range',
                harderOption: 'Single leg or hold 2s at top'
              },
              {
                exerciseId: 'knee-or-incline-plank',
                name: 'Knee or Incline Plank Hold',
                order: 6,
                sets: 2,
                reps: '20-30 secs',
                duration: 30,
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Core, Abdominals',
                keyCue: 'Straight line head to heels, keep breathing evenly.',
                easierOption: 'Incline plank hands on counter',
                harderOption: 'Full floor plank on toes'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 2,
            title: 'Brisk Walk',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'brisk-walk-30min',
                name: 'Brisk Walk (Steady State)',
                order: 2,
                sets: 1,
                reps: '30 mins',
                duration: 1800,
                restSeconds: 0,
                intensity: 'Moderate',
                rpe: 6,
                isCardio: true,
                targetMuscle: 'Cardiovascular System',
                keyCue: 'Brisk purposeful pace, breathing deeply, arms swinging naturally.',
                easierOption: '20 minutes steady walk',
                harderOption: '35 minutes brisk walk'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 3,
            title: 'Strength B',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'backpack-bent-over-row',
                name: 'Backpack Bent-Over Row',
                order: 2,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Upper Back, Lats, Biceps',
                keyCue: 'Flat back, hinge at hips, pull elbows to hips.',
                easierOption: 'Lighter backpack with fewer books',
                harderOption: 'Heavier backpack with 2-second squeeze at top'
              },
              {
                exerciseId: 'backpack-hip-hinge',
                name: 'Backpack Hip Hinge',
                order: 3,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Hamstrings, Glutes',
                keyCue: 'Push hips back, keep back flat, feel hamstring tension.',
                easierOption: 'Hands on hips without backpack',
                harderOption: 'Heavier backpack held close to chest'
              },
              {
                exerciseId: 'step-up',
                name: 'Step-Up on Low Stable Step',
                order: 4,
                sets: 2,
                reps: '10 per leg',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Whole foot on step, do not push off back foot.',
                easierOption: 'Lower step with hand on railing',
                harderOption: 'Higher step or hold water bottles'
              },
              {
                exerciseId: 'water-bottle-overhead-press',
                name: 'Water-Bottle Overhead Press',
                order: 5,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Shoulders, Triceps',
                keyCue: 'Ribs down, do not arch lower back, press overhead.',
                easierOption: 'Smaller 500ml water bottles',
                harderOption: 'Larger 1.5L bottles or light dumbbells'
              },
              {
                exerciseId: 'dead-bug',
                name: 'Dead Bug',
                order: 6,
                sets: 2,
                reps: '10 per side',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Core, Abdominals',
                keyCue: 'Keep lower back glued to floor.',
                easierOption: 'Knees bent 90 degrees',
                harderOption: 'Extend arms and legs fully'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 4,
            title: 'Interval Walk',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'walk-intervals',
                name: 'Interval Walk (6 Rounds: 1m Brisk / 2m Easy)',
                order: 2,
                sets: 6,
                reps: '3 mins/round',
                duration: 1080,
                restSeconds: 0,
                intensity: 'High',
                rpe: 7,
                isCardio: true,
                targetMuscle: 'Cardiovascular Conditioning',
                keyCue: '1 min brisk walk (RPE 7: short sentences only), followed by 2 min easy recovery walk (RPE 4).',
                easierOption: '4 interval rounds',
                harderOption: '8 interval rounds'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 5,
            title: 'Strength C',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'bodyweight-squat',
                name: 'Bodyweight Squat',
                order: 2,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Chest up, knees tracking toes.',
                easierOption: 'Box squat to chair',
                harderOption: 'Pause at bottom'
              },
              {
                exerciseId: 'incline-push-up',
                name: 'Incline Push-Up',
                order: 3,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Straight line, tight core.',
                easierOption: 'Higher counter',
                harderOption: 'Floor knees'
              },
              {
                exerciseId: 'backpack-bent-over-row',
                name: 'Backpack Bent-Over Row',
                order: 4,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Lats, Upper Back',
                keyCue: 'Flat back, elbows to hips.',
                easierOption: 'Lighter bag',
                harderOption: 'Heavier bag'
              },
              {
                exerciseId: 'glute-bridge-march',
                name: 'Glute Bridge March',
                order: 5,
                sets: 2,
                reps: '8 per leg',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Glutes, Pelvic Stability',
                keyCue: 'Hold hips up high, lift one foot 2 inches off floor without dropping hips.',
                easierOption: 'Standard glute bridge hold',
                harderOption: 'Higher knee march with 2s hold'
              },
              {
                exerciseId: 'slow-incline-mountain-climber',
                name: 'Slow Incline Mountain Climber (Hands on Counter)',
                order: 6,
                sets: 2,
                reps: '10 per side',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Core, Hip Flexors',
                keyCue: 'No jumping. Drive knee slowly to chest, hold 1s, step back.',
                easierOption: 'Standing high knees holding counter',
                harderOption: 'Floor mountain climber (slow controlled tempo)'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 6,
            title: 'Saturday Long Walk',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'saturday-long-walk-40',
                name: 'Saturday Steady Long Walk',
                order: 2,
                sets: 1,
                reps: '40 mins',
                duration: 2400,
                restSeconds: 0,
                intensity: 'Moderate',
                rpe: 6,
                isCardio: true,
                targetMuscle: 'Aerobic Capacity & Fat Oxidation',
                keyCue: 'Steady endurance walk. Stay hydrated.',
                easierOption: '30 minutes easy walk',
                harderOption: '50 minutes brisk walk'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 7,
            title: 'Full Rest Day',
            isRestDay: true,
            dayType: 'rest',
            notes: 'Complete rest day. Hydrate, foam roll or gentle mobility if feeling tight.',
            exercises: []
          }
        ]
      }
    ]
  },

  // ==========================================
  // H3: HOME DRIVEN (HEAVY EXTREME FAT LOSS)
  // ==========================================
  {
    key: 'home_driven',
    title: 'H3: Home Driven: Heavy Extreme Fat Loss (No Equipment) - 4 Weeks',
    type: 'Workout',
    category: 'Weight Loss',
    goal: 'Weight Loss',
    difficulty: 'Advanced',
    durationWeeks: 4,
    daysPerWeek: 6,
    targetAudience: 'Trained individuals (3+ days/week for 2+ months) wanting high-intensity fat loss',
    equipmentTrack: 'Home (No Equipment)',
    programLevel: 'Driven',
    isExtremeProgram: true,
    minAge: 20,
    maxAge: 59,
    minBMI: 23,
    maxBMI: 34.9,
    minWeightKg: 55,
    maxWeightKg: 130,
    whoCanDo: [
      'Experienced trainees already training 3+ days/week for at least 2 months',
      'Users comfortable with 30-40 min of brisk exercise seeking aggressive safe metabolic conditioning'
    ],
    whoShouldNotDo: [
      'Under 20 or over 60 years old',
      'Inactive beginners or anyone with BMI 35+ / weight 120kg+ (must use Starter only)',
      'Anyone with knee, back, or cardiovascular medical issues'
    ],
    medicalWarningRequired: true,
    medicalWarningText: 'EXTREME PROGRAM WARNING: High metabolic intensity. Do NOT attempt without doctor approval and an established exercise foundation.',
    missedDayPolicy: DEFAULT_MISSED_DAY_POLICY,
    cardioPrescription: {
      hasWalking: true,
      hasRunning: true,
      description: 'Wednesday high-intensity fast intervals (8-10 rounds: 1m fast jog/stair climb RPE 7-8 / 1.5m easy) + Saturday long steady cardio (45-60m)',
      dailyMinutes: 35,
      saturdayMinutes: 50,
      intervalRounds: 8,
      effortRPE: 'RPE 7-8'
    },
    expectedLossMonth1: {
      minKg: 1.2,
      maxKg: 3.6,
      note: 'High-effort metabolic output. Planning band 0.25% to 0.75%/week with 1% hard cap. Food adherence and recovery are vital.'
    },
    equipmentRequired: ['Bodyweight', 'Sturdy Chair', 'Backpack with Weight', 'Bottles'],
    status: 'published',
    createdBy: 'Coach Tariq',
    authorRole: 'FitnessInstructor',
    description: 'High-intensity home shred program for conditioned lifters. Lower/upper split with tempo squats, split squats, full push-ups, chair dips, and Wednesday fast intervals.',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Week 1: High Tension & Metabolic Output (3 sets × 8-10 reps, 8 fast interval rounds, RPE 6-7)',
        days: [
          {
            dayNumber: 1,
            title: 'Lower A (Tempo & Quad Focus)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'tempo-squat',
                name: 'Tempo Squat (3s Lowering)',
                order: 2,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                tempo: '3-0-1',
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Control 3 full seconds down, explosive press up.',
                easierOption: 'Standard speed squat to a chair',
                harderOption: 'Hold heavy backpack at chest',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif'
              },
              {
                exerciseId: 'reverse-lunge',
                name: 'Reverse Lunge (No Support)',
                order: 3,
                sets: 3,
                reps: '10 per leg',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Step back, torso tall, front thigh parallel to floor.',
                easierOption: 'Hold a wall for balance',
                harderOption: 'Hold water bottles or backpack'
              },
              {
                exerciseId: 'single-leg-glute-bridge',
                name: 'Single-Leg Glute Bridge',
                order: 4,
                sets: 3,
                reps: '8-10 per leg',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Glutes, Hamstrings',
                keyCue: 'Drive through planted heel, keep hips square.',
                easierOption: 'Two-leg glute bridge with 3s hold at top',
                harderOption: 'Elevate foot on a chair or step'
              },
              {
                exerciseId: 'wall-sit-hold',
                name: 'Wall Sit Hold',
                order: 5,
                sets: 3,
                reps: '30 secs hold',
                duration: 30,
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Quadriceps Isometric',
                keyCue: 'Back flat on wall, thighs parallel to ground.',
                easierOption: 'Higher angle (45 degrees)',
                harderOption: 'Hold 45s or place backpack on lap'
              },
              {
                exerciseId: 'single-leg-calf-raise',
                name: 'Single-Leg Calf Raise',
                order: 6,
                sets: 3,
                reps: '12 per leg',
                restSeconds: 45,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Calves',
                keyCue: 'Slow on way up, pause 1s at apex, slow lowering.',
                easierOption: 'Two-legged calf raise',
                harderOption: 'Deficit calf raise on edge of a step'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 2,
            title: 'Upper A (Push & Pull Power)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'push-up-full',
                name: 'Floor Push-Up (Full / Strict)',
                order: 2,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                tempo: '2-0-1',
                targetMuscle: 'Chest, Triceps, Core',
                keyCue: 'Ribs down, glutes tight, chest touches within inch of floor.',
                easierOption: 'Knee push-ups or hands on counter',
                harderOption: 'Tempo push-ups (3s descent) or close-grip',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0493-B1EVP9F.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0493-B1EVP9F.gif'
              },
              {
                exerciseId: 'backpack-bent-over-row',
                name: 'Backpack Bent-Over Row (Heavy)',
                order: 3,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Lats, Rhomboids',
                keyCue: 'Hinge forward, pull elbows back toward hips.',
                easierOption: 'Lighter weight',
                harderOption: 'Pause 2 seconds at chest'
              },
              {
                exerciseId: 'pike-push-up',
                name: 'Pike Push-Up (Shoulder Builder)',
                order: 4,
                sets: 3,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Deltoids, Upper Chest',
                keyCue: 'Hips high in air, head lowers between hands.',
                easierOption: 'Hands on higher surface (chair or bed)',
                harderOption: 'Feet elevated on chair'
              },
              {
                exerciseId: 'chair-triceps-dip',
                name: 'Chair Triceps Dip',
                order: 5,
                sets: 3,
                reps: '10',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Triceps',
                keyCue: 'Shoulders down, elbows point back, do not shrug.',
                easierOption: 'Feet close to chair with knees bent',
                harderOption: 'Legs extended straight out'
              },
              {
                exerciseId: 'plank-hold',
                name: 'Full Plank Hold',
                order: 6,
                sets: 3,
                reps: '30-40 secs',
                duration: 40,
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Core, Abdominals',
                keyCue: 'Straight line, actively push floor away, glutes locked.',
                easierOption: 'Incline plank or knees',
                harderOption: 'Elevate feet or tap shoulders'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 3,
            title: 'High-Intensity Fast Intervals',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'driven-fast-intervals',
                name: 'Driven Fast Intervals (8 Rounds: 1m Fast Jog/Stairs / 1.5m Easy)',
                order: 2,
                sets: 8,
                reps: '2.5 mins/round',
                duration: 1200,
                restSeconds: 0,
                intensity: 'Extreme',
                rpe: 8,
                isCardio: true,
                targetMuscle: 'Cardiovascular & Glycolytic Conditioning',
                keyCue: '1 min fast effort (jog, fast march or stair climb RPE 7-8, never all-out sprint) followed by 1.5m easy recovery.',
                easierOption: '6 interval rounds with power walking instead of jogging',
                harderOption: '10 interval rounds on stairs or incline'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 4,
            title: 'Lower B + Core',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'bulgarian-split-squat',
                name: 'Rear-Foot-Elevated Split Squat (Back Foot on Chair)',
                order: 2,
                sets: 3,
                reps: '8-10 per leg',
                restSeconds: 75,
                intensity: 'Extreme',
                rpe: 8,
                targetMuscle: 'Quads, Glutes, Hamstrings',
                keyCue: 'Torso slightly pitched forward, lower back knee toward ground.',
                easierOption: 'Standard split squat with both feet on floor',
                harderOption: 'Hold backpack or water bottles'
              },
              {
                exerciseId: 'backpack-hip-hinge',
                name: 'Backpack Hip Hinge (Heavy)',
                order: 3,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Hamstrings, Glutes',
                keyCue: 'Push hips back, feel intense stretch in hamstrings.',
                easierOption: 'Bodyweight hip hinge',
                harderOption: 'Heavier bag with 2-second pause at stretch'
              },
              {
                exerciseId: 'higher-step-up',
                name: 'Step-Up on Higher Step',
                order: 4,
                sets: 3,
                reps: '10 per leg',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Plant full foot, drive through heel, control descent.',
                easierOption: 'Lower step',
                harderOption: 'Add knee drive at top'
              },
              {
                exerciseId: 'lateral-lunge',
                name: 'Lateral Lunge',
                order: 5,
                sets: 3,
                reps: '8 per side',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 7,
                targetMuscle: 'Adductors, Glute Medius',
                keyCue: 'Step wide, sit hips back on bent leg, trailing leg straight.',
                easierOption: 'Shorter step with hands on thighs',
                harderOption: 'Hold backpack at chest'
              },
              {
                exerciseId: 'dead-bug',
                name: 'Dead Bug (Extended)',
                order: 6,
                sets: 3,
                reps: '12 per side',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 7,
                targetMuscle: 'Deep Core, Transverse Abdominis',
                keyCue: 'Lower back remains flush against floor.',
                easierOption: 'Bend knees 90 degrees',
                harderOption: 'Hold 2 seconds at maximum extension'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 5,
            title: 'Upper B (Tempo Push & Core)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'tempo-push-up',
                name: 'Tempo Push-Up (3s Lowering)',
                order: 2,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Lower under control for 3 full seconds.',
                easierOption: 'Incline push-up on counter',
                harderOption: 'Close-grip push-up'
              },
              {
                exerciseId: 'backpack-bent-over-row',
                name: 'Backpack Bent-Over Row',
                order: 3,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Lats, Rhomboids',
                keyCue: 'Flat back, elbows tucked.',
                easierOption: 'Lighter backpack',
                harderOption: 'Heavier bag'
              },
              {
                exerciseId: 'overhead-press-backpack',
                name: 'Overhead Press with Backpack or Bottles',
                order: 4,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Shoulders, Triceps',
                keyCue: 'Ribs pulled down, no lower back hyperextension.',
                easierOption: 'Lighter water bottles',
                harderOption: 'Heavier backpack'
              },
              {
                exerciseId: 'chair-triceps-dip',
                name: 'Chair Triceps Dip',
                order: 5,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Triceps',
                keyCue: 'Keep back close to chair edge.',
                easierOption: 'Knees bent 90 degrees',
                harderOption: 'Straight legs'
              },
              {
                exerciseId: 'side-plank',
                name: 'Side Plank',
                order: 6,
                sets: 3,
                reps: '25-30 secs per side',
                duration: 30,
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Obliques, Quadratus Lumborum',
                keyCue: 'Elbow under shoulder, hips lifted in a straight line.',
                easierOption: 'Knees bent on floor',
                harderOption: 'Full side plank with top leg elevated'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 6,
            title: 'Saturday Long Steady Cardio',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'saturday-driven-cardio',
                name: 'Long Steady Cardio (Jog / Power Walk / Bike)',
                order: 2,
                sets: 1,
                reps: '45 mins',
                duration: 2700,
                restSeconds: 0,
                intensity: 'Moderate-High',
                rpe: 6,
                isCardio: true,
                targetMuscle: 'Cardiovascular Endurance & Maximum Calorie Deficit',
                keyCue: 'Maintain consistent output at RPE 6-7 without stopping.',
                easierOption: 'Brisk 35-minute power walk',
                harderOption: '60 minutes continuous jogging/cycling'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 7,
            title: 'Full Rest Day',
            isRestDay: true,
            dayType: 'rest',
            notes: 'Essential complete rest day for neurological and muscular recovery after high metabolic demand.',
            exercises: []
          }
        ]
      }
    ]
  },

  // ==========================================
  // G1: EQUIPMENT STARTER (GYM TRACK)
  // ==========================================
  {
    key: 'gym_standard',
    title: 'G1: Equipment Starter: Low-Impact Gym Circuit - 4 Weeks',
    type: 'Workout',
    category: 'Weight Loss',
    goal: 'Weight Loss',
    difficulty: 'Beginner',
    durationWeeks: 4,
    daysPerWeek: 4,
    targetAudience: 'Beginners with gym access seeking safe machine guidance',
    equipmentTrack: 'Gym (Equipment Required)',
    programLevel: 'Starter',
    isExtremeProgram: false,
    minAge: 18,
    maxAge: 75,
    minBMI: 23,
    maxBMI: 50,
    minWeightKg: 50,
    maxWeightKg: 180,
    whoCanDo: [
      'Adults (18+) with gym membership seeking safe, guided weight loss',
      'Users who walk <20 min/day or are new to weight training',
      'Users with high starting weight (120kg+) needing fixed-track safe machines'
    ],
    whoShouldNotDo: [
      'Under 18 years old',
      'BMI under 18.5',
      'Anyone without medical clearance if managing cardiovascular or orthopedic conditions'
    ],
    medicalWarningRequired: true,
    medicalWarningText: 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.',
    missedDayPolicy: DEFAULT_MISSED_DAY_POLICY,
    cardioPrescription: {
      hasWalking: true,
      hasRunning: false,
      description: 'Daily easy walk on flat treadmill or outdoors (15-25 min) + Saturday long walk or easy stationary bike (25-35 min)',
      dailyMinutes: 20,
      saturdayMinutes: 30,
      intervalRounds: 0,
      effortRPE: 'RPE 5'
    },
    expectedLossMonth1: {
      minKg: 0.8,
      maxKg: 2.8,
      note: 'Safe planning band: 0.25% to 0.75% of body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.'
    },
    equipmentRequired: ['Leg Press Machine', 'Chest Press Machine', 'Seated Row Machine', 'Lat Pulldown', 'Treadmill / Stationary Bike'],
    status: 'published',
    createdBy: 'Coach Tariq',
    authorRole: 'FitnessInstructor',
    description: 'Safe, guided gym machine progression for beginners. Fixed-track machines protect joint alignment while burning calories and retaining muscle.',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Week 1: Machine Acclimatization (2 sets × 8-10 reps, 3-4 reps in reserve, 15m treadmill walk, RPE 5)',
        days: [
          {
            dayNumber: 1,
            title: 'Strength A (Leg Press & Guided Presses)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'leg-press-machine',
                name: 'Leg Press Machine (Light)',
                order: 2,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                tempo: '2-0-2',
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Knees follow toes, do not lock out at top, lower back stays pinned to seat.',
                easierOption: 'Lighter weight, partial depth is fine',
                harderOption: 'Heavier weight with 3-second controlled lowering',
                notes: 'Leave 3-4 reps in reserve.',
                gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1560-yRYyfdA.gif',
                mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1560-yRYyfdA.gif'
              },
              {
                exerciseId: 'seated-chest-press-machine',
                name: 'Seated Chest Press Machine',
                order: 3,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                tempo: '2-0-2',
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Handles at mid-chest level, 2s forward, 2s back.',
                easierOption: 'Lighter weight pin, seat adjusted higher',
                harderOption: 'Heavier pin with 1s squeeze at full extension',
                notes: 'Do not shrug shoulders.'
              },
              {
                exerciseId: 'seated-row-machine',
                name: 'Seated Row Machine',
                order: 4,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                tempo: '2-0-2',
                targetMuscle: 'Upper Back, Lats',
                keyCue: 'Sit tall, chest against pad, pull elbows straight back.',
                easierOption: 'Lighter pin',
                harderOption: 'Pause 2 seconds at full contraction'
              },
              {
                exerciseId: 'glute-bridge-floor',
                name: 'Glute Bridge on Floor',
                order: 5,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Glutes, Hamstrings',
                keyCue: 'Push through heels, squeeze glutes at apex.',
                easierOption: 'Smaller range',
                harderOption: 'Single leg or hold 3s'
              },
              {
                exerciseId: 'dead-bug',
                name: 'Dead Bug',
                order: 6,
                sets: 2,
                reps: '8 per side',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Core, Abdominals',
                keyCue: 'Lower back stays flat on the floor.',
                easierOption: 'Knees bent 90 degrees',
                harderOption: 'Full extension'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 2,
            title: 'Easy Walk (Flat Treadmill or Outdoors)',
            isRestDay: false,
            dayType: 'active_recovery',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'treadmill-easy-walk',
                name: 'Easy Treadmill Walk (0% Incline)',
                order: 2,
                sets: 1,
                reps: '15 mins',
                duration: 900,
                restSeconds: 0,
                intensity: 'Low',
                rpe: 5,
                isCardio: true,
                targetMuscle: 'Cardiovascular System',
                keyCue: 'Keep speed between 3.5 - 4.5 km/h at 0% incline. Talk comfortably.',
                easierOption: '10 minutes at 3.0 km/h',
                harderOption: '20 minutes at 4.8 km/h'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 3,
            title: 'Strength B (Lat Pulldown & Shoulder Press)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'bench-sit-to-stand',
                name: 'Bench Sit-to-Stand (Optional Light Dumbbell at Chest)',
                order: 2,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Lean forward slightly, stand tall, sit back down smoothly.',
                easierOption: 'Bodyweight only without dumbbell',
                harderOption: 'Hold 4-6kg dumbbell at chest'
              },
              {
                exerciseId: 'lat-pulldown',
                name: 'Lat Pulldown (Wide or Neutral Grip)',
                order: 3,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                targetMuscle: 'Lats, Upper Back',
                keyCue: 'Pull bar to upper chest, do not lean excessively back.',
                easierOption: 'Lighter pin',
                harderOption: 'Slow 3s lowering'
              },
              {
                exerciseId: 'shoulder-press-machine',
                name: 'Shoulder Press Machine (Light)',
                order: 4,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                targetMuscle: 'Shoulders, Triceps',
                keyCue: 'Ribs down, press smoothly overhead without arching back.',
                easierOption: 'Lighter pin',
                harderOption: 'Hold 1s at top'
              },
              {
                exerciseId: 'seated-leg-curl-machine',
                name: 'Seated Leg Curl Machine',
                order: 5,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                targetMuscle: 'Hamstrings',
                keyCue: 'Hips pressed firmly into seat, curl heels under.',
                easierOption: 'Lighter pin',
                harderOption: 'Slow 3s release'
              },
              {
                exerciseId: 'bird-dog',
                name: 'Bird-Dog',
                order: 6,
                sets: 2,
                reps: '8 per side',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Core, Lower Back',
                keyCue: 'Hips level, opposite limbs straight.',
                easierOption: 'Arm only',
                harderOption: 'Pause 3s'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 4,
            title: 'Easy Walk + 5-Min Stretching',
            isRestDay: false,
            dayType: 'active_recovery',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'recovery-walk',
                name: 'Easy Treadmill / Track Walk',
                order: 2,
                sets: 1,
                reps: '15 mins',
                duration: 900,
                restSeconds: 0,
                intensity: 'Low',
                rpe: 4,
                isCardio: true,
                targetMuscle: 'Active Recovery',
                keyCue: 'Promote blood flow, relax shoulders.',
                easierOption: '10 minutes stroll',
                harderOption: '20 minutes walk'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 5,
            title: 'Strength A (Leg Press & Guided Presses)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'leg-press-machine',
                name: 'Leg Press Machine (Light)',
                order: 2,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Knees follow toes, never lock out knees fully.',
                easierOption: 'Lighter weight',
                harderOption: '3s lowering'
              },
              {
                exerciseId: 'seated-chest-press-machine',
                name: 'Seated Chest Press Machine',
                order: 3,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Smooth press, control descent.',
                easierOption: 'Lighter pin',
                harderOption: 'Heavier pin'
              },
              {
                exerciseId: 'seated-row-machine',
                name: 'Seated Row Machine',
                order: 4,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low-Moderate',
                rpe: 5,
                targetMuscle: 'Upper Back, Lats',
                keyCue: 'Pull elbows back, do not round upper back.',
                easierOption: 'Lighter pin',
                harderOption: '2s pause'
              },
              {
                exerciseId: 'glute-bridge-floor',
                name: 'Glute Bridge on Floor',
                order: 5,
                sets: 2,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Glutes',
                keyCue: 'Drive through heels, squeeze glutes.',
                easierOption: 'Smaller range',
                harderOption: 'Hold 3s at top'
              },
              {
                exerciseId: 'dead-bug',
                name: 'Dead Bug',
                order: 6,
                sets: 2,
                reps: '8 per side',
                restSeconds: 60,
                intensity: 'Low',
                rpe: 5,
                targetMuscle: 'Core',
                keyCue: 'Lower back flat on floor.',
                easierOption: 'Bent knees',
                harderOption: 'Full extension'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 6,
            title: 'Saturday Long Walk or Easy Bike',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'saturday-gym-cardio',
                name: 'Saturday Long Walk or Stationary Upright Bike',
                order: 2,
                sets: 1,
                reps: '25 mins',
                duration: 1500,
                restSeconds: 0,
                intensity: 'Moderate',
                rpe: 5,
                isCardio: true,
                targetMuscle: 'Aerobic Base & Calorie Expenditure',
                keyCue: 'Maintain comfortable cadence (60-70 RPM on bike or 4.5 km/h walking).',
                easierOption: '20 minutes at low resistance',
                harderOption: '35 minutes easy cardio'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 7,
            title: 'Full Rest Day',
            isRestDay: true,
            dayType: 'rest',
            notes: 'Complete rest. Allow muscular and joint structures to adapt.',
            exercises: []
          }
        ]
      }
    ]
  },

  // ==========================================
  // G2: EQUIPMENT STEADY (GYM TRACK)
  // ==========================================
  {
    key: 'gym_steady',
    title: 'G2: Equipment Steady: Full Body Gym & Cardio - 4 Weeks',
    type: 'Workout',
    category: 'Weight Loss',
    goal: 'Weight Loss',
    difficulty: 'Intermediate',
    durationWeeks: 4,
    daysPerWeek: 5,
    targetAudience: 'Active individuals seeking balanced gym hypertrophy & interval cardio for fat loss',
    equipmentTrack: 'Gym (Equipment Required)',
    programLevel: 'Steady',
    isExtremeProgram: false,
    minAge: 18,
    maxAge: 70,
    minBMI: 23,
    maxBMI: 40,
    minWeightKg: 50,
    maxWeightKg: 150,
    whoCanDo: [
      'Adults (18+) who exercise 2-3 days/week with gym access',
      'Users looking to lose fat while building metabolic lean mass'
    ],
    whoShouldNotDo: [
      'Under 18 years old',
      'BMI under 18.5',
      'Users with unmanaged medical issues'
    ],
    medicalWarningRequired: true,
    medicalWarningText: 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.',
    missedDayPolicy: DEFAULT_MISSED_DAY_POLICY,
    cardioPrescription: {
      hasWalking: true,
      hasRunning: false,
      description: 'Tuesday brisk or slight-incline walk (30-40m), Thursday machine intervals (6-8 rounds: 1m brisk RPE 7 / 2m easy RPE 4 on bike/treadmill), Saturday steady cardio (40-50m)',
      dailyMinutes: 30,
      saturdayMinutes: 45,
      intervalRounds: 6,
      effortRPE: 'RPE 6-7'
    },
    expectedLossMonth1: {
      minKg: 1.0,
      maxKg: 3.2,
      note: 'Safe planning band: 0.25% to 0.75% of body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.'
    },
    equipmentRequired: ['Leg Press', 'Dumbbells', 'Cable Row', 'Lat Pulldown', 'Treadmill / Bike / Elliptical'],
    status: 'published',
    createdBy: 'Coach Tariq',
    authorRole: 'FitnessInstructor',
    description: 'Comprehensive gym fat loss progression. Blends dumbbell compounds, cable rows, goblet squats, and Thursday cardio machine intervals.',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Week 1: Hypertrophy & Aerobic Conditioning (2 sets × 10-12 reps, 30m brisk walk, 6 interval rounds, RPE 6)',
        days: [
          {
            dayNumber: 1,
            title: 'Full Body A (Leg Press & Cable Rows)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'leg-press',
                name: 'Leg Press',
                order: 2,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Knees follow toes, controlled lowering, lower back flat against seat.',
                easierOption: 'Lighter weight, partial depth',
                harderOption: 'Heavier weight, 3s lowering'
              },
              {
                exerciseId: 'dumbbell-bench-press',
                name: 'Dumbbell Bench Press (or Chest Press Machine)',
                order: 3,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Feet flat on floor, lower dumbbells to chest level, press up.',
                easierOption: 'Chest press machine',
                harderOption: 'Heavier dumbbells with pause at chest'
              },
              {
                exerciseId: 'seated-cable-row',
                name: 'Seated Cable Row',
                order: 4,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Lats, Rhomboids',
                keyCue: 'Chest tall, pull elbows back, do not shrug.',
                easierOption: 'Lighter weight',
                harderOption: 'Pause 2 seconds at chest'
              },
              {
                exerciseId: 'dumbbell-romanian-deadlift',
                name: 'Dumbbell Romanian Deadlift (Light)',
                order: 5,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Hamstrings, Glutes',
                keyCue: 'Hips back, flat back, dumbbells shave down close to legs.',
                easierOption: 'Lighter dumbbells, shorter range to knees',
                harderOption: 'Heavier dumbbells with 3s descent'
              },
              {
                exerciseId: 'plank-knees-or-toes',
                name: 'Plank Hold (Knees or Toes)',
                order: 6,
                sets: 2,
                reps: '25-30 secs',
                duration: 30,
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Core, Abdominals',
                keyCue: 'Straight line head to heels, breathe continuously.',
                easierOption: 'Incline or knees',
                harderOption: 'Full plank on toes'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 2,
            title: 'Brisk or Slight-Incline Walk',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'treadmill-incline-walk',
                name: 'Treadmill Incline Walk (1-2% Incline)',
                order: 2,
                sets: 1,
                reps: '30 mins',
                duration: 1800,
                restSeconds: 0,
                intensity: 'Moderate',
                rpe: 6,
                isCardio: true,
                targetMuscle: 'Cardiovascular Fat Oxidation',
                keyCue: 'Treadmill incline stays between 1% and 2%. Walk briskly without holding handles.',
                easierOption: 'Flat 0% incline walk',
                harderOption: '35 minutes at 2.5% incline'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 3,
            title: 'Full Body B (Goblet Squat & Lat Pulldown)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'goblet-squat',
                name: 'Goblet Squat',
                order: 2,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Hold dumbbell vertically at chest, keep elbows inside knees.',
                easierOption: 'Squat to a bench or bodyweight only',
                harderOption: 'Tempo or pause at bottom'
              },
              {
                exerciseId: 'lat-pulldown',
                name: 'Lat Pulldown',
                order: 3,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Lats, Upper Back',
                keyCue: 'Pull bar smoothly to upper chest, keep torso upright.',
                easierOption: 'Lighter pin',
                harderOption: 'Slow 3s lowering'
              },
              {
                exerciseId: 'seated-dumbbell-shoulder-press',
                name: 'Seated Dumbbell Shoulder Press',
                order: 4,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Deltoids, Triceps',
                keyCue: 'Ribs down, do not arch lower back, press bells overhead.',
                easierOption: 'Shoulder press machine',
                harderOption: 'Heavier dumbbells'
              },
              {
                exerciseId: 'seated-leg-curl',
                name: 'Seated Leg Curl',
                order: 5,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Hamstrings',
                keyCue: 'Hips pressed firmly into seat.',
                easierOption: 'Lighter weight',
                harderOption: 'Slow eccentric'
              },
              {
                exerciseId: 'dead-bug',
                name: 'Dead Bug',
                order: 6,
                sets: 2,
                reps: '10 per side',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Core',
                keyCue: 'Lower back flat on floor.',
                easierOption: 'Bent knees',
                harderOption: 'Full extension'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 4,
            title: 'Cardio Machine Intervals',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'machine-intervals',
                name: 'Machine Intervals (Bike, Treadmill or Elliptical: 6 Rounds)',
                order: 2,
                sets: 6,
                reps: '3 mins/round',
                duration: 1080,
                restSeconds: 0,
                intensity: 'High',
                rpe: 7,
                isCardio: true,
                targetMuscle: 'Cardiovascular Capacity',
                keyCue: '1 min brisk effort (RPE 7) followed by 2 min easy recovery (RPE 4).',
                easierOption: '4 interval rounds',
                harderOption: '8 interval rounds'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 5,
            title: 'Full Body C (Step-Ups & Rows)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'dumbbell-step-up',
                name: 'Dumbbell Step-Up on Low Step',
                order: 2,
                sets: 2,
                reps: '10 per leg',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Whole foot on step, drive through heel.',
                easierOption: 'Lower step, bodyweight only',
                harderOption: 'Higher step or heavier dumbbells'
              },
              {
                exerciseId: 'incline-dumbbell-press',
                name: 'Incline Dumbbell Press (or Machine)',
                order: 3,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Upper Chest, Anterior Deltoid',
                keyCue: 'Bench set to 30 degrees, press dumbbells overhead.',
                easierOption: 'Incline chest press machine',
                harderOption: 'Heavier dumbbells'
              },
              {
                exerciseId: 'one-arm-dumbbell-row',
                name: 'One-Arm Dumbbell Row (Bench Supported)',
                order: 4,
                sets: 2,
                reps: '10-12 per arm',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Lats, Rhomboids',
                keyCue: 'Flat back, pull elbow back to hip.',
                easierOption: 'Lighter dumbbell',
                harderOption: 'Pause at top'
              },
              {
                exerciseId: 'hip-thrust',
                name: 'Hip Thrust (Bodyweight or Dumbbell on Lap)',
                order: 5,
                sets: 2,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Glutes',
                keyCue: 'Chin tucked, squeeze glutes hard at the top.',
                easierOption: 'Bodyweight floor glute bridge',
                harderOption: 'Add 10-15kg dumbbell across hips'
              },
              {
                exerciseId: 'side-plank',
                name: 'Side Plank (Knees or Toes)',
                order: 6,
                sets: 2,
                reps: '25 secs per side',
                duration: 25,
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Obliques, Core',
                keyCue: 'Hips lifted high in line with spine.',
                easierOption: 'Knees bent',
                harderOption: 'Full side plank'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 6,
            title: 'Saturday Long Steady Cardio',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'saturday-steady-cardio',
                name: 'Long Steady Gym Cardio (Treadmill, Bike or Elliptical)',
                order: 2,
                sets: 1,
                reps: '40 mins',
                duration: 2400,
                restSeconds: 0,
                intensity: 'Moderate',
                rpe: 6,
                isCardio: true,
                targetMuscle: 'Aerobic Base & Calorie Expenditure',
                keyCue: 'Maintain steady aerobic pace at RPE 6 throughout.',
                easierOption: '30 minutes steady cardio',
                harderOption: '50 minutes steady cardio'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 7,
            title: 'Full Rest Day',
            isRestDay: true,
            dayType: 'rest',
            notes: 'Complete rest day. Nourish body with adequate protein and hydration.',
            exercises: []
          }
        ]
      }
    ]
  },

  // ==========================================
  // G3: EQUIPMENT DRIVEN (HEAVY EXTREME GYM SHRED)
  // ==========================================
  {
    key: 'gym_driven',
    title: 'G3: Equipment Driven: Heavy Extreme Gym Shred - 4 Weeks',
    type: 'Workout',
    category: 'Weight Loss',
    goal: 'Weight Loss',
    difficulty: 'Advanced',
    durationWeeks: 4,
    daysPerWeek: 6,
    targetAudience: 'Experienced lifters (3+ days/week for 2+ months) seeking maximum metabolic fat shred',
    equipmentTrack: 'Gym (Equipment Required)',
    programLevel: 'Driven',
    isExtremeProgram: true,
    minAge: 20,
    maxAge: 59,
    minBMI: 23,
    maxBMI: 34.9,
    minWeightKg: 55,
    maxWeightKg: 130,
    whoCanDo: [
      'Conditioned gym athletes already lifting 3+ days/week for at least 2 months',
      'Users comfortable with 30-40 min of brisk exercise seeking aggressive safe metabolic conditioning'
    ],
    whoShouldNotDo: [
      'Under 20 or over 60 years old',
      'Beginners or anyone with BMI 35+ / weight 120kg+ (must use Starter only)',
      'Anyone with cardiac or joint limitations'
    ],
    medicalWarningRequired: true,
    medicalWarningText: 'EXTREME PROGRAM WARNING: High metabolic intensity. Do NOT attempt without doctor approval and an established exercise foundation.',
    missedDayPolicy: DEFAULT_MISSED_DAY_POLICY,
    cardioPrescription: {
      hasWalking: true,
      hasRunning: true,
      description: 'Wednesday intense cardio intervals (8-10 rounds: 1m hard RPE 7-8 / 1.5m easy on bike, rower or treadmill) + Saturday long steady cardio (45-60m)',
      dailyMinutes: 35,
      saturdayMinutes: 50,
      intervalRounds: 8,
      effortRPE: 'RPE 7-8'
    },
    expectedLossMonth1: {
      minKg: 1.2,
      maxKg: 3.6,
      note: 'High-effort metabolic output. Planning band 0.25% to 0.75%/week with 1% hard cap. Food adherence and recovery are vital.'
    },
    equipmentRequired: ['Barbells / Dumbbells', 'Leg Press', 'Cables', 'Lat Pulldown', 'Rower / Stationary Bike / Treadmill'],
    status: 'published',
    createdBy: 'Coach Tariq',
    authorRole: 'FitnessInstructor',
    description: 'High-output advanced gym shred program. Split into Lower A/B and Upper A/B with heavy dumbbell compounds, cable work, and Wednesday intense intervals.',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Week 1: High Tension & Metabolic Output (3 sets × 8-10 reps, 3 reps in reserve, 8 interval rounds, RPE 6-7)',
        days: [
          {
            dayNumber: 1,
            title: 'Lower A (Goblet Squat & Leg Press)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'goblet-squat-tempo',
                name: 'Goblet Squat (2-3s Down)',
                order: 2,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                tempo: '3-0-1',
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Hold weight tight at chest, control 2-3s descent, drive up.',
                easierOption: 'Squat to a bench',
                harderOption: 'Heavier dumbbell or pause 2s at bottom'
              },
              {
                exerciseId: 'leg-press-heavy',
                name: 'Leg Press (Heavy Working Sets)',
                order: 3,
                sets: 3,
                reps: '8-10',
                restSeconds: 90,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Quadriceps, Glutes',
                keyCue: 'Knees follow toes, never lock out knees fully, lower back glued to pad.',
                easierOption: 'Lighter weight',
                harderOption: 'Heavier plate load with slow eccentric'
              },
              {
                exerciseId: 'dumbbell-romanian-deadlift',
                name: 'Dumbbell Romanian Deadlift',
                order: 4,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Hamstrings, Glutes',
                keyCue: 'Hips back, flat back, dumbbells shave down close to shins.',
                easierOption: 'Lighter dumbbells',
                harderOption: 'Heavier weight with 3s eccentric'
              },
              {
                exerciseId: 'seated-leg-curl',
                name: 'Seated Leg Curl',
                order: 5,
                sets: 3,
                reps: '10',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Hamstrings',
                keyCue: 'Hips down on seat, curl hard, control release.',
                easierOption: 'Lighter weight',
                harderOption: 'Slow 3s release'
              },
              {
                exerciseId: 'standing-calf-raise',
                name: 'Standing Calf Raise',
                order: 6,
                sets: 3,
                reps: '12-15',
                restSeconds: 45,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Calves',
                keyCue: 'Full stretch at bottom, squeeze at apex.',
                easierOption: 'Two feet on flat ground',
                harderOption: 'Single leg or hold dumbbell'
              },
              COMMON_COOLDOWN(7)
            ]
          },
          {
            dayNumber: 2,
            title: 'Upper A (Heavy Press & Pull)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'dumbbell-bench-press',
                name: 'Dumbbell Bench Press',
                order: 2,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Chest, Triceps',
                keyCue: 'Retract scapulae, touch lower chest, press smoothly.',
                easierOption: 'Chest press machine',
                harderOption: 'Heavier dumbbells with 2s pause at chest'
              },
              {
                exerciseId: 'lat-pulldown',
                name: 'Lat Pulldown (Neutral or Wide Grip)',
                order: 3,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Lats, Upper Back',
                keyCue: 'Pull to collarbone, keep elbows pointed down.',
                easierOption: 'Lighter pin',
                harderOption: 'Pause at chest'
              },
              {
                exerciseId: 'seated-cable-row',
                name: 'Seated Cable Row',
                order: 4,
                sets: 3,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Rhomboids, Lats',
                keyCue: 'Chest high, squeeze shoulder blades together.',
                easierOption: 'Lighter weight',
                harderOption: '2s contraction hold'
              },
              {
                exerciseId: 'seated-dumbbell-shoulder-press',
                name: 'Seated Dumbbell Shoulder Press',
                order: 5,
                sets: 3,
                reps: '8-10',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Deltoids, Triceps',
                keyCue: 'Ribs pulled in, press bells in slight arc.',
                easierOption: 'Shoulder press machine',
                harderOption: 'Heavier dumbbells'
              },
              {
                exerciseId: 'cable-triceps-pushdown',
                name: 'Cable Triceps Pushdown (Rope or Bar)',
                order: 6,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate-High',
                rpe: 7,
                targetMuscle: 'Triceps',
                keyCue: 'Elbows pinned to sides, flare rope at bottom.',
                easierOption: 'Lighter weight',
                harderOption: 'Hold 2s at bottom'
              },
              {
                exerciseId: 'plank-hold',
                name: 'Plank Hold',
                order: 7,
                sets: 3,
                reps: '30-40 secs',
                duration: 40,
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Core',
                keyCue: 'Solid plank, tight glutes.',
                easierOption: 'Knees',
                harderOption: 'Longer hold'
              },
              COMMON_COOLDOWN(8)
            ]
          },
          {
            dayNumber: 3,
            title: 'Wednesday Intense Intervals',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'driven-gym-intervals',
                name: 'Intense Machine Intervals (8 Rounds: 1m Hard / 1.5m Easy on Bike/Rower/Treadmill)',
                order: 2,
                sets: 8,
                reps: '2.5 mins/round',
                duration: 1200,
                restSeconds: 0,
                intensity: 'Extreme',
                rpe: 8,
                isCardio: true,
                targetMuscle: 'Cardiovascular Conditioning',
                keyCue: '1 min hard effort (RPE 7-8, controlled, never all-out sprint) and 1.5 min easy recovery on bike, rower or treadmill.',
                easierOption: '6 interval rounds',
                harderOption: '10 interval rounds'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 4,
            title: 'Lower B (Split Squat & Hip Thrust)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'dumbbell-split-squat',
                name: 'Dumbbell Split Squat',
                order: 2,
                sets: 3,
                reps: '8-10 per leg',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Torso upright, lower back knee smoothly.',
                easierOption: 'Bodyweight split squat',
                harderOption: 'Rear foot elevated on bench'
              },
              {
                exerciseId: 'hip-thrust',
                name: 'Hip Thrust (Barbell or Heavy Dumbbell)',
                order: 3,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Glutes',
                keyCue: 'Chin tucked, drive hips up, 1s hard squeeze at top.',
                easierOption: 'Lighter dumbbell on lap',
                harderOption: 'Heavier weight with 2s hold'
              },
              {
                exerciseId: 'dumbbell-step-up-higher',
                name: 'Dumbbell Step-Up on Higher Step',
                order: 4,
                sets: 3,
                reps: '10 per leg',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Quads, Glutes',
                keyCue: 'Plant full foot, drive through heel, control descent.',
                easierOption: 'Lower step or no weight',
                harderOption: 'Heavier dumbbells'
              },
              {
                exerciseId: 'cable-pull-through',
                name: 'Cable Pull-Through',
                order: 5,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate-High',
                rpe: 7,
                targetMuscle: 'Glutes, Hamstrings',
                keyCue: 'Push hips back toward cable tower, stand tall and squeeze glutes.',
                easierOption: 'Lighter weight',
                harderOption: 'Heavier weight'
              },
              {
                exerciseId: 'calf-raise',
                name: 'Calf Raise',
                order: 6,
                sets: 3,
                reps: '12-15',
                restSeconds: 45,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Calves',
                keyCue: 'Full range of motion, control tempo.',
                easierOption: 'Two feet flat',
                harderOption: 'Single leg'
              },
              {
                exerciseId: 'dead-bug',
                name: 'Dead Bug',
                order: 7,
                sets: 3,
                reps: '12 per side',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Core',
                keyCue: 'Keep lower back glued to floor.',
                easierOption: 'Bent knees',
                harderOption: 'Hold 2s'
              },
              COMMON_COOLDOWN(8)
            ]
          },
          {
            dayNumber: 5,
            title: 'Upper B (Incline Press & Pull)',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'incline-dumbbell-press',
                name: 'Incline Dumbbell Press',
                order: 2,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Upper Chest, Anterior Deltoid',
                keyCue: 'Bench at 30 degrees, press dumbbells overhead.',
                easierOption: 'Incline machine press',
                harderOption: 'Heavier dumbbells with pause at chest'
              },
              {
                exerciseId: 'assisted-pull-up',
                name: 'Assisted Pull-Up (or Neutral-Grip Lat Pulldown)',
                order: 3,
                sets: 3,
                reps: '8-10',
                restSeconds: 75,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Lats, Biceps',
                keyCue: 'Start from full hang, pull chest up to handles.',
                easierOption: 'More pin assistance or neutral pulldown',
                harderOption: 'Less pin assistance'
              },
              {
                exerciseId: 'one-arm-dumbbell-row',
                name: 'One-Arm Dumbbell Row',
                order: 4,
                sets: 3,
                reps: '8-10 per arm',
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Lats, Upper Back',
                keyCue: 'Flat back on bench, pull dumbbell back to hip.',
                easierOption: 'Lighter dumbbell',
                harderOption: 'Heavier dumbbell'
              },
              {
                exerciseId: 'lateral-raise-light',
                name: 'Dumbbell Lateral Raise (Light)',
                order: 5,
                sets: 3,
                reps: '12-15',
                restSeconds: 45,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Lateral Deltoid',
                keyCue: 'Lead with elbows, raise to shoulder height, do not swing.',
                easierOption: 'Lighter dumbbells',
                harderOption: 'Pause 1s at top'
              },
              {
                exerciseId: 'cable-biceps-curl',
                name: 'Cable Biceps Curl',
                order: 6,
                sets: 3,
                reps: '10-12',
                restSeconds: 60,
                intensity: 'Moderate',
                rpe: 6,
                targetMuscle: 'Biceps',
                keyCue: 'Keep elbows fixed at sides, curl smoothly.',
                easierOption: 'Lighter weight',
                harderOption: 'Slow 3s eccentric'
              },
              {
                exerciseId: 'side-plank',
                name: 'Side Plank',
                order: 7,
                sets: 3,
                reps: '30 secs per side',
                duration: 30,
                restSeconds: 60,
                intensity: 'High',
                rpe: 7,
                targetMuscle: 'Obliques, Core',
                keyCue: 'Hips high, straight line.',
                easierOption: 'Knees',
                harderOption: 'Top leg elevated'
              },
              COMMON_COOLDOWN(8)
            ]
          },
          {
            dayNumber: 6,
            title: 'Saturday Long Steady Cardio',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'saturday-driven-gym-cardio',
                name: 'Long Steady Gym Cardio (Treadmill, Bike or Rower)',
                order: 2,
                sets: 1,
                reps: '45 mins',
                duration: 2700,
                restSeconds: 0,
                intensity: 'Moderate-High',
                rpe: 6,
                isCardio: true,
                targetMuscle: 'Aerobic System & Glycogen Depletion',
                keyCue: 'Maintain consistent output at RPE 6-7 without stopping.',
                easierOption: '35 minutes easy cardio',
                harderOption: '60 minutes continuous cardio'
              },
              COMMON_COOLDOWN(3)
            ]
          },
          {
            dayNumber: 7,
            title: 'Full Rest Day',
            isRestDay: true,
            dayType: 'rest',
            notes: 'Essential full rest day for central nervous system and muscular regeneration.',
            exercises: []
          }
        ]
      }
    ]
  },
  {
    key: 'walking_cardio',
    title: 'Walking & Daily Mobility Cardio Protocol - 4 Weeks',
    type: 'Workout',
    category: 'Weight Loss',
    goal: 'Weight Loss',
    difficulty: 'Beginner',
    durationWeeks: 4,
    daysPerWeek: 5,
    targetAudience: 'Individuals starting with daily walking and joint mobilization',
    equipmentTrack: 'Home (No Equipment)',
    programLevel: 'Starter',
    isExtremeProgram: false,
    minAge: 18,
    maxAge: 80,
    minBMI: 23,
    maxBMI: 50,
    minWeightKg: 50,
    maxWeightKg: 200,
    whoCanDo: ['Adults (18+) with BMI 23+ beginning with walking conditioning'],
    whoShouldNotDo: ['Under 18', 'BMI under 18.5'],
    medicalWarningRequired: true,
    medicalWarningText: 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.',
    missedDayPolicy: DEFAULT_MISSED_DAY_POLICY,
    cardioPrescription: {
      hasWalking: true,
      hasRunning: false,
      description: 'Daily easy walking (20 min) + Saturday long walk (35 min)',
      dailyMinutes: 20,
      saturdayMinutes: 35,
      intervalRounds: 0,
      effortRPE: 'RPE 5'
    },
    expectedLossMonth1: {
      minKg: 0.8,
      maxKg: 2.8,
      note: 'Planning band: 0.25% to 0.75% body weight/week, hard cap 1%/week.'
    },
    equipmentRequired: ['Comfortable Walking Shoes'],
    status: 'published',
    createdBy: 'Coach Sarah Miller (Fitness Instructor)',
    authorRole: 'FitnessInstructor',
    description: 'Foundational daily walking and joint mobility program for beginners.',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Week 1: Daily Walking Habit & Posture',
        days: [
          {
            dayNumber: 1,
            title: 'Daily Walk + Joint Mobilization',
            isRestDay: false,
            dayType: 'workout',
            exercises: [
              COMMON_WARMUP,
              {
                exerciseId: 'brisk-walk-protocol',
                name: 'Brisk Walk',
                order: 2,
                sets: 1,
                reps: '20 mins',
                duration: 1200,
                restSeconds: 0,
                intensity: 'Moderate',
                rpe: 5,
                isCardio: true,
                targetMuscle: 'Cardiovascular System',
                keyCue: 'Walk tall, arms swinging naturally at conversational pace.',
                easierOption: 'Two 10-minute walks',
                harderOption: 'Increase pace to RPE 6'
              },
              COMMON_COOLDOWN(3)
            ]
          }
        ]
      }
    ]
  }
];

/**
 * Matches a user to a human-authored template based on equipment access and days.
 */
export function getMatchingWeightLossTemplate({ equipmentAccess = '', trainingDaysPerWeek = 3, level = 'Starter' }) {
  const eq = (Array.isArray(equipmentAccess) ? equipmentAccess.join(' ') : (equipmentAccess || '')).toLowerCase();
  const lvl = (level || 'Starter').toLowerCase();

  // If no equipment specified or empty, match walking cardio
  if (!eq.trim()) {
    return WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'walking_cardio') || WEIGHT_LOSS_TEMPLATES[0];
  }

  const isGym = eq.includes('gym') || eq.includes('barbell') || eq.includes('cable') || eq.includes('machine');

  if (isGym) {
    if (lvl.includes('driven') || lvl.includes('extreme') || lvl.includes('heavy')) {
      return WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'gym_driven') || WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'gym_standard');
    }
    if (lvl.includes('steady') || lvl.includes('intermediate')) {
      return WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'gym_steady') || WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'gym_standard');
    }
    return WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'gym_standard');
  }

  // Home Track
  if (lvl.includes('driven') || lvl.includes('extreme') || lvl.includes('heavy')) {
    return WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'home_driven') || WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'home_bodyweight');
  }
  if (lvl.includes('steady') || lvl.includes('intermediate')) {
    return WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'home_steady') || WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'home_bodyweight');
  }
  return WEIGHT_LOSS_TEMPLATES.find(t => t.key === 'home_bodyweight') || WEIGHT_LOSS_TEMPLATES[0];
}

/**
 * Expands a program template's weeks array to cover full duration (e.g. 4 weeks),
 * applying progressive overload principles (stamina, volume, and intensity).
 */
export function expandTemplateWeeks(templateWeeks = [], durationWeeks = 4) {
  if (!Array.isArray(templateWeeks) || templateWeeks.length === 0) return [];
  if (templateWeeks.length >= durationWeeks) return templateWeeks;

  const baseWeek = templateWeeks[0];
  const weeklyThemes = [
    { num: 1, suffix: 'Foundation & Baseline Form', rpeAdd: 0, repAdd: 0, setAdd: 0 },
    { num: 2, suffix: 'Volume & Core Stability', rpeAdd: 0.5, repAdd: 2, setAdd: 0 },
    { num: 3, suffix: 'Peak Intensity & Muscular Endurance', rpeAdd: 1.0, repAdd: 2, setAdd: 1 },
    { num: 4, suffix: 'Consolidation & Peak Shred', rpeAdd: 1.0, repAdd: 4, setAdd: 1 }
  ];

  const resultWeeks = [];
  for (let w = 1; w <= durationWeeks; w++) {
    const existing = templateWeeks.find(x => x.weekNumber === w);
    if (existing) {
      resultWeeks.push(existing);
      continue;
    }

    const theme = weeklyThemes[w - 1] || {
      num: w,
      suffix: `Phase ${w} Progression`,
      rpeAdd: Math.min(1.5, (w - 1) * 0.5),
      repAdd: (w - 1) * 2,
      setAdd: w > 2 ? 1 : 0
    };

    const newDays = (baseWeek.days || []).map(day => {
      const newExercises = (day.exercises || []).map(ex => {
        if (ex.isWarmup || ex.isCooldown) return { ...ex };

        let sets = ex.sets;
        if (typeof sets === 'number' && theme.setAdd > 0 && sets < 4) {
          sets += theme.setAdd;
        }

        let rpe = ex.rpe;
        if (typeof rpe === 'number') {
          rpe = Math.min(9, Math.round((rpe + theme.rpeAdd) * 10) / 10);
        }

        return {
          ...ex,
          sets,
          rpe,
          notes: ex.notes
            ? `${ex.notes} (Week ${w}: crisp control, higher metabolic demand)`
            : `Week ${w} progressive target`
        };
      });

      return {
        ...day,
        exercises: newExercises
      };
    });

    resultWeeks.push({
      weekNumber: w,
      focus: `Week ${w}: ${theme.suffix} - Progressive overload & stamina adaptation`,
      days: newDays
    });
  }

  return resultWeeks;
}

// Ensure every in-memory human-authored template has the complete 4-week progression
for (const tmpl of WEIGHT_LOSS_TEMPLATES) {
  if (tmpl.weeks && tmpl.weeks.length < (tmpl.durationWeeks || 4)) {
    tmpl.weeks = expandTemplateWeeks(tmpl.weeks, tmpl.durationWeeks || 4);
  }
}

/**
 * Ensures human-authored templates exist in MongoDB PreMadePlan collection.
 */
export async function seedWeightLossTemplatesIfMissing() {
  for (const template of WEIGHT_LOSS_TEMPLATES) {
    const fullWeeks = (template.weeks && template.weeks.length < (template.durationWeeks || 4))
      ? expandTemplateWeeks(template.weeks, template.durationWeeks || 4)
      : template.weeks;

    const formattedWeeks = (fullWeeks || []).map(week => ({
      ...week,
      days: (week.days || []).map(day => ({
        ...day,
        exercises: (day.exercises || []).map(ex => ({
          ...ex,
          exerciseId: ex.exerciseId || ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }))
      }))
    }));

    const existing = await PreMadePlan.findOne({ title: template.title });
    if (!existing) {
      await PreMadePlan.create({
        ...template,
        weeks: formattedWeeks,
        version: 1
      });
    } else {
      existing.category = 'Weight Loss';
      existing.goal = 'Weight Loss';
      existing.authorRole = 'FitnessInstructor';
      existing.createdBy = template.createdBy;
      existing.equipmentTrack = template.equipmentTrack;
      existing.programLevel = template.programLevel;
      existing.isExtremeProgram = template.isExtremeProgram;
      existing.minAge = template.minAge;
      existing.maxAge = template.maxAge;
      existing.minBMI = template.minBMI;
      existing.maxBMI = template.maxBMI;
      existing.minWeightKg = template.minWeightKg;
      existing.maxWeightKg = template.maxWeightKg;
      existing.whoCanDo = template.whoCanDo;
      existing.whoShouldNotDo = template.whoShouldNotDo;
      existing.medicalWarningRequired = template.medicalWarningRequired;
      existing.medicalWarningText = template.medicalWarningText;
      existing.missedDayPolicy = template.missedDayPolicy;
      existing.cardioPrescription = template.cardioPrescription;
      existing.expectedLossMonth1 = template.expectedLossMonth1;
      existing.weeks = formattedWeeks;
      await existing.save();
    }
  }
}

export default {
  WEIGHT_LOSS_TEMPLATES,
  getMatchingWeightLossTemplate,
  expandTemplateWeeks,
  seedWeightLossTemplatesIfMissing
};

