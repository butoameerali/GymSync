import mongoose from 'mongoose';

const dailyCheckInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  mood: {
    type: String, // e.g., 'Pain', 'Happy', 'Sad', etc.
    required: true
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  painNote: {
    type: String,
    default: null
  },
  sleepHours: {
    type: Number,
    default: null
  },
  lastSessionRPE: {
    type: Number,
    min: 1,
    max: 10,
    default: null
  }
}, { timestamps: true });

// Ensure one check-in per user per day
dailyCheckInSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyCheckIn = mongoose.model('DailyCheckIn', dailyCheckInSchema);
export default DailyCheckIn;
