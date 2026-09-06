import mongoose from 'mongoose';

const exerciseRecordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  exerciseId: {
    type: String,
    required: true,
    index: true
  },
  exerciseName: {
    type: String,
    required: true
  },
  dayNumber: {
    type: Number,
    default: 1
  },
  planId: {
    type: String,
    default: null
  },
  setNumber: {
    type: Number,
    default: 1
  },
  totalSets: {
    type: Number,
    default: 1
  },
  repsCompleted: {
    type: Number,
    default: 0
  },
  targetReps: {
    type: Number,
    default: 10
  },
  pointsEarned: {
    type: Number,
    default: 1
  },
  mode: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'manual'
  },
  aiConfidence: {
    type: Number,
    default: null
  },
  aiResult: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

export default mongoose.model('ExerciseRecord', exerciseRecordSchema);
