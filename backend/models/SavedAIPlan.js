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
  isActive: { type: Boolean, default: false }
}, {
  timestamps: true
});

savedAIPlanSchema.index({ userId: 1, createdAt: -1 });
savedAIPlanSchema.index({ userName: 1, createdAt: -1 });

const SavedAIPlan = mongoose.model('SavedAIPlan', savedAIPlanSchema);
export default SavedAIPlan;
