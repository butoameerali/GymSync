import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PkFood from '../models/PkFood.js';
import FoodLog from '../models/FoodLog.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import ActivityLog from '../models/ActivityLog.js';
import { computeTodaysEnergy } from '../services/nutrition/dailyEnergyAggregator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedJsonFoods = null;
function getJsonFoods() {
  if (!cachedJsonFoods) {
    try {
      const p = path.resolve(__dirname, '../data/pkFoods.json');
      if (fs.existsSync(p)) {
        cachedJsonFoods = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (e) {
      console.warn('Could not read pkFoods.json fallback:', e);
      cachedJsonFoods = [];
    }
  }
  return cachedJsonFoods || [];
}

// Pakistani food categories with bilingual labels
export const FOOD_CATEGORIES = [
  { id: 'daal', label: 'Daal (Lentils & Pulses)', urdu: 'دالیں' },
  { id: 'sabzi', label: 'Sabzi (Vegetables)', urdu: 'سبزیاں' },
  { id: 'gosht', label: 'Gosht (Meat, Chicken & Fish)', urdu: 'گوشت و مرغی' },
  { id: 'chawal', label: 'Chawal (Rice & Biryani)', urdu: 'چاول' },
  { id: 'roti_paratha', label: 'Roti & Paratha (Breads)', urdu: 'روٹی و پراٹھا' },
  { id: 'nashta', label: 'Nashta (Breakfast Items)', urdu: 'روایتی ناشتہ' },
  { id: 'drinks', label: 'Drinks & Chai (Lassi, Sharbat, Tea)', urdu: 'مشروبات و چائے' },
  { id: 'sweets', label: 'Mithai & Desserts', urdu: 'مٹھائیاں' },
  { id: 'fast_food', label: 'Desi Fast Food (Burgers & Rolls)', urdu: 'فاسٹ فوڈ' },
  { id: 'snacks', label: 'Chaat & Snacks (Samosa, Pakora)', urdu: 'سیکس و چاٹ' },
  { id: 'bbq', label: 'BBQ & Kababs', urdu: 'تکہ کباب' },
  { id: 'chutney_raita', label: 'Raita & Chutney', urdu: 'رائتہ و چٹنی' }
];

/**
 * GET /api/foods/categories
 */
export const getCategories = async (req, res) => {
  try {
    return res.json({
      success: true,
      categories: FOOD_CATEGORIES
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

/**
 * GET /api/foods/search?q=biryani&category=chawal&limit=25
 */
export const searchFoods = async (req, res) => {
  try {
    const { q, category, tag, mealSlot, minProtein, maxCalories, limit = 50 } = req.query;
    const conditions = [];

    if (category && category !== 'all') {
      conditions.push({ category });
    }

    if (tag && tag !== 'all') {
      conditions.push({ tags: tag });
    }

    if (mealSlot && mealSlot !== 'all') {
      conditions.push({
        $or: [
          { mealSlots: mealSlot },
          { tags: mealSlot }
        ]
      });
    }

    if (minProtein) {
      conditions.push({ protein: { $gte: Number(minProtein) } });
    }

    if (maxCalories) {
      conditions.push({ calories: { $lte: Number(maxCalories) } });
    }

    if (q && q.trim()) {
      const trimmed = q.trim();
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      conditions.push({
        $or: [
          { simpleName: regex },
          { name: regex },
          { baseName: regex },
          { 'aliases.romanUrdu': regex },
          { 'aliases.urdu': regex },
          { mainIngredients: regex },
          { tags: regex }
        ]
      });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    let sortOption = { isGymPreferred: -1, protein: -1, name: 1 };

    let items = [];
    try {
      items = await PkFood.find(filter)
        .limit(Math.min(Number(limit) || 60, 150))
        .sort(sortOption)
        .lean();
    } catch (dbErr) {
      console.warn('PkFood DB query fallback triggered:', dbErr?.message);
      items = [];
    }

    if (!items || items.length === 0) {
      // Fallback to local pkFoods.json
      let fallbackList = getJsonFoods();
      if (category && category !== 'all') {
        fallbackList = fallbackList.filter(f => f.category === category);
      }
      if (tag && tag !== 'all') {
        fallbackList = fallbackList.filter(f => f.tags && f.tags.includes(tag));
      }
      if (mealSlot && mealSlot !== 'all') {
        fallbackList = fallbackList.filter(f => 
          (f.mealSlots && f.mealSlots.includes(mealSlot)) || 
          (f.tags && f.tags.includes(mealSlot))
        );
      }
      if (minProtein) {
        fallbackList = fallbackList.filter(f => f.protein >= Number(minProtein));
      }
      if (maxCalories) {
        fallbackList = fallbackList.filter(f => f.calories <= Number(maxCalories));
      }
      if (q && q.trim()) {
        const queryLower = q.trim().toLowerCase();
        fallbackList = fallbackList.filter(f => {
          const matchSimple = f.simpleName && f.simpleName.toLowerCase().includes(queryLower);
          const matchName = f.name && f.name.toLowerCase().includes(queryLower);
          const matchBase = f.baseName && f.baseName.toLowerCase().includes(queryLower);
          const matchUrdu = f.aliases?.urdu && (Array.isArray(f.aliases.urdu) ? f.aliases.urdu.some(u => u.includes(queryLower)) : f.aliases.urdu.includes(queryLower));
          const matchRoman = f.aliases?.romanUrdu && (Array.isArray(f.aliases.romanUrdu) ? f.aliases.romanUrdu.some(r => r.toLowerCase().includes(queryLower)) : f.aliases.romanUrdu.toLowerCase().includes(queryLower));
          const matchIng = f.mainIngredients && (Array.isArray(f.mainIngredients) ? f.mainIngredients.some(i => i.toLowerCase().includes(queryLower)) : f.mainIngredients.toLowerCase().includes(queryLower));
          const matchTag = f.tags && f.tags.some(t => t.toLowerCase().includes(queryLower));
          return matchSimple || matchName || matchBase || matchUrdu || matchRoman || matchIng || matchTag;
        });

        // Smart sort: query matches first, followed by gym preferred and higher protein
        fallbackList.sort((a, b) => {
          const aName = (a.simpleName || a.name || '').toLowerCase();
          const bName = (b.simpleName || b.name || '').toLowerCase();
          const aExact = aName === queryLower ? 3 : aName.startsWith(queryLower) ? 2 : 1;
          const bExact = bName === queryLower ? 3 : bName.startsWith(queryLower) ? 2 : 1;
          if (bExact !== aExact) return bExact - aExact;
          const aGym = a.isGymPreferred ? 1 : 0;
          const bGym = b.isGymPreferred ? 1 : 0;
          if (bGym !== aGym) return bGym - aGym;
          return (b.protein || 0) - (a.protein || 0);
        });
      } else {
        // Default browse sort: Gym preferred & high protein dishes come FIRST!
        fallbackList.sort((a, b) => {
          const aGym = a.isGymPreferred ? 1 : 0;
          const bGym = b.isGymPreferred ? 1 : 0;
          if (bGym !== aGym) return bGym - aGym;
          return (b.protein || 0) - (a.protein || 0);
        });
      }
      items = fallbackList.slice(0, Math.min(Number(limit) || 60, 150));
    } else if (q && q.trim()) {
      // Smart sort for database items too
      const queryLower = q.trim().toLowerCase();
      items.sort((a, b) => {
        const aName = (a.simpleName || a.name || '').toLowerCase();
        const bName = (b.simpleName || b.name || '').toLowerCase();
        const aExact = aName === queryLower ? 3 : aName.startsWith(queryLower) ? 2 : 1;
        const bExact = bName === queryLower ? 3 : bName.startsWith(queryLower) ? 2 : 1;
        if (bExact !== aExact) return bExact - aExact;
        const aGym = a.isGymPreferred ? 1 : 0;
        const bGym = b.isGymPreferred ? 1 : 0;
        if (bGym !== aGym) return bGym - aGym;
        return (b.protein || 0) - (a.protein || 0);
      });
    }

    return res.json({
      success: true,
      count: items.length,
      foods: items
    });
  } catch (error) {
    console.error('Error searching Pakistani foods:', error);
    return res.status(500).json({ error: 'Failed to search foods' });
  }
};

/**
 * GET /api/foods/:id
 */
export const getFoodById = async (req, res) => {
  try {
    const { id } = req.params;
    let food = await PkFood.findOne({ $or: [{ foodId: id }, { _id: id }] }).lean();
    if (!food) {
      food = getJsonFoods().find(f => f.foodId === id || f._id === id);
    }
    if (!food) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    return res.json({ success: true, food });
  } catch (error) {
    console.error('Error fetching food item:', error);
    return res.status(500).json({ error: 'Failed to fetch food item' });
  }
};

/**
 * Helper to compute today's date in YYYY-MM-DD
 */
function getTodayDateStr() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * POST /api/food-log
 * Body: { date, mealSlot, items: [{ foodId, quantity }], notes }
 */
export const logFood = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, mealSlot = 'lunch', items = [], notes = '' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one food item is required.' });
    }

    const targetDate = date || getTodayDateStr();
    const todayStr = getTodayDateStr();
    const isBackfilled = targetDate < todayStr;

    const populatedItems = [];
    let totalCaloriesEstimated = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;

    for (const rawItem of items) {
      const { foodId, quantity = 1 } = rawItem;
      const numQty = Math.max(0.25, Math.min(10, Number(quantity) || 1));

      let food = await PkFood.findOne({ $or: [{ foodId }, { _id: foodId }] }).lean();
      if (!food) {
        food = getJsonFoods().find(f => f.foodId === foodId || f._id === foodId);
      }
      if (!food) {
        continue;
      }

      const calEstimate = Math.round(food.calories * numQty);
      const rangeMargin = Math.round(calEstimate * (food.estimateRangePercent || 15) / 100);
      const minCal = Math.max(0, calEstimate - rangeMargin);
      const maxCal = calEstimate + rangeMargin;

      const p = Number((food.protein * numQty).toFixed(1));
      const c = Number((food.carbs * numQty).toFixed(1));
      const f = Number((food.fat * numQty).toFixed(1));
      const fib = Number(((food.fiber || 0) * numQty).toFixed(1));

      populatedItems.push({
        foodId: food.foodId,
        name: food.name,
        category: food.category,
        servingUnit: food.typicalServing?.unit || 'serving',
        servingGrams: Math.round((food.typicalServing?.grams || 100) * numQty),
        quantity: numQty,
        caloriesEstimated: calEstimate,
        caloriesRangeMin: minCal,
        caloriesRangeMax: maxCal,
        proteinG: p,
        carbsG: c,
        fatG: f,
        fiberG: fib,
        whoShouldLimit: food.whoShouldLimit || []
      });

      totalCaloriesEstimated += calEstimate;
      totalProteinG += p;
      totalCarbsG += c;
      totalFatG += f;
    }

    if (populatedItems.length === 0) {
      return res.status(400).json({ error: 'Could not find any of the requested food items.' });
    }

    const totalRangeMargin = Math.round(totalCaloriesEstimated * 0.15);
    const totalCaloriesRangeMin = Math.max(0, totalCaloriesEstimated - totalRangeMargin);
    const totalCaloriesRangeMax = totalCaloriesEstimated + totalRangeMargin;

    const newLog = new FoodLog({
      userId,
      date: targetDate,
      mealSlot,
      items: populatedItems,
      totalCaloriesEstimated,
      totalCaloriesRangeMin,
      totalCaloriesRangeMax,
      totalProteinG: Number(totalProteinG.toFixed(1)),
      totalCarbsG: Number(totalCarbsG.toFixed(1)),
      totalFatG: Number(totalFatG.toFixed(1)),
      notes,
      isBackfilled,
      loggedAt: new Date()
    });

    await newLog.save();

    return res.status(201).json({
      success: true,
      message: isBackfilled 
        ? `Logged food for ${targetDate} (backfill recorded)`
        : 'Food logged successfully',
      foodLog: newLog
    });
  } catch (error) {
    console.error('Error logging food:', error);
    return res.status(500).json({ error: 'Failed to record food log' });
  }
};

/**
 * GET /api/food-log?date=YYYY-MM-DD
 */
export const getFoodLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, startDate, endDate } = req.query;

    const filter = { userId };
    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else {
      filter.date = getTodayDateStr();
    }

    const logs = await FoodLog.find(filter).sort({ date: -1, loggedAt: -1 }).lean();

    const summary = {
      totalEstimatedCalories: logs.reduce((acc, l) => acc + (l.totalCaloriesEstimated || 0), 0),
      totalRangeMin: logs.reduce((acc, l) => acc + (l.totalCaloriesRangeMin || 0), 0),
      totalRangeMax: logs.reduce((acc, l) => acc + (l.totalCaloriesRangeMax || 0), 0),
      totalProteinG: Number(logs.reduce((acc, l) => acc + (l.totalProteinG || 0), 0).toFixed(1)),
      totalCarbsG: Number(logs.reduce((acc, l) => acc + (l.totalCarbsG || 0), 0).toFixed(1)),
      totalFatG: Number(logs.reduce((acc, l) => acc + (l.totalFatG || 0), 0).toFixed(1))
    };

    return res.json({
      success: true,
      date: filter.date,
      count: logs.length,
      summary,
      logs
    });
  } catch (error) {
    console.error('Error fetching food logs:', error);
    return res.status(500).json({ error: 'Failed to fetch food logs' });
  }
};

/**
 * DELETE /api/food-log/:id
 */
export const deleteFoodLog = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deleted = await FoodLog.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ error: 'Food log not found or unauthorized' });
    }

    return res.json({
      success: true,
      message: 'Food log entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting food log:', error);
    return res.status(500).json({ error: 'Failed to delete food log' });
  }
};

/**
 * GET /api/food-log/report?date=YYYY-MM-DD&range=day|week
 * Pure TRACK + REPORT: provides observational report of estimated intake vs estimated expenditure.
 * Strictly NEVER outputs dietary prescriptions or target assignments (Rule R2).
 */
export const getDietReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date = getTodayDateStr(), range = 'day' } = req.query;

    const targetDates = [];
    if (range === 'week') {
      const base = new Date(date);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        targetDates.push(d.toISOString().split('T')[0]);
      }
    } else {
      targetDates.push(date);
    }

    const dailyBreakdown = [];
    let totalIntakeKcal = 0;
    let totalIntakeMin = 0;
    let totalIntakeMax = 0;
    let totalWorkoutBurn = 0;
    let totalWalkingBurn = 0;
    let totalExpenditure = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;

    for (const dStr of targetDates) {
      const energy = await computeTodaysEnergy(userId, dStr, {
        UserWorkoutProgram,
        ActivityLog,
        FoodLog
      });

      const dayLogs = await FoodLog.find({ userId, date: dStr }).lean();
      const dayIntakeMin = dayLogs.reduce((acc, l) => acc + (l.totalCaloriesRangeMin || 0), 0);
      const dayIntakeMax = dayLogs.reduce((acc, l) => acc + (l.totalCaloriesRangeMax || 0), 0);
      const dayProtein = dayLogs.reduce((acc, l) => acc + (l.totalProteinG || 0), 0);
      const dayCarbs = dayLogs.reduce((acc, l) => acc + (l.totalCarbsG || 0), 0);
      const dayFat = dayLogs.reduce((acc, l) => acc + (l.totalFatG || 0), 0);

      dailyBreakdown.push({
        date: dStr,
        estimatedIntakeKcal: energy.eatenKcal,
        intakeRange: {
          min: dayIntakeMin || Math.round(energy.eatenKcal * 0.85),
          max: dayIntakeMax || Math.round(energy.eatenKcal * 1.15)
        },
        workoutBurnKcal: energy.workoutKcal,
        walkingBurnKcal: energy.walkingKcal,
        totalEstimatedExpenditureKcal: energy.estimatedExpenditure,
        energyBalanceKcal: energy.balance,
        mealsLoggedCount: dayLogs.length,
        macros: {
          proteinG: Number(dayProtein.toFixed(1)),
          carbsG: Number(dayCarbs.toFixed(1)),
          fatG: Number(dayFat.toFixed(1))
        }
      });

      totalIntakeKcal += energy.eatenKcal;
      totalIntakeMin += (dayIntakeMin || Math.round(energy.eatenKcal * 0.85));
      totalIntakeMax += (dayIntakeMax || Math.round(energy.eatenKcal * 1.15));
      totalWorkoutBurn += energy.workoutKcal;
      totalWalkingBurn += energy.walkingKcal;
      totalExpenditure += energy.estimatedExpenditure;
      totalProteinG += dayProtein;
      totalCarbsG += dayCarbs;
      totalFatG += dayFat;
    }

    const count = targetDates.length;
    const netBalanceKcal = totalIntakeKcal - totalExpenditure;

    return res.json({
      success: true,
      reportType: range === 'week' ? 'weekly_summary' : 'daily_summary',
      period: {
        startDate: targetDates[0],
        endDate: targetDates[targetDates.length - 1],
        daysCount: count
      },
      dailyBreakdown,
      totals: {
        totalIntakeKcal,
        intakeRange: {
          min: totalIntakeMin,
          max: totalIntakeMax
        },
        totalWorkoutBurnKcal: totalWorkoutBurn,
        totalWalkingBurnKcal: totalWalkingBurn,
        totalExpenditureKcal: totalExpenditure,
        netBalanceKcal
      },
      averages: {
        avgDailyIntakeKcal: Math.round(totalIntakeKcal / count),
        avgDailyExpenditureKcal: Math.round(totalExpenditure / count)
      },
      macroBreakdown: {
        proteinG: Number(totalProteinG.toFixed(1)),
        carbsG: Number(totalCarbsG.toFixed(1)),
        fatG: Number(totalFatG.toFixed(1))
      },
      complianceNote: 'GymSync tracks and reports your logged food and activity. GymSync does not prescribe or assign calorie limits or diet plans (Rule R2).'
    });
  } catch (error) {
    console.error('Error generating diet report:', error);
    return res.status(500).json({ error: 'Failed to generate diet report' });
  }
};
