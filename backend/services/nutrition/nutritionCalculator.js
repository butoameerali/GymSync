/**
 * Deterministic Nutrition & Macro Calculator
 * Uses the clinically validated Mifflin-St Jeor equation to compute BMR,
 * applies physical activity multipliers for TDEE, and allocates macronutrient targets
 * matching the user's adaptation goal.
 */

export const nutritionCalculator = {
  /**
   * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor formula
   *
   * @param {Object} options
   * @param {number} options.weightKg - Body weight in kg
   * @param {number} options.heightCm - Height in cm
   * @param {number} options.age - Age in years (defaults to 25 if not supplied)
   * @param {string} options.gender - 'Male' | 'Female' | other
   * @returns {number} BMR in kcal/day
   */
  calculateBMR({ weightKg = 70, heightCm = 170, age = 25, gender = 'Male' } = {}) {
    const w = Math.max(35, Math.min(250, Number(weightKg) || 70));
    const h = Math.max(120, Math.min(230, Number(heightCm) || 170));
    const a = Math.max(14, Math.min(95, Number(age) || 25));
    const isFemale = String(gender).toLowerCase() === 'female';

    // Mifflin-St Jeor:
    // Men: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
    // Women: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
    const base = (10 * w) + (6.25 * h) - (5 * a);
    return Math.round(isFemale ? base - 161 : base + 5);
  },

  /**
   * Calculate Total Daily Energy Expenditure (TDEE)
   *
   * @param {number} bmr - Basal metabolic rate
   * @param {string|number} activityLevel - Activity descriptor or training days/week
   * @returns {number} TDEE in kcal/day
   */
  calculateTDEE(bmr, activityLevel = 3) {
    let multiplier = 1.375; // lightly active default

    if (typeof activityLevel === 'number') {
      if (activityLevel <= 1) multiplier = 1.2; // Sedentary
      else if (activityLevel <= 3) multiplier = 1.375; // Lightly active (1-3 days)
      else if (activityLevel <= 5) multiplier = 1.55; // Moderately active (3-5 days)
      else multiplier = 1.725; // Very active (6-7 days)
    } else {
      const act = String(activityLevel).toLowerCase();
      if (act.includes('sedentary')) multiplier = 1.2;
      else if (act.includes('light')) multiplier = 1.375;
      else if (act.includes('moderat')) multiplier = 1.55;
      else if (act.includes('very') || act.includes('heavy') || act.includes('athlete')) multiplier = 1.725;
    }

    return Math.round(bmr * multiplier);
  },

  /**
   * Determine Target Calorie Intake and Macronutrients based on Goal and Weight
   *
   * @param {Object} options
   * @param {number} options.weightKg - User weight in kg
   * @param {number} options.heightCm - User height in cm
   * @param {number} options.age - User age
   * @param {string} options.gender - User gender
   * @param {string} options.goal - Fitness Goal
   * @param {string|number} options.activityLevel - Activity level
   * @returns {Object} { bmr, tdee, targetCalories, goalType, proteinGrams, fatGrams, carbGrams, hydrationLiters }
   */
  calculateMacroTargets({
    weightKg = 70,
    heightCm = 170,
    age = 25,
    gender = 'Male',
    goal = 'General Fitness',
    activityLevel = 3
  } = {}) {
    const w = Math.max(35, Math.min(250, Number(weightKg) || 70));
    const bmr = this.calculateBMR({ weightKg: w, heightCm, age, gender });
    const tdee = this.calculateTDEE(bmr, activityLevel);
    const g = String(goal).toLowerCase();

    let targetCalories = tdee;
    let goalType = 'Maintenance & Recomposition';
    let proteinMultiplier = 1.8; // grams per kg

    if (g.includes('weight loss') || g.includes('fat burn') || g.includes('cut') || g.includes('lean')) {
      // 15% to 22% moderate, healthy deficit (~400-500 kcal)
      const deficit = Math.min(600, Math.max(350, Math.round(tdee * 0.20)));
      targetCalories = tdee - deficit;
      goalType = 'Fat Loss (Caloric Deficit)';
      // High protein to spare lean muscle mass during deficit
      proteinMultiplier = 2.0;

      // Absolute healthy floor check (no starvation diets)
      const minimumFloor = gender.toLowerCase() === 'female' ? 1200 : 1500;
      if (targetCalories < minimumFloor) targetCalories = minimumFloor;
    } else if (g.includes('muscle') || g.includes('hypertrophy') || g.includes('bulking') || g.includes('mass')) {
      // 10% to 15% clean surplus (~250-400 kcal)
      const surplus = Math.min(450, Math.max(250, Math.round(tdee * 0.12)));
      targetCalories = tdee + surplus;
      goalType = 'Muscle Building (Lean Caloric Surplus)';
      proteinMultiplier = 2.0;
    } else if (g.includes('endurance') || g.includes('running') || g.includes('cricket') || g.includes('athletic')) {
      targetCalories = tdee;
      goalType = 'Athletic Performance & Glycogen Replenishment';
      proteinMultiplier = 1.7;
    }

    // 1. Protein Target (1.6 to 2.2 g/kg, safely bounded)
    const proteinGrams = Math.round(w * proteinMultiplier);
    const proteinCalories = proteinGrams * 4;

    // 2. Fat Target (0.8 to 1.0 g/kg, minimum 20% of total calories for hormonal health)
    let fatGrams = Math.round(w * 0.9);
    let fatCalories = fatGrams * 9;
    const minFatCalories = targetCalories * 0.20;
    if (fatCalories < minFatCalories) {
      fatCalories = Math.round(minFatCalories);
      fatGrams = Math.round(fatCalories / 9);
    }

    // 3. Carbohydrate Target (Remaining calories / 4)
    const remainingCalories = Math.max(0, targetCalories - (proteinCalories + fatCalories));
    const carbGrams = Math.round(remainingCalories / 4);

    // Consistency check: total must equal the sum of constituent macros
    const exactTotalCalories = (proteinGrams * 4) + (carbGrams * 4) + (fatGrams * 9);

    // Dynamic hydration based on bodyweight & activity (not arbitrary 3L for everyone)
    // Guideline: 35ml per kg bodyweight + 500ml for training session
    const hydrationLiters = Number(((w * 0.035) + 0.5).toFixed(1));

    return {
      bmr,
      tdee,
      targetCalories: exactTotalCalories,
      goalType,
      proteinGrams,
      fatGrams,
      carbGrams,
      proteinCalories,
      fatCalories,
      carbCalories: carbGrams * 4,
      macroSplitPercentage: {
        protein: Math.round((proteinCalories / exactTotalCalories) * 100),
        carbs: Math.round(((carbGrams * 4) / exactTotalCalories) * 100),
        fat: Math.round((fatCalories / exactTotalCalories) * 100)
      },
      hydrationLiters
    };
  }
};

export default nutritionCalculator;
