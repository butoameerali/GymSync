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
  category: {
    type: String,
    enum: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body', 'Other'],
    default: 'Chest'
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
  defaultSets: {
    type: Number,
    default: 3
  },
  defaultReps: {
    type: Number,
    default: 10
  },
  defaultDuration: {
    type: Number,
    default: 0
  },
  instructions: {
    type: String,
    default: ''
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
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true
  },
  isAiTrackable: {
    type: Boolean,
    default: false
  },
  aiDetection: {
    enabled: { type: Boolean, default: false },
    detectorId: { type: String, default: null },
    detectorVersion: { type: String, default: null }
  },
  createdBy: {
    type: String,
    default: 'System'
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, { timestamps: true });

export default mongoose.model('Exercise', exerciseSchema);
