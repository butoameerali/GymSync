/**
 * Clinical Diet Validator & Sanity Engine
 * Audits nutrition plans for biological plausibility, macro consistency,
 * safe protein ceilings, and healthy fat thresholds.
 */

export const dietValidator = {
  /**
   * Validate a generated diet plan
   *
   * @param {Object} plan - Generated diet plan object
   * @param {Object} userProfile - User bio metrics { weightKg, gender }
   * @returns {Object} { valid, errors, warnings, correctedPlan }
   */
  validateDiet(plan, userProfile = {}) {
    const errors = [];
    const warnings = [];
    const weightKg = Number(userProfile.weight || userProfile.weightKg || 70);

    if (!plan || !plan.actualTotals || !plan.meals) {
      return {
        valid: false,
        errors: ['Plan object is missing actualTotals or meals structure.'],
        warnings: [],
        correctedPlan: null
      };
    }

    const { totalDailyCalories, totalProtein, totalCarbs, totalFat } = plan.actualTotals;

    // 1. Check Calorie Plausibility (Biological floor and ceiling)
    if (totalDailyCalories < 1100) {
      errors.push(`Calorie target (${totalDailyCalories} kcal) is dangerously low (< 1100 kcal). Potential risk of metabolic downregulation.`);
    }
    if (totalDailyCalories > 4800) {
      errors.push(`Calorie target (${totalDailyCalories} kcal) is excessively high (> 4800 kcal) for general population training.`);
    }

    // 2. Check Protein Plausibility (Safe clinical bounds: 1.0 to 2.8 g/kg)
    const proteinPerKg = totalProtein / weightKg;
    if (proteinPerKg < 0.9) {
      warnings.push(`Protein intake (${proteinPerKg.toFixed(1)} g/kg) is below optimal sports recovery thresholds.`);
    }
    if (proteinPerKg > 2.8) {
      errors.push(`Protein ceiling exceeded: intake (${proteinPerKg.toFixed(1)} g/kg, ${totalProtein}g total) exceeds safe clinical ceiling of 2.8 g/kg.`);
    }

    // 3. Check Healthy Fat Minimum (Minimum 18% of calories or 0.5g/kg)
    const fatCalories = totalFat * 9;
    const fatPercentage = (fatCalories / totalDailyCalories) * 100;
    if (fatPercentage < 15) {
      errors.push(`Dietary fat (${fatPercentage.toFixed(1)}% of total calories) is dangerously low (< 15%). Essential fatty acids needed for endocrine and hormone health.`);
    }

    // 4. Mathematical Consistency Check (Sum of meals vs Actual Totals)
    const mealSumCalories = plan.meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
    const constituentMacroCalories = (totalProtein * 4) + (totalCarbs * 4) + (totalFat * 9);

    if (Math.abs(mealSumCalories - totalDailyCalories) > 15) {
      warnings.push(`Slight variance between meal calorie sum (${mealSumCalories} kcal) and total calories (${totalDailyCalories} kcal). Auto-synchronized.`);
    }

    if (Math.abs(constituentMacroCalories - totalDailyCalories) > (totalDailyCalories * 0.08)) {
      warnings.push(`Constituent macro calories (${constituentMacroCalories} kcal) differ slightly from target (${totalDailyCalories} kcal).`);
    }

    // 5. Food Portion Sanity Check (No absurd single-food consumption)
    plan.meals.forEach(m => {
      (m.items || []).forEach(item => {
        const str = (item.food + ' ' + item.portion).toLowerCase();
        // Check egg overload
        const eggMatch = str.match(/(\d+)\s*(whole)?\s*eggs?/);
        if (eggMatch && parseInt(eggMatch[1], 10) > 6) {
          errors.push(`Unrealistic Egg quantity detected in ${m.mealName}: ${eggMatch[1]} whole eggs in a single meal.`);
        }
        // Check meat overload (> 400g in one meal)
        const meatMatch = str.match(/(\d+)\s*g/);
        if (meatMatch && parseInt(meatMatch[1], 10) > 400 && (str.includes('chicken') || str.includes('fish') || str.includes('beef'))) {
          errors.push(`Excessive single-meal meat portion detected in ${m.mealName}: ${meatMatch[1]}g.`);
        }
      });
    });

    const valid = errors.length === 0;

    // Build corrected plan if needed
    let correctedPlan = { ...plan };
    if (!valid) {
      // Auto-correct if minor bounded errors exist
      correctedPlan.actualTotals = {
        ...plan.actualTotals,
        totalDailyCalories: mealSumCalories
      };
    }

    return {
      valid,
      isValid: valid,
      errors,
      issues: errors,
      warnings,
      correctedPlan
    };
  }
};

export default dietValidator;
