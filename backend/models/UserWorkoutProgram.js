import mongoose from 'mongoose';

const userWorkoutProgramSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true,
    index: true
  },
  sourceProgramId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PreMadePlan',
    required: true,
    index: true
  },
  programVersion: {
    type: Number,
    default: 1
  },
  title: {
    type: String,
    required: true
  },
  goal: {
    type: String,
    default: 'General Fitness'
  },
  difficulty: {
    type: String,
    default: 'Beginner'
  },
  durationWeeks: {
    type: Number,
    default: 4
  },
  daysPerWeek: {
    type: Number,
    default: 4
  },
  instructorName: {
    type: String,
    default: 'Fitness Instructor'
  },
  equipmentTrack: {
    type: String,
    enum: ['Home (No Equipment)', 'Gym (Equipment Required)'],
    default: 'Home (No Equipment)'
  },
  programLevel: {
    type: String,
    enum: ['Starter', 'Steady', 'Driven'],
    default: 'Starter'
  },
  isExtremeProgram: {
    type: Boolean,
    default: false
  },
  missedDayPolicy: {
    rule1To3Days: { type: String, default: 'Never double up. Missed 1 to 3 days, carry on.' },
    rule4To7Days: { type: String, default: 'Missed 4 to 7 days, repeat the week.' },
    ruleMoreThan7Days: { type: String, default: 'Missed more than 7 days, restart week 1.' }
  },
  cardioPrescription: {
    hasWalking: { type: Boolean, default: true },
    hasRunning: { type: Boolean, default: false },
    description: { type: String, default: 'Daily Walk + Saturday Long Walk' },
    dailyMinutes: { type: Number, default: 20 },
    saturdayMinutes: { type: Number, default: 35 },
    intervalRounds: { type: Number, default: 0 },
    effortRPE: { type: String, default: 'RPE 5 - 6' }
  },
  // Snapshot of weeks/days at the time of application (prevents historical corruption if instructor edits)
  weeks: [{
    weekNumber: Number,
    focus: String,
    days: [{
      dayNumber: Number,
      title: String,
      focus: String,
      isRestDay: { type: Boolean, default: false },
      dayType: {
        type: String,
        enum: ['workout', 'rest', 'active_recovery', 'mobility', 'deload'],
        default: 'workout'
      },
      warmup: [{ text: String, duration: Number }],
      exercises: [{
        exerciseId: String,
        name: String,
        order: Number,
        sets: Number,
        reps: String,
        duration: Number,
        restSeconds: Number,
        intensity: String,
        rpe: Number,
        tempo: String,
        notes: String,
        isWarmup: { type: Boolean, default: false },
        isCooldown: { type: Boolean, default: false },
        isCardio: { type: Boolean, default: false },
        easierOption: { type: String, default: '' },
        harderOption: { type: String, default: '' },
        keyCue: { type: String, default: '' },
        targetMuscle: { type: String, default: '' },
        gifUrl: { type: String, default: '' },
        mediaUrl: { type: String, default: '' },
        videoUrl: { type: String, default: '' }
      }],
      cooldown: [{ text: String, duration: Number }],
      notes: String
    }]
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  reviewRemindersDisabled: {
    type: Boolean,
    default: false
  },
  reviewSnoozedUntil: {
    type: Date,
    default: null
  },
  missedSessions: [{
    weekNumber: Number,
    dayNumber: Number,
    handled: { type: Boolean, default: false },
    reasonCode: String,
    detectedAt: { type: Date, default: Date.now }
  }],
  progress: {
    currentWeek: { type: Number, default: 1 },
    currentDay: { type: Number, default: 1 },
    completedSessions: [{
      weekNumber: Number,
      dayNumber: Number,
      completedAt: { type: Date, default: Date.now },
      caloriesBurned: { type: Number, default: 0 },
      exerciseLogs: [{
        exerciseId: String,
        name: String,
        completedSets: Number,
        reps: String,
        weightKg: Number,
        caloriesBurned: { type: Number, default: 0 },
        notes: String
      }]
    }]
  },
  outcomeReport: {
    reviewedAt: { type: Date, default: Date.now },
    successScore: { type: Number, default: 0 },
    outcomeCategory: { type: String, default: 'near_target' },
    outcomeCategoryLabel: { type: String, default: 'Near Target' },
    userFeedback: {
      goalSatisfaction: { type: String },
      metricOutcome: { type: String },
      difficultyRating: { type: Number, default: 5 },
      feltResults: { type: String },
      favoriteMovements: [{ type: String }],
      struggledMovements: [{ type: String }],
      notes: { type: String }
    },
    aiAnalysis: {
      summary: { type: String },
      keyWins: [{ type: String }],
      areasForImprovement: [{ type: String }],
      planEffectiveness: { type: String },
      trainerFeedbackNotes: { type: String },
      nextPhaseRecommendations: [{ type: String }]
    }
  }
}, { timestamps: true });

userWorkoutProgramSchema.index({ userId: 1, isActive: 1 });
userWorkoutProgramSchema.index({ userName: 1, isActive: 1 });

export default mongoose.model('UserWorkoutProgram', userWorkoutProgramSchema);
