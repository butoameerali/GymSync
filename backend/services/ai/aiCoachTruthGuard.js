/**
 * aiCoachTruthGuard
 * Enforces Truth Rules (Rule R1, R2, 5.4):
 * - The AI NEVER claims it saved/changed a program. Programs come only from human instructors.
 * - The AI NEVER prescribes diet or assigns meal plans. Diet is Track + Report only.
 * - Always cite source items when recommending or providing exercise/article advice.
 */

// Patterns indicating false claims of saving or mutating workout programs
const PROGRAM_MUTATION_PATTERNS = [
  /\b(?:i(?:'ve|\s+have)?\s+(?:updated|saved|modified|changed|edited|overwritten|created)\s+(?:your\s+)?(?:workout\s+)?(?:program|plan|routine))\b/i,
  /\b(?:i(?:'ve|\s+have)?\s+(?:added|swapped|replaced)\s+.*?\s+(?:in|into|to)\s+(?:your\s+)?(?:saved\s+)?(?:plan|program|routine))\b/i,
  /\b(?:your\s+(?:workout\s+)?(?:plan|program)\s+has\s+been\s+(?:updated|saved|modified))\b/i,
  /\b(?:maine\s+apka\s+(?:plan|program)\s+(?:update|change|save)\s+kar\s+diya)\b/i,
  /\b(?:apka\s+(?:plan|program)\s+update\s+ho\s+gaya)\b/i
];

// Patterns indicating false claims of prescribing diet or assigning meal plans
const DIET_PRESCRIPTION_PATTERNS = [
  /\b(?:i(?:'ve|\s+have)?\s+(?:prescribed|assigned|created|generated)\s+(?:a|this|your)\s+(?:diet|meal\s+plan|nutrition\s+plan))\b/i,
  /\b(?:you\s+must\s+eat|you\s+should\s+eat)\s+\d{3,4}\s*(?:calories|kcal)\b/i,
  /\b(?:here\s+is\s+your\s+(?:prescribed\s+)?diet\s+plan)\b/i,
  /\b(?:follow\s+this\s+prescribed\s+meal\s+plan)\b/i,
  /\b(?:maine\s+apke\s+liye\s+diet\s+plan\s+(?:bana|generate)\s+kiya)\b/i
];

export const aiCoachTruthGuard = {
  /**
   * Scans and sanitizes any coach response (from Ollama or deterministic fallback)
   * to ensure no false claims violate GymSync Truth Rules.
   */
  sanitizeCoachResponse(replyText, { structuredAction = {}, intent = '' } = {}) {
    if (!replyText || typeof replyText !== 'string') return replyText;
    let text = replyText;

    // 1. Program Mutation Claim Guard
    const hasProgramMutationClaim = PROGRAM_MUTATION_PATTERNS.some(rx => rx.test(text));
    if (hasProgramMutationClaim) {
      // Clean false claim and replace with truth statement
      PROGRAM_MUTATION_PATTERNS.forEach(rx => {
        text = text.replace(rx, 'I can suggest this adjustment from our library, and you can select certified programs in Workout Programs');
      });
      // Append truth footer if not already present
      if (!text.includes('GymSync programs are human-authored')) {
        text += '\n\n*(Note: In GymSync, workout programs are human-authored by certified trainers. The AI can find and suggest matching exercises or instructor plans, but never mutates your program directly.)*';
      }
    }

    // 2. Diet Prescription Claim Guard
    const hasDietPrescriptionClaim = DIET_PRESCRIPTION_PATTERNS.some(rx => rx.test(text));
    if (hasDietPrescriptionClaim) {
      DIET_PRESCRIPTION_PATTERNS.forEach(rx => {
        text = text.replace(rx, 'GymSync nutrition is Track & Report only');
      });
      if (!text.includes('Track + Report only')) {
        text += '\n\n*(Note: Under GymSync safety rules, nutrition is Track + Report only. The AI never prescribes diets; you can log meals in Food Log to review your daily energy report.)*';
      }
    }

    // 3. Offline AI / Ollama Claim Guard (Rule 5.1: No "AI offline" or "Ollama down" banner to users)
    if (/\b(?:ollama\s+is\s+(?:down|offline|unavailable)|ai\s+is\s+offline|local\s+llm\s+offline)\b/i.test(text)) {
      text = text.replace(/\b(?:ollama\s+is\s+(?:down|offline|unavailable)|ai\s+is\s+offline|local\s+llm\s+offline)[^.]*\.?/gi, '').trim();
      if (!text) {
        text = "I'm here to help with your training! How can I assist you with your fitness goals today?";
      }
    }

    return text;
  },

  /**
   * Helper to verify if text violates truth rules
   */
  validateTruthCompliance(text) {
    if (!text || typeof text !== 'string') return { valid: true };
    const claimsProgramMutation = PROGRAM_MUTATION_PATTERNS.some(rx => rx.test(text));
    const claimsDietPrescription = DIET_PRESCRIPTION_PATTERNS.some(rx => rx.test(text));
    const mentionsOfflineAI = /\b(?:ollama\s+is\s+(?:down|offline)|ai\s+is\s+offline)\b/i.test(text);

    return {
      valid: !claimsProgramMutation && !claimsDietPrescription && !mentionsOfflineAI,
      claimsProgramMutation,
      claimsDietPrescription,
      mentionsOfflineAI
    };
  }
};

export default aiCoachTruthGuard;
