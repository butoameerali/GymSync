import mongoose from 'mongoose';

const gymPlanSchema = new mongoose.Schema({
  gymId: { type: String, required: true },
  memberId: { type: String, required: true },
  memberName: { type: String, required: true },
  assignedBy: { type: String, required: true },
  planType: { type: String, enum: ['Workout', 'Diet'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  schedule: [{
    date: Date,
    day: String,
    routine: String,
    exercises: [{
      name: String,
      sets: String,
      reps: String,
      notes: String
    }],
    dietInstructions: String
    ,completedAt: { type: Date, default: null }
  }],
  nutritionMacros: {
    calories: Number,
    proteinGrams: Number,
    carbsGrams: Number,
    fatGrams: Number
  }
}, {
  timestamps: true
});

const GymPlan = mongoose.model('GymPlan', gymPlanSchema);
export default GymPlan;
