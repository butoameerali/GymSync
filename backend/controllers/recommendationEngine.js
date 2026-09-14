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

    const finalPlan = generatePlanObject(bio, { effectiveGoal });
    return res.status(200).json(finalPlan);

  } catch (error) {
    console.error('Generate Plan Error:', error);
    res.status(500).json({ error: 'Failed to generate reasoned plan.', message: 'An internal error occurred while generating the plan.' });
  }
};

/**
 * Parses user input duration string into structured weeks and days
 * Supports: '2 Weeks', '1 Month' (4 Weeks), '3 Months' (12 Weeks), '6 Months' (24 Weeks), '1 Year' (52 Weeks), or custom
 */
export const parsePlanDuration = (rawDuration) => {
  if (!rawDuration) return { totalWeeks: 4, totalDays: 28, label: '1 Month (4 Weeks)' };
  const str = String(rawDuration).toLowerCase().trim();
  if (/\b1\s*years?\b|one\s*year|\b52\s*weeks?\b|365\s*days?|yearly|annual/i.test(str)) {
    return { totalWeeks: 52, totalDays: 364, label: '1 Year (52 Weeks)' };
  }
  if (/\b6\s*months?\b|six\s*months?|\b24\s*weeks?\b|half\s*year/i.test(str)) {
    return { totalWeeks: 24, totalDays: 168, label: '6 Months (24 Weeks)' };
  }
  if (/\b3\s*months?\b|three\s*months?|\b12\s*weeks?\b|quarter/i.test(str)) {
    return { totalWeeks: 12, totalDays: 84, label: '3 Months (12 Weeks)' };
  }
  if (/\b1\s*months?\b|one\s*month|\b4\s*weeks?\b|\b28\s*days?\b|\b30\s*days?\b/i.test(str)) {
    return { totalWeeks: 4, totalDays: 28, label: '1 Month (4 Weeks)' };
  }
  if (/\b2\s*weeks?\b|two\s*weeks?|\b14\s*days?\b/i.test(str)) {
    return { totalWeeks: 2, totalDays: 14, label: '2 Weeks' };
  }
  const weekMatch = str.match(/(\d+)\s*weeks?/);
  if (weekMatch) {
    const w = Math.min(52, Math.max(1, parseInt(weekMatch[1], 10)));
    return { totalWeeks: w, totalDays: w * 7, label: `${w} Weeks` };
  }
  const monthMatch = str.match(/(\d+)\s*months?/);
  if (monthMatch) {
    const m = Math.min(12, Math.max(1, parseInt(monthMatch[1], 10)));
    return { totalWeeks: m * 4, totalDays: m * 28, label: `${m} Months` };
  }
  return { totalWeeks: 4, totalDays: 28, label: '1 Month (4 Weeks)' };
};

/**
 * Synchronously generates a full periodized plan object (benchmarks, calendar, splits, diet)
 */
export const generatePlanObject = (bio = {}, options = {}) => {
  const effectiveGoal = options.effectiveGoal || bio.mainGoalArea || bio.goal || 'General Fitness';

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

  // 2. PARSE FLEXIBLE DURATION
  const durationInfo = parsePlanDuration(bio.planDuration || bio.duration);
  const totalDays = durationInfo.totalDays;
  const totalWeeks = durationInfo.totalWeeks;

  // 3. PERIODIZATION PHASES (Base -> Overload -> Peak -> Deload cycle)
  const phaseCycle = [
    { key: 'base', name: 'Base Load & Adaptation' },
    { key: 'overload', name: 'Progressive Overload & Density' },
    { key: 'peak', name: 'Peak Volume & Intensity' },
    { key: 'deload', name: 'Deload & Neurological Recovery' }
  ];

  const workoutDaysPerWeekMap = {
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6]
  };
  const activeDaysInWeek = workoutDaysPerWeekMap[trainingDaysPerWeek] || workoutDaysPerWeekMap[3];

  const interactive_calendar = [];
  const medicalWarningsSet = new Set([
    'Always consult a physician before starting an intensive training or diet regimen.',
    ...(bio.jointPain || []).map(p => `Safety hard-filter active: exercises stressing the ${p} have been automatically screened out.`),
    ...(bio.medicalConditions || []).map(m => `Strict medical contraindications applied for ${m}.`)
  ]);

  // Session cache per phase to keep calendar generation instantaneous even for 52 weeks
  const sessionCache = {};
  const getCachedSession = (phaseKey, workoutIndex, dayNumber) => {
    const cacheKey = `${phaseKey}_${workoutIndex}`;
    if (!sessionCache[cacheKey]) {
      sessionCache[cacheKey] = workoutDecisionEngine.generateSession({
        userProfile: { ...bio, mainGoalArea: effectiveGoal },
        microcyclePhase: phaseKey,
        dayNumber
      });
    }
    return sessionCache[cacheKey];
  };

  // Sample templates for push/pull/leg display
  const pushSession = getCachedSession('base', 0, 1);
  const pullSession = getCachedSession('base', 1, 2);
  const legSession = getCachedSession('base', 2, 3);

  for (let day = 1; day <= totalDays; day++) {
    const weekNum = Math.ceil(day / 7);
    const dayOfWeek = ((day - 1) % 7) + 1;
    const isWorkoutDay = activeDaysInWeek.includes(dayOfWeek);
    const workoutIndexInWeek = activeDaysInWeek.indexOf(dayOfWeek);
    const phaseObj = phaseCycle[(weekNum - 1) % phaseCycle.length];
    const phaseName = `Week ${weekNum} (${phaseObj.name})`;

    if (!isWorkoutDay) {
      interactive_calendar.push({
        dayNumber: day,
        weekNumber: weekNum,
        phaseName,
        isWorkoutDay: false,
        focusArea: 'Scheduled Rest & Recovery Day',
        workoutSplit: 'Scheduled Rest & Recovery Day',
        sessionObjective: 'Active recovery, parasympathetic downregulation, and tissue remodeling.',
        warmup: null,
        cooldown: null
      });
    } else {
      const session = getCachedSession(phaseObj.key, workoutIndexInWeek, day);

      if (session.medicalSafetyReview?.safetyWarnings) {
        session.medicalSafetyReview.safetyWarnings.forEach(w => medicalWarningsSet.add(w));
      }

      interactive_calendar.push({
        dayNumber: day,
        weekNumber: weekNum,
        phaseName,
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
    userProfile: { ...bio, mainGoalArea: effectiveGoal },
    preferences: {
      isVegetarian: String(bio.foodPreferences || '').toLowerCase().includes('veg')
    }
  });

  const dietAudit = dietValidator.validateDiet(structuredDiet, bio);

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

  return {
    intake_status: 'COMPLETE',
    title: `${durationInfo.label} ${effectiveGoal} Program`,
    goal: effectiveGoal,
    user_benchmarks,
    sport: sport.sportName,
    planDuration: durationInfo.label,
    totalWeeks,
    totalDays,
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
};

export default { generatePlan, generatePlanObject, parsePlanDuration };
