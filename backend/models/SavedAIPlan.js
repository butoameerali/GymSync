import mongoose from 'mongoose';

const savedAIPlanSchema = new mongoose.Schema({
  userName: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

savedAIPlanSchema.index({ userName: 1, createdAt: -1 });

const SavedAIPlan = mongoose.model('SavedAIPlan', savedAIPlanSchema);
export default SavedAIPlan;
