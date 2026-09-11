import mongoose from 'mongoose';

const savedAIPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String, default: '', index: true },
  title: { type: String, required: true },
  goal: { type: String, required: true, default: 'General Fitness' },
  fitnessLevel: { type: String, default: 'Beginner' },
  workout: { type: mongoose.Schema.Types.Mixed, default: null },
  diet: { type: mongoose.Schema.Types.Mixed, default: null },
  calendar: { type: Array, default: [] },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: false },
  goalGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoalGroup', default: null, index: true },
  planKind: { type: String, enum: ['Workout', 'Diet', 'Combined'], default: 'Combined' },
  supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedAIPlan', default: null },
  missedSessions: [{
    dayNumber: Number,
    handled: { type: Boolean, default: false },
    reasonCode: String,
    detectedAt: { type: Date, default: Date.now }
  }],
  progress: {
    currentWeek: { type: Number, default: 1 },
    currentDay: { type: Number, default: 1 },
    completedSessions: [{
      dayNumber: Number,
      weekNumber: Number,
      completedAt: { type: Date, default: Date.now },
      reportedIssue: {
        status: { type: String, enum: ['Pending', 'Resolved', 'Dismissed'], default: null },
        issueType: { type: String, enum: ['MinorIssue', 'FormFraud', 'CalorieFraud'], default: null },
        description: String,
        reportedAt: { type: Date, default: null },
        resolvedAt: { type: Date, default: null },
        caloriesAdjusted: { type: Number, default: 0 }
      }
    }]
  }
}, {
  timestamps: true
});

savedAIPlanSchema.index({ userId: 1, createdAt: -1 });
savedAIPlanSchema.index({ userName: 1, createdAt: -1 });

const SavedAIPlan = mongoose.model('SavedAIPlan', savedAIPlanSchema);
export default SavedAIPlan;
