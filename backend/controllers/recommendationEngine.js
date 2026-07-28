import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dataset = [];
let dietPlans = [];
let progressions = [];

try {
  const datasetPath = path.join(__dirname, '../data/dataset.json');
  const plansPath = path.join(__dirname, '../data/plans.json');
  const progressionPath = path.join(__dirname, '../data/progression.json');
  const d = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  const p = JSON.parse(fs.readFileSync(plansPath, 'utf-8'));
  const prog = JSON.parse(fs.readFileSync(progressionPath, 'utf-8'));
  dataset = d['LLM_7_Step_Dataset'] || [];
  dietPlans = p['Diet_Plans_Food'] || [];
  progressions = prog['2_Daily_Weekly_Sets_Reps'] || [];
} catch (e) {
  console.error("Error loading GymSync data:", e.message);
}

export const generatePlan = async (req, res) => {
  try {
    const bio = req.body || {};

    // PHASE 1: SMART INTAKE & BENCHMARKS
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

    const intake_status = 'COMPLETE';

    // PHASE 2: MEDICAL SAFETY HARD FILTERS (ZERO TOLERANCE)
    const safeExercises = dataset.filter(ex => {
      // Medical Avoid If
      if (ex.Step_6_Medical_Avoid_If && bio.medicalConditions) {
        for (const cond of bio.medicalConditions) {
          if (String(ex.Step_6_Medical_Avoid_If).toLowerCase().includes(String(cond).toLowerCase())) return false;
        }
      }
      // Joint Pain Avoid If
      if (ex.Step_6_Joint_Pain_Avoid_If && bio.jointPain) {
        for (const pain of bio.jointPain) {
          if (String(ex.Step_6_Joint_Pain_Avoid_If).toLowerCase().includes(String(pain).toLowerCase())) return false;
        }
      }
      return true;
    });

    // Equipment & Goal Alignment
    let goalExercises = safeExercises;
    if (equipmentAccess.toLowerCase() === 'bodyweight only' || equipmentAccess.toLowerCase() === 'no equipment') {
      goalExercises = safeExercises.filter(ex => {
        const eq = String(ex.Equipment_Required || '').toLowerCase();
        return eq.includes('bodyweight') || eq.includes('none') || eq === '';
      });
    }

    if (bio.goals && bio.goals.length > 0) {
      const filtered = goalExercises.filter(ex => {
        return bio.goals.some(g => {
          const match = (ex.Step_1_Primary_Paths || '') + ' ' + (ex.Step_3_Weight_Goal_Strategy || '');
          const subGoal = (g.subs && g.subs.length > 0) ? g.subs[0] : (g.category || g);
          return match.toLowerCase().includes(String(subGoal).toLowerCase());
        });
      });
      if (filtered.length >= 6) goalExercises = filtered;
    }

    if (goalExercises.length < 6) goalExercises = safeExercises;

    // Base reps benchmark calculation
    const baseReps = user_benchmarks.calculatedBaseReps;

    // Build 4 Microcycle weekly splits
    const buildWorkoutSet = (multiplierSets = 1, multiplierReps = 1, rpeLabel = 'RPE 7') => {
      return {
        pushDay: goalExercises.slice(0, 4).map(ex => ({
          id: ex.Exercise_ID,
          name: ex.Exercise_Name,
          target: ex.Step_5_Target_Muscles,
          equipment: ex.Equipment_Required || 'Bodyweight',
          sets: Math.max(2, Math.round(3 * multiplierSets)),
          reps: Math.max(5, Math.round(baseReps * multiplierReps)),
          rpe: rpeLabel
        })),
        pullDay: goalExercises.slice(4, 8).map(ex => ({
          id: ex.Exercise_ID,
          name: ex.Exercise_Name,
          target: ex.Step_5_Target_Muscles,
          equipment: ex.Equipment_Required || 'Bodyweight',
          sets: Math.max(2, Math.round(3 * multiplierSets)),
          reps: Math.max(5, Math.round(baseReps * multiplierReps)),
          rpe: rpeLabel
        })),
        legDay: goalExercises.slice(8, 12).length >= 2 ? goalExercises.slice(8, 12).map(ex => ({
          id: ex.Exercise_ID,
          name: ex.Exercise_Name,
          target: ex.Step_5_Target_Muscles,
          equipment: ex.Equipment_Required || 'Bodyweight',
          sets: Math.max(2, Math.round(3 * multiplierSets)),
          reps: Math.max(5, Math.round(baseReps * multiplierReps)),
          rpe: rpeLabel
        })) : goalExercises.slice(0, 4).map(ex => ({
          id: ex.Exercise_ID,
          name: ex.Exercise_Name,
          target: ex.Step_5_Target_Muscles,
          equipment: ex.Equipment_Required || 'Bodyweight',
          sets: Math.max(2, Math.round(3 * multiplierSets)),
          reps: Math.max(5, Math.round(baseReps * multiplierReps)),
          rpe: rpeLabel
        }))
      };
    };

    const microcycles = {
      week1: { phase: 'Week 1 (Base Load)', split: buildWorkoutSet(1.0, 1.0, 'RPE 7') },
      week2: { phase: 'Week 2 (Progressive Overload)', split: buildWorkoutSet(1.0, 1.25, 'RPE 8') },
      week3: { phase: 'Week 3 (Peak Volume)', split: buildWorkoutSet(1.33, 1.25, 'RPE 9') },
      week4: { phase: 'Week 4 (Deload & Recovery)', split: buildWorkoutSet(0.67, 0.8, 'RPE 6') }
    };

    // PHASE 3: INTERACTIVE 30-DAY CALENDAR GENERATION
    const interactive_calendar = [];
    const workoutDaysPerWeekMap = {
      2: [1, 4],
      3: [1, 3, 5],
      4: [1, 2, 4, 5],
      5: [1, 2, 3, 4, 5],
      6: [1, 2, 3, 4, 5, 6]
    };
    const activeDaysInWeek = workoutDaysPerWeekMap[trainingDaysPerWeek] || workoutDaysPerWeekMap[3];

    const focusAreas = ['Push & Core Focus', 'Pull & Upper Focus', 'Legs & Mobility Focus'];

    for (let day = 1; day <= 28; day++) {
      const weekNum = Math.ceil(day / 7);
      const dayOfWeek = ((day - 1) % 7) + 1;
      const isWorkoutDay = activeDaysInWeek.includes(dayOfWeek);
      const workoutIndexInWeek = activeDaysInWeek.indexOf(dayOfWeek);
      const focusArea = isWorkoutDay ? focusAreas[workoutIndexInWeek % focusAreas.length] : 'Rest & Recovery';

      let currentMicro = microcycles.week1;
      if (weekNum === 2) currentMicro = microcycles.week2;
      if (weekNum === 3) currentMicro = microcycles.week3;
      if (weekNum === 4) currentMicro = microcycles.week4;

      let dayWorkoutSplit = 'Rest & Recovery';
      if (isWorkoutDay) {
        if (workoutIndexInWeek === 0) dayWorkoutSplit = currentMicro.split.pushDay;
        else if (workoutIndexInWeek === 1) dayWorkoutSplit = currentMicro.split.pullDay;
        else dayWorkoutSplit = currentMicro.split.legDay;
      }

      interactive_calendar.push({
        dayNumber: day,
        weekNumber: weekNum,
        phaseName: currentMicro.phase,
        isWorkoutDay,
        focusArea,
        workoutSplit: dayWorkoutSplit
      });
    }

    // Natural Whole Food Diet Protocol
    let planGoal = "Weight Loss & Fat Burn";
    if (bio.goals && bio.goals.length > 0) {
      const g = bio.goals[0];
      planGoal = (g.subs && g.subs.length > 0) ? g.subs[0] : (g.category || g || "Weight Loss & Fat Burn");
    }
    const dietForGoal = dietPlans.filter(d => (d.Goal || '').toLowerCase().includes(String(planGoal).toLowerCase()));

    const daily_diet_plan = dietForGoal.length > 0 ? dietForGoal.map(d => ({
      meal: d['Meal Time'],
      food: d['Food Options (Khana kya hai)'],
      macros: d['Macro Focus'],
      supplement_rule: d['Supplement Rule (No Pills/Injections)'] || '100% Whole Food Natural'
    })) : [
      { meal: "Breakfast", food: "3 Boiled Eggs (1 whole, 2 whites) + 1 Slice Bran Bread + Green Tea", macros: "Low Calorie, High Protein", supplement_rule: "Strictly Natural Food" },
      { meal: "Mid-Day Snack", food: "1 Apple or Handful of Almonds (10-12) or Cucumber slices", macros: "Fiber & Micronutrients", supplement_rule: "100% Whole Food Natural" },
      { meal: "Lunch", food: "Grilled Chicken Breast (150g) + 1/2 cup Brown Rice + Fresh Salad", macros: "Moderate Carbs, High Protein", supplement_rule: "100% Whole Food Natural" },
      { meal: "Pre-Workout", food: "1 Banana + Black Coffee (No Sugar)", macros: "Quick Glycogen", supplement_rule: "100% Whole Food Natural" },
      { meal: "Post-Workout", food: "Whey Protein Scoop (IF user agrees) OR 4 Egg Whites", macros: "Fast Recovery", supplement_rule: "Protein Powder (Optional)" },
      { meal: "Dinner", food: "Baked Fish/Chicken (150g) + Sautéed Vegetables (Broccoli, Carrots)", macros: "Zero Starch, High Protein", supplement_rule: "100% Whole Food Natural" }
    ];

    const finalPlan = {
      intake_status,
      user_benchmarks,
      interactive_calendar,
      daily_diet_plan,
      daily_workout_split: microcycles.week1.split,
      medical_warnings: [
        "Always consult a physician before starting any diet or workout.",
        ...(bio.jointPain || []).map(p => `Avoid high-impact exercises stressing the ${p}.`),
        ...(bio.medicalConditions || []).map(m => `Strictly follow limitations for ${m}.`)
      ]
    };

    return res.status(200).json(finalPlan);
  } catch (error) {
    console.error("Generate Plan Error:", error);
    res.status(500).json({ error: "Failed to generate plan." });
  }
};
