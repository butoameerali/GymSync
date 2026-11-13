import { isBioComplete } from '../user/bioValidator.js';
import { goalSafetyValidator } from '../safety/goalSafetyValidator.js';
import { programGate } from '../workout/programGate.js';

export const MEDICAL_WARNING_TEXT =
  "Do NOT start this program without your doctor's approval if you have: heart disease, high/low blood pressure, diabetes, asthma or breathing problems, joint/back/knee injury or recent surgery, pregnancy or breastfeeding, an eating disorder history, or you take regular medication. Stop immediately and seek medical care if you feel chest pain, dizziness, fainting or unusual breathlessness.";

export const MEDICAL_WARNING_VERSION = 'v1.0';

export function calculateAge(dobStr, fallbackAge) {
  if (fallbackAge && Number(fallbackAge) > 0) return Number(fallbackAge);
  if (!dobStr) return null;

  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validates eligibility for enrolling in the Weight Loss program.
 * Enforces Rules R3, R4, and R5.
 */
export async function checkWeightLossEligibility({
  user,
  targetWeightKg,
  targetDurationWeeks,
  medicalWarningAcknowledged = false,
  medicalWarningVersion = null,
  seniorAcknowledged = false,
  allowProgramSwitch = false
}) {
  if (!user) {
    return {
      eligible: false,
      code: 'UNAUTHENTICATED',
      message: 'You must be signed in to check eligibility.'
    };
  }

  // 1. Bio completeness check (Rule R4)
  if (!isBioComplete(user)) {
    return {
      eligible: false,
      code: 'INCOMPLETE_BIO',
      message: 'Complete your profile to start',
      action: {
        label: 'Complete Profile',
        url: '/profile'
      }
    };
  }

  const bio = user.bioData || {};
  const currentWeightKg = Number(bio.weight);
  const heightCm = Number(bio.height);
  const age = calculateAge(bio.dob, bio.age);
  const gender = bio.gender;

  // 2. Age Gate
  if (!age || age < 18) {
    return {
      eligible: false,
      code: 'UNDERAGE',
      message: 'Weight-loss programs are restricted to adults aged 18 and older for health and safety.'
    };
  }

  const isSenior = age >= 65;

  // 3. BMI & Goal Safety checks (reusing goalSafetyValidator)
  if (targetWeightKg) {
    const safetyEval = goalSafetyValidator.evaluateGoalSafety({
      currentWeightKg,
      targetWeightKg: Number(targetWeightKg),
      heightCm,
      age,
      gender,
      deadlineDate: targetDurationWeeks
        ? new Date(Date.now() + Number(targetDurationWeeks) * 7 * 24 * 60 * 60 * 1000)
        : null
    });

    if (safetyEval.currentBMI < 18.5) {
      return {
        eligible: false,
        code: 'UNDERWEIGHT',
        message: `Your current BMI is ${safetyEval.currentBMI}. Weight loss programs are not permitted for individuals with a BMI below 18.5.`,
        currentBMI: safetyEval.currentBMI
      };
    }

    if (safetyEval.projectedBMI < 18.5) {
      return {
        eligible: false,
        code: 'PROJECTED_UNDERWEIGHT',
        message: `The target weight (${targetWeightKg} kg) would lead to a BMI of ${safetyEval.projectedBMI}, which is below the safe threshold of 18.5.`,
        projectedBMI: safetyEval.projectedBMI
      };
    }
  } else {
    // Check current weight BMI alone if target not yet submitted
    const currentBMI = Number((currentWeightKg / ((heightCm / 100) ** 2)).toFixed(1));
    if (currentBMI < 18.5) {
      return {
        eligible: false,
        code: 'UNDERWEIGHT',
        message: `Your current BMI is ${currentBMI}. Weight loss programs are not permitted for individuals with a BMI below 18.5.`,
        currentBMI
      };
    }
  }

  // 4. Program Gate (Rule R3: Exactly one active program)
  if (!allowProgramSwitch) {
    const gateCheck = await programGate.canJoin(user._id);
    if (!gateCheck.canJoin) {
      return {
        eligible: false,
        code: 'ACTIVE_PROGRAM_EXISTS',
        message: gateCheck.message || 'Finish or leave your current program first',
        activeProgram: gateCheck.activeProgram
      };
    }
  }

  // 5. Senior Acknowledgment Requirement (if age >= 65)
  if (isSenior && !seniorAcknowledged) {
    return {
      eligible: false,
      code: 'SENIOR_ACK_REQUIRED',
      message: 'For participants aged 65 and older, an additional physician acknowledgment is required before enrollment.',
      requiresSeniorAcknowledgment: true
    };
  }

  // 6. Medical Warning Acknowledgment (Rule R5: No medical data collected, explicit warning acknowledged)
  if (!medicalWarningAcknowledged) {
    return {
      eligible: false,
      code: 'MEDICAL_WARNING_REQUIRED',
      message: 'You must review and acknowledge the medical safety warning before beginning this program.',
      warningText: MEDICAL_WARNING_TEXT,
      version: MEDICAL_WARNING_VERSION
    };
  }

  return {
    eligible: true,
    code: 'ELIGIBLE',
    message: 'All eligibility checks passed.',
    isSenior,
    warningVersion: MEDICAL_WARNING_VERSION
  };
}

export default {
  checkWeightLossEligibility,
  calculateAge,
  MEDICAL_WARNING_TEXT,
  MEDICAL_WARNING_VERSION
};
