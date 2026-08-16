import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
  exerciseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  targetMuscles: [{
    type: String
  }],
  equipmentRequired: {
    type: String,
    default: 'Bodyweight'
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  fitnessPaths: [{
    type: String
  }],
  medicalAvoidIf: [{
    type: String
  }],
  jointPainAvoidIf: [{
    type: String
  }],
  mediaUrl: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  isAiTrackable: {
    type: Boolean,
    default: false
  },
  aiDetection: {
    enabled: { type: Boolean, default: false },
    detectorId: { type: String, default: null },
    detectorVersion: { type: String, default: null }
  }
}, { timestamps: true });

export default mongoose.model('Exercise', exerciseSchema);
