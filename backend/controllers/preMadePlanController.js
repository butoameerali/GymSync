import PreMadePlan from '../models/PreMadePlan.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import UserDietPlan from '../models/UserDietPlan.js';
import WorkoutProgress from '../models/WorkoutProgress.js';
import { paginateQuery } from '../utils/pagination.js';
import { apiCache } from '../utils/cache.js';

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
    const { type, status, goal, difficulty, dietaryType, search, cursor, page, limit = 12, paginate } = req.query;
    let query = {};

    if (type) {
      query.type = type;
    }

    // Role-based visibility: Normal users & unauthenticated callers only get published content
    const userRole = req.user?.role;
    const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);

    if (status && isStaff) {
      query.status = status;
    } else if (!isStaff) {
      query.status = 'published';
    }

    if (goal && goal !== 'All') {
      query.$or = [
        { goal: new RegExp(goal, 'i') },
        { category: new RegExp(goal, 'i') }
      ];
    }

    if (difficulty && difficulty !== 'All') {
      query.difficulty = difficulty;
    }

    if (dietaryType && dietaryType !== 'All') {
      if (dietaryType.toLowerCase().includes('keto') || dietaryType.toLowerCase().includes('low-carb')) {
        query.dietaryType = /keto|low-carb/i;
      } else {
        query.dietaryType = new RegExp(`^${dietaryType.trim()}$`, 'i');
      }
    }

    if (search && search.trim()) {
      const sRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: sRegex },
        { description: sRegex },
        { sportTags: sRegex }
      ];
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
    const cardProjection = '_id title type category goal difficulty durationWeeks daysPerWeek description createdBy createdById authorRole status sportTags equipmentRequired version calories protein carbs fat dietaryType allergies createdAt updatedAt';

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
      return res.status(400).json({ error: 'Invalid cursor', message: error.message });
    }
    console.error('getPreMadePlans Error:', error);
    res.status(500).json({ error: 'Failed to fetch pre-made plans', message: error.message });
  }
};


// GET /api/plans/premade/:id
export const getPreMadePlanById = async (req, res) => {
  try {
    const plan = await PreMadePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plan', message: error.message });
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
      tags
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
      sportTags: Array.isArray(sportTags) ? sportTags : [],
      equipmentRequired: Array.isArray(equipmentRequired) ? equipmentRequired : [],
      fitnessGoals: Array.isArray(fitnessGoals) ? fitnessGoals : [],
      status: status || 'published',
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
      createdBy,
      createdById,
      authorRole: req.user?.role || 'FitnessInstructor'
    });

    apiCache.invalidatePattern('plans:*');
    res.status(201).json(newPlan);
  } catch (error) {
    console.error('createPreMadePlan Error:', error);
    res.status(500).json({ error: 'Failed to create pre-made plan', message: error.message });
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
    apiCache.invalidatePattern('plans:*');
    res.status(200).json(plan);
  } catch (error) {
    console.error('updatePreMadePlan Error:', error);
    res.status(500).json({ error: 'Failed to update plan', message: error.message });
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
    res.status(500).json({ error: 'Failed to delete pre-made plan', message: error.message });
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

    // Deactivate previous active programs for this user
    await UserWorkoutProgram.updateMany(
      { userId, isActive: true },
      { isActive: false }
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
      durationWeeks: program.durationWeeks || 4,
      daysPerWeek: program.daysPerWeek || 4,
      instructorName: program.createdBy || 'Fitness Instructor',
      weeks: program.weeks || [],
      startDate: new Date(),
      isActive: true,
      progress: {
        currentWeek: 1,
        currentDay: 1,
        completedSessions: []
      }
    });

    res.status(201).json({
      message: `Successfully applied "${program.title}" to your routine!`,
      userProgram
    });
  } catch (error) {
    console.error('applyProgramToUser Error:', error);
    res.status(500).json({ error: 'Failed to apply program to user routine', message: error.message });
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
      isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json(activeProgram || null);
  } catch (error) {
    console.error('getUserActiveProgram Error:', error);
    res.status(500).json({ error: 'Failed to fetch active program', message: error.message });
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

    const requestedWeek = Number(weekNumber);
    const requestedDay = Number(dayNumber);

    if (!requestedWeek || !requestedDay || requestedWeek < 1 || requestedDay < 1) {
      return res.status(400).json({ error: 'Invalid weekNumber or dayNumber provided' });
    }

    // 1. Idempotency Check: Avoid double logging and prevent duplicate streak/points
    const completedList = userProgram.progress.completedSessions || [];
    const alreadyCompletedIndex = completedList.findIndex(
      s => s.weekNumber === requestedWeek && s.dayNumber === requestedDay
    );

    if (alreadyCompletedIndex !== -1) {
      if (exerciseLogs && exerciseLogs.length > 0) {
        userProgram.progress.completedSessions[alreadyCompletedIndex].exerciseLogs = exerciseLogs;
        await userProgram.save();
      }
      return res.status(200).json({
        message: `Session Week ${requestedWeek} Day ${requestedDay} was already completed. Exercise logs updated idempotently.`,
        alreadyCompleted: true,
        progress: userProgram.progress
      });
    }

    // 2. Server-side Progression Validation (Anti-cheating)
    // Trainee cannot arbitrarily jump ahead into the future
    const currentWeek = userProgram.progress.currentWeek || 1;
    const currentDay = userProgram.progress.currentDay || 1;

    if (requestedWeek > currentWeek || (requestedWeek === currentWeek && requestedDay > currentDay)) {
      return res.status(400).json({
        error: `Cannot skip ahead! You must complete Week ${currentWeek}, Day ${currentDay} before attempting future sessions.`
      });
    }

    // 3. Add session to completed sessions
    userProgram.progress.completedSessions.push({
      weekNumber: requestedWeek,
      dayNumber: requestedDay,
      completedAt: new Date(),
      exerciseLogs
    });

    // 4. Advance current day & week pointers
    let nextDay = currentDay + 1;
    let nextWeek = currentWeek;

    if (nextDay > userProgram.daysPerWeek) {
      nextDay = 1;
      nextWeek = Math.min(userProgram.durationWeeks, currentWeek + 1);
    }

    userProgram.progress.currentDay = nextDay;
    userProgram.progress.currentWeek = nextWeek;

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
      message: 'Workout session completed & logged!',
      streakIncremented,
      progress: userProgram.progress
    });
  } catch (error) {
    console.error('logUserProgramProgress Error:', error);
    res.status(500).json({ error: 'Failed to log program progress', message: error.message });
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
    res.status(500).json({ error: 'Failed to apply diet template', message: error.message });
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
    res.status(500).json({ error: 'Failed to fetch active diet', message: error.message });
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
    res.status(500).json({ error: 'Failed to log diet meal adherence', message: error.message });
  }
};

