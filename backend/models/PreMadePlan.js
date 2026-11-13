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
  durationMonths: {
    type: Number,
    default: 1
  },
  daysPerWeek: {
    type: Number,
    default: 4
  },
  targetAudience: {
    type: String,
    default: 'All athletes'
  },
  // Weight Loss & Training Track Specs
  equipmentTrack: {
    type: String,
    enum: ['Home (No Equipment)', 'Gym (Equipment Required)'],
    default: 'Home (No Equipment)',
    index: true
  },
  programLevel: {
    type: String,
    enum: ['Starter', 'Steady', 'Driven'],
    default: 'Starter',
    index: true
  },
  isExtremeProgram: {
    type: Boolean,
    default: false,
    index: true
  },
  minAge: {
    type: Number,
    default: 18
  },
  maxAge: {
    type: Number,
    default: 65
  },
  minBMI: {
    type: Number,
    default: 23
  },
  maxBMI: {
    type: Number,
    default: 50
  },
  minWeightKg: {
    type: Number,
    default: 50
  },
  maxWeightKg: {
    type: Number,
    default: 180
  },
  whoCanDo: [{
    type: String
  }],
  whoShouldNotDo: [{
    type: String
  }],
  medicalWarningRequired: {
    type: Boolean,
    default: true
  },
  medicalWarningText: {
    type: String,
    default: 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.'
  },
  missedDayPolicy: {
    rule1To3Days: { type: String, default: 'Never double up. Missed 1 to 3 days, carry on.' },
    rule4To7Days: { type: String, default: 'Missed 4 to 7 days, repeat the week.' },
    ruleMoreThan7Days: { type: String, default: 'Missed more than 7 days, restart week 1.' }
  },
  cardioPrescription: {
    hasWalking: { type: Boolean, default: true },
    hasRunning: { type: Boolean, default: false },
    description: { type: String, default: 'Daily Walk + Saturday Long Walk' },
    dailyMinutes: { type: Number, default: 20 },
    saturdayMinutes: { type: Number, default: 35 },
    intervalRounds: { type: Number, default: 0 },
    effortRPE: { type: String, default: 'RPE 5 - 6' }
  },
  expectedLossMonth1: {
    minKg: { type: Number, default: 1.0 },
    maxKg: { type: Number, default: 3.5 },
    note: { type: String, default: 'Planning band: 0.25% to 0.75% body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.' }
  },
  ageRange: {
    type: String,
    default: '18 - 65 years'
  },
  ageGuidelines: {
    type: String,
    default: ''
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
    enum: ['draft', 'pending_review', 'published', 'rejected', 'archived'],
    default: 'published',
    index: true
  },
  version: {
    type: Number,
    default: 1
  },

  // Connected Diet Plan (Directly linked by trainer/instructor)
  connectedDietPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PreMadePlan',
    default: null
  },
  connectedDietPlanTitle: {
    type: String,
    default: null
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
        notes: { type: String, default: '' },
        isWarmup: { type: Boolean, default: false },
        isCooldown: { type: Boolean, default: false },
        isCardio: { type: Boolean, default: false },
        easierOption: { type: String, default: '' },
        harderOption: { type: String, default: '' },
        keyCue: { type: String, default: '' },
        targetMuscle: { type: String, default: '' },
        gifUrl: { type: String, default: '' },
        mediaUrl: { type: String, default: '' },
        videoUrl: { type: String, default: '' }
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


preMadePlanSchema.index({ type: 1, status: 1, _id: -1 });
preMadePlanSchema.index({ type: 1, status: 1, goal: 1, _id: -1 });
preMadePlanSchema.index({ type: 1, status: 1, category: 1 });
preMadePlanSchema.index({ type: 1, status: 1, goal: 1, difficulty: 1, createdAt: -1 });
preMadePlanSchema.index({ type: 1, status: 1, createdAt: -1 });
preMadePlanSchema.index({ type: 1, status: 1, sportTags: 1 });
preMadePlanSchema.index({ createdById: 1, status: 1 });
preMadePlanSchema.index({ goal: 1, difficulty: 1 });

export default mongoose.model('PreMadePlan', preMadePlanSchema);


