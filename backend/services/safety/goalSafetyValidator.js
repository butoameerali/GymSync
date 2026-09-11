/**
 * Goal Plausibility & Body-Composition Safety Screening Service
 * 
 * Flags requested weight/body targets and timelines that fall outside clinically
 * recommended safety guidelines using BMI and weekly weight change velocity.
 * 
 * IMPORTANT: This does NOT make medical diagnoses — it acts as an authoritative
 * safety gate requiring certified human GymTrainer review before an aggressive
 * or potentially hazardous plan is activated.
 */

export const goalSafetyValidator = {
  /**
   * Calculate BMI from weight in kg and height in cm
   */
  calculateBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    return Number((weightKg / (heightM * heightM)).toFixed(1));
  },

  /**
   * Evaluate a requested target weight against user baseline
   */
  evaluateWeightTarget({ currentWeightKg, targetWeightKg, heightCm, age, gender }) {
    const curW = Number(currentWeightKg);
    const tarW = Number(targetWeightKg);
    const hCm = Number(heightCm);

    if (!curW || !tarW || !hCm) {
      return {
        flagged: false,
        reason: null,
        currentBMI: null,
        projectedBMI: null,
        warningMessage: null
      };
    }

    const currentBMI = this.calculateBMI(curW, hCm);
    const projectedBMI = this.calculateBMI(tarW, hCm);

    // Screening thresholds
    const UNDERWEIGHT_THRESHOLD = 18.5;
    const SEVERE_UNDERWEIGHT_THRESHOLD = 16.5;

    // 1. Projected target leads to severe underweight BMI (< 16.5)
    if (projectedBMI < SEVERE_UNDERWEIGHT_THRESHOLD) {
      return {
        flagged: true,
        reason: 'severe_underweight_target',
        currentBMI,
        projectedBMI,
        warningMessage: `Your requested target weight (${tarW} kg) projects to a BMI of ${projectedBMI}, which falls below the safe physiological threshold. A certified fitness trainer review is required before proceeding.`
      };
    }

    // 2. User is already underweight and requesting further weight reduction
    if (currentBMI < UNDERWEIGHT_THRESHOLD && tarW < curW) {
      return {
        flagged: true,
        reason: 'already_underweight_requesting_further_loss',
        currentBMI,
        projectedBMI,
        warningMessage: `Your current weight (${curW} kg, BMI ${currentBMI}) is already on the leaner boundary for your height. Further weight loss is not recommended without human trainer guidance.`
      };
    }

    // 3. Single goal asks for more than 35% total bodyweight reduction at once
    if (curW - tarW > (curW * 0.35)) {
      return {
        flagged: true,
        reason: 'excessive_single_phase_loss',
        currentBMI,
        projectedBMI,
        warningMessage: `Losing over 35% of body weight in a single program phase requires phased milestone planning and trainer supervision.`
      };
    }

    return {
      flagged: false,
      reason: null,
      currentBMI,
      projectedBMI,
      warningMessage: null
    };
  },

  /**
   * Evaluate timeline velocity (weekly change rate)
   */
  evaluateWeeklyRate({ currentWeightKg, targetWeightKg, deadlineWeeks }) {
    const curW = Number(currentWeightKg);
    const tarW = Number(targetWeightKg);
    const weeks = Number(deadlineWeeks);

    if (!curW || !tarW || !weeks || weeks <= 0) {
      return {
        flagged: false,
        weeklyRateKg: 0,
        maxSafeWeeklyKg: curW ? Number((curW * 0.01).toFixed(2)) : 0,
        warningMessage: null
      };
    }

    const totalDeltaKg = Math.abs(tarW - curW);
    const weeklyRateKg = Number((totalDeltaKg / weeks).toFixed(2));
    const maxSafeWeeklyKg = Number((curW * 0.01).toFixed(2)); // 1% bodyweight/week ceiling

    if (weeklyRateKg > maxSafeWeeklyKg) {
      return {
        flagged: true,
        reason: 'aggressive_weekly_rate',
        weeklyRateKg,
        maxSafeWeeklyKg,
        warningMessage: `Your requested timeline requires a change of ~${weeklyRateKg} kg/week, exceeding the recommended safe ceiling of ~${maxSafeWeeklyKg} kg/week (1% of body weight). A trainer review is required for aggressive timelines.`
      };
    }

    return {
      flagged: false,
      reason: null,
      weeklyRateKg,
      maxSafeWeeklyKg,
      warningMessage: null
    };
  },

  /**
   * Combined comprehensive safety check
   */
  evaluateGoalSafety({ currentWeightKg, targetWeightKg, heightCm, age, gender, deadlineDate }) {
    let deadlineWeeks = null;
    if (deadlineDate) {
      const dDate = new Date(deadlineDate);
      const diffMs = dDate.getTime() - Date.now();
      if (diffMs > 0) {
        deadlineWeeks = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 7)));
      }
    }

    const weightEval = this.evaluateWeightTarget({
      currentWeightKg,
      targetWeightKg,
      heightCm,
      age,
      gender
    });

    if (weightEval.flagged) {
      return {
        ...weightEval,
        weeklyRateKg: null,
        maxSafeWeeklyKg: null,
        requiresTrainerReview: true
      };
    }

    if (deadlineWeeks) {
      const rateEval = this.evaluateWeeklyRate({
        currentWeightKg,
        targetWeightKg,
        deadlineWeeks
      });

      if (rateEval.flagged) {
        return {
          flagged: true,
          reason: rateEval.reason,
          currentBMI: weightEval.currentBMI,
          projectedBMI: weightEval.projectedBMI,
          weeklyRateKg: rateEval.weeklyRateKg,
          maxSafeWeeklyKg: rateEval.maxSafeWeeklyKg,
          warningMessage: rateEval.warningMessage,
          requiresTrainerReview: true
        };
      }
    }

    return {
      flagged: false,
      reason: null,
      currentBMI: weightEval.currentBMI,
      projectedBMI: weightEval.projectedBMI,
      warningMessage: null,
      requiresTrainerReview: false
    };
  },

  /**
   * Generate structured milestones between start and target weight
   */
  generateMilestones({ startWeightKg, targetWeightKg, deadlineDate, count = 4 }) {
    const sW = Number(startWeightKg);
    const tW = Number(targetWeightKg);
    if (!sW || !tW || sW === tW) {
      return [];
    }

    const totalDelta = tW - sW;
    const stepDelta = totalDelta / count;
    const milestones = [];

    const nowMs = Date.now();
    let totalDurationMs = 0;
    if (deadlineDate) {
      const dTime = new Date(deadlineDate).getTime();
      if (dTime > nowMs) {
        totalDurationMs = dTime - nowMs;
      }
    }

    for (let i = 1; i <= count; i++) {
      const targetVal = Number((sW + (stepDelta * i)).toFixed(1));
      let targetDate = null;
      if (totalDurationMs > 0) {
        targetDate = new Date(nowMs + (totalDurationMs * (i / count)));
      }

      const isFinal = (i === count);
      milestones.push({
        label: isFinal ? `Final Goal: ${targetVal} kg` : `Milestone ${i}: ${targetVal} kg`,
        targetValue: targetVal,
        targetDate,
        achievedAt: null
      });
    }

    return milestones;
  }
};

export default goalSafetyValidator;
