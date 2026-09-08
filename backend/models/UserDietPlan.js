import mongoose from 'mongoose';

const userDietPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true,
    index: true
  },
  sourceDietId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PreMadePlan',
    required: true,
    index: true
  },
  dietVersion: {
    type: Number,
    default: 1
  },
  title: {
    type: String,
    required: true
  },
  goal: {
    type: String,
    default: 'General Fitness'
  },
  dietaryType: {
    type: String,
    default: 'Balanced'
  },
  calories: {
    type: Number,
    default: 2000
  },
  protein: {
    type: Number,
    default: 150
  },
  carbs: {
    type: Number,
    default: 200
  },
  fat: {
    type: Number,
    default: 65
  },
  allergies: [{
    type: String
  }],
  instructorName: {
    type: String,
    default: 'Fitness Instructor'
  },
  meals: [{
    mealType: {
      type: String,
      default: 'Breakfast'
    },
    name: { type: String, default: 'Meal' },
    timing: { type: String, default: '08:00 AM' },
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    foodItems: [{
      name: String,
      quantity: Number,
      unit: String,
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      allergens: [String],
      localAlternative: String
    }],
    substitutions: [String]
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  adherenceLogs: [{
    date: { type: Date, default: Date.now },
    loggedMealName: String,
    loggedMealType: String,
    caloriesConsumed: Number,
    adherenceNote: String
  }]
}, { timestamps: true });

userDietPlanSchema.index({ userId: 1, isActive: 1 });
userDietPlanSchema.index({ userName: 1, isActive: 1 });

export default mongoose.model('UserDietPlan', userDietPlanSchema);
