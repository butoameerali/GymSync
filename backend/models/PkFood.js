import mongoose from 'mongoose';

const pkFoodSchema = new mongoose.Schema({
  foodId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  simpleName: {
    type: String,
    index: true
  },
  variation: {
    type: String,
    default: ''
  },
  portionLabel: {
    type: String,
    default: ''
  },
  qtyPerPlate: {
    type: String,
    default: ''
  },
  aliases: {
    romanUrdu: [{ type: String }],
    urdu: [{ type: String }]
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  typicalServing: {
    unit: { type: String, required: true },
    grams: { type: Number, default: 100 }
  },
  calories: {
    type: Number,
    required: true
  },
  minCalories: {
    type: Number
  },
  maxCalories: {
    type: Number
  },
  protein: {
    type: Number,
    default: 0
  },
  carbs: {
    type: Number,
    default: 0
  },
  fat: {
    type: Number,
    default: 0
  },
  fiber: {
    type: Number,
    default: 0
  },
  mainIngredients: [{
    type: String
  }],
  howTypicallyMade: {
    type: String,
    default: ''
  },
  recipeSteps: [{
    type: String
  }],
  healthyTip: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  benefits: {
    type: String,
    default: ''
  },
  whoCanEat: [{
    type: String
  }],
  whoShouldLimit: [{
    type: String
  }],
  mealSlots: [{
    type: String,
    enum: ['breakfast', 'lunch', 'snack', 'dinner']
  }],
  isGymPreferred: {
    type: Boolean,
    default: false,
    index: true
  },
  isEstimate: {
    type: Boolean,
    default: true
  },
  estimateRangePercent: {
    type: Number,
    default: 15
  },
  source: {
    type: String,
    default: 'Pakistan Food Composition Database / USDA / Institutional Recipe Analysis'
  },
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'high'
  },
  needsReview: {
    type: Boolean,
    default: false
  },
  medicalDisclaimer: {
    type: String,
    default: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  }
}, {
  timestamps: true
});

pkFoodSchema.index({ name: 'text', 'aliases.romanUrdu': 'text', 'aliases.urdu': 'text' });
pkFoodSchema.index({ category: 1, calories: 1 });

export default mongoose.model('PkFood', pkFoodSchema);
