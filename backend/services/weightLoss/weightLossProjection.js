/**
 * Weight Loss Projection Engine
 *
 * Generates non-linear metabolic projections (weekly, monthly, and yearly ranges).
 * Models realistic biological slowdown/taper rather than linear multiplication.
 * Computes deterministic data-driven confidence labels (Low/Medium/High) without fake probability scores.
 */

export const PROJECTION_DISCLAIMER =
  "Estimates only, not guarantees. Results depend on consistency, sleep, nutrition and health.";

/**
 * Calculates a confidence label based strictly on volume of logged user data.
 * @param {Object} logs - { workoutsCount, weighInsCount, foodLogsCount }
 * @returns {'Low' | 'Medium' | 'High'}
 */
export function calculateConfidenceLabel({
  workoutsCount = 0,
  weighInsCount = 0,
  foodLogsCount = 0
} = {}) {
  const totalLogs = (Number(workoutsCount) || 0) + (Number(weighInsCount) || 0) + (Number(foodLogsCount) || 0);

  if (totalLogs < 3) return 'Low';
  if (totalLogs < 10) return 'Medium';
  return 'High';
}

/**
 * Age-bracket metabolic responsiveness adjustment factor
 */
export function getAgeMetabolicFactor(age) {
  const a = Number(age);
  if (!a || a < 18) return 1.0;
  if (a <= 29) return 1.0;     // 18-29
  if (a <= 49) return 0.95;    // 30-49
  if (a <= 64) return 0.90;    // 50-64
  return 0.85;                 // 65+
}

/**
 * Computes realistic weekly, monthly, and yearly ranges modeling metabolic slowdown.
 */
export function generateWeightLossProjection({
  currentWeightKg,
  targetWeightKg,
  targetDurationWeeks,
  age,
  gender,
  trainingDaysPerWeek = 3,
  userLogStats = {}
}) {
  const curW = Math.max(30, Math.min(300, Number(currentWeightKg) || 75)); // clamp extreme inputs safely
  const tarW = Math.max(25, Math.min(curW, Number(targetWeightKg) || (curW - 5)));
  const totalGoalDeltaKg = Math.max(0, curW - tarW);

  const ageFactor = getAgeMetabolicFactor(age);

  // Baseline safe rate per week based on 0.25% - 0.75% of body weight, scaled by age factor
  const minWeeklyRate = Number((curW * 0.0025 * ageFactor).toFixed(2));
  const maxWeeklyRate = Number((curW * 0.0075 * ageFactor).toFixed(2));

  // 1. Weekly Expected Range
  const weeklyRange = {
    minKg: Number(minWeeklyRate.toFixed(2)),
    maxKg: Number(maxWeeklyRate.toFixed(2))
  };

  // 2. Monthly Expected Range (Month 1: ~4 weeks)
  // Month 1 typically exhibits highest consistency before metabolic adaptation kicks in
  const monthlyRange = {
    minKg: Number((minWeeklyRate * 4 * 0.95).toFixed(1)),
    maxKg: Number((maxWeeklyRate * 4 * 0.95).toFixed(1))
  };

  // 3. Yearly Expected Range (Month-by-month diminishing returns model)
  // Non-linear projection: 12 months with progressive taper
  // Month 1: 100%, M2: 95%, M3: 90%, M4-6: 80%, M7-9: 70%, M10-12: 60%
  const monthlyTaperFactors = [1.0, 0.95, 0.90, 0.82, 0.80, 0.78, 0.72, 0.70, 0.68, 0.62, 0.60, 0.58];
  
  let yearlyMinTotal = 0;
  let yearlyMaxTotal = 0;

  for (const factor of monthlyTaperFactors) {
    const mMin = (minWeeklyRate * 4) * factor;
    const mMax = (maxWeeklyRate * 4) * factor;
    yearlyMinTotal += mMin;
    yearlyMaxTotal += mMax;
  }

  // Cap yearly max to never exceed 25% of current bodyweight in a single continuous phase for health preservation
  const absoluteYearlyCeiling = curW * 0.25;
  const yearlyRange = {
    minKg: Number(Math.min(totalGoalDeltaKg || yearlyMinTotal, yearlyMinTotal).toFixed(1)),
    maxKg: Number(Math.min(absoluteYearlyCeiling, yearlyMaxTotal).toFixed(1))
  };

  // 4. Data-driven confidence label
  const confidence = calculateConfidenceLabel(userLogStats);

  return {
    ranges: {
      weekly: {
        minKg: weeklyRange.minKg,
        maxKg: weeklyRange.maxKg,
        unit: 'kg/week'
      },
      monthly: {
        minKg: monthlyRange.minKg,
        maxKg: monthlyRange.maxKg,
        unit: 'kg/month'
      },
      yearly: {
        minKg: yearlyRange.minKg,
        maxKg: yearlyRange.maxKg,
        unit: 'kg/year'
      }
    },
    confidence,
    disclaimer: PROJECTION_DISCLAIMER,
    ageBracketFactor: ageFactor,
    modeledSlowdown: 'Non-linear metabolic taper applied across quarters'
  };
}

export default {
  PROJECTION_DISCLAIMER,
  calculateConfidenceLabel,
  getAgeMetabolicFactor,
  generateWeightLossProjection
};
