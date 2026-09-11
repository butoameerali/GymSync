import UserDietPlan from '../models/UserDietPlan.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import User from '../models/User.js';
import { getAlternatives, lookupFoodItem } from '../services/nutrition/foodSubstitutionGroups.js';

export const getSubstitutionOptions = async (req, res) => {
  try {
    const { itemName } = req.query;
    if (!itemName) return res.status(400).json({ error: 'itemName is required' });

    const user = await User.findById(req.user._id).select('bioData');
    const restrictions = user?.bioData?.dietaryRestrictions || [];

    const alternatives = getAlternatives(itemName, restrictions);
    return res.status(200).json({ alternatives });
  } catch (error) {
    console.error('getSubstitutionOptions Error:', error);
    return res.status(500).json({ error: 'Failed to fetch alternatives' });
  }
};

export const substituteFoodItem = async (req, res) => {
  try {
    const { planId, mealId } = req.params;
    const { fromFoodItemName, toFoodItemName } = req.body;

    let isSavedAIPlan = false;
    let plan = await UserDietPlan.findOne({ _id: planId, userId: req.user._id });
    
    if (!plan) {
      plan = await SavedAIPlan.findOne({ _id: planId, userId: req.user._id });
      isSavedAIPlan = true;
    }

    if (!plan) return res.status(404).json({ error: 'Diet plan not found' });

    let meals = isSavedAIPlan ? plan.diet?.meals : plan.meals;
    if (!meals) return res.status(404).json({ error: 'Meals not found in plan' });

    // Handle mongoose subdocument array vs raw array
    const meal = typeof meals.id === 'function' ? meals.id(mealId) : meals.find(m => String(m._id) === mealId || String(m.mealNumber) === mealId);
    if (!meal) return res.status(404).json({ error: 'Meal not found' });

    let foodItems = meal.foodItems || meal.items; // dietBuilder uses 'items'
    if (!foodItems) return res.status(404).json({ error: 'Food items not found in meal' });

    const foodItem = foodItems.find(f => (f.name || f.food) === fromFoodItemName);
    if (!foodItem) return res.status(404).json({ error: 'Original food item not found in meal' });

    const replacementProfile = lookupFoodItem(toFoodItemName);
    if (!replacementProfile) return res.status(400).json({ error: 'Replacement food item profile not found' });

    let multiplier = 1;
    if (foodItem.protein > 10 && replacementProfile.protein > 0) {
      multiplier = foodItem.protein / replacementProfile.protein;
    } else {
      multiplier = foodItem.calories / replacementProfile.calories;
    }

    const newCalories = Math.round(replacementProfile.calories * multiplier);
    const newProtein = Math.round(replacementProfile.protein * multiplier);
    const newCarbs = Math.round(replacementProfile.carbs * multiplier);
    const newFat = Math.round(replacementProfile.fat * multiplier);
    const newQuantity = Math.round(replacementProfile.baseGrams * multiplier);

    const macroDeltaKcal = newCalories - foodItem.calories;

    if (foodItem.food !== undefined) {
      foodItem.food = replacementProfile.name;
      foodItem.portion = `${newQuantity}g`;
    } else {
      foodItem.name = replacementProfile.name;
      foodItem.quantity = newQuantity;
      foodItem.unit = 'g';
    }
    foodItem.calories = newCalories;
    foodItem.protein = newProtein;
    foodItem.carbs = newCarbs;
    foodItem.fat = newFat;

    if (!meal.substitutions) meal.substitutions = [];
    meal.substitutions.push({
      fromFoodItem: fromFoodItemName,
      toFoodItem: toFoodItemName,
      appliedAt: new Date(),
      macroDeltaKcal
    });

    // Recompute meal totals
    meal.calories = foodItems.reduce((sum, item) => sum + item.calories, 0);
    meal.protein = foodItems.reduce((sum, item) => sum + item.protein, 0);
    meal.carbs = foodItems.reduce((sum, item) => sum + item.carbs, 0);
    meal.fat = foodItems.reduce((sum, item) => sum + item.fat, 0);

    // Keep dietBuilder total names in sync
    if (meal.totalCalories !== undefined) meal.totalCalories = meal.calories;
    if (meal.totalProtein !== undefined) meal.totalProtein = meal.protein;
    if (meal.totalCarbs !== undefined) meal.totalCarbs = meal.carbs;
    if (meal.totalFat !== undefined) meal.totalFat = meal.fat;

    // Recompute plan totals
    const totalCals = meals.reduce((sum, m) => sum + (m.calories || m.totalCalories || 0), 0);
    const totalProt = meals.reduce((sum, m) => sum + (m.protein || m.totalProtein || 0), 0);
    const totalCarb = meals.reduce((sum, m) => sum + (m.carbs || m.totalCarbs || 0), 0);
    const totalFat = meals.reduce((sum, m) => sum + (m.fat || m.totalFat || 0), 0);

    if (isSavedAIPlan) {
      plan.diet.actualTotals = {
        totalDailyCalories: totalCals,
        totalProtein: totalProt,
        totalCarbs: totalCarb,
        totalFat: totalFat
      };
      // Must markModified since diet is Mixed
      plan.markModified('diet');
    } else {
      plan.calories = totalCals;
      plan.protein = totalProt;
      plan.carbs = totalCarb;
      plan.fat = totalFat;
    }

    await plan.save();

    let message = `Swapped ${fromFoodItemName} → ${toFoodItemName}.`;
    if (newProtein < (foodItem.protein * 0.85)) {
      message += ` To hit your protein target, I also suggest adding Greek yogurt or a protein shake.`;
    }

    return res.status(200).json({ plan, message });
  } catch (error) {
    console.error('substituteFoodItem Error:', error);
    return res.status(500).json({ error: 'Failed to substitute food item' });
  }
};
