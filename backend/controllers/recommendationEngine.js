import workoutDecisionEngine from '../services/workout/workoutDecisionEngine.js';
import dietBuilder from '../services/nutrition/dietBuilder.js';
import dietValidator from '../services/nutrition/dietValidator.js';
import exerciseLibrary from '../models/Exercise.js';
import sportProfileEngine from '../services/workout/sportProfileEngine.js';
import { computeMissingBioFields } from '../services/ai/intentClassifier.js';
import planMergeEngine from '../services/ai/planMergeEngine.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import GoalGroup from '../models/GoalGroup.js';

/**
 * AI Plan Generation Controller
 * Builds the comprehensive 28-day interactive periodized calendar,
 * reasoned daily workout splits, and mathematically consistent nutrition protocols.
 */

export const generatePlan = async (req, res) => {
  try {
    const bio = req.body || {};

    const missingFields = computeMissingBioFields(bio);
    const needsMiniCoach = missingFields.length > 0 || !bio.mainGoalArea || !bio.planDuration || !bio.trainingDaysPerWeek;

    if (needsMiniCoach) {
      const steps = [];
      if (!bio.mainGoalArea) {
        steps.push({ key: 'mainGoalArea', label: 'What is your goal?', kind: 'single_select', options: ['Lose Weight', 'Build Muscle', 'Gain Strength', 'Improve Stamina', 'Sports Performance', 'General Fitness'], prefillValue: null, isPrefilled: false });
      }
      if (!bio.planDuration) {
        steps.push({ key: 'planDuration', label: 'Plan Duration', kind: 'single_select', options: ['4 Weeks', '8 Weeks', '12 Weeks'], prefillValue: '4 Weeks', isPrefilled: true });
      }
      if (!bio.trainingDaysPerWeek) {
        steps.push({ key: 'trainingDaysPerWeek', label: 'Smart Intake & Stamina', kind: 'single_select', options: [2, 3, 4, 5, 6], prefillValue: 3, isPrefilled: true });
      }
      if (missingFields.length > 0) {
        steps.push({ key: 'missingBioFields', label: 'Health & Fitness Bio', kind: 'form', fields: missingFields });
      }
      
      return res.status(200).json({
        structuredAction: {
          type: 'mini_coach_interview',
          steps,
          currentStepIndex: 0
        }
      });
    }

    // PHASE 4: MULTI-GOAL DETECTION & PLAN MERGE ENGINE
    if (req.user && !bio.mergeDecision) {
      const existingPlan = await planMergeEngine.detectExistingActivePlan(req.user._id, SavedAIPlan);
      
      if (existingPlan && existingPlan.goal !== bio.mainGoalArea) {
        return res.status(200).json({
          structuredAction: {
            type: 'merge_offer',
            existingPlanTitle: existingPlan.title,
            existingGoal: existingPlan.goal,
            newGoal: bio.mainGoalArea,
            options: ['Merge Plans', 'Keep Separate', 'Cancel Old Plan']
          }
        });
      }
    }
    
    let effectiveGoal = bio.mainGoalArea || 'General Fitness';
    if (req.user && bio.mergeDecision === 'Merge Plans') {
      const existingPlan = await planMergeEngine.detectExistingActivePlan(req.user._id, SavedAIPlan);
      if (existingPlan) {
         const mergeRes = await planMergeEngine.mergePlans({ existingPlan, newGoalRequest: bio });
         effectiveGoal = mergeRes.combinedGoal;
         existingPlan.isActive = false;
         await existingPlan.save();
      }
    } else if (req.user && bio.mergeDecision === 'Cancel Old Plan') {
      const existingPlan = await planMergeEngine.detectExistingActivePlan(req.user._id, SavedAIPlan);
      if (existingPlan) {
         existingPlan.isActive = false;
         await existingPlan.save();
      }
    }

    // 1. INTAKE & BENCHMARKS
    const trainingDaysPerWeek = parseInt(bio.trainingDaysPerWeek || bio.daysPerWeek || 3, 10);
    const sessionDurationMins = parseInt(bio.sessionDurationMins || bio.sessionDuration || 45, 10);
    const equipmentAccess = bio.equipmentAccess || bio.equipment || 'Full Gym';
    const pushupBaseline = parseInt(bio.pushupBaseline || bio.pushupsBaseline || 10, 10);

    const user_benchmarks = {
      trainingDaysPerWeek,
      sessionDurationMins,
      equipmentAccess,
      pushupBaseline,
      calculatedBaseReps: Math.max(5, Math.min(25, pushupBaseline)),
      staminaLevel: pushupBaseline >= 15 ? 'Advanced' : pushupBaseline >= 8 ? 'Intermediate' : 'Beginner'
    };

    const sport = sportProfileEngine.detectSport(bio);

    // 2. BUILD PERIODIZED 4-WEEK MICROCICLES (Base -> Overload -> Peak -> Deload)
    const phases = [
      { week: 1, phaseKey: 'base', phaseName: 'Week 1 (Base Load & Adaptation)' },
      { week: 2, phaseKey: 'overload', phaseName: 'Week 2 (Progressive Overload & Density)' },
      { week: 3, phaseKey: 'peak', phaseName: 'Week 3 (Peak Volume & Intensity)' },
      { week: 4, phaseKey: 'deload', phaseName: 'Week 4 (Deload & Neurological Recovery)' }
    ];

    // Days allocation map
    const workoutDaysPerWeekMap = {
      2: [1, 4],
      3: [1, 3, 5],
      4: [1, 2, 4, 5],
      5: [1, 2, 3, 4, 5],
      6: [1, 2, 3, 4, 5, 6]
    };
    const activeDaysInWeek = workoutDaysPerWeekMap[trainingDaysPerWeek] || workoutDaysPerWeekMap[3];

    // 3. GENERATE 28-DAY INTERACTIVE PERIODIZED CALENDAR
    const interactive_calendar = [];
    const medicalWarningsSet = new Set([
      'Always consult a physician before starting an intensive training or diet regimen.',
      ...(bio.jointPain || []).map(p => `Safety hard-filter active: exercises stressing the ${p} have been automatically screened out.`),
      ...(bio.medicalConditions || []).map(m => `Strict medical contraindications applied for ${m}.`)
    ]);

    // Cache template workouts for standard splits
    const pushSession = workoutDecisionEngine.generateSession({
      userProfile: { ...bio, sessionType: 'upper', mainGoalArea: bio.mainGoalArea || 'Push Focus' },
      microcyclePhase: 'base',
      dayNumber: 1
    });

    const pullSession = workoutDecisionEngine.generateSession({
      userProfile: { ...bio, sessionType: 'upper', mainGoalArea: bio.mainGoalArea || 'Pull Focus' },
      microcyclePhase: 'base',
      dayNumber: 2
    });

    const legSession = workoutDecisionEngine.generateSession({
      userProfile: { ...bio, sessionType: 'lower', mainGoalArea: bio.mainGoalArea || 'Leg Focus' },
      microcyclePhase: 'base',
      dayNumber: 3
    });

    for (let day = 1; day <= 28; day++) {
      const weekNum = Math.ceil(day / 7);
      const dayOfWeek = ((day - 1) % 7) + 1;
      const isWorkoutDay = activeDaysInWeek.includes(dayOfWeek);
      const workoutIndexInWeek = activeDaysInWeek.indexOf(dayOfWeek);
      const currentPhase = phases[weekNum - 1] || phases[0];

      if (!isWorkoutDay) {
        interactive_calendar.push({
          dayNumber: day,
          weekNumber: weekNum,
          phaseName: currentPhase.phaseName,
          isWorkoutDay: false,
          focusArea: 'Scheduled Rest & Recovery Day',
          workoutSplit: 'Scheduled Rest & Recovery Day',
          sessionObjective: 'Active recovery, parasympathetic downregulation, and tissue remodeling.',
          warmup: null,
          cooldown: null
        });
      } else {
        // Generate daily reasoned session
        const session = workoutDecisionEngine.generateSession({
          userProfile: bio,
          microcyclePhase: currentPhase.phaseKey,
          dayNumber: day
        });

        // Collect medical warnings from the engine
        if (session.medicalSafetyReview?.safetyWarnings) {
          session.medicalSafetyReview.safetyWarnings.forEach(w => medicalWarningsSet.add(w));
        }

        interactive_calendar.push({
          dayNumber: day,
          weekNumber: weekNum,
          phaseName: currentPhase.phaseName,
          isWorkoutDay: true,
          focusArea: session.sessionObjective,
          sessionObjective: session.sessionObjective,
          timeBudget: session.timeBudget,
          warmup: session.warmup,
          workoutSplit: session.mainWorkout,
          cooldown: session.cooldown
        });
      }
    }

    // 4. GENERATE MATHEMATICALLY VERIFIED NUTRITION PLAN
    const structuredDiet = dietBuilder.generateDietPlan({
      userProfile: bio,
      preferences: {
        isVegetarian: String(bio.foodPreferences || '').toLowerCase().includes('veg')
      }
    });

    const dietAudit = dietValidator.validateDiet(structuredDiet, bio);

    // Format daily_diet_plan for both rich UI and legacy compatibility
    const daily_diet_plan = structuredDiet.meals.map(m => ({
      meal: m.mealName,
      timing: m.timing,
      food: m.items.map(i => `${i.food} (${i.portion})`).join(' + '),
      calories: m.totalCalories,
      protein: m.totalProtein,
      carbs: m.totalCarbs,
      fat: m.totalFat,
      macros: `${m.totalCalories} kcal | ${m.totalProtein}g Protein | ${m.totalCarbs}g Carbs | ${m.totalFat}g Fat`,
      supplement_rule: '100% Whole Food Natural (No Unsafe Pills/Injections)'
    }));

    const finalPlan = {
      intake_status: 'COMPLETE',
      user_benchmarks,
      sport: sport.sportName,
      planDuration: bio.planDuration || '1 Month (28 Days)',
      interactive_calendar,
      daily_workout_split: {
        pushDay: pushSession.mainWorkout,
        pullDay: pullSession.mainWorkout,
        legDay: legSession.mainWorkout
      },
      structuredDiet,
      daily_diet_plan,
      dietAudit,
      medical_warnings: Array.from(medicalWarningsSet)
    };

    return res.status(200).json(finalPlan);

  } catch (error) {
    console.error('Generate Plan Error:', error);
    res.status(500).json({ error: 'Failed to generate reasoned plan.', message: 'An internal error occurred while generating the plan.' });
  }
};

export default { generatePlan };
