import mongoose from 'mongoose';

const trainerReviewSchema = new mongoose.Schema({
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
  reviewType: {
    type: String,
    enum: ['GoalTarget', 'FlaggedInjuryPlan'],
    default: 'GoalTarget',
    required: true
  },
  goalGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoalGroup',
    default: null,
    index: true
  },
  requestedTargetWeightKg: {
    type: Number,
    default: null
  },
  requestedDeadline: {
    type: Date,
    default: null
  },
  currentWeightKg: {
    type: Number,
    default: null
  },
  currentBMI: {
    type: Number,
    default: null
  },
  projectedBMI: {
    type: Number,
    default: null
  },
  flagReason: {
    type: String,
    required: true
  },
  warningMessage: {
    type: String,
    default: ''
  },
  userJustification: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  assignedTrainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  trainerNotes: {
    type: String,
    default: ''
  },
  safeAlternativeSuggestion: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

trainerReviewSchema.index({ status: 1, createdAt: -1 });

const TrainerReview = mongoose.model('TrainerReview', trainerReviewSchema);
export default TrainerReview;
