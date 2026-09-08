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
        notes: String
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
  progress: {
    currentWeek: { type: Number, default: 1 },
    currentDay: { type: Number, default: 1 },
    completedSessions: [{
      weekNumber: Number,
      dayNumber: Number,
      completedAt: { type: Date, default: Date.now },
      exerciseLogs: [{
        exerciseId: String,
        name: String,
        completedSets: Number,
        reps: String,
        weightKg: Number,
        notes: String
      }]
    }]
  }
}, { timestamps: true });

userWorkoutProgramSchema.index({ userId: 1, isActive: 1 });
userWorkoutProgramSchema.index({ userName: 1, isActive: 1 });

export default mongoose.model('UserWorkoutProgram', userWorkoutProgramSchema);
