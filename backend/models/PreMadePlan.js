import mongoose from 'mongoose';

const preMadePlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Exercise', 'Diet', 'Workout', 'workout', 'diet', 'exercise'],
    required: true,
    index: true
  },
  category: {
    type: String,
    default: 'General Fitness',
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  // High-level metadata
  goal: {
    type: String,
    default: 'General Fitness',
    index: true
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'Beginner'
  },
  durationWeeks: {
    type: Number,
    default: 4
  },
  daysPerWeek: {
    type: Number,
    default: 4
  },
  targetAudience: {
    type: String,
    default: 'All athletes'
  },
  sportTags: [{
    type: String
  }],
  equipmentRequired: [{
    type: String
  }],
  fitnessGoals: [{
    type: String
  }],

  // Program & Diet Lifecycle & Versioning
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  version: {
    type: Number,
    default: 1
  },

  // 1. Structured Workout Programs (Multi-week progression)
  weeks: [{
    weekNumber: { type: Number, required: true },
    focus: { type: String, default: '' },
    days: [{
      dayNumber: { type: Number, required: true },
      title: { type: String, default: '' },
      focus: { type: String, default: '' },
      isRestDay: { type: Boolean, default: false },
      dayType: {
        type: String,
        enum: ['workout', 'rest', 'active_recovery', 'mobility', 'deload'],
        default: 'workout'
      },
      warmup: [{
        text: { type: String, default: '' },
        duration: { type: Number, default: 5 }
      }],
      exercises: [{
        exerciseId: { type: String, required: true },
        name: { type: String, required: true },
        order: { type: Number, default: 1 },
        sets: { type: Number, default: 3 },
        reps: { type: String, default: '10' },
        duration: { type: Number, default: 0 },
        restSeconds: { type: Number, default: 60 },
        intensity: { type: String, default: 'Moderate' },
        rpe: { type: Number, default: 7 },
        tempo: { type: String, default: '2-0-2' },
        notes: { type: String, default: '' }
      }],
      cooldown: [{
        text: { type: String, default: '' },
        duration: { type: Number, default: 5 }
      }],
      notes: { type: String, default: '' }
    }]
  }],

  // 2. Structured Nutritional Diet Templates
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
  dietaryType: {
    type: String,
    default: 'Balanced',
    index: true
  },
  allergies: [{
    type: String
  }],
  dietaryRestrictions: [{
    type: String
  }],
  meals: [{
    mealType: {
      type: String,
      enum: ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Post-Workout', 'Snack'],
      default: 'Breakfast'
    },
    name: { type: String, default: 'Meal' },
    timing: { type: String, default: '08:00 AM' },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    foodItems: [{
      name: { type: String, required: true },
      quantity: { type: Number, default: 100 },
      unit: { type: String, default: 'g' },
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      allergens: [{ type: String, trim: true }],
      localAlternative: { type: String, default: '' }
    }],
    substitutions: [{
      type: String
    }]
  }],

  // Legacy Details Container for backward compatibility
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Author & Attribution
  createdBy: {
    type: String,
    default: 'Fitness Instructor'
  },
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  authorRole: {
    type: String,
    default: 'FitnessInstructor'
  },
  tags: [{
    type: String
  }]
}, { timestamps: true });

// Pre-save hook: Enforce nutrition arithmetic integrity across meals and total plan
preMadePlanSchema.pre('save', function() {
  if (this.type && this.type.toLowerCase() === 'diet' && this.meals && this.meals.length > 0) {
    let planCal = 0;
    let planP = 0;
    let planC = 0;
    let planF = 0;
    const collectedAllergens = new Set(this.allergies || []);

    this.meals.forEach(meal => {
      let mCal = 0, mP = 0, mC = 0, mF = 0;
      (meal.foodItems || []).forEach(item => {
        mCal += Number(item.calories) || 0;
        mP += Number(item.protein) || 0;
        mC += Number(item.carbs) || 0;
        mF += Number(item.fat) || 0;

        if (Array.isArray(item.allergens)) {
          item.allergens.forEach(a => {
            if (a && a.trim()) collectedAllergens.add(a.trim().toLowerCase());
          });
        }
      });

      meal.calories = Math.round(mCal);
      meal.protein = Math.round(mP);
      meal.carbs = Math.round(mC);
      meal.fat = Math.round(mF);

      planCal += mCal;
      planP += mP;
      planC += mC;
      planF += mF;
    });

    // Auto-synchronize daily totals with exact sum of meals if not overridden
    this.calories = Math.round(planCal);
    this.protein = Math.round(planP);
    this.carbs = Math.round(planC);
    this.fat = Math.round(planF);
    this.allergies = Array.from(collectedAllergens);
  }
});


preMadePlanSchema.index({ type: 1, status: 1, category: 1 });
preMadePlanSchema.index({ type: 1, status: 1, goal: 1, difficulty: 1, createdAt: -1 });
preMadePlanSchema.index({ type: 1, status: 1, createdAt: -1 });
preMadePlanSchema.index({ type: 1, status: 1, sportTags: 1 });
preMadePlanSchema.index({ createdById: 1, status: 1 });
preMadePlanSchema.index({ goal: 1, difficulty: 1 });

export default mongoose.model('PreMadePlan', preMadePlanSchema);


