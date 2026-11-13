import mongoose from 'mongoose';

const foodLogItemSchema = new mongoose.Schema({
  foodId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'other'
  },
  servingUnit: {
    type: String,
    default: 'serving'
  },
  servingGrams: {
    type: Number,
    default: 100
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.25,
    max: 10,
    default: 1
  },
  caloriesEstimated: {
    type: Number,
    required: true
  },
  caloriesRangeMin: {
    type: Number,
    required: true
  },
  caloriesRangeMax: {
    type: Number,
    required: true
  },
  proteinG: {
    type: Number,
    default: 0
  },
  carbsG: {
    type: Number,
    default: 0
  },
  fatG: {
    type: Number,
    default: 0
  },
  fiberG: {
    type: Number,
    default: 0
  },
  whoShouldLimit: [{
    type: String
  }]
}, { _id: true });

const foodLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    index: true
  },
  mealSlot: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack', 'extra'],
    default: 'lunch',
    required: true
  },
  items: [foodLogItemSchema],
  totalCaloriesEstimated: {
    type: Number,
    default: 0
  },
  totalCaloriesRangeMin: {
    type: Number,
    default: 0
  },
  totalCaloriesRangeMax: {
    type: Number,
    default: 0
  },
  totalProteinG: {
    type: Number,
    default: 0
  },
  totalCarbsG: {
    type: Number,
    default: 0
  },
  totalFatG: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  isBackfilled: {
    type: Boolean,
    default: false
  },
  loggedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

foodLogSchema.index({ userId: 1, date: 1, mealSlot: 1 });

export default mongoose.model('FoodLog', foodLogSchema);
