import mongoose from 'mongoose';

const goalGroupSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Abandoned', 'PendingReview'],
    default: 'Active',
    index: true
  },
  primaryGoalType: {
    type: String,
    required: true,
    enum: [
      'WeightLoss',
      'WeightGain',
      'MuscleBuilding',
      'Endurance',
      'Strength',
      'GeneralFitness',
      'SportsPerformance'
    ]
  },
  secondaryGoalTypes: [{
    type: String
  }],
  linkedPlanIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavedAIPlan'
  }],
  startWeightKg: {
    type: Number,
    required: true
  },
  targetWeightKg: {
    type: Number,
    default: null
  },
  deadline: {
    type: Date,
    default: null
  },
  milestones: [{
    label: { type: String, required: true },
    targetValue: { type: Number, required: true },
    targetDate: { type: Date, default: null },
    achievedAt: { type: Date, default: null }
  }],
  weeklyTrainingLoad: {
    plannedSessionsPerWeek: { type: Number, default: 3 },
    plannedWeeklyCalorieBurn: { type: Number, default: 0 }
  },
  completedAt: {
    type: Date,
    default: null
  },
  completionSummary: {
    startWeightKg: Number,
    endWeightKg: Number,
    totalWorkouts: Number,
    totalSteps: Number,
    consistencyPercent: Number
  }
}, {
  timestamps: true
});

goalGroupSchema.index({ userId: 1, status: 1 });

const GoalGroup = mongoose.model('GoalGroup', goalGroupSchema);
export default GoalGroup;
