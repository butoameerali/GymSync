/**
 * programOutcomeEvaluator.js
 *
 * Post-Program AI Outcome & Performance Evaluation Engine.
 *
 * Evaluates completed workout programs using trainee debrief input,
 * factual session completion logs, and local Ollama LLM (with silent deterministic fallback).
 *
 * Output:
 *  - Success Score % (0-100)
 *  - Outcome Category (goal_achieved, near_target, needs_refinement, low_impact)
 *  - Key Wins & Strengths
 *  - Areas for Improvement
 *  - Trainer Feedback Notes (to improve program design)
 *  - Actionable Next Phase Recommendations
 */

import ollamaCoachService from './ollamaCoachService.js';

export const evaluateProgramOutcome = async ({ userProgram, userFeedback = {} }) => {
  const title = userProgram.title || 'Workout Routine';
  const goal = userProgram.goal || 'General Fitness';
  const difficulty = userProgram.difficulty || 'Intermediate';
  const durationWeeks = Number(userProgram.durationWeeks) || 4;
  const completedSessions = userProgram.progress?.completedSessions || [];
  const completedCount = completedSessions.length;

  // Calculate total workout days
  const totalWorkoutDays = (userProgram.weeks || []).reduce(
    (acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length, 0
  ) || (durationWeeks * (userProgram.daysPerWeek || 4));

  const totalCaloriesBurned = completedSessions.reduce(
    (sum, s) => sum + (Number(s.caloriesBurned) || 0), 0
  );

  const adherenceRate = totalWorkoutDays > 0
    ? Math.min(100, Math.round((completedCount / totalWorkoutDays) * 100))
    : 100;

  // Extract user feedback
  const goalSatisfaction = String(userFeedback.goalSatisfaction || 'near_target').toLowerCase();
  const metricOutcome = String(userFeedback.metricOutcome || '').trim();
  const difficultyRating = Number(userFeedback.difficultyRating) || 6;
  const feltResults = String(userFeedback.feltResults || '').trim();
  const favoriteMovements = Array.isArray(userFeedback.favoriteMovements) ? userFeedback.favoriteMovements : [];
  const struggledMovements = Array.isArray(userFeedback.struggledMovements) ? userFeedback.struggledMovements : [];
  const notes = String(userFeedback.notes || '').trim();

  // 1. Calculate deterministic baseline score
  let satisfactionBase = 75;
  if (goalSatisfaction.includes('full') || goalSatisfaction.includes('100') || goalSatisfaction.includes('yes') || goalSatisfaction.includes('pura')) {
    satisfactionBase = 95;
  } else if (goalSatisfaction.includes('near') || goalSatisfaction.includes('mostly') || goalSatisfaction.includes('theek') || goalSatisfaction.includes('asspass tha thek')) {
    satisfactionBase = 80;
  } else if (goalSatisfaction.includes('partial') || goalSatisfaction.includes('asspass tha lakin theek nahi') || goalSatisfaction.includes('refine')) {
    satisfactionBase = 58;
  } else if (goalSatisfaction.includes('not') || goalSatisfaction.includes('nahi') || goalSatisfaction.includes('failed')) {
    satisfactionBase = 35;
  }

  // Adjust for difficulty perception (extreme 10/10 or 1/10 without match gives slight penalty)
  let diffBonus = 0;
  if (difficultyRating >= 6 && difficultyRating <= 8) diffBonus = 3; // Sweet spot of progressive overload

  const deterministicScore = Math.max(15, Math.min(100, Math.round(
    (adherenceRate * 0.4) + (satisfactionBase * 0.55) + diffBonus
  )));

  const getCategoryInfo = (score) => {
    if (score >= 85) {
      return {
        category: 'goal_achieved',
        label: 'Goal Fully Achieved (Zabardast Kaam Hua!)',
        effectiveness: 'Highly Effective'
      };
    }
    if (score >= 70) {
      return {
        category: 'near_target',
        label: 'Near Target (Theek tha, aas paas tha)',
        effectiveness: 'Solid & Effective with Minor Gaps'
      };
    }
    if (score >= 50) {
      return {
        category: 'needs_refinement',
        label: 'Needs Refinement (Aas paas tha lekin theek nahi)',
        effectiveness: 'Requires Routine / Recovery Tuning'
      };
    }
    return {
      category: 'low_impact',
      label: 'Incomplete Impact (Kaam pura nahi hua)',
      effectiveness: 'Low Impact / Needs Overhaul'
    };
  };

  const defaultCategory = getCategoryInfo(deterministicScore);

  // Default deterministic evaluation result
  const fallbackResult = {
    reviewedAt: new Date(),
    successScore: deterministicScore,
    outcomeCategory: defaultCategory.category,
    outcomeCategoryLabel: defaultCategory.label,
    userFeedback: {
      goalSatisfaction: userFeedback.goalSatisfaction || defaultCategory.label,
      metricOutcome: metricOutcome || 'Completed all scheduled program blocks.',
      difficultyRating,
      feltResults: feltResults || 'Consistent training completed across duration.',
      favoriteMovements,
      struggledMovements,
      notes
    },
    aiAnalysis: {
      summary: `You successfully finished ${completedCount} sessions of "${title}" targeting ${goal}. Based on your feedback and ${adherenceRate}% adherence, your progress sits at ${deterministicScore}% (${defaultCategory.label}).`,
      keyWins: [
        `Maintained ${adherenceRate}% workout consistency across ${durationWeeks} weeks.`,
        `Estimated ~${totalCaloriesBurned} kcal expended through structured resistance training.`,
        ...(favoriteMovements.length > 0 ? [`High biomechanical proficiency in ${favoriteMovements.join(', ')}.`] : [`Developed foundational movement patterns for ${goal}.`])
      ],
      areasForImprovement: [
        ...(struggledMovements.length > 0 ? [`Exercise fatigue observed on: ${struggledMovements.join(', ')}.`] : [`Target progressive overload increments more evenly across weeks.`]),
        difficultyRating > 8 ? 'High perceived fatigue: consider incorporating an active recovery / deload week.' : 'Gradually increase target reps or resistance to avoid early plateaus.'
      ],
      planEffectiveness: defaultCategory.effectiveness,
      trainerFeedbackNotes: `The program "${title}" demonstrated good training stimulus. For trainees rating difficulty ${difficultyRating}/10, recommend adding alternative accessory movements for ${struggledMovements.join(', ') || 'fatiguing muscle groups'}.`,
      nextPhaseRecommendations: [
        'Take a 3 to 5 day active recovery or deload phase before launching your next block.',
        'Increase primary compound weights by 2.5% to 5% based on your newly established strength baseline.',
        'Pair your next training cycle with structured protein and sleep tracking.'
      ]
    }
  };

  // 2. Try Ollama AI inference on local machine if available
  if (ollamaCoachService.isEnabled()) {
    try {
      const prompt = `You are the GymSync AI Performance Evaluator. A trainee has just completed a workout program.

PROGRAM DATA:
- Title: "${title}"
- Goal: "${goal}"
- Duration: ${durationWeeks} weeks (${totalWorkoutDays} planned workout sessions)
- Completed Sessions: ${completedCount} of ${totalWorkoutDays} (${adherenceRate}% adherence)
- Total Calories Burned: ~${totalCaloriesBurned} kcal

TRAINEE FEEDBACK:
- Goal Achievement Feedback: "${userFeedback.goalSatisfaction || 'near target'}"
- Reported Metric Results: "${metricOutcome || 'not specified'}"
- Perceived Difficulty (1-10): ${difficultyRating}/10
- Body Feel / Sensation: "${feltResults || 'felt good'}"
- Favorite Movements: ${favoriteMovements.join(', ') || 'none specified'}
- Difficult / Struggled Movements: ${struggledMovements.join(', ') || 'none specified'}
- Trainee Notes: "${notes || 'none'}"

TASK:
Analyze the results and return ONLY a valid JSON object with EXACTLY this structure:
{
  "successScore": number between 15 and 100,
  "outcomeCategory": "goal_achieved" | "near_target" | "needs_refinement" | "low_impact",
  "outcomeCategoryLabel": "Goal Fully Achieved (Zabardast Kaam Hua!)" | "Near Target (Theek tha, aas paas tha)" | "Needs Refinement (Aas paas tha lekin theek nahi)" | "Incomplete Impact (Kaam pura nahi hua)",
  "summary": "2-3 sentences evaluating the outcome and success percentage",
  "keyWins": ["win 1", "win 2", "win 3"],
  "areasForImprovement": ["area 1", "area 2"],
  "planEffectiveness": "Highly Effective" | "Solid & Effective with Minor Gaps" | "Requires Routine / Recovery Tuning",
  "trainerFeedbackNotes": "Constructive advice for the trainer who wrote this program to make it better",
  "nextPhaseRecommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

      const aiReply = await ollamaCoachService.reply({
        systemPrompt: 'You are an authoritative Sports Scientist evaluating workout program results. Respond with valid JSON only. Do not prescribe diets.',
        message: prompt,
        timeoutMs: 15000
      });

      if (aiReply) {
        const jsonMatch = aiReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && typeof parsed.successScore === 'number') {
            const finalScore = Math.max(10, Math.min(100, Math.round(parsed.successScore)));
            const cat = getCategoryInfo(finalScore);

            return {
              reviewedAt: new Date(),
              successScore: finalScore,
              outcomeCategory: parsed.outcomeCategory || cat.category,
              outcomeCategoryLabel: parsed.outcomeCategoryLabel || cat.label,
              userFeedback: {
                goalSatisfaction: userFeedback.goalSatisfaction || cat.label,
                metricOutcome: metricOutcome || 'Completed all scheduled program blocks.',
                difficultyRating,
                feltResults,
                favoriteMovements,
                struggledMovements,
                notes
              },
              aiAnalysis: {
                summary: parsed.summary || fallbackResult.aiAnalysis.summary,
                keyWins: Array.isArray(parsed.keyWins) && parsed.keyWins.length > 0 ? parsed.keyWins : fallbackResult.aiAnalysis.keyWins,
                areasForImprovement: Array.isArray(parsed.areasForImprovement) && parsed.areasForImprovement.length > 0 ? parsed.areasForImprovement : fallbackResult.aiAnalysis.areasForImprovement,
                planEffectiveness: parsed.planEffectiveness || cat.effectiveness,
                trainerFeedbackNotes: parsed.trainerFeedbackNotes || fallbackResult.aiAnalysis.trainerFeedbackNotes,
                nextPhaseRecommendations: Array.isArray(parsed.nextPhaseRecommendations) && parsed.nextPhaseRecommendations.length > 0 ? parsed.nextPhaseRecommendations : fallbackResult.aiAnalysis.nextPhaseRecommendations
              }
            };
          }
        }
      }
    } catch (err) {
      console.warn('Ollama outcome evaluation error, using deterministic fallback:', err.message);
    }
  }

  return fallbackResult;
};

export default evaluateProgramOutcome;
