import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  X,
  Sparkles,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Utensils,
  ArrowLeft,
  Flame,
  Coffee,
  Sun,
  Moon,
  Cookie,
  RotateCcw,
  Check
} from 'lucide-react';
import foodLogService from './foodLogService';

const PAGE_SIZE = 9; // 9 items per page (Google-style fast pagination)

const MEAL_SLOT_OPTIONS = [
  { id: 'all', label: 'Sab Khane (All Meal Times)', icon: '🍽️', urdu: 'تمام اوقات' },
  { id: 'breakfast', label: 'Subah Ka Nashta (Breakfast)', icon: '🌅', urdu: 'صبح کا ناشتہ' },
  { id: 'lunch', label: 'Dopahar Ka Khana (Lunch)', icon: '☀️', urdu: 'دوپہر کا کھانا' },
  { id: 'snack', label: 'Sham Ka Khana / Snacks', icon: '☕', urdu: 'شام کا کھانا و اسنیکس' },
  { id: 'dinner', label: 'Raat Ka Khana (Dinner)', icon: '🌙', urdu: 'رات کا کھانا' }
];

const HEALTH_GOAL_OPTIONS = [
  { id: 'all', label: 'Sab Dishes (All Types)', icon: '🥗' },
  { id: 'gym', label: 'Gym & High Protein (≥18g Protein)', icon: '💪' },
  { id: 'low_calorie', label: 'Low Calorie & Fat Loss (≤220 kcal)', icon: '🔥' },
  { id: 'high_fiber', label: 'High Fiber & Clean Digestion', icon: '🌿' }
];

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All Categories' },
  { id: 'gosht', label: 'Gosht & Chicken (Meat & Poultry)' },
  { id: 'daal', label: 'Daal (Lentils & Pulses)' },
  { id: 'sabzi', label: 'Sabzi (Vegetables)' },
  { id: 'chawal', label: 'Chawal (Rice & Biryani)' },
  { id: 'roti_paratha', label: 'Roti & Breads' },
  { id: 'nashta', label: 'Traditional Nashta' },
  { id: 'bbq', label: 'BBQ & Tikka Kabab' },
  { id: 'drinks', label: 'Drinks & Shakes' },
  { id: 'snacks', label: 'Snacks & Chaat' }
];

export const FoodLibraryView = ({ onLogFoodDirectly } = {}) => {
  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealSlot, setSelectedMealSlot] = useState('all');
  const [selectedHealthGoal, setSelectedHealthGoal] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Paginated Data State
  const [allFetchedFoods, setAllFetchedFoods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Dedicated Detailed Info Page State
  const [selectedFoodForDetail, setSelectedFoodForDetail] = useState(null);

  // Active filter count
  const activeFilterCount =
    (selectedMealSlot !== 'all' ? 1 : 0) +
    (selectedHealthGoal !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0);

  // Fetch foods with query and filters
  const loadFoods = useCallback(async (query, mealSlot, healthGoal, category) => {
    setIsLoading(true);
    try {
      const filters = {};
      if (mealSlot && mealSlot !== 'all') {
        filters.mealSlot = mealSlot;
      }
      if (healthGoal && healthGoal !== 'all') {
        if (healthGoal === 'gym') {
          filters.minProtein = 18;
        } else if (healthGoal === 'low_calorie') {
          filters.maxCalories = 220;
        } else {
          filters.tag = healthGoal;
        }
      }

      const res = await foodLogService.searchFoods(query, category, 150, filters);
      if (res && res.success) {
        setAllFetchedFoods(res.foods || []);
        setCurrentPage(1); // Reset to page 1 on new search/filter
      }
    } catch (err) {
      console.warn('Food search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFoods(searchQuery, selectedMealSlot, selectedHealthGoal, selectedCategory);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedMealSlot, selectedHealthGoal, selectedCategory, loadFoods]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedMealSlot('all');
    setSelectedHealthGoal('all');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  // Pagination Math
  const totalItems = allFetchedFoods.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const displayedFoods = allFetchedFoods.slice(startIndex, startIndex + PAGE_SIZE);

  // Helper: Meal slot labels & icons for rendering badges
  const renderMealTimingBadges = (food) => {
    const slots = food.mealSlots || [];
    if (!slots || slots.length === 0) return null;

    const slotMap = {
      breakfast: { label: 'Nashta', icon: '🌅', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      lunch: { label: 'Lunch', icon: '☀️', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
      snack: { label: 'Sham Ka Khana', icon: '☕', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
      dinner: { label: 'Dinner', icon: '🌙', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' }
    };

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
        {slots.map((slot) => {
          const info = slotMap[slot];
          if (!info) return null;
          return (
            <span
              key={slot}
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '5px',
                background: info.bg,
                color: info.color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <span>{info.icon}</span> {info.label}
            </span>
          );
        })}
      </div>
    );
  };

  // ── IF A FOOD IS OPENED IN DEDICATED INFO PAGE VIEW ──
  if (selectedFoodForDetail) {
    const food = selectedFoodForDetail;
    const minKcal = food.minCalories || Math.round(food.calories * 0.85);
    const maxKcal = food.maxCalories || Math.round(food.calories * 1.15);
    const servingText = food.qtyPerPlate || `${food.typicalServing?.unit || '1 Serving'} (~${food.typicalServing?.grams || 150}g)`;
    const suitabilityList = food.whoCanEat && food.whoCanEat.length > 0 ? food.whoCanEat : ['Ghar Ke Sab Afrad (Family Friendly)', 'Balanced Nutrition'];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Back Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setSelectedFoodForDetail(null)}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg-light)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <ArrowLeft size={16} /> Wapas Recipe Library Mein Jayein
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Dish Knowledge & Recipe Encyclopedia · {food.category?.toUpperCase()}
          </span>
        </div>

        {/* Dish Hero Card */}
        <div className="glass-panel" style={{
          padding: '24px',
          borderRadius: '20px',
          background: 'var(--card-bg-light)',
          border: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  textTransform: 'uppercase'
                }}>
                  {food.category}
                </span>

                {food.isGymPreferred && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.25)',
                    color: '#34d399',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    💪 Gym & Fitness Preferred Choice
                  </span>
                )}
              </div>

              <h2 style={{ margin: '8px 0 2px', fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {food.simpleName || food.name}
              </h2>
              {food.variation && (
                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                  {food.variation}
                </div>
              )}
              {food.aliases?.urdu && (
                <div style={{ fontSize: '1rem', color: '#10b981', direction: 'rtl', textAlign: 'left', marginTop: '4px', fontWeight: 700 }}>
                  {Array.isArray(food.aliases.urdu) ? food.aliases.urdu.join(' • ') : food.aliases.urdu}
                </div>
              )}

              {/* Meal Timing Badges */}
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '6px', fontWeight: 600 }}>
                  Khane Ka Behtareen Waqt (Best Meal Timing):
                </span>
                {renderMealTimingBadges(food)}
              </div>
            </div>
          </div>

          {/* Portion & Calorie Range Banner */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qty Per Plate / Serving</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                🍽️ {servingText}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Calorie Range (Min - Max)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b' }}>
                🔥 {minKcal} - {maxKcal} kcal
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Avg: ~{food.calories} kcal (±15% est.)
              </span>
            </div>
          </div>

          {/* Nutritional Profile Grid */}
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Nutritional Profile (Per Serving)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', textAlign: 'center' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Protein</span>
                <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>{food.protein}g</strong>
              </div>
              <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Carbohydrates</span>
                <strong style={{ fontSize: '1.15rem', color: '#3b82f6' }}>{food.carbs}g</strong>
              </div>
              <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Fats</span>
                <strong style={{ fontSize: '1.15rem', color: '#eab308' }}>{food.fat}g</strong>
              </div>
              <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>Fiber</span>
                <strong style={{ fontSize: '1.15rem', color: '#a855f7' }}>{food.fiber || 0}g</strong>
              </div>
            </div>
          </div>

          {/* Step-by-Step Complete Recipe */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px' }}>
              <ChefHat size={20} color="#10b981" />
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                Complete Recipe (Step-by-Step Cooking Guide)
              </h4>
            </div>

            {food.recipeSteps && food.recipeSteps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {food.recipeSteps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <span style={{
                      flexShrink: 0,
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {food.howTypicallyMade || 'Ghar ke masalon se authentic Pakistani tareeqay se tayyar.'}
              </p>
            )}
          </div>

          {/* Main Ingredients */}
          {food.mainIngredients && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Bunyadi Ajza (Complete Ingredients):
              </h4>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(Array.isArray(food.mainIngredients) ? food.mainIngredients : [food.mainIngredients]).map((ing, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--card-border)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Healthy Cooking Tip */}
          {food.healthyTip && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.85rem',
              color: '#34d399',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>💡 Sehatmand Tareeqa (Healthy Cooking Hack & Gym Tip):</strong>
                <div style={{ marginTop: '2px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  {food.healthyTip}
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          {food.benefits && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '0.85rem',
              color: '#60a5fa',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>💪 Fitness & Nutritional Benefits:</strong>
                <div style={{ marginTop: '2px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  {food.benefits}
                </div>
              </div>
            </div>
          )}

          {/* Kon Log Kha Sakte Hain */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 800, color: '#34d399' }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span>Kon Log Kha Sakte Hain (Dietary Suitability):</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {suitabilityList.map((target, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  ✅ {target}
                </span>
              ))}
            </div>
          </div>

          {/* Health Considerations / Who Should Limit */}
          {food.whoShouldLimit && food.whoShouldLimit.length > 0 && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              fontSize: '0.82rem',
              color: '#f59e0b',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Ehtiyat (Health Cautions / Who Should Limit):</strong>
                <div style={{ marginTop: '2px', color: '#e2e8f0' }}>
                  {food.whoShouldLimit.join(' • ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN FOOD LIBRARY & RECIPE BROWSER ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── TOP SEARCH & FILTER BUTTON BAR ── */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--card-bg-light)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Pakistani Food & Recipe Library
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Gym aur healthy khano ka complete encyclopedia. Har dish ki mukammal recipe aur nutrition details!
            </span>
          </div>

          {/* View Mode Toggle (Table / Grid) */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            borderRadius: '10px',
            border: '1px solid var(--card-border)',
            padding: '4px'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'table' ? '#10b981' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <List size={14} /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'grid' ? '#10b981' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LayoutGrid size={14} /> Cards
            </button>
          </div>
        </div>

        {/* Search Bar + Filter Button (No horizontal scrolling pills!) */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search dish (e.g. Boiled Chicken, Eggs, Omelette, Oats, Fish, Daal, Roti)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 40px 11px 40px',
                borderRadius: '10px',
                border: '1px solid var(--card-border)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem'
              }}
            />
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '11px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeFilterCount > 0 ? '1px solid #10b981' : '1px solid var(--card-border)',
              background: activeFilterCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
              color: activeFilterCount > 0 ? '#10b981' : 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            <SlidersHorizontal size={17} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span style={{
                background: '#10b981',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active Filter Chips Bar (Shown when any filter is active) */}
        {(activeFilterCount > 0 || searchQuery) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '2px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Active Filters:
            </span>

            {selectedMealSlot !== 'all' && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {MEAL_SLOT_OPTIONS.find(m => m.id === selectedMealSlot)?.label}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedMealSlot('all')} />
              </span>
            )}

            {selectedHealthGoal !== 'all' && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {HEALTH_GOAL_OPTIONS.find(h => h.id === selectedHealthGoal)?.label}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedHealthGoal('all')} />
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory('all')} />
              </span>
            )}

            {searchQuery && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                "{searchQuery}"
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#ef4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '4px'
              }}
            >
              <RotateCcw size={12} /> Saaf Karein (Clear All)
            </button>
          </div>
        )}
      </div>

      {/* ── FILTER MODAL / DIALOG ── */}
      {isFilterModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--card-border, #334155)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            color: '#f8fafc',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Dish Filters & Khane Ka Waqt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 1. Khane Ka Waqt (Meal Time): Breakfast, Lunch, Sham Ka Khana, Dinner */}
            <div>
              <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                🕒 Khane Ka Waqt (Meal Timing):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '6px' }}>
                {MEAL_SLOT_OPTIONS.map((slot) => {
                  const isSelected = selectedMealSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedMealSlot(slot.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? '#10b981' : '#e2e8f0',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{slot.icon}</span>
                        <span>{slot.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', direction: 'rtl' }}>{slot.urdu}</span>
                        {isSelected && <Check size={16} color="#10b981" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Fitness & Sehat (Health Focus) */}
            <div>
              <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                💪 Sehat & Fitness Preference:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '6px' }}>
                {HEALTH_GOAL_OPTIONS.map((goal) => {
                  const isSelected = selectedHealthGoal === goal.id;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSelectedHealthGoal(goal.id)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? '#10b981' : '#cbd5e1',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {goal.icon} {goal.label}
                      </span>
                      {isSelected && <Check size={15} color="#10b981" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Category Filter */}
            <div>
              <span style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                🍲 Khane Ki Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id} style={{ background: '#1e293b', color: '#fff' }}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Reset (Saaf Karein)
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                style={{
                  flex: 2,
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Dishes Dekhein ({totalItems})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGINATED CONTENT LIST (TABLE OR CARDS) ── */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--card-bg-light)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Count & Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Kul {totalItems} dishes daryaft huin (Showing page {currentPage} of {totalPages})
          </span>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            💪 Top Gym & Healthy Dishes Priority Mode
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Dishes load ho rahi hain...
          </div>
        ) : displayedFoods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Koi dish nahi mili. Search ya filter reset karein.
          </div>
        ) : viewMode === 'table' ? (
          /* Table View (Actions column removed, Recipe & Info button only!) */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 14px' }}>Dish Ka Naam & Category</th>
                  <th style={{ padding: '12px 10px' }}>Khane Ka Waqt (Timing)</th>
                  <th style={{ padding: '12px 10px' }}>Qty Per Plate</th>
                  <th style={{ padding: '12px 10px' }}>Kcal & Macros</th>
                  <th style={{ padding: '12px 10px' }}>Kon Log Kha Sakte Hain</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Recipe & Tafseelat</th>
                </tr>
              </thead>
              <tbody>
                {displayedFoods.map((food) => {
                  const minKcal = food.minCalories || Math.round(food.calories * 0.85);
                  const maxKcal = food.maxCalories || Math.round(food.calories * 1.15);
                  const displayName = food.simpleName || food.name;
                  const servingText = food.qtyPerPlate || `${food.typicalServing?.unit || '1 Serving'} (~${food.typicalServing?.grams || 150}g)`;
                  const suitabilityList = food.whoCanEat && food.whoCanEat.length > 0 ? food.whoCanEat : ['Ghar Ke Sab Log'];

                  return (
                    <tr 
                      key={food.foodId} 
                      style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => setSelectedFoodForDetail(food)}
                    >
                      {/* 1. Dish Ka Naam */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {displayName}
                          </span>
                          {food.isGymPreferred && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#10b981'
                            }}>
                              💪 Gym Choice
                            </span>
                          )}
                          {food.category && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-secondary)'
                            }}>
                              {food.category}
                            </span>
                          )}
                        </div>
                        {food.variation && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            {food.variation}
                          </div>
                        )}
                        {food.aliases?.urdu && (
                          <div style={{ fontSize: '0.78rem', color: '#10b981', direction: 'rtl', textAlign: 'left', marginTop: '2px', fontWeight: 600 }}>
                            {Array.isArray(food.aliases.urdu) ? food.aliases.urdu[0] : food.aliases.urdu}
                          </div>
                        )}
                      </td>

                      {/* 2. Khane Ka Waqt (Timing) */}
                      <td style={{ padding: '14px 10px', minWidth: '120px' }}>
                        {renderMealTimingBadges(food)}
                      </td>

                      {/* 3. Qty Per Plate */}
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 9px',
                          borderRadius: '8px',
                          background: 'rgba(59, 130, 246, 0.08)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          🍽️ {servingText}
                        </span>
                      </td>

                      {/* 4. Kcal & Macros */}
                      <td style={{ padding: '14px 10px' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}>
                            🔥 {minKcal} - {maxKcal} kcal
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '3px' }}>
                            <strong style={{ color: '#10b981' }}>{food.protein}g P</strong> · {food.carbs}g C · {food.fat}g F
                          </span>
                        </div>
                      </td>

                      {/* 5. Kon Log Kha Sakte Hain */}
                      <td style={{ padding: '14px 10px', maxWidth: '180px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {suitabilityList.slice(0, 2).map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                fontSize: '0.7rem',
                                fontWeight: 600
                              }}
                            >
                              ✅ {item.split('(')[0].trim()}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 6. Recipe Button (NO action button, purely educational library!) */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFoodForDetail(food);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <ChefHat size={14} color="#10b981" /> Recipe & Info
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View (Action buttons removed!) */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
            {displayedFoods.map((food) => {
              const minKcal = food.minCalories || Math.round(food.calories * 0.85);
              const maxKcal = food.maxCalories || Math.round(food.calories * 1.15);
              const displayName = food.simpleName || food.name;
              const servingText = food.qtyPerPlate || `${food.typicalServing?.unit || '1 Serving'} (~${food.typicalServing?.grams || 150}g)`;
              const suitabilityList = food.whoCanEat && food.whoCanEat.length > 0 ? food.whoCanEat : ['Ghar Ke Sab Log'];

              return (
                <div
                  key={food.foodId}
                  onClick={() => setSelectedFoodForDetail(food)}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, border-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {displayName}
                          </h4>
                          {food.isGymPreferred && (
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#10b981'
                            }}>
                              💪 Gym Choice
                            </span>
                          )}
                        </div>
                        {food.variation && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            {food.variation}
                          </div>
                        )}
                        {food.aliases?.urdu && (
                          <div style={{ fontSize: '0.8rem', color: '#10b981', direction: 'rtl', textAlign: 'left', marginTop: '2px', fontWeight: 600 }}>
                            {Array.isArray(food.aliases.urdu) ? food.aliases.urdu[0] : food.aliases.urdu}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)'
                      }}>
                        {food.category}
                      </span>
                    </div>

                    {/* Meal Timing Badges */}
                    <div style={{ marginTop: '8px' }}>
                      {renderMealTimingBadges(food)}
                    </div>

                    {/* Serving & Calories */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '10px',
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        🍽️ {servingText}
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f59e0b' }}>
                        🔥 {minKcal} - {maxKcal} kcal
                      </span>
                    </div>

                    {/* Macros */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '6px',
                      fontSize: '0.75rem',
                      padding: '0 4px'
                    }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>Protein: {food.protein}g</span>
                      <span style={{ color: '#38bdf8' }}>Carbs: {food.carbs}g</span>
                      <span style={{ color: '#eab308' }}>Fat: {food.fat}g</span>
                    </div>

                    {/* Recipe summary */}
                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      {food.howTypicallyMade 
                        ? (food.howTypicallyMade.length > 70 ? food.howTypicallyMade.slice(0, 70) + '…' : food.howTypicallyMade)
                        : food.mainIngredients 
                        ? food.mainIngredients.slice(0, 3).join(', ')
                        : 'Ghar ke masalon se tayyar.'}
                    </div>

                    {/* Suitability */}
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {suitabilityList.slice(0, 2).map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            fontSize: '0.68rem',
                            fontWeight: 600
                          }}
                        >
                          ✅ {item.split('(')[0].trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Single View Recipe & Details Button (No action button) */}
                  <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFoodForDetail(food);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        color: '#34d399',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ChefHat size={14} color="#10b981" /> Pura Recipe & Tafseelat Dekhein
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── GOOGLE-STYLE PAGINATION CONTROLS ── */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '12px',
            borderTop: '1px solid var(--card-border)',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: currentPage <= 1 ? 'transparent' : 'var(--bg-input)',
                color: currentPage <= 1 ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ChevronLeft size={16} /> Pehla (Prev)
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              const isCurrent = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: isCurrent ? '1px solid #10b981' : '1px solid var(--card-border)',
                    background: isCurrent ? '#10b981' : 'var(--bg-input)',
                    color: isCurrent ? '#fff' : 'var(--text-primary)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: currentPage >= totalPages ? 'transparent' : 'var(--bg-input)',
                color: currentPage >= totalPages ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Agla (Next) <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodLibraryView;
