import mongoose from 'mongoose';

const tourRequestSchema = new mongoose.Schema({
  gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
  gymName: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userPhone: { type: String, default: '' },
  tourDate: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Declined', 'Completed'],
    default: 'Pending'
  },
  ownerResponse: { type: String, default: '' }
}, { timestamps: true });

tourRequestSchema.index({ gym: 1 });
tourRequestSchema.index({ user: 1 });

export default mongoose.model('TourRequest', tourRequestSchema);
