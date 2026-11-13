/**
 * Weight Loss Calculator
 *
 * Implements authoritative exercise metabolic calculations using the Mifflin-St Jeor equation.
 * Calculates safe velocity bounds, realistic timelines, and deficit boundaries.
 * NOTE: Deficit values are for INTERNAL metabolic velocity modeling ONLY and must NEVER
 * be presented or prescribed as a diet plan (Rule R2).
 */

export function calculateBMR({ weightKg, heightCm, age, gender }) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  const a = Number(age);
  const g = (gender || '').toLowerCase().trim();

  if (!w || !h || !a) return 1600; // safe fallback

  const base = 10 * w + 6.25 * h - 5 * a;

  if (g === 'male' || g === 'm') {
    return Math.round(base + 5);
  }
  if (g === 'female' || g === 'f') {
    return Math.round(base - 161);
  }
  // Neutral / other
  return Math.round(base - 78);
}

export function getActivityMultiplier(trainingDaysPerWeek = 3) {
  const days = Number(trainingDaysPerWeek) || 3;
  if (days <= 2) return 1.2;
  if (days === 3) return 1.375;
  if (days <= 5) return 1.55;
  return 1.725;
}

export function calculateTDEE({ weightKg, heightCm, age, gender, trainingDaysPerWeek }) {
  const bmr = calculateBMR({ weightKg, heightCm, age, gender });
  const multiplier = getActivityMultiplier(trainingDaysPerWeek);
  return Math.round(bmr * multiplier);
}

export function evaluateWeightLossPlan({
  currentWeightKg,
  targetWeightKg,
  targetDurationWeeks,
  targetDurationDays,
  heightCm,
  age,
  gender,
  trainingDaysPerWeek = 3
}) {
  const curW = Number(currentWeightKg);
  const tarW = Number(targetWeightKg);
  let weeks = Number(targetDurationWeeks);

  if (!weeks && targetDurationDays) {
    weeks = Math.max(1, Math.round(Number(targetDurationDays) / 7));
  }
  weeks = Math.max(1, weeks || 4);

  const totalDeltaKg = Math.max(0, curW - tarW);
  const requestedRateKgPerWeek = Number((totalDeltaKg / weeks).toFixed(2));

  // Planning rate bands
  const minSafeWeeklyKg = Number((curW * 0.0025).toFixed(2)); // 0.25% bodyweight / week
  const maxSafeWeeklyKg = Number((curW * 0.0075).toFixed(2)); // 0.75% bodyweight / week
  const hardCapWeeklyKg = Number((curW * 0.01).toFixed(2));  // 1.00% bodyweight / week hard cap

  // Internal metabolic calculations (Mifflin-St Jeor)
  const bmr = calculateBMR({ weightKg: curW, heightCm, age, gender });
  const tdee = calculateTDEE({ weightKg: curW, heightCm, age, gender, trainingDaysPerWeek });

  // Deficit bounds: 250 - 500 kcal/day yields ~0.23 - 0.45 kg/wk
  const minExpectedLossKgPerWeek = Number(((250 * 7) / 7700).toFixed(2));
  const maxExpectedLossKgPerWeek = Math.min(hardCapWeeklyKg, Number(((500 * 7) / 7700).toFixed(2)));

  const isTimelineRealistic = requestedRateKgPerWeek <= hardCapWeeklyKg;
  const realisticWeeks = isTimelineRealistic
    ? weeks
    : Math.ceil(totalDeltaKg / Math.max(0.1, hardCapWeeklyKg));

  const targetDateMs = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
  const realisticDateMs = Date.now() + realisticWeeks * 7 * 24 * 60 * 60 * 1000;

  const maxSafeLossForRequestedTimeframeKg = Number((weeks * hardCapWeeklyKg).toFixed(1));

  return {
    currentWeightKg: curW,
    targetWeightKg: tarW,
    totalDeltaKg: Number(totalDeltaKg.toFixed(1)),
    requestedWeeks: weeks,
    requestedRateKgPerWeek,
    isTimelineRealistic,
    realisticWeeks,
    targetDate: new Date(targetDateMs).toISOString().split('T')[0],
    realisticDate: new Date(realisticDateMs).toISOString().split('T')[0],
    maxSafeLossForRequestedTimeframeKg,
    recommendedPlanningBand: {
      minKgPerWeek: minSafeWeeklyKg,
      maxKgPerWeek: maxSafeWeeklyKg,
      hardCapKgPerWeek: hardCapWeeklyKg,
      minSafeWeeklyKg,
      maxSafeWeeklyKg,
      hardCapWeeklyKg
    },
    internalMetrics: {
      bmr,
      tdee,
      minDeficitKcalDay: 250,
      maxDeficitKcalDay: 500,
      expectedLossBandWeekly: {
        minKg: minExpectedLossKgPerWeek,
        maxKg: maxExpectedLossKgPerWeek
      }
    }
  };
}

export default {
  calculateBMR,
  getActivityMultiplier,
  calculateTDEE,
  evaluateWeightLossPlan
};
