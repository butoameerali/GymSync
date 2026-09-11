export const FOOD_SUBSTITUTION_GROUPS = {
  PROTEIN_MEAT: [
    { name: 'Grilled / Boiled Chicken Breast', category: 'meat', baseGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: 'Baked White Fish Fillet', category: 'meat', baseGrams: 100, calories: 96, protein: 20, carbs: 0, fat: 1.7 },
    { name: 'Lean Ground Beef (95/5)', category: 'meat', baseGrams: 100, calories: 137, protein: 21, carbs: 0, fat: 5 }
  ],
  PROTEIN_VEG: [
    { name: 'Boiled Eggs', category: 'veg', baseGrams: 100 /* ~2 eggs */, calories: 144, protein: 12.6, carbs: 1, fat: 9.6 },
    { name: 'Low-Fat Paneer / Cottage Cheese', category: 'dairy', baseGrams: 100, calories: 166, protein: 18.6, carbs: 2.6, fat: 9.3, allergens: ['dairy'] },
    { name: 'Tofu (Firm)', category: 'vegan', baseGrams: 100, calories: 144, protein: 15.8, carbs: 2.8, fat: 8.7, allergens: ['soy'] },
    { name: 'Cooked Lentils / Daal Tadka', category: 'vegan', baseGrams: 100, calories: 114, protein: 9, carbs: 20, fat: 0.4 },
    { name: 'Greek Yogurt (Plain, Non-Fat)', category: 'dairy', baseGrams: 100, calories: 59, protein: 10, carbs: 3.6, fat: 0.4, allergens: ['dairy'] }
  ],
  CARBS_STARCH: [
    { name: 'Cooked Brown Rice', category: 'vegan', baseGrams: 100, calories: 112, protein: 2.3, carbs: 23.5, fat: 1 },
    { name: 'Whole Wheat Roti', category: 'vegan', baseGrams: 100 /* ~3 rotis */, calories: 312, protein: 9.3, carbs: 63, fat: 2.7, allergens: ['gluten'] },
    { name: 'Boiled Sweet Potato', category: 'vegan', baseGrams: 100, calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
    { name: 'Rolled Oats with Cinnamon & Water', category: 'vegan', baseGrams: 100, calories: 375, protein: 12, carbs: 67, fat: 2.5 }
  ]
};

// Helper to find alternatives matching the original item's protein/calories
export function getAlternatives(originalItemName, restrictions = []) {
  const normRestr = restrictions.map(r => r.toLowerCase());
  const isLactoseIntolerant = normRestr.includes('lactose intolerant') || normRestr.includes('dairy');
  const isVegan = normRestr.includes('vegan');
  const isVegetarian = isVegan || normRestr.includes('vegetarian');

  // Find the group containing the original item
  let matchedGroup = null;
  let originalProfile = null;

  for (const group of Object.values(FOOD_SUBSTITUTION_GROUPS)) {
    const found = group.find(item => originalItemName.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(originalItemName.toLowerCase()));
    if (found) {
      matchedGroup = group;
      originalProfile = found;
      break;
    }
  }

  // If not found in a specific group, we can just return a generic mix based on protein vs carb dominance
  if (!matchedGroup) {
    // Basic heuristic if it's a protein source
    if (originalItemName.toLowerCase().includes('chicken') || originalItemName.toLowerCase().includes('fish')) {
      matchedGroup = [...FOOD_SUBSTITUTION_GROUPS.PROTEIN_MEAT, ...FOOD_SUBSTITUTION_GROUPS.PROTEIN_VEG];
    } else {
      matchedGroup = [...FOOD_SUBSTITUTION_GROUPS.CARBS_STARCH, ...FOOD_SUBSTITUTION_GROUPS.PROTEIN_VEG];
    }
  } else {
    // If it's meat, we should offer veg proteins too
    if (matchedGroup === FOOD_SUBSTITUTION_GROUPS.PROTEIN_MEAT) {
      matchedGroup = [...FOOD_SUBSTITUTION_GROUPS.PROTEIN_MEAT, ...FOOD_SUBSTITUTION_GROUPS.PROTEIN_VEG];
    }
  }

  const alternatives = [];

  for (const item of matchedGroup) {
    if (originalProfile && item.name === originalProfile.name) continue;

    // Apply dietary restrictions
    if (isVegan && item.category !== 'vegan') continue;
    if (isVegetarian && item.category === 'meat') continue;
    if (isLactoseIntolerant && item.allergens?.includes('dairy')) continue;

    alternatives.push({
      name: item.name,
      baseGrams: item.baseGrams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat
    });
  }

  return alternatives;
}

export function lookupFoodItem(name) {
  for (const group of Object.values(FOOD_SUBSTITUTION_GROUPS)) {
    const found = group.find(item => name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(name.toLowerCase()));
    if (found) return found;
  }
  return null;
}
