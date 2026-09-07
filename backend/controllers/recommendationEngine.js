import workoutDecisionEngine from '../services/workout/workoutDecisionEngine.js';
import dietBuilder from '../services/nutrition/dietBuilder.js';
import dietValidator from '../services/nutrition/dietValidator.js';
import sportProfileEngine from '../services/workout/sportProfileEngine.js';

/**
 * AI Plan Generation Controller
 * Builds the comprehensive 28-day interactive periodized calendar,
 * reasoned daily workout splits, and mathematically consistent nutrition protocols.
 */

export const generatePlan = async (req, res) => {
  try {
    const bio = req.body || {};

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
    res.status(500).json({ error: 'Failed to generate reasoned plan.', message: error.message });
  }
};

export default { generatePlan };
