import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  steps: { type: Number, default: 0 },
  distanceKm: { type: Number, default: 0 },
  activeMinutes: { type: Number, default: 0 },
  estimatedWalkingCalories: { type: Number, default: 0 },
  lastSyncedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Compound index for fast lookup and uniqueness per user per day
activityLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
