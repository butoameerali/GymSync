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
  thumbnailUrl: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  },
  gifUrl: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  aliases: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  movementPatterns: [{
    type: String
  }],
  trainingGoals: [{
    type: String
  }],
  trainingQualities: [{
    type: String
  }],
  sportTags: [{
    type: String
  }],
  secondaryMuscles: [{
    type: String
  }],
  experienceLevels: [{
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced']
  }],
  primaryPurpose: {
    type: String,
    default: ''
  },
  secondaryPurpose: {
    type: String,
    default: ''
  },
  recommendedFor: [{
    type: String
  }],
  notRecommendedFor: [{
    type: String
  }],
  contraindications: [{
    type: String
  }],
  precautions: [{
    type: String
  }],
  commonMistakes: [{
    type: String
  }],
  regressions: [{
    type: String
  }],
  progressions: [{
    type: String
  }],
  alternatives: [{
    type: String
  }],
  coachingCues: [{
    type: String
  }],
  breathing: {
    type: String,
    default: ''
  },
  setup: {
    type: String,
    default: ''
  },
  executionSteps: [{
    type: String
  }],
  programming: {
    repRange: {
      min: { type: Number, default: 6 },
      max: { type: Number, default: 12 }
    },
    setRange: {
      min: { type: Number, default: 3 },
      max: { type: Number, default: 4 }
    },
    restSeconds: { type: Number, default: 60 },
    tempo: { type: String, default: '2-0-2' },
    recommendedRPE: { type: Number, default: 8 },
    beginnerPrescription: {
      sets: { type: Number, default: 3 },
      reps: { type: String, default: '10-12' },
      rest: { type: Number, default: 60 },
      notes: { type: String, default: '' }
    },
    intermediatePrescription: {
      sets: { type: Number, default: 3 },
      reps: { type: String, default: '8-10' },
      rest: { type: Number, default: 60 },
      notes: { type: String, default: '' }
    },
    advancedPrescription: {
      sets: { type: Number, default: 4 },
      reps: { type: String, default: '6-8' },
      rest: { type: Number, default: 90 },
      notes: { type: String, default: '' }
    }
  },
  calorieEstimation: {
    metValue: { type: Number, default: 5.0 },
    intensity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'vigorous'],
      default: 'moderate'
    },
    estimatedKcalPerMinute: { type: Number, default: 6.0 }
  },
  aiGeneratedMetadata: {
    type: Boolean,
    default: false
  },
  instructorApproved: {
    type: Boolean,
    default: true
  },
  reviewStatus: {
    type: String,
    enum: ['draft', 'approved', 'flagged'],
    default: 'approved'
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
