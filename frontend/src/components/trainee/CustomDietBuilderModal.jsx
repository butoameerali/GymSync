import React, { useState, useMemo } from 'react';
import { Utensils, Search, Plus, Trash2, Check, Flame, Activity, X, Sparkles, ChefHat } from 'lucide-react';
import { toast } from 'react-toastify';

// Comprehensive Pakistani & South Asian Food Database with verified macronutrient values
export const PAKISTANI_FOOD_DATABASE = [
  // ── ANDAY & NASHTA (EGGS & BREAKFAST) ──
  { id: 'pk-egg-01', name: 'Ublay Anday (Whole Boiled Egg)', category: 'Eggs & Breakfast', unit: 'piece', servingSize: '1 egg (~50g)', calories: 72, protein: 6.3, carbs: 0.5, fat: 5.0 },
  { id: 'pk-egg-02', name: 'Anday ki Safedi (Boiled Egg White)', category: 'Eggs & Breakfast', unit: 'piece', servingSize: '1 white (~33g)', calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1 },
  { id: 'pk-egg-03', name: 'Desi Anda Omelette (Pyaz, Tamatar, Hari Mirch)', category: 'Eggs & Breakfast', unit: 'serving', servingSize: '1 egg omelette with 1 tsp oil', calories: 120, protein: 7.0, carbs: 3.0, fat: 9.0 },
  { id: 'pk-egg-04', name: 'Anda Bhurji (Scrambled Egg Desi)', category: 'Eggs & Breakfast', unit: 'serving', servingSize: '2 eggs bhurji', calories: 230, protein: 14.0, carbs: 4.0, fat: 17.0 },
  { id: 'pk-brk-01', name: 'Gandum ka Daliya (Wheat Porridge with Milk)', category: 'Eggs & Breakfast', unit: 'bowl', servingSize: '1 bowl (~200g)', calories: 160, protein: 6.5, carbs: 30.0, fat: 2.5 },
  { id: 'pk-brk-02', name: 'Rolled Oats (Doodh ke sath)', category: 'Eggs & Breakfast', unit: 'bowl', servingSize: '50g oats + 150ml milk', calories: 280, protein: 13.0, carbs: 44.0, fat: 6.0 },
  { id: 'pk-brk-03', name: 'Halwa Puri (Cheating / Cheat Meal)', category: 'Eggs & Breakfast', unit: 'serving', servingSize: '1 puri + 1 bowl chana halwa', calories: 450, protein: 6.0, carbs: 62.0, fat: 22.0 },
  { id: 'pk-brk-04', name: 'Chai Doodh Patti (with 1 tsp sugar)', category: 'Eggs & Breakfast', unit: 'cup', servingSize: '1 cup (~150ml)', calories: 120, protein: 3.5, carbs: 16.0, fat: 4.5 },
  { id: 'pk-brk-05', name: 'Chai Bina Cheeni (Sugar-Free Milk Tea)', category: 'Eggs & Breakfast', unit: 'cup', servingSize: '1 cup (~150ml)', calories: 65, protein: 3.5, carbs: 4.5, fat: 3.5 },

  // ── GOSHT & MURGHI (MEAT, CHICKEN & FISH) ──
  { id: 'pk-meat-01', name: 'Murghi ka Seena (Grilled Chicken Breast)', category: 'Meat & Chicken', unit: 'portion', servingSize: '150g cooked', calories: 245, protein: 46.0, carbs: 0.0, fat: 5.0 },
  { id: 'pk-meat-02', name: 'Chicken Karahi (Ghar ki bani, moderate oil)', category: 'Meat & Chicken', unit: 'bowl', servingSize: '200g with gravy', calories: 350, protein: 35.0, carbs: 6.0, fat: 18.0 },
  { id: 'pk-meat-03', name: 'Chicken Tikka Boti (Grilled)', category: 'Meat & Chicken', unit: 'portion', servingSize: '150g (5-6 pieces)', calories: 220, protein: 38.0, carbs: 2.0, fat: 6.0 },
  { id: 'pk-meat-04', name: 'Chicken Biryani (Standard Pakistani plate)', category: 'Meat & Chicken', unit: 'plate', servingSize: '1 plate (~250g with chicken piece)', calories: 450, protein: 24.0, carbs: 62.0, fat: 14.0 },
  { id: 'pk-meat-05', name: 'Beef Keema (Minced Beef Salan)', category: 'Meat & Chicken', unit: 'cup', servingSize: '150g cooked', calories: 280, protein: 30.0, carbs: 4.0, fat: 15.0 },
  { id: 'pk-meat-06', name: 'Beef Chapli Kabab (Peshawari)', category: 'Meat & Chicken', unit: 'piece', servingSize: '1 large kabab (~120g)', calories: 260, protein: 22.0, carbs: 6.0, fat: 16.0 },
  { id: 'pk-meat-07', name: 'Beef Nihari (Gravy with lean meat)', category: 'Meat & Chicken', unit: 'bowl', servingSize: '200g serving', calories: 390, protein: 28.0, carbs: 12.0, fat: 26.0 },
  { id: 'pk-meat-08', name: 'Mutton Gosht Salan (Curry)', category: 'Meat & Chicken', unit: 'bowl', servingSize: '200g serving', calories: 360, protein: 28.0, carbs: 5.0, fat: 24.0 },
  { id: 'pk-meat-09', name: 'Machli Fillet (Grilled / Steamed Fish)', category: 'Meat & Chicken', unit: 'portion', servingSize: '150g fillet', calories: 180, protein: 34.0, carbs: 0.0, fat: 4.0 },
  { id: 'pk-meat-10', name: 'Machli Fried (Tawa / Deep Fried Fish)', category: 'Meat & Chicken', unit: 'piece', servingSize: '1 large piece (~150g)', calories: 280, protein: 24.0, carbs: 8.0, fat: 17.0 },
  { id: 'pk-meat-11', name: 'Shami Kabab (Chicken / Beef)', category: 'Meat & Chicken', unit: 'piece', servingSize: '1 kabab (~60g)', calories: 135, protein: 10.0, carbs: 8.0, fat: 6.5 },

  // ── DAAL & LEGUMES (LENTILS & CHANA) ──
  { id: 'pk-daal-01', name: 'Daal Chana (Gram Lentils Cooked)', category: 'Daal & Legumes', unit: 'cup', servingSize: '1 cup cooked (~180g)', calories: 220, protein: 12.0, carbs: 34.0, fat: 4.0 },
  { id: 'pk-daal-02', name: 'Daal Moong (Yellow Moong Daal)', category: 'Daal & Legumes', unit: 'cup', servingSize: '1 cup cooked (~180g)', calories: 180, protein: 13.0, carbs: 28.0, fat: 2.0 },
  { id: 'pk-daal-03', name: 'Daal Mash (White Urad Daal Tarka)', category: 'Daal & Legumes', unit: 'cup', servingSize: '1 cup cooked (~180g)', calories: 210, protein: 12.0, carbs: 32.0, fat: 4.0 },
  { id: 'pk-daal-04', name: 'Daal Masoor (Red Lentils)', category: 'Daal & Legumes', unit: 'cup', servingSize: '1 cup cooked (~180g)', calories: 170, protein: 12.0, carbs: 28.0, fat: 1.5 },
  { id: 'pk-daal-05', name: 'Lobia Salan (Red Kidney Beans Curry)', category: 'Daal & Legumes', unit: 'cup', servingSize: '1 cup cooked (~180g)', calories: 215, protein: 14.0, carbs: 38.0, fat: 1.5 },
  { id: 'pk-daal-06', name: 'Chana Chaat (Boiled White Chana with Salad)', category: 'Daal & Legumes', unit: 'bowl', servingSize: '1 bowl (~200g)', calories: 220, protein: 10.5, carbs: 38.0, fat: 3.0 },
  { id: 'pk-daal-07', name: 'Ublay Safaid Chane (Plain Boiled Chickpeas)', category: 'Daal & Legumes', unit: 'cup', servingSize: '1 cup (~160g)', calories: 240, protein: 14.5, carbs: 42.0, fat: 3.5 },

  // ── SABZI & SALAN (VEGETABLES) ──
  { id: 'pk-veg-01', name: 'Palak Paneer ya Palak Salan', category: 'Vegetables & Sabzi', unit: 'cup', servingSize: '1 cup (~180g)', calories: 190, protein: 10.0, carbs: 8.0, fat: 12.0 },
  { id: 'pk-veg-02', name: 'Bhindi Fry (Okra / Lady Finger)', category: 'Vegetables & Sabzi', unit: 'cup', servingSize: '1 cup (~150g)', calories: 120, protein: 3.0, carbs: 12.0, fat: 6.0 },
  { id: 'pk-veg-03', name: 'Aloo Gobi (Potato & Cauliflower)', category: 'Vegetables & Sabzi', unit: 'cup', servingSize: '1 cup (~180g)', calories: 160, protein: 4.0, carbs: 22.0, fat: 7.0 },
  { id: 'pk-veg-04', name: 'Karela Pyaz (Bitter Gourd with Onions)', category: 'Vegetables & Sabzi', unit: 'cup', servingSize: '1 cup (~150g)', calories: 110, protein: 3.0, carbs: 14.0, fat: 5.0 },
  { id: 'pk-veg-05', name: 'Mixed Seasonal Sabzi (Gajar, Matar, Aloo)', category: 'Vegetables & Sabzi', unit: 'cup', servingSize: '1 cup (~180g)', calories: 140, protein: 4.0, carbs: 18.0, fat: 6.0 },
  { id: 'pk-veg-06', name: 'Sarson ka Saag (Desi Mustard Greens)', category: 'Vegetables & Sabzi', unit: 'cup', servingSize: '1 cup (~200g with light butter)', calories: 180, protein: 6.0, carbs: 10.0, fat: 12.0 },
  { id: 'pk-veg-07', name: 'Fresh Green Salad (Kheera, Tamatar, Lemon)', category: 'Vegetables & Sabzi', unit: 'bowl', servingSize: '1 large bowl (~180g)', calories: 40, protein: 1.5, carbs: 8.0, fat: 0.2 },

  // ── ROTI, CHAWAL & GRAINS ──
  { id: 'pk-grain-01', name: 'Gandum ki Roti (Whole Wheat Chapati)', category: 'Roti & Rice', unit: 'piece', servingSize: '1 normal roti (~40g dry flour)', calories: 110, protein: 3.5, carbs: 23.0, fat: 0.8 },
  { id: 'pk-grain-02', name: 'Tandoori Roti (Khamiri / Dhaba)', category: 'Roti & Rice', unit: 'piece', servingSize: '1 piece (~50g)', calories: 130, protein: 4.0, carbs: 26.0, fat: 1.0 },
  { id: 'pk-grain-03', name: 'Sada Paratha (Tawa Paratha with Ghee/Oil)', category: 'Roti & Rice', unit: 'piece', servingSize: '1 paratha', calories: 280, protein: 5.0, carbs: 35.0, fat: 14.0 },
  { id: 'pk-grain-04', name: 'Roghani Naan', category: 'Roti & Rice', unit: 'piece', servingSize: '1 naan (~100g)', calories: 320, protein: 9.0, carbs: 54.0, fat: 8.0 },
  { id: 'pk-grain-05', name: 'Sada Naan', category: 'Roti & Rice', unit: 'piece', servingSize: '1 naan (~90g)', calories: 260, protein: 8.0, carbs: 50.0, fat: 3.0 },
  { id: 'pk-grain-06', name: 'Ublay Safaid Chawal (Boiled Basmati Rice)', category: 'Roti & Rice', unit: 'cup', servingSize: '1 cup cooked (~160g)', calories: 200, protein: 4.2, carbs: 44.0, fat: 0.4 },
  { id: 'pk-grain-07', name: 'Brown Rice (Cooked)', category: 'Roti & Rice', unit: 'cup', servingSize: '1 cup cooked (~160g)', calories: 215, protein: 5.0, carbs: 45.0, fat: 1.8 },
  { id: 'pk-grain-08', name: 'Matar Pulao (Basmati Rice with Peas)', category: 'Roti & Rice', unit: 'plate', servingSize: '1 plate (~200g)', calories: 340, protein: 8.0, carbs: 56.0, fat: 9.0 },
  { id: 'pk-grain-09', name: 'Khichdi (Moong Daal & Chawal)', category: 'Roti & Rice', unit: 'bowl', servingSize: '1 bowl (~200g)', calories: 220, protein: 7.0, carbs: 40.0, fat: 3.0 },

  // ── DAIRY & FITNESS DRINKS ──
  { id: 'pk-dairy-01', name: 'Sada Dahi / Yogurt (Low-fat)', category: 'Dairy & Drinks', unit: 'cup', servingSize: '1 cup (~150g)', calories: 95, protein: 6.0, carbs: 8.0, fat: 4.5 },
  { id: 'pk-dairy-02', name: 'Greek Yogurt / Hung Curd', category: 'Dairy & Drinks', unit: 'portion', servingSize: '100g', calories: 90, protein: 14.0, carbs: 4.0, fat: 2.0 },
  { id: 'pk-dairy-03', name: 'Namkeen Lassi (Salted Buttermilk)', category: 'Dairy & Drinks', unit: 'glass', servingSize: '1 glass (~250ml)', calories: 110, protein: 6.0, carbs: 8.0, fat: 4.0 },
  { id: 'pk-dairy-04', name: 'Meethi Lassi (Sweet Lassi)', category: 'Dairy & Drinks', unit: 'glass', servingSize: '1 glass (~250ml with sugar)', calories: 240, protein: 7.0, carbs: 36.0, fat: 7.0 },
  { id: 'pk-dairy-05', name: 'Sattu Drink (Roasted Gram Flour with Lemon & Salt)', category: 'Dairy & Drinks', unit: 'glass', servingSize: '40g sattu in water', calories: 160, protein: 10.0, carbs: 26.0, fat: 2.5 },
  { id: 'pk-dairy-06', name: '100% Whey Protein Shake (with Water)', category: 'Dairy & Drinks', unit: 'scoop', servingSize: '1 scoop (30g)', calories: 120, protein: 25.0, carbs: 2.0, fat: 1.5 },
  { id: 'pk-dairy-07', name: 'Kela Shake (Banana Milkshake with Doodh)', category: 'Dairy & Drinks', unit: 'glass', servingSize: '1 glass (~250ml)', calories: 280, protein: 8.0, carbs: 48.0, fat: 6.0 },
  { id: 'pk-dairy-08', name: 'Low-Fat Desi Paneer', category: 'Dairy & Drinks', unit: 'portion', servingSize: '100g cubes', calories: 265, protein: 18.0, carbs: 3.0, fat: 20.0 },

  // ── PHAL & DRY FRUITS (FRUITS & NUTS) ──
  { id: 'pk-fruit-01', name: 'Kela (Banana)', category: 'Fruits & Nuts', unit: 'piece', servingSize: '1 medium banana', calories: 105, protein: 1.3, carbs: 27.0, fat: 0.3 },
  { id: 'pk-fruit-02', name: 'Saib (Apple)', category: 'Fruits & Nuts', unit: 'piece', servingSize: '1 medium apple', calories: 80, protein: 0.5, carbs: 20.0, fat: 0.2 },
  { id: 'pk-fruit-03', name: 'Khajoor (Dates)', category: 'Fruits & Nuts', unit: 'portion', servingSize: '3 dates (~30g)', calories: 110, protein: 1.0, carbs: 28.0, fat: 0.2 },
  { id: 'pk-fruit-04', name: 'Kacha Badam (Raw Almonds)', category: 'Fruits & Nuts', unit: 'handful', servingSize: '15 almonds (~20g)', calories: 115, protein: 4.2, carbs: 4.0, fat: 10.0 },
  { id: 'pk-fruit-05', name: 'Akhrot (Walnuts)', category: 'Fruits & Nuts', unit: 'handful', servingSize: '4 whole walnuts (~20g)', calories: 130, protein: 3.0, carbs: 3.0, fat: 13.0 },
  { id: 'pk-fruit-06', name: 'Peanut Butter (Natural)', category: 'Fruits & Nuts', unit: 'tbsp', servingSize: '1 tbsp (~16g)', calories: 95, protein: 4.0, carbs: 3.5, fat: 8.0 }
];

export const CATEGORIES = [
  'All',
  'Eggs & Breakfast',
  'Meat & Chicken',
  'Daal & Legumes',
  'Vegetables & Sabzi',
  'Roti & Rice',
  'Dairy & Drinks',
  'Fruits & Nuts'
];

export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Nashta (Breakfast)', timing: '08:00 AM' },
  { key: 'lunch', label: 'Dopehar ka Khana (Lunch)', timing: '01:30 PM' },
  { key: 'snack', label: 'Shaam ka Snack (Evening)', timing: '05:30 PM' },
  { key: 'dinner', label: 'Raat ka Khana (Dinner)', timing: '08:30 PM' }
];

const CustomDietBuilderModal = ({ isOpen, onClose, onDietCreated, initialTargetCalories = 2200 }) => {
  const [activeMealKey, setActiveMealKey] = useState('breakfast');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom meals container
  const [customMeals, setCustomMeals] = useState({
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: []
  });

  const [dietTitle, setDietTitle] = useState('Mera Desi Custom Diet Plan');

  // Filter foods by category and search
  const filteredFoods = useMemo(() => {
    return PAKISTANI_FOOD_DATABASE.filter(food => {
      const matchCat = selectedCategory === 'All' || food.category === selectedCategory;
      const matchQuery = !searchQuery.trim() || 
        food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        food.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  // Add food to current active meal
  const handleAddFood = (food) => {
    setCustomMeals(prev => {
      const currentList = prev[activeMealKey] || [];
      const existing = currentList.find(item => item.foodId === food.id);
      if (existing) {
        return {
          ...prev,
          [activeMealKey]: currentList.map(item =>
            item.foodId === food.id ? { ...item, servings: item.servings + 1 } : item
          )
        };
      }
      return {
        ...prev,
        [activeMealKey]: [
          ...currentList,
          {
            foodId: food.id,
            name: food.name,
            servingSize: food.servingSize,
            unit: food.unit,
            servings: 1,
            caloriesPerServing: food.calories,
            proteinPerServing: food.protein,
            carbsPerServing: food.carbs,
            fatPerServing: food.fat
          }
        ]
      };
    });
    toast.success(`Added ${food.name} to ${MEAL_TYPES.find(m => m.key === activeMealKey)?.label}`);
  };

  const handleUpdateServings = (mealKey, foodId, delta) => {
    setCustomMeals(prev => {
      const updated = (prev[mealKey] || []).map(item => {
        if (item.foodId === foodId) {
          const newServings = item.servings + delta;
          return newServings > 0 ? { ...item, servings: newServings } : null;
        }
        return item;
      }).filter(Boolean);

      return { ...prev, [mealKey]: updated };
    });
  };

  const handleRemoveFood = (mealKey, foodId) => {
    setCustomMeals(prev => ({
      ...prev,
      [mealKey]: (prev[mealKey] || []).filter(item => item.foodId !== foodId)
    }));
  };

  // Compute total calories & macros
  const totals = useMemo(() => {
    let cal = 0, p = 0, c = 0, f = 0;
    Object.values(customMeals).forEach(mealItems => {
      (mealItems || []).forEach(item => {
        const s = item.servings || 1;
        cal += item.caloriesPerServing * s;
        p += item.proteinPerServing * s;
        c += item.carbsPerServing * s;
        f += item.fatPerServing * s;
      });
    });
    return {
      calories: Math.round(cal),
      protein: Math.round(p),
      carbs: Math.round(c),
      fat: Math.round(f)
    };
  }, [customMeals]);

  const handleSaveDiet = () => {
    const totalItems = Object.values(customMeals).flat().length;
    if (totalItems === 0) {
      toast.warning('Pehle kuch khanay apne plan mein add karein!');
      return;
    }

    const structuredMeals = MEAL_TYPES.map(m => {
      const items = customMeals[m.key] || [];
      let mCal = 0, mP = 0, mC = 0, mF = 0;
      const foodItems = items.map(item => {
        const s = item.servings || 1;
        const cal = Math.round(item.caloriesPerServing * s);
        const prot = Math.round(item.proteinPerServing * s);
        const carb = Math.round(item.carbsPerServing * s);
        const fat = Math.round(item.fatPerServing * s);
        mCal += cal; mP += prot; mC += carb; mF += fat;
        return {
          name: item.name,
          quantity: s,
          unit: item.unit || 'serving',
          portion: `${s} ${item.unit || 'serving'} (${item.servingSize})`,
          calories: cal,
          protein: prot,
          carbs: carb,
          fat: fat,
          allergens: []
        };
      });

      return {
        mealType: m.label.split(' ')[0],
        name: m.label,
        timing: m.timing,
        calories: mCal,
        protein: mP,
        carbs: mC,
        fat: mF,
        foodItems
      };
    }).filter(m => m.foodItems.length > 0);

    const fullDietObject = {
      title: dietTitle.trim() || 'Mera Custom Desi Diet Plan',
      goal: totals.calories > 2400 ? 'Muscle Building' : totals.calories < 1900 ? 'Lose Weight' : 'General Fitness',
      category: 'Custom Desi Diet',
      dietaryType: 'Pakistani Nutrition',
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      hydrationTargetLiters: Number((totals.protein * 0.02 + 2.5).toFixed(1)),
      meals: structuredMeals,
      createdBy: 'Self-Customized (Desi Database)',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    try {
      localStorage.setItem(`gymsync_${userKey}_active_diet`, JSON.stringify(fullDietObject));
    } catch {}

    toast.success('🎉 Aapka Custom Desi Diet Plan save ho gaya!');
    if (onDietCreated) onDietCreated(fullDietObject);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '92vh',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--card-bg-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <ChefHat size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                Build My Own Diet • Pakistani & Desi Food Tracker
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Anday, Gosht, Daal, Roti, Sabzi aur Doodh — Har cheez ki calories aur macros real time calculate karein.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* LIVE MACRO TOTALS BAR */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(16, 185, 129, 0.08)',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>TOTAL CALORIES</span>
              <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>{totals.calories} <small style={{ fontSize: '0.75rem' }}>kcal</small></strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>PROTEIN</span>
              <strong style={{ fontSize: '1.15rem', color: '#3b82f6' }}>{totals.protein}g</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>CARBS</span>
              <strong style={{ fontSize: '1.15rem', color: '#f59e0b' }}>{totals.carbs}g</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>FATS</span>
              <strong style={{ fontSize: '1.15rem', color: '#ec4899' }}>{totals.fat}g</strong>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveDiet}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#10b981',
              borderColor: '#10b981'
            }}
          >
            <Check size={16} /> Save as My Active Diet Plan
          </button>
        </div>

        {/* 2-COLUMN BODY */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(280px, 1fr)',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* LEFT: SEARCH & FOOD SELECTION */}
          <div style={{ padding: '20px', borderRight: '1px solid var(--card-border)', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Utensils size={16} color="#10b981" /> 1. Select Food Item to Add
            </h3>

            {/* Target Meal Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {MEAL_TYPES.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActiveMealKey(m.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: activeMealKey === m.key ? '#10b981' : 'var(--card-border)',
                    background: activeMealKey === m.key ? 'rgba(16, 185, 129, 0.15)' : 'var(--card-bg-light)',
                    color: activeMealKey === m.key ? '#10b981' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {m.label.split(' ')[0]} ({customMeals[m.key]?.length || 0})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search roti, biryani, anda, daal, chicken, oats, milk..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg-light)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? '#3b82f6' : 'var(--card-border)',
                    background: selectedCategory === cat ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: selectedCategory === cat ? '#60a5fa' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Food Cards Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredFoods.map(food => (
                <div
                  key={food.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--card-bg-light)',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {food.name}
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {food.servingSize} • <strong style={{ color: '#10b981' }}>{food.calories} kcal</strong> | P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddFood(food)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: CURRENT MEAL STRUCTURE */}
          <div style={{ padding: '20px', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
              📋 2. Your Configured Meals
            </h3>

            {MEAL_TYPES.map(m => {
              const items = customMeals[m.key] || [];
              const mealCal = items.reduce((acc, it) => acc + (it.caloriesPerServing * (it.servings || 1)), 0);
              const mealP = items.reduce((acc, it) => acc + (it.proteinPerServing * (it.servings || 1)), 0);

              return (
                <div
                  key={m.key}
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: activeMealKey === m.key ? 'rgba(16, 185, 129, 0.05)' : 'var(--card-bg-light)',
                    border: '1px solid',
                    borderColor: activeMealKey === m.key ? 'rgba(16, 185, 129, 0.35)' : 'var(--card-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {m.label}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {mealCal} kcal • {Math.round(mealP)}g protein
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Koi food add nahi kiya. Left side se items add karein.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {items.map(item => (
                        <div
                          key={item.foodId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {item.caloriesPerServing * item.servings} kcal • {Math.round(item.proteinPerServing * item.servings)}g P
                            </span>
                          </div>

                          {/* Portion Counter */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateServings(m.key, item.foodId, -1)}
                              style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--card-border)', background: 'var(--card-bg-light)', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                              {item.servings}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateServings(m.key, item.foodId, 1)}
                              style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--card-border)', background: 'var(--card-bg-light)', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFood(m.key, item.foodId)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomDietBuilderModal;
