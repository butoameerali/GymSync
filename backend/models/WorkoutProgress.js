import mongoose from 'mongoose';

const workoutProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  planId: {
    type: String,
    default: null
  },
  completedDays: [{
    type: Number
  }],
  lastWorkoutCompletionTime: {
    type: Date,
    default: null
  },
  streak: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model('WorkoutProgress', workoutProgressSchema);
