import PreMadePlan from '../models/PreMadePlan.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import UserDietPlan from '../models/UserDietPlan.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import WeightLossEnrollment from '../models/WeightLossEnrollment.js';
import WorkoutProgress from '../models/WorkoutProgress.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { estimateExerciseCalories } from '../services/workout/exerciseRegistry.js';
import { paginateQuery } from '../utils/pagination.js';
import { apiCache } from '../utils/cache.js';
import { safeRegex, safeExactRegex } from '../utils/validation.js';
import { programGate } from '../services/workout/programGate.js';
import { evaluateProgramOutcome } from '../services/ai/programOutcomeEvaluator.js';
import { expandTemplateWeeks } from '../services/weightLoss/weightLossTemplates.js';

// Seed starter data with structured weeks & meals if database is fresh
const INITIAL_PLANS = [
  {
    title: '4-Week Hypertrophy Mass Split',
    type: 'Workout',
    category: 'Muscle Building',
    goal: 'Hypertrophy',
    difficulty: 'Intermediate',
    durationWeeks: 4,
    daysPerWeek: 4,
    targetAudience: 'Intermediate lifters wanting muscle mass',
    sportTags: ['Bodybuilding', 'Strength'],
    equipmentRequired: ['Barbell', 'Dumbbells', 'Cables'],
    status: 'published',
    version: 1,
    description: '4-day upper/lower hypertrophy program focusing on mechanical tension and progressive overload.',
    createdBy: 'Fitness Instructor',
    weeks: [
      {
        weekNumber: 1,
        focus: 'Base Hypertrophy Accumulation',
        days: [
          {
            dayNumber: 1,
            title: 'Upper Body Power & Tension',
            focus: 'Chest, Back, Shoulders',
            warmup: [{ text: 'Shoulder dislocates & band pull-aparts', duration: 5 }],
            exercises: [
              { exerciseId: 'bench-press', name: 'Barbell Bench Press', order: 1, sets: 4, reps: '8-10', restSeconds: 90, rpe: 8, intensity: 'High', notes: 'Touch mid-sternum, control descent' },
              { exerciseId: 'bent-over-row', name: 'Bent Over Barbell Row', order: 2, sets: 4, reps: '8-10', restSeconds: 90, rpe: 8, intensity: 'High', notes: 'Hinge at hips, pull elbows back' },
              { exerciseId: 'overhead-press', name: 'Standing Overhead Press', order: 3, sets: 3, reps: '10-12', restSeconds: 60, rpe: 7, intensity: 'Moderate', notes: 'Keep core tight' }
            ],
            cooldown: [{ text: 'Pec stretch & lat hang', duration: 5 }],
            notes: 'Rest 90s on heavy compounds'
          },
          {
            dayNumber: 2,
            title: 'Lower Body Strength',
            focus: 'Quads, Hamstrings, Calves',
            warmup: [{ text: 'Hip flexor stretch & bodyweight squats', duration: 5 }],
            exercises: [
              { exerciseId: 'barbell-squat', name: 'Barbell Back Squat', order: 1, sets: 4, reps: '8', restSeconds: 120, rpe: 8, intensity: 'High', notes: 'Break at knees and hips together' },
              { exerciseId: 'romanian-deadlift', name: 'Romanian Deadlift', order: 2, sets: 3, reps: '10', restSeconds: 90, rpe: 7, intensity: 'Moderate', notes: 'Feel deep hamstring stretch' }
            ],
            cooldown: [{ text: 'Hamstring & quad stretch', duration: 5 }],
            notes: 'Ensure proper foot tripod'
          }
        ]
      }
    ]
  },
  {
    title: 'High-Protein Clean Bulk Plan',
    type: 'Diet',
    category: 'Muscle Gain',
    goal: 'Muscle Gain',
    calories: 2800,
    protein: 200,
    carbs: 320,
    fat: 75,
    dietaryType: 'High-Protein',
    status: 'published',
    version: 1,
    description: 'Nutrient-dense macro distribution targeting 2,800 kcal with 200g protein for lean hypertrophy.',
    createdBy: 'Fitness Instructor',
    meals: [
      {
        mealType: 'Breakfast',
        name: 'Power Oatmeal & Eggs',
        timing: '08:00 AM',
        foodItems: [
          { name: 'Rolled Oats', quantity: 100, unit: 'g', calories: 380, protein: 13, carbs: 68, fat: 7 },
          { name: 'Whole Eggs', quantity: 3, unit: 'items', calories: 215, protein: 18, carbs: 2, fat: 15 },
          { name: 'Whey Protein Scoop', quantity: 30, unit: 'g', calories: 120, protein: 24, carbs: 2, fat: 1.5 }
        ],
        substitutions: ['Egg whites instead of whole eggs', 'Greek yogurt instead of whey']
      },
      {
        mealType: 'Lunch',
        name: 'Grilled Chicken, Jasmine Rice & Veggies',
        timing: '01:00 PM',
        foodItems: [
          { name: 'Chicken Breast', quantity: 200, unit: 'g', calories: 330, protein: 62, carbs: 0, fat: 7 },
          { name: 'Cooked Jasmine Rice', quantity: 250, unit: 'g', calories: 325, protein: 6, carbs: 70, fat: 1 },
          { name: 'Olive Oil Drizzle', quantity: 10, unit: 'ml', calories: 88, protein: 0, carbs: 0, fat: 10 }
        ],
        substitutions: ['Lean ground beef', 'Sweet potatoes instead of rice']
      },
      {
        mealType: 'Dinner',
        name: 'Salmon & Steamed Potatoes',
        timing: '07:30 PM',
        foodItems: [
          { name: 'Atlantic Salmon Fillet', quantity: 180, unit: 'g', calories: 370, protein: 36, carbs: 0, fat: 23 },
          { name: 'Boiled Potatoes', quantity: 250, unit: 'g', calories: 215, protein: 5, carbs: 48, fat: 0.2 }
        ],
        substitutions: ['Tilapia + avocado', 'Quinoa instead of potatoes']
      }
    ]
  }
];

// GET /api/plans/premade
export const getPreMadePlans = async (req, res) => {
  try {
    const { type, status, goal, difficulty, dietaryType, search, cursor, page, limit = 12, paginate, myPlans } = req.query;
    let query = {};

    if (type) {
      query.type = { $regex: new RegExp(`^${type}$`, 'i') };
    }

    // Role-based visibility: Normal users & unauthenticated callers only get published content
    const userRole = req.user?.role;
    const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);

    if (status && status !== 'all' && isStaff) {
      query.status = status;
    } else if (!isStaff) {
      query.status = 'published';
    }

    if (myPlans === 'true' && req.user?._id) {
      query.createdById = req.user._id;
    }

    const andConditions = [];

    if (goal && goal !== 'All') {
      const gRegex = safeRegex(goal);
      if (gRegex) {
        andConditions.push({
          $or: [
            { goal: gRegex },
            { category: gRegex }
          ]
        });
      }
    }

    if (difficulty && difficulty !== 'All') {
      query.difficulty = difficulty;
    }

    if (dietaryType && dietaryType !== 'All') {
      if (dietaryType.toLowerCase().includes('keto') || dietaryType.toLowerCase().includes('low-carb')) {
        query.dietaryType = /keto|low-carb/i;
      } else {
        const dRegex = safeExactRegex(dietaryType);
        if (dRegex) query.dietaryType = dRegex;
      }
    }

    if (search && search.trim()) {
      const sRegex = safeRegex(search.trim());
      if (sRegex) {
        andConditions.push({
          $or: [
            { title: sRegex },
            { description: sRegex },
            { sportTags: sRegex }
          ]
        });
      }
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Cache key for non-search public queries
    const shouldCache = !search && (!req.user || req.user.role === 'User');
    const cacheKey = `plans:${type || 'all'}:${query.status || 'all'}:${goal || 'all'}:${difficulty || 'all'}:${dietaryType || 'all'}:${cursor || page || '0'}:${limit}`;

    if (shouldCache) {
      const cached = await apiCache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }
    }

    // Lightweight projection for list cards (omits heavy nested week/exercise matrices)
    const cardProjection = '_id title type category goal difficulty durationWeeks daysPerWeek description createdBy createdById authorRole status sportTags equipmentRequired version calories protein carbs fat dietaryType allergies createdAt updatedAt equipmentTrack programLevel isExtremeProgram minBMI maxBMI minWeightKg maxWeightKg whoCanDo whoShouldNotDo medicalWarningRequired medicalWarningText missedDayPolicy cardioPrescription expectedLossMonth1';

    // Check if client requested pagination or provided cursor/page
    const isPaginated = paginate === 'true' || Boolean(cursor) || Boolean(page);

    if (isPaginated) {
      const paginatedResult = await paginateQuery(PreMadePlan, query, {
        cursor,
        page,
        limit: Number(limit) || 12,
        cursorField: '_id',
        direction: -1,
        select: cardProjection
      });

      if (shouldCache) {
        await apiCache.set(cacheKey, paginatedResult, 300);
      }
      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(paginatedResult);
    }

    // Legacy unpaginated fallback
    let plans = await PreMadePlan.find(query).select(cardProjection).sort({ createdAt: -1 });

    // Seed if collection is completely empty
    if (plans.length === 0 && !type && !search) {
      try {
        const count = await PreMadePlan.countDocuments();
        if (count === 0) {
          plans = await PreMadePlan.insertMany(INITIAL_PLANS);
        }
      } catch (e) {
        console.warn('Initial seed error:', e.message);
      }
    }

    if (shouldCache) {
      await apiCache.set(cacheKey, plans, 300);
    }
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(plans);
  } catch (error) {
    if (error.name === 'InvalidCursorError' || error.statusCode === 400) {
      return res.status(400).json({ error: 'Invalid cursor', message: 'The provided pagination cursor is invalid or malformed.' });
    }
    console.error('getPreMadePlans Error:', error);
    res.status(500).json({ error: 'Failed to fetch pre-made plans', message: 'An internal error occurred while fetching pre-made plans.' });
  }
};


// GET /api/plans/premade/:id
export const getPreMadePlanById = async (req, res) => {
  try {
    const plan = await PreMadePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const planObj = plan.toObject();
    if (planObj.type === 'Workout' && planObj.weeks && planObj.weeks.length < (planObj.durationWeeks || 4)) {
      planObj.weeks = expandTemplateWeeks(planObj.weeks, planObj.durationWeeks || 4);
    }
    res.status(200).json(planObj);
  } catch (error) {
    console.error('getPreMadePlanById Error:', error);
    res.status(500).json({ error: 'Failed to fetch plan', message: 'An internal error occurred while fetching the plan.' });
  }
};


// POST /api/plans/premade
export const createPreMadePlan = async (req, res) => {
  try {
    const {
      title,
      type,
      category,
      description,
      goal,
      difficulty,
      durationWeeks,
      daysPerWeek,
      targetAudience,
      sportTags,
      equipmentRequired,
      fitnessGoals,
      status,
      weeks,
      calories,
      protein,
      carbs,
      fat,
      dietaryType,
      allergies,
      dietaryRestrictions,
      meals,
      details,
      tags,
      connectedDietPlanId,
      connectedDietPlanTitle,
      equipmentTrack,
      programLevel,
      isExtremeProgram,
      minAge,
      maxAge,
      minBMI,
      maxBMI,
      minWeightKg,
      maxWeightKg,
      whoCanDo,
      whoShouldNotDo,
      medicalWarningRequired,
      medicalWarningText,
      missedDayPolicy,
      cardioPrescription,
      expectedLossMonth1
    } = req.body;

    const createdBy = req.user?.name || 'Fitness Instructor';
    const createdById = req.user?._id;

    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const newPlan = await PreMadePlan.create({
      title: title.trim(),
      type,
      category: category || 'General Fitness',
      description: description || '',
      goal: goal || category || 'General Fitness',
      difficulty: difficulty || 'Beginner',
      durationWeeks: Number(durationWeeks) || 4,
      daysPerWeek: Number(daysPerWeek) || 4,
      targetAudience: targetAudience || 'All athletes',
      equipmentTrack: equipmentTrack || 'Home (No Equipment)',
      programLevel: programLevel || 'Starter',
      isExtremeProgram: Boolean(isExtremeProgram),
      minAge: minAge !== undefined ? Number(minAge) : 18,
      maxAge: maxAge !== undefined ? Number(maxAge) : 65,
      minBMI: minBMI !== undefined ? Number(minBMI) : 23,
      maxBMI: maxBMI !== undefined ? Number(maxBMI) : 50,
      minWeightKg: minWeightKg !== undefined ? Number(minWeightKg) : 50,
      maxWeightKg: maxWeightKg !== undefined ? Number(maxWeightKg) : 180,
      whoCanDo: Array.isArray(whoCanDo) ? whoCanDo : (whoCanDo ? [whoCanDo] : []),
      whoShouldNotDo: Array.isArray(whoShouldNotDo) ? whoShouldNotDo : (whoShouldNotDo ? [whoShouldNotDo] : []),
      medicalWarningRequired: medicalWarningRequired !== undefined ? Boolean(medicalWarningRequired) : true,
      medicalWarningText: medicalWarningText || 'Do NOT start without doctor approval if you have heart disease, BP issues, diabetes, asthma, joint/back injury, or take regular medication.',
      missedDayPolicy: missedDayPolicy || {
        rule1To3Days: 'Never double up. Missed 1 to 3 days, carry on.',
        rule4To7Days: 'Missed 4 to 7 days, repeat the week.',
        ruleMoreThan7Days: 'Missed more than 7 days, restart week 1.'
      },
      cardioPrescription: cardioPrescription || {
        hasWalking: true,
        hasRunning: false,
        description: 'Daily Walk + Saturday Long Walk',
        dailyMinutes: 20,
        saturdayMinutes: 35,
        intervalRounds: 0,
        effortRPE: 'RPE 5 - 6'
      },
      expectedLossMonth1: expectedLossMonth1 || {
        minKg: 1.0,
        maxKg: 3.5,
        note: 'Planning band: 0.25% to 0.75% body weight/week, hard cap 1%/week. Depends on food, sleep, consistency and health.'
      },
      sportTags: Array.isArray(sportTags) ? sportTags : [],
      equipmentRequired: Array.isArray(equipmentRequired) ? equipmentRequired : [],
      fitnessGoals: Array.isArray(fitnessGoals) ? fitnessGoals : [],
      status: ['Admin', 'SuperAdmin'].includes(req.user?.role)
        ? (status || 'published')
        : (status === 'draft' ? 'draft' : 'pending_review'),
      version: 1,
      weeks: Array.isArray(weeks) ? weeks : [],
      calories: Number(calories) || 2000,
      protein: Number(protein) || 150,
      carbs: Number(carbs) || 200,
      fat: Number(fat) || 65,
      dietaryType: dietaryType || 'Balanced',
      allergies: Array.isArray(allergies) ? allergies : [],
      dietaryRestrictions: Array.isArray(dietaryRestrictions) ? dietaryRestrictions : [],
      meals: Array.isArray(meals) ? meals : [],
      details: details || {},
      tags: Array.isArray(tags) ? tags : [],
      connectedDietPlanId: connectedDietPlanId || null,
      connectedDietPlanTitle: connectedDietPlanTitle || '',
      createdBy,
      createdById,
      authorRole: req.user?.role || 'FitnessInstructor'
    });

    apiCache.invalidatePattern('plans:*');
    res.status(201).json(newPlan);
  } catch (error) {
    console.error('createPreMadePlan Error:', error);
    res.status(500).json({ error: 'Failed to create pre-made plan', message: 'An internal error occurred while creating the pre-made plan.' });
  }
};

// PUT /api/plans/premade/:id
export const updatePreMadePlan = async (req, res) => {
  try {
    const plan = await PreMadePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Authorization check
    const isOwner = plan.createdById && req.user?._id && plan.createdById.toString() === req.user._id.toString();
    const isAuthor = plan.createdBy === req.user?.name;
    const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

    if (!isOwner && !isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this plan' });
    }

    const previousStatus = plan.status;
    const updates = req.body;

    // Increment version if updating an already published plan with new weeks/meals
    if (plan.status === 'published' && (updates.weeks || updates.meals)) {
      plan.version = (plan.version || 1) + 1;
    }

    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'createdBy') {
        plan[key] = updates[key];
      }
    });

    await plan.save();

    // If an administrator just approved and published an instructor program, notify the instructor
    if (isAdmin && previousStatus === 'pending_review' && plan.status === 'published' && plan.createdById) {
      try {
        await Notification.create({
          recipient: plan.createdById,
          sender: req.user?._id,
          type: 'general',
          title: 'Program Approved & Published! 🎉',
          message: `Your program "${plan.title}" has been reviewed, approved, and is now live for all GymSync trainees!`,
          link: '/programs'
        });
      } catch (notifErr) {
        console.warn('Failed to send program approval notification:', notifErr.message);
      }
    }

    apiCache.invalidatePattern('plans:*');
    res.status(200).json(plan);
  } catch (error) {
    console.error('updatePreMadePlan Error:', error);
    res.status(500).json({ error: 'Failed to update plan', message: 'An internal error occurred while updating the plan.' });
  }
};

// DELETE /api/plans/premade/:id
export const deletePreMadePlan = async (req, res) => {
  try {
    const plan = await PreMadePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const isOwner = plan.createdById && req.user?._id && plan.createdById.toString() === req.user._id.toString();
    const isAuthor = plan.createdBy === req.user?.name;
    const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

    if (!isOwner && !isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this plan' });
    }

    await plan.deleteOne();
    apiCache.invalidatePattern('plans:*');
    res.status(200).json({ message: 'Pre-made plan deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('deletePreMadePlan Error:', error);
    res.status(500).json({ error: 'Failed to delete pre-made plan', message: 'An internal error occurred while deleting the pre-made plan.' });
  }
};


// POST /api/plans/premade/:id/apply — Trainee applies instructor program to their routine
export const applyProgramToUser = async (req, res) => {
  try {
    const programId = req.params.id;
    const userId = req.user?._id;
    const userName = req.user?.name;

    if (!userId || !userName) {
      return res.status(401).json({ error: 'User must be authenticated to apply a program' });
    }

    const program = await PreMadePlan.findById(programId);
    if (!program || program.type !== 'Workout') {
      return res.status(404).json({ error: 'Workout program not found' });
    }

    if (program.status !== 'published') {
      return res.status(400).json({ error: 'Cannot apply an unpublished or draft program' });
    }

    // Enforce R3: Exactly ONE active program per user until finished or removed
    const gate = await programGate.canJoin(userId);
    if (!gate.canJoin) {
      // Check if user is already enrolled in this exact program
      if (
        gate.activeProgram &&
        (String(gate.activeProgram.sourceProgramId) === String(program._id) ||
         String(gate.activeProgram.id) === String(program._id))
      ) {
        return res.status(200).json({
          message: 'You are already enrolled in this program.',
          alreadyEnrolled: true,
          userProgram: gate.activeProgram
        });
      }

      return res.status(409).json({
        error: `You already have an active program ('${gate.activeProgram?.title || 'Current Program'}'). You cannot enroll in another program until it is finished or removed.`,
        message: `You already have an active program ('${gate.activeProgram?.title || 'Current Program'}'). You cannot enroll in another program until it is finished or removed.`,
        activeProgram: gate.activeProgram
      });
    }

    // Prepare weeks snapshot, dynamically expanding to match durationWeeks if trainer created repeating cycles
    let finalWeeks = Array.isArray(program.weeks) && program.weeks.length > 0 ? JSON.parse(JSON.stringify(program.weeks)) : [];
    const targetDurationWeeks = Number(program.durationWeeks) || (finalWeeks.length > 0 ? finalWeeks.length : 4);

    if (finalWeeks.length > 0 && finalWeeks.length < targetDurationWeeks) {
      const templateWeeks = [...finalWeeks];
      while (finalWeeks.length < targetDurationWeeks) {
        const nextWeekIndex = finalWeeks.length;
        const sourceWeek = templateWeeks[nextWeekIndex % templateWeeks.length];
        const newWeekNumber = nextWeekIndex + 1;
        const clonedWeek = {
          ...JSON.parse(JSON.stringify(sourceWeek)),
          weekNumber: newWeekNumber,
          focus: sourceWeek.focus ? `${sourceWeek.focus} (Progression Week ${newWeekNumber})` : `Week ${newWeekNumber} Progression`
        };
        finalWeeks.push(clonedWeek);
      }
    }

    // Deactivate previous active programs (preserves them as completed history)
    await UserWorkoutProgram.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
    await SavedAIPlan.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
    await WeightLossEnrollment.updateMany(
      { userId, isActive: true },
      { isActive: false, status: 'Replaced' }
    );

    // Create user-specific instance (preserves snapshot of weeks at current version)
    const userProgram = await UserWorkoutProgram.create({
      userId,
      userName,
      sourceProgramId: program._id,
      programVersion: program.version || 1,
      title: program.title,
      goal: program.goal || program.category,
      difficulty: program.difficulty,
      durationWeeks: targetDurationWeeks,
      daysPerWeek: program.daysPerWeek || 4,
      instructorName: program.createdBy || 'Fitness Instructor',
      equipmentTrack: program.equipmentTrack || 'Home (No Equipment)',
      programLevel: program.programLevel || 'Starter',
      isExtremeProgram: program.isExtremeProgram || false,
      missedDayPolicy: program.missedDayPolicy || undefined,
      cardioPrescription: program.cardioPrescription || undefined,
      weeks: finalWeeks,
      startDate: new Date(),
      isActive: true,
      progress: {
        currentWeek: 1,
        currentDay: 1,
        completedSessions: []
      }
    });

    // Automatically activate connected diet plan if linked by trainer
    let connectedDiet = null;
    if (program.connectedDietPlanId) {
      try {
        const diet = await PreMadePlan.findById(program.connectedDietPlanId);
        if (diet && ['Diet', 'diet'].includes(diet.type)) {
          await UserDietPlan.updateMany({ userId, isActive: true }, { isActive: false });
          connectedDiet = await UserDietPlan.create({
            userId,
            userName,
            sourceDietId: diet._id,
            dietVersion: diet.version || 1,
            title: diet.title,
            goal: diet.goal || diet.category,
            dietaryType: diet.dietaryType || 'Balanced',
            calories: diet.calories || 2000,
            protein: diet.protein || 150,
            carbs: diet.carbs || 200,
            fat: diet.fat || 65,
            allergies: diet.allergies || [],
            instructorName: diet.createdBy || 'Fitness Instructor',
            meals: diet.meals || [],
            startDate: new Date(),
            isActive: true,
            adherenceLogs: []
          });
        }
      } catch (dietErr) {
        console.warn('Failed to auto-apply connected diet:', dietErr);
      }
    }

    res.status(201).json({
      message: `Successfully applied "${program.title}" to your routine!${connectedDiet ? ` Connected diet "${connectedDiet.title}" has also been activated.` : ''}`,
      userProgram,
      connectedDiet
    });
  } catch (error) {
    console.error('applyProgramToUser Error:', error);
    res.status(500).json({ error: 'Failed to apply program to user routine', message: 'An internal error occurred while applying the program.' });
  }
};

// GET /api/plans/user-programs/active — Retrieve user's active applied routine
export const getUserActiveProgram = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userName = req.user?.name;

    if (!userId && !userName) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const activeProgram = await UserWorkoutProgram.findOne({
      $or: [{ userId }, { userName }],
      isActive: true,
      isCompleted: { $ne: true }
    }).sort({ createdAt: -1 });

    if (activeProgram && activeProgram.durationWeeks > (activeProgram.weeks || []).length && (activeProgram.weeks || []).length > 0) {
      const templateWeeks = [...activeProgram.weeks];
      const targetDurationWeeks = activeProgram.durationWeeks;
      while (activeProgram.weeks.length < targetDurationWeeks) {
        const nextWeekIndex = activeProgram.weeks.length;
        const sourceWeek = templateWeeks[nextWeekIndex % templateWeeks.length];
        const newWeekNumber = nextWeekIndex + 1;
        const clonedWeek = {
          ...JSON.parse(JSON.stringify(sourceWeek)),
          weekNumber: newWeekNumber,
          focus: sourceWeek.focus ? `${sourceWeek.focus} (Progression Week ${newWeekNumber})` : `Week ${newWeekNumber} Progression`
        };
        activeProgram.weeks.push(clonedWeek);
      }
      const totalSessions = activeProgram.weeks.reduce((acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length, 0);
      const doneSessions = (activeProgram.progress?.completedSessions || []).length;
      if (doneSessions < totalSessions) {
        activeProgram.isCompleted = false;
      }
      await activeProgram.save();
    }

    res.status(200).json(activeProgram || null);
  } catch (error) {
    console.error('getUserActiveProgram Error:', error);
    res.status(500).json({ error: 'Failed to fetch active program', message: 'An internal error occurred while fetching the active program.' });
  }
};

// POST /api/plans/user-programs/:id/progress — Log completed workout session in user's program
export const logUserProgramProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { weekNumber, dayNumber, exerciseLogs = [] } = req.body;
    const userId = req.user?._id;
    const userName = req.user?.name;

    const userProgram = await UserWorkoutProgram.findById(id);
    if (!userProgram) {
      return res.status(404).json({ error: 'User program not found' });
    }

    if (userProgram.userId.toString() !== userId.toString() && userProgram.userName !== userName) {
      return res.status(403).json({ error: 'Not authorized to log progress on this program' });
    }

    // Expand weeks if durationWeeks > weeks.length so user can progress through all weeks
    if (userProgram.durationWeeks > (userProgram.weeks || []).length && (userProgram.weeks || []).length > 0) {
      const templateWeeks = [...userProgram.weeks];
      const targetDurationWeeks = userProgram.durationWeeks;
      while (userProgram.weeks.length < targetDurationWeeks) {
        const nextWeekIndex = userProgram.weeks.length;
        const sourceWeek = templateWeeks[nextWeekIndex % templateWeeks.length];
        const newWeekNumber = nextWeekIndex + 1;
        const clonedWeek = {
          ...JSON.parse(JSON.stringify(sourceWeek)),
          weekNumber: newWeekNumber,
          focus: sourceWeek.focus ? `${sourceWeek.focus} (Progression Week ${newWeekNumber})` : `Week ${newWeekNumber} Progression`
        };
        userProgram.weeks.push(clonedWeek);
      }
    }

    const requestedWeek = Number(weekNumber);
    const requestedDay = Number(dayNumber);

    if (!requestedWeek || !requestedDay || requestedWeek < 1 || requestedDay < 1) {
      return res.status(400).json({ error: 'Invalid weekNumber or dayNumber provided' });
    }

    // Retrieve authoritative user bodyweight for ACSM calorie calculation
    let bodyweightKg = req.user?.bioData?.weight;
    if (!bodyweightKg && userId) {
      const userRecord = await User.findById(userId).select('bioData.weight').lean();
      bodyweightKg = userRecord?.bioData?.weight;
    }
    bodyweightKg = Number(bodyweightKg) > 0 ? Number(bodyweightKg) : 70;

    // Helper: Calculate calories for an exercise log item with duration and bodyweight fallbacks
    const calculateLogCalories = (log, defaultDuration = 10) => {
      const rawDuration = Number(log.durationMinutes || log.duration);
      const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : defaultDuration;
      return estimateExerciseCalories(log.name || log.exerciseId, duration, bodyweightKg);
    };

    // 1. Idempotency Check: Avoid double logging and prevent duplicate streak/points
    const completedList = userProgram.progress.completedSessions || [];
    const alreadyCompletedIndex = completedList.findIndex(
      s => s.weekNumber === requestedWeek && s.dayNumber === requestedDay
    );

    if (alreadyCompletedIndex !== -1) {
      if (exerciseLogs && exerciseLogs.length > 0) {
        const totalSessionMinutes = Number(req.body.durationMinutes) || (exerciseLogs.length * 10) || 45;
        const defaultDuration = Math.max(5, Math.round(totalSessionMinutes / exerciseLogs.length));
        const updatedLogs = exerciseLogs.map(log => ({
          ...log,
          caloriesBurned: Number(log.caloriesBurned) > 0
            ? Number(log.caloriesBurned)
            : calculateLogCalories(log, defaultDuration)
        }));
        userProgram.progress.completedSessions[alreadyCompletedIndex].exerciseLogs = updatedLogs;
        userProgram.progress.completedSessions[alreadyCompletedIndex].caloriesBurned = updatedLogs.reduce(
          (sum, l) => sum + (Number(l.caloriesBurned) || 0), 0
        );
        await userProgram.save();
      }
      return res.status(200).json({
        ...userProgram.toObject(),
        message: `Session Week ${requestedWeek} Day ${requestedDay} was already completed. Exercise logs updated idempotently.`,
        alreadyCompleted: true,
        progress: userProgram.progress
      });
    }

    // 2. Server-side Progression Validation (Anti-cheating)
    // Trainee cannot arbitrarily jump ahead into the future
    const isSessionDone = (wNum, dNum) => {
      return (userProgram.progress.completedSessions || []).some(
        s => Number(s.weekNumber) === Number(wNum) && Number(s.dayNumber) === Number(dNum)
      );
    };

    let effectiveCurrentWeek = 1;
    let effectiveCurrentDay = 1;
    let foundFirstIncomplete = false;

    for (const w of (userProgram.weeks || [])) {
      const workoutDays = (w.days || []).filter(d => !d.isRestDay);
      for (const d of workoutDays) {
        if (!isSessionDone(w.weekNumber, d.dayNumber)) {
          effectiveCurrentWeek = w.weekNumber;
          effectiveCurrentDay = d.dayNumber;
          foundFirstIncomplete = true;
          break;
        }
      }
      if (foundFirstIncomplete) break;
    }

    if (!foundFirstIncomplete && (userProgram.weeks || []).length > 0) {
      effectiveCurrentWeek = userProgram.durationWeeks || userProgram.weeks.length;
      effectiveCurrentDay = 999;
    }

    if (requestedWeek > effectiveCurrentWeek || (requestedWeek === effectiveCurrentWeek && requestedDay > effectiveCurrentDay)) {
      return res.status(400).json({
        error: `Cannot skip ahead! You must complete Week ${effectiveCurrentWeek}, Day ${effectiveCurrentDay} before attempting future sessions.`
      });
    }

    // Resolve exercises from program schedule if not explicitly provided in request
    const targetWeek = (userProgram.weeks || []).find(w => w.weekNumber === requestedWeek);
    const targetDay = (targetWeek?.days || []).find(d => d.dayNumber === requestedDay);
    let finalExerciseLogs = Array.isArray(exerciseLogs) && exerciseLogs.length > 0 ? [...exerciseLogs] : [];

    if (finalExerciseLogs.length === 0 && targetDay?.exercises?.length > 0) {
      const totalSessionMinutes = Number(req.body.durationMinutes) || 45;
      const durationPerEx = Math.max(5, Math.round(totalSessionMinutes / targetDay.exercises.length));
      finalExerciseLogs = targetDay.exercises.map(ex => {
        const exId = ex.exerciseId?._id || ex.exerciseId || ex.name || 'EX-GEN';
        const exName = ex.exerciseId?.name || ex.name || 'Exercise';
        const duration = Number(ex.duration) || durationPerEx;
        return {
          exerciseId: String(exId),
          name: exName,
          completedSets: Number(ex.sets) || 3,
          reps: String(ex.reps || '10'),
          weightKg: 0,
          caloriesBurned: estimateExerciseCalories(exName || exId, duration, bodyweightKg),
          notes: ''
        };
      });
    } else {
      const totalSessionMinutes = Number(req.body.durationMinutes) || (finalExerciseLogs.length * 10) || 45;
      const defaultDuration = Math.max(5, Math.round(totalSessionMinutes / (finalExerciseLogs.length || 1)));
      finalExerciseLogs = finalExerciseLogs.map(log => ({
        ...log,
        caloriesBurned: Number(log.caloriesBurned) > 0
          ? Number(log.caloriesBurned)
          : calculateLogCalories(log, defaultDuration)
      }));
    }

    const sessionCaloriesBurned = finalExerciseLogs.reduce((sum, item) => sum + (Number(item.caloriesBurned) || 0), 0);

    // 3. Add session to completed sessions
    userProgram.progress.completedSessions.push({
      weekNumber: requestedWeek,
      dayNumber: requestedDay,
      completedAt: new Date(),
      caloriesBurned: sessionCaloriesBurned,
      exerciseLogs: finalExerciseLogs
    });

    // 4. Advance current day & week pointers to next uncompleted session
    const updatedCompletedSessions = userProgram.progress.completedSessions;
    let nextIncompleteWeek = 1;
    let nextIncompleteDay = 1;
    let allFinished = true;

    for (const w of (userProgram.weeks || [])) {
      const workoutDays = (w.days || []).filter(d => !d.isRestDay);
      for (const d of workoutDays) {
        const isDone = updatedCompletedSessions.some(
          s => Number(s.weekNumber) === Number(w.weekNumber) && Number(s.dayNumber) === Number(d.dayNumber)
        );
        if (!isDone) {
          nextIncompleteWeek = w.weekNumber;
          nextIncompleteDay = d.dayNumber;
          allFinished = false;
          break;
        }
      }
      if (!allFinished) break;
    }

    if (allFinished && (userProgram.weeks || []).length >= (userProgram.durationWeeks || 1)) {
      userProgram.isCompleted = true;
      userProgram.isActive = false;
      userProgram.progress.currentWeek = userProgram.weeks?.length || userProgram.durationWeeks || 1;
      userProgram.progress.currentDay = 1;

      // Also mark any connected weight loss enrollment as completed
      await WeightLossEnrollment.updateMany(
        { userId, userWorkoutProgramId: userProgram._id },
        { $set: { status: 'Completed', isActive: false } }
      ).catch(() => {});

      // Trigger review notification if not already reviewed and not disabled
      if (!userProgram.outcomeReport && !userProgram.reviewRemindersDisabled) {
        try {
          const existingNotif = await Notification.findOne({
            userId,
            type: 'program_review',
            relatedId: String(userProgram._id),
            isDismissed: { $ne: true }
          });
          if (!existingNotif) {
            await Notification.create({
              userId,
              type: 'program_review',
              title: '🎉 Program Completed: Share Your AI Review',
              message: `Congratulations on finishing "${userProgram.title}"! Tell your AI Coach how it went to generate your official performance report.`,
              link: `/ai-trainer?reviewProgramId=${userProgram._id}`,
              relatedId: String(userProgram._id),
              sender: 'GymSync AI Coach'
            });
          }
        } catch (notifErr) {
          console.warn('Could not create program_review notification:', notifErr.message);
        }
      }
    } else {
      userProgram.isCompleted = false;
      userProgram.progress.currentWeek = nextIncompleteWeek;
      userProgram.progress.currentDay = nextIncompleteDay;
    }

    await userProgram.save();

    // 5. Calendar-based streak calculation and points award
    let streakIncremented = false;
    const pointsAwarded = 50;

    try {
      let prog = await WorkoutProgress.findOne({ userId: userName });
      if (!prog) {
        prog = new WorkoutProgress({ userId: userName, streak: 0, totalPoints: 0 });
      }

      const now = new Date();
      const lastCompletion = prog.lastWorkoutCompletionTime ? new Date(prog.lastWorkoutCompletionTime) : null;

      if (!lastCompletion) {
        prog.streak = 1;
        streakIncremented = true;
      } else {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfLast = new Date(lastCompletion.getFullYear(), lastCompletion.getMonth(), lastCompletion.getDate()).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((startOfToday - startOfLast) / oneDayMs);

        if (diffDays === 0) {
          // Completed an additional workout session on the same day: Keep streak intact
          streakIncremented = false;
        } else if (diffDays === 1) {
          // Consecutive calendar day: Increment streak
          prog.streak = (prog.streak || 0) + 1;
          streakIncremented = true;
        } else {
          // Missed 1 or more full calendar days: Reset streak to 1
          prog.streak = 1;
          streakIncremented = true;
        }
      }

      prog.totalPoints = (prog.totalPoints || 0) + pointsAwarded;
      prog.lastWorkoutCompletionTime = now;
      await prog.save();
    } catch (pe) {
      console.warn('Sync WorkoutProgress error:', pe.message);
    }

    res.status(200).json({
      ...userProgram.toObject(),
      message: 'Workout session completed & logged!',
      streakIncremented,
      progress: userProgram.progress
    });
  } catch (error) {
    console.error('logUserProgramProgress Error:', error);
    res.status(500).json({ error: 'Failed to log program progress', message: 'An internal error occurred while logging program progress.' });
  }
};

// POST /api/plans/premade/:id/apply-diet — Trainee applies instructor diet template to their active routine
export const applyDietToUser = async (req, res) => {
  try {
    const dietId = req.params.id;
    const userId = req.user?._id;
    const userName = req.user?.name;

    if (!userId || !userName) {
      return res.status(401).json({ error: 'User must be authenticated to apply a diet template' });
    }

    const diet = await PreMadePlan.findById(dietId);
    if (!diet || !['Diet', 'diet'].includes(diet.type)) {
      return res.status(404).json({ error: 'Diet template not found' });
    }

    if (diet.status !== 'published') {
      return res.status(400).json({ error: 'Cannot apply an unpublished diet template' });
    }

    // Deactivate previous active diet templates for this user
    await UserDietPlan.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Create user-specific instance (preserves snapshot of meals at current version)
    const userDiet = await UserDietPlan.create({
      userId,
      userName,
      sourceDietId: diet._id,
      dietVersion: diet.version || 1,
      title: diet.title,
      goal: diet.goal || diet.category,
      dietaryType: diet.dietaryType || 'Balanced',
      calories: diet.calories || 2000,
      protein: diet.protein || 150,
      carbs: diet.carbs || 200,
      fat: diet.fat || 65,
      allergies: diet.allergies || [],
      instructorName: diet.createdBy || 'Fitness Instructor',
      meals: diet.meals || [],
      startDate: new Date(),
      isActive: true,
      adherenceLogs: []
    });

    res.status(201).json({
      message: `Successfully adopted "${diet.title}" into your nutrition routine!`,
      userDiet
    });
  } catch (error) {
    console.error('applyDietToUser Error:', error);
    res.status(500).json({ error: 'Failed to apply diet template', message: 'An internal error occurred while applying the diet template.' });
  }
};

// GET /api/plans/user-diets/active — Retrieve user's active applied diet template
export const getUserActiveDiet = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userName = req.user?.name;

    if (!userId && !userName) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const activeDiet = await UserDietPlan.findOne({
      $or: [{ userId }, { userName }],
      isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json(activeDiet || null);
  } catch (error) {
    console.error('getUserActiveDiet Error:', error);
    res.status(500).json({ error: 'Failed to fetch active diet', message: 'An internal error occurred while fetching the active diet.' });
  }
};

// POST /api/plans/user-diets/:id/meal-log — Log meal consumption adherence against adopted template
export const logUserDietMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { mealName, mealType, caloriesConsumed, adherenceNote } = req.body;
    const userId = req.user?._id;
    const userName = req.user?.name;

    const userDiet = await UserDietPlan.findById(id);
    if (!userDiet) {
      return res.status(404).json({ error: 'User diet plan not found' });
    }

    if (userDiet.userId.toString() !== userId.toString() && userDiet.userName !== userName) {
      return res.status(403).json({ error: 'Not authorized to log meals on this diet plan' });
    }

    userDiet.adherenceLogs.push({
      date: new Date(),
      loggedMealName: mealName || 'Scheduled Meal',
      loggedMealType: mealType || 'Meal',
      caloriesConsumed: Number(caloriesConsumed) || 0,
      adherenceNote: adherenceNote || ''
    });

    await userDiet.save();

    res.status(200).json({
      message: 'Meal adherence logged successfully!',
      adherenceLogs: userDiet.adherenceLogs
    });
  } catch (error) {
    console.error('logUserDietMeal Error:', error);
    res.status(500).json({ error: 'Failed to log diet meal adherence', message: 'An internal error occurred while logging meal adherence.' });
  }
};

// DELETE /api/plans/user-programs/:id — Unenroll/Delete user's applied program
export const deleteUserProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userName = req.user?.name;

    if (!userId && !userName) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const userProgram = await UserWorkoutProgram.findById(id);
    if (!userProgram) {
      return res.status(404).json({ error: 'User program not found' });
    }

    if (
      userProgram.userId &&
      userId &&
      userProgram.userId.toString() !== userId.toString() &&
      userProgram.userName !== userName
    ) {
      return res.status(403).json({ error: 'Not authorized to delete this program' });
    }

    await UserWorkoutProgram.findByIdAndDelete(id);
    await WeightLossEnrollment.updateMany(
      { $or: [{ userId }, { userName }], userWorkoutProgramId: id },
      { $set: { isActive: false, status: 'Cancelled' } }
    ).catch(() => {});
    res.status(200).json({ message: 'Program successfully un-enrolled and removed' });
  } catch (error) {
    console.error('deleteUserProgram Error:', error);
    res.status(500).json({ error: 'Failed to delete user program', message: 'An internal error occurred.' });
  }
};

// POST /api/plans/user-programs/:id/review — AI Outcome Evaluation & Debrief
export const reviewUserProgramOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userName = req.user?.name;

    if (!userId && !userName) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const userProgram = await UserWorkoutProgram.findById(id);
    if (!userProgram) {
      return res.status(404).json({ error: 'User program not found' });
    }

    if (
      userProgram.userId &&
      userId &&
      userProgram.userId.toString() !== userId.toString() &&
      userProgram.userName !== userName
    ) {
      return res.status(403).json({ error: 'Not authorized to review this program' });
    }

    const outcomeReport = await evaluateProgramOutcome({
      userProgram,
      userFeedback: req.body || {}
    });

    userProgram.outcomeReport = outcomeReport;
    await userProgram.save();

    res.status(200).json({
      message: 'Program outcome reviewed & evaluated successfully',
      outcomeReport,
      userProgram
    });
  } catch (error) {
    console.error('reviewUserProgramOutcome Error:', error);
    res.status(500).json({ error: 'Failed to evaluate program outcome' });
  }
};

// GET /api/plans/user-programs/:id/review — Retrieve existing outcome report
export const getUserProgramReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userProgram = await UserWorkoutProgram.findById(id).select('title goal durationWeeks outcomeReport isCompleted');
    if (!userProgram) {
      return res.status(404).json({ error: 'User program not found' });
    }
    res.status(200).json(userProgram.outcomeReport || null);
  } catch (error) {
    console.error('getUserProgramReview Error:', error);
    res.status(500).json({ error: 'Failed to fetch review report' });
  }
};

// GET /api/plans/user-programs — Retrieve all programs for user (active + completed history)
export const getUserPrograms = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userName = req.user?.name;

    if (!userId && !userName) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const programs = await UserWorkoutProgram.find({
      $or: [{ userId }, { userName }]
    }).sort({ createdAt: -1 });

    // Enforce Rule R3: Only 1 active program at a time, plus completed history
    const seenActive = new Set();
    const cleanedPrograms = [];

    for (const prog of (programs || [])) {
      const totalWorkoutDays = (prog.weeks || []).reduce(
        (acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length,
        0
      );
      const completedSessionsCount = (prog.progress?.completedSessions || []).length;
      const isFullyCompleted = Boolean(
        prog.isCompleted ||
        (totalWorkoutDays > 0 && completedSessionsCount >= totalWorkoutDays)
      );

      if (isFullyCompleted) {
        // Fully completed programs belong in workout history
        cleanedPrograms.push(prog);
      } else if (prog.isActive) {
        // Enforce exactly ONE active program
        if (seenActive.size === 0) {
          seenActive.add(prog._id.toString());
          cleanedPrograms.push(prog);
        } else {
          // Extra active program found! Deactivate it in DB
          await UserWorkoutProgram.findByIdAndUpdate(prog._id, { isActive: false }).catch(() => {});
        }
      }
      // Stale / abandoned programs that are neither completed nor active are excluded
    }

    res.status(200).json(cleanedPrograms);
  } catch (error) {
    console.error('getUserPrograms Error:', error);
    res.status(500).json({ error: 'Failed to fetch user programs' });
  }
};


