import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Flame,
  UtensilsCrossed,
  Droplets,
  Eye,
  X,
  List,
  LayoutGrid,
  Check,
  SlidersHorizontal,
  ChefHat,
  BookOpen,
  Heart,
  Layers,
  Utensils
} from 'lucide-react';
import foodLogService from './foodLogService';

const QUANTITY_PRESETS_SOLID = [0.5, 1, 1.5, 2, 2.5, 3];
const QUANTITY_PRESETS_DRINK = [1, 2, 3, 4];

const HEALTHY_PRESET_TAGS = [
  { id: 'all', label: 'All Dishes', icon: '🍽️' },
  { id: 'chicken', label: '🍗 Chicken', icon: '🍗' },
  { id: 'egg', label: '🥚 Egg', icon: '🥚' },
  { id: 'omelette', label: '🍳 Omelette', icon: '🍳' },
  { id: 'fries', label: '🍟 Fries', icon: '🍟' },
  { id: 'oats', label: '🥣 Oats', icon: '🥣' },
  { id: 'roti', label: '🫓 Roti', icon: '🫓' },
  { id: 'rice', label: '🍚 Rice', icon: '🍚' },
  { id: 'daal', label: '🍲 Daal', icon: '🍲' },
  { id: 'sabzi', label: '🥗 Mix Sabzi', icon: '🥗' },
  { id: 'healthy', label: '🌿 Diet Choice', icon: '🌿' },
  { id: 'high_protein', label: '💪 High Protein', icon: '💪' }
];

export const FoodLogView = ({ onLogUpdated }) => {
  // Date State: default today
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isBackfilled = selectedDate < todayStr;

  // View Layout Mode: 'table' | 'grid'
  const [viewMode, setViewMode] = useState('table');

  // Food Search, Categories & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [menuFoods, setMenuFoods] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Multi-Dish Plate / Thali Combination State (e.g. Salan + 2 Rotis + Raita)
  const [plateItems, setPlateItems] = useState([]);

  // Modals & Active Selections
  const [foodDetailModal, setFoodDetailModal] = useState(null); // Item open in full recipe & detail modal
  const [selectedFoodForQuickLog, setSelectedFoodForQuickLog] = useState(null); // Item active in quick single logger

  // Logging Form State
  const [mealSlot, setMealSlot] = useState('lunch');
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Daily Logs State
  const [dailyLogs, setDailyLogs] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Load Categories on mount
  useEffect(() => {
    foodLogService.getCategories()
      .then(res => {
        if (res.success) setCategories(res.categories);
      })
      .catch(err => console.warn('Could not load food categories:', err));
  }, []);

  // Fetch Daily Logs when date changes
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const data = await foodLogService.getFoodLogs(selectedDate);
      if (data.success) {
        setDailyLogs(data.logs || []);
        setDailySummary(data.summary || null);
      }
    } catch (err) {
      console.warn('Failed to fetch food logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Load Menu Foods (Debounced search or Category/Tag filters)
  const fetchMenu = useCallback(async (query, cat, tag) => {
    setIsLoadingMenu(true);
    try {
      const filters = {};
      let searchQ = query ? query.trim() : '';

      if (tag && tag !== 'all') {
        if (tag === 'high_protein') {
          filters.minProtein = 15;
        } else if (tag === 'low_calorie') {
          filters.maxCalories = 220;
        } else if (['chicken', 'egg', 'omelette', 'fries', 'oats', 'roti', 'rice', 'daal', 'sabzi'].includes(tag)) {
          // If a home preset was clicked and no explicit search text is typed, use the tag as search term
          if (!searchQ) {
            searchQ = tag;
          } else {
            filters.tag = tag;
          }
        } else {
          filters.tag = tag;
        }
      }

      const res = await foodLogService.searchFoods(searchQ, cat || 'all', 60, filters);
      if (res.success) {
        setMenuFoods(res.foods || []);
      }
    } catch (err) {
      console.warn('Menu fetch failed:', err);
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMenu(searchQuery, selectedCategory, selectedTag);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedTag, fetchMenu]);

  // Quick date selector
  const setQuickDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Add dish to Plate/Thali builder
  const handleAddToPlate = (food, defaultQty = 1) => {
    setPlateItems(prev => {
      const existing = prev.find(p => p.food.foodId === food.foodId);
      if (existing) {
        return prev.map(p =>
          p.food.foodId === food.foodId
            ? { ...p, quantity: Number((p.quantity + defaultQty).toFixed(2)) }
            : p
        );
      }
      return [...prev, { food, quantity: defaultQty }];
    });
    setStatusMessage({
      type: 'success',
      text: `Added "${food.baseName || food.name}" to your current Plate/Thali!`
    });
  };

  // Adjust portion in Plate/Thali
  const handleUpdatePlateQuantity = (foodId, delta) => {
    setPlateItems(prev =>
      prev.map(p => {
        if (p.food.foodId === foodId) {
          const newQty = Math.max(0.25, Math.min(10, Number((p.quantity + delta).toFixed(2))));
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  // Remove dish from Plate/Thali
  const handleRemoveFromPlate = (foodId) => {
    setPlateItems(prev => prev.filter(p => p.food.foodId !== foodId));
  };

  // Clear whole Plate
  const handleClearPlate = () => {
    setPlateItems([]);
  };

  // Log complete multi-dish Plate/Thali combination
  const handleLogPlate = async () => {
    if (plateItems.length === 0) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = {
        date: selectedDate,
        mealSlot,
        items: plateItems.map(p => ({
          foodId: p.food.foodId,
          quantity: p.quantity
        })),
        notes: notes || plateItems.map(p => `${p.quantity}x ${p.food.baseName || p.food.name}`).join(' + ')
      };

      await foodLogService.logMeal(payload);
      setStatusMessage({
        type: 'success',
        text: `Logged complete meal plate (${plateItems.length} dishes) for ${mealSlot.toUpperCase()}!`
      });

      setPlateItems([]);
      setNotes('');
      await fetchLogs();
      if (onLogUpdated) onLogUpdated();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to log plate combination'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick single-food log handler
  const handleQuickLogSingle = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedFoodForQuickLog) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = {
        date: selectedDate,
        mealSlot,
        items: [
          {
            foodId: selectedFoodForQuickLog.foodId,
            quantity: Number(quickQuantity)
          }
        ],
        notes
      };

      await foodLogService.logMeal(payload);
      setStatusMessage({
        type: 'success',
        text: `Logged ${quickQuantity}x ${selectedFoodForQuickLog.baseName || selectedFoodForQuickLog.name} for ${mealSlot.toUpperCase()}`
      });

      setSelectedFoodForQuickLog(null);
      setQuickQuantity(1);
      setNotes('');
      await fetchLogs();
      if (onLogUpdated) onLogUpdated();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to log food'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete logged meal entry
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this meal log?')) return;
    try {
      await foodLogService.deleteFoodLog(logId);
      await fetchLogs();
      if (onLogUpdated) onLogUpdated();
    } catch (err) {
      alert(err.message || 'Failed to delete food log');
    }
  };

  // Plate Calculations
  const plateTotalCalories = plateItems.reduce((acc, p) => acc + Math.round((p.food.calories || 0) * p.quantity), 0);
  const plateRangeMin = Math.round(plateTotalCalories * 0.85);
  const plateRangeMax = Math.round(plateTotalCalories * 1.15);
  const plateTotalProtein = plateItems.reduce((acc, p) => acc + (p.food.protein || 0) * p.quantity, 0).toFixed(1);
  const plateTotalCarbs = plateItems.reduce((acc, p) => acc + (p.food.carbs || 0) * p.quantity, 0).toFixed(1);
  const plateTotalFat = plateItems.reduce((acc, p) => acc + (p.food.fat || 0) * p.quantity, 0).toFixed(1);

  // Single Quick-log Calculations
  const isQuickDrink = selectedFoodForQuickLog?.category === 'drinks';
  const quickPresets = isQuickDrink ? QUANTITY_PRESETS_DRINK : QUANTITY_PRESETS_SOLID;
  const quickCalories = selectedFoodForQuickLog ? Math.round((selectedFoodForQuickLog.calories || 0) * quickQuantity) : 0;
  const quickMinCal = Math.round(quickCalories * 0.85);
  const quickMaxCal = Math.round(quickCalories * 1.15);

  const activeFiltersCount = (selectedCategory !== 'all' ? 1 : 0) + (selectedTag !== 'all' ? 1 : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── TOP HEADER & DATE CONTROLLER ── */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        borderRadius: '16px',
        background: 'var(--card-bg-light)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UtensilsCrossed size={20} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Pakistani Food Database & Thali Log
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Log individual dishes or build a complete Pakistani Thali (Salan + Roti + Chawal).
          </p>
        </div>

        {/* Date Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setQuickDate(0)}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedDate === todayStr ? '1px solid #10b981' : '1px solid var(--card-border)',
              background: selectedDate === todayStr ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: selectedDate === todayStr ? '#10b981' : 'var(--text-secondary)'
            }}
          >
            Today (Aaj)
          </button>

          <button
            type="button"
            onClick={() => setQuickDate(1)}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: isBackfilled ? '1px solid #f59e0b' : '1px solid var(--card-border)',
              background: isBackfilled ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: isBackfilled ? '#f59e0b' : 'var(--text-secondary)'
            }}
          >
            Yesterday (Kal)
          </button>

          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {isBackfilled && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          fontSize: '0.85rem',
          color: '#f59e0b'
        }}>
          <Clock size={18} />
          <span>
            <strong>Backfill Mode:</strong> Recording meals for past date: <u>{selectedDate}</u>.
          </span>
        </div>
      )}

      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '0.85rem',
          background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          color: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ── SEARCH & FILTER CONTROLLER (NO HORIZONTAL SCROLLBAR) ── */}
      <div className="glass-panel" style={{
        padding: '18px 20px',
        borderRadius: '16px',
        background: 'var(--card-bg-light)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Main Search Bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Search dish or recipe (e.g. Biryani, Aloo Gobi, Oats, Daliya, Daal, Roti)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 40px 12px 42px',
                borderRadius: '10px',
                border: '1px solid var(--card-border)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Clean Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              border: activeFiltersCount > 0 ? '1px solid #10b981' : '1px solid var(--card-border)',
              background: activeFiltersCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
              color: activeFiltersCount > 0 ? '#10b981' : 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span style={{
                background: '#10b981',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 800,
                borderRadius: '10px',
                padding: '1px 6px',
                marginLeft: '2px'
              }}>
                {activeFiltersCount}
              </span>
            )}
          </button>

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
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <List size={15} /> Table Menu
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
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LayoutGrid size={15} /> Cards
            </button>
          </div>
        </div>

        {/* Active Filter Badges (Wrapped gracefully - NO ugly horizontal line scrollbar) */}
        {(selectedTag !== 'all' || selectedCategory !== 'all' || searchQuery) && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Active Filters:
            </span>

            {selectedTag !== 'all' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                Tag: {HEALTHY_PRESET_TAGS.find(t => t.id === selectedTag)?.label || selectedTag}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedTag('all')} />
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '14px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                Category: {categories.find(c => c.id === selectedCategory)?.label?.split('(')[0]?.trim() || selectedCategory}
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory('all')} />
              </span>
            )}

            {searchQuery && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                Search: "{searchQuery}"
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedTag('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '2px 6px'
              }}
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT: RESTAURANT MENU + COMBINATION THALI TRAY ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(320px, 1.1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* ── LEFT: DISHES LIST (TABLE OR GRID) ── */}
        <div className="glass-panel" style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--card-bg-light)',
          border: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Showing {menuFoods.length} Pakistani dishes & recipes
            </span>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ChefHat size={14} /> Tap "Recipe & Khasiyat" to view cooking method & low-oil tips
            </span>
          </div>

          {isLoadingMenu ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Loading Pakistani menu items...
            </div>
          ) : menuFoods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <p>No dishes found matching your query or filter. Try clearing filters or searching another dish.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* ── MODERN DISHES TABLE VIEW (CLEAN & SIMPLE) ── */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 14px' }}>Dish Ka Naam</th>
                    <th style={{ padding: '12px 10px' }}>Qty Per Plate</th>
                    <th style={{ padding: '12px 10px' }}>Kcal (Min - Max)</th>
                    <th style={{ padding: '12px 10px' }}>Recipe Used</th>
                    <th style={{ padding: '12px 10px' }}>Kon Log Kha Sakte Hain</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuFoods.map((food) => {
                    const minKcal = food.minCalories || Math.round(food.calories * 0.85);
                    const maxKcal = food.maxCalories || Math.round(food.calories * 1.15);
                    const displayName = food.simpleName || food.name;
                    const servingText = food.qtyPerPlate || `${food.typicalServing?.unit || '1 Serving'} (~${food.typicalServing?.grams || 150}g)`;
                    const suitabilityList = food.whoCanEat && food.whoCanEat.length > 0 ? food.whoCanEat : ['Ghar Ke Sab Log'];
                    const cautions = food.whoShouldLimit && food.whoShouldLimit.length > 0 ? food.whoShouldLimit : [];

                    return (
                      <tr 
                        key={food.foodId} 
                        style={{ 
                          borderBottom: '1px solid var(--card-border)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* 1. DISH KA NAAM */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {displayName}
                            </span>
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

                        {/* 2. QTY PER PLATE */}
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

                        {/* 3. KCAL MIN - MAX */}
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
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '3px' }}>
                              ~{food.calories} avg ({food.protein}g P · {food.carbs}g C · {food.fat}g F)
                            </span>
                          </div>
                        </td>

                        {/* 4. RECIPE USED */}
                        <td style={{ padding: '14px 10px', maxWidth: '240px' }}>
                          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4, marginBottom: '6px' }}>
                            {food.howTypicallyMade 
                              ? (food.howTypicallyMade.length > 55 ? food.howTypicallyMade.slice(0, 55) + '…' : food.howTypicallyMade)
                              : food.mainIngredients 
                              ? food.mainIngredients.slice(0, 3).join(', ') + '…'
                              : 'Ghar ke taza masalon se tayyar.'}
                          </div>
                          <button
                            type="button"
                            onClick={() => setFoodDetailModal(food)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#34d399',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ChefHat size={12} color="#10b981" /> Recipe Dekhein
                          </button>
                        </td>

                        {/* 5. KON LOG KHA SAKTE HAIN */}
                        <td style={{ padding: '14px 10px', maxWidth: '220px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                            {cautions.length > 0 && (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#f59e0b',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                display: 'inline-block'
                              }}>
                                ⚠️ Ehtiyat: {cautions[0].slice(0, 28)}…
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. ACTIONS */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {/* Add to Plate / Thali */}
                            <button
                              type="button"
                              onClick={() => handleAddToPlate(food, 1)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#60a5fa',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Add to multi-dish Plate/Thali combination"
                            >
                              <Layers size={13} /> + Thali
                            </button>

                            {/* Quick Single Log */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFoodForQuickLog(food);
                                setQuickQuantity(1);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#10b981',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Quick log this single food directly"
                            >
                              <Plus size={13} /> Log
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── MODERN CARD GRID VIEW (CLEAN & SIMPLE) ── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {menuFoods.map((food) => {
                const minKcal = food.minCalories || Math.round(food.calories * 0.85);
                const maxKcal = food.maxCalories || Math.round(food.calories * 1.15);
                const displayName = food.simpleName || food.name;
                const servingText = food.qtyPerPlate || `${food.typicalServing?.unit || '1 Serving'} (~${food.typicalServing?.grams || 150}g)`;
                const suitabilityList = food.whoCanEat && food.whoCanEat.length > 0 ? food.whoCanEat : ['Ghar Ke Sab Log'];
                const cautions = food.whoShouldLimit && food.whoShouldLimit.length > 0 ? food.whoShouldLimit : [];

                return (
                  <div
                    key={food.foodId}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <div>
                      {/* Top: Dish Ka Naam & Category */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {displayName}
                          </h4>
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

                      {/* Qty Per Plate & Kcal Min - Max */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '12px',
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

                      {/* Macros Bar */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        marginTop: '6px',
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '6px'
                      }}>
                        <span style={{ color: '#10b981' }}><strong>P:</strong> {food.protein}g</span>
                        <span style={{ color: '#3b82f6' }}><strong>C:</strong> {food.carbs}g</span>
                        <span style={{ color: '#eab308' }}><strong>F:</strong> {food.fat}g</span>
                        <span style={{ color: '#a855f7' }}><strong>Fib:</strong> {food.fiber || 0}g</span>
                      </div>

                      {/* Recipe Used Summary */}
                      <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>Recipe: </span>
                        {food.howTypicallyMade 
                          ? (food.howTypicallyMade.length > 70 ? food.howTypicallyMade.slice(0, 70) + '…' : food.howTypicallyMade)
                          : food.mainIngredients 
                          ? food.mainIngredients.slice(0, 4).join(', ')
                          : 'Ghar ke masalon se tayyar.'}
                      </div>

                      {/* Kon Log Kha Sakte Hain */}
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
                        {cautions.length > 0 && (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            fontSize: '0.68rem',
                            fontWeight: 600
                          }}>
                            ⚠️ Ehtiyat: {cautions[0].slice(0, 30)}…
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setFoodDetailModal(food)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: '#34d399',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <ChefHat size={13} color="#10b981" /> Recipe
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddToPlate(food, 1)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Layers size={13} /> + Thali
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFoodForQuickLog(food);
                          setQuickQuantity(1);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#10b981',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Log
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: MULTI-DISH THALI / PLATE BUILDER & DAILY SUMMARY ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ── THALI / PLATE COMBINATION BUILDER ── */}
          <div className="glass-panel" style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'var(--card-bg-light)',
            border: plateItems.length > 0 ? '1px solid #10b981' : '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: plateItems.length > 0 ? '0 4px 20px rgba(16, 185, 129, 0.12)' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#10b981" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Meri Plate / Thali Combination
                </h4>
              </div>
              {plateItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearPlate}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Clear Plate
                </button>
              )}
            </div>

            {plateItems.length === 0 ? (
              <div style={{
                padding: '20px 14px',
                borderRadius: '12px',
                border: '1px dashed var(--card-border)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                lineHeight: 1.5
              }}>
                <Utensils size={24} style={{ opacity: 0.4, margin: '0 auto 6px' }} />
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Your Plate is Empty
                </p>
                <span>
                  Tap <strong>"+ Thali"</strong> on any dish (e.g. Aloo Gobi + 2 Rotis + Raita) to calculate and log your full meal combination together!
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* List of items in current Plate */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {plateItems.map((item) => (
                    <div
                      key={item.food.foodId}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--card-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.food.baseName || item.food.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          ~{Math.round((item.food.calories || 0) * item.quantity)} kcal ({item.quantity}x {item.food.typicalServing?.unit})
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdatePlateQuantity(item.food.foodId, -0.5)}
                          disabled={item.quantity <= 0.5}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: '1px solid var(--card-border)',
                            background: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: item.quantity <= 0.5 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, minWidth: '24px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdatePlateQuantity(item.food.foodId, 0.5)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: '1px solid var(--card-border)',
                            background: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromPlate(item.food.foodId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            marginLeft: '4px',
                            padding: '2px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Combined Plate Nutritional Summary */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Total Plate Intake Range (±15%):
                    </span>
                    <strong style={{ fontSize: '1rem', color: '#10b981' }}>
                      {plateRangeMin} – {plateRangeMax} kcal
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <span>Estimated Midpoint: <strong>{plateTotalCalories} kcal</strong></span>
                    <span>P: <strong>{plateTotalProtein}g</strong> | C: <strong>{plateTotalCarbs}g</strong> | F: <strong>{plateTotalFat}g</strong></span>
                  </div>
                </div>

                {/* Meal Slot Picker */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setMealSlot(slot)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        border: mealSlot === slot ? '1px solid #10b981' : '1px solid var(--card-border)',
                        background: mealSlot === slot ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-input)',
                        color: mealSlot === slot ? '#10b981' : 'var(--text-secondary)'
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                {/* Submit Complete Plate */}
                <button
                  type="button"
                  onClick={handleLogPlate}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Check size={16} />
                  {isSubmitting ? 'Recording Plate...' : `Log Complete Plate (${plateItems.length} Dishes)`}
                </button>
              </div>
            )}
          </div>

          {/* ── DAILY LOGGED MEALS SUMMARY ── */}
          <div className="glass-panel" style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'var(--card-bg-light)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Recorded Meals for {selectedDate}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {dailyLogs.length} entries recorded
                </span>
              </div>

              {dailySummary && dailySummary.totalEstimatedCalories > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Day Intake Range:</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>
                    {dailySummary.totalRangeMin} – {dailySummary.totalRangeMax} kcal
                  </div>
                </div>
              )}
            </div>

            {isLoadingLogs ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Loading food logs...
              </div>
            ) : dailyLogs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 16px',
                border: '1px dashed var(--card-border)',
                borderRadius: '12px',
                color: 'var(--text-secondary)'
              }}>
                <UtensilsCrossed size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No meals logged for this date.
                </p>
                <span style={{ fontSize: '0.78rem' }}>
                  Select any dish from the menu on the left to record what you ate.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {dailyLogs.map(log => (
                  <div
                    key={log._id}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          textTransform: 'uppercase',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981'
                        }}>
                          {log.mealSlot}
                        </span>
                        {log.isBackfilled && (
                          <span style={{ fontSize: '0.68rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> backfilled
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        title="Delete log"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {log.items?.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {item.quantity}x • {item.servingUnit}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {item.caloriesRangeMin}–{item.caloriesRangeMax} kcal
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            (Est. {item.caloriesEstimated})
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '4px',
                      marginTop: '2px'
                    }}>
                      <span>P: {log.totalProteinG}g</span>
                      <span>C: {log.totalCarbsG}g</span>
                      <span>F: {log.totalFatG}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTER MODAL (CLEAN GRID, NO HORIZONTAL SCROLLBAR) ── */}
      {isFilterModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 99998,
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
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: '#f8fafc'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Menu Filters & Healthy Choices
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Section 1: Healthy & Fitness Presets */}
            <div>
              <h5 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                🌟 Healthy Diet & Macro Presets
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                {HEALTHY_PRESET_TAGS.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTag(tag.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedTag === tag.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedTag === tag.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedTag === tag.id ? '#10b981' : '#cbd5e1',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Pakistani Food Categories Grid */}
            <div>
              <h5 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                🍲 Pakistani Food Category (Khana Type)
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: selectedCategory === 'all' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedCategory === 'all' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: selectedCategory === 'all' ? '#10b981' : '#cbd5e1'
                  }}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedCategory === cat.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedCategory === cat.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedCategory === cat.id ? '#10b981' : '#cbd5e1'
                    }}
                  >
                    <div>{cat.label.split('(')[0].trim()}</div>
                    {cat.urdu && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', direction: 'rtl' }}>
                        {cat.urdu}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag('all');
                  setSelectedCategory('all');
                }}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                style={{
                  flex: 2,
                  padding: '11px',
                  borderRadius: '10px',
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Apply Filters ({activeFiltersCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTHENTIC RECIPE & KHASIYAT MODAL ── */}
      {foodDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
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
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            color: '#f8fafc'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  textTransform: 'uppercase'
                }}>
                  {foodDetailModal.category}
                </span>
                <h3 style={{ margin: '6px 0 0', fontSize: '1.45rem', fontWeight: 800 }}>
                  {foodDetailModal.simpleName || foodDetailModal.name}
                </h3>
                {foodDetailModal.variation && (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
                    {foodDetailModal.variation}
                  </div>
                )}
                {foodDetailModal.aliases?.urdu && (
                  <div style={{ fontSize: '0.95rem', color: '#10b981', direction: 'rtl', textAlign: 'left', marginTop: '2px', fontWeight: 700 }}>
                    {Array.isArray(foodDetailModal.aliases.urdu) ? foodDetailModal.aliases.urdu.join(' • ') : foodDetailModal.aliases.urdu}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFoodDetailModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Portion & Calorie Banner */}
            <div style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Qty Per Plate / Serving</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                  🍽️ {foodDetailModal.qtyPerPlate || `${foodDetailModal.typicalServing?.unit} (~${foodDetailModal.typicalServing?.grams}g)`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Calorie Range (Min - Max)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                  🔥 {foodDetailModal.minCalories || Math.round(foodDetailModal.calories * 0.85)} - {foodDetailModal.maxCalories || Math.round(foodDetailModal.calories * 1.15)} kcal
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Avg: ~{foodDetailModal.calories} kcal (±15% est.)
                </div>
              </div>
            </div>

            {/* Complete Nutritional Table */}
            <div>
              <h5 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                Nutritional Profile (Per Serving)
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Protein</span>
                  <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>{foodDetailModal.protein}g</strong>
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Carbs</span>
                  <strong style={{ fontSize: '0.95rem', color: '#3b82f6' }}>{foodDetailModal.carbs}g</strong>
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Fat</span>
                  <strong style={{ fontSize: '0.95rem', color: '#f59e0b' }}>{foodDetailModal.fat}g</strong>
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Fiber</span>
                  <strong style={{ fontSize: '0.95rem', color: '#a855f7' }}>{foodDetailModal.fiber || 0}g</strong>
                </div>
              </div>
            </div>

            {/* 👨‍🍳 GHAR KI RECIPE (AUTHENTIC STEP-BY-STEP HOME PREPARATION) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px' }}>
                <ChefHat size={18} color="#10b981" />
                <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>
                  Ghar Ki Recipe (Step-by-Step Cooking Steps)
                </h5>
              </div>

              {foodDetailModal.recipeSteps && foodDetailModal.recipeSteps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {foodDetailModal.recipeSteps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        fontSize: '0.85rem',
                        lineHeight: 1.45,
                        color: '#e2e8f0'
                      }}
                    >
                      <span style={{
                        flexShrink: 0,
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        fontSize: '0.75rem',
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
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {foodDetailModal.howTypicallyMade || 'Prepared according to traditional Pakistani home recipe.'}
                </p>
              )}
            </div>

            {/* Main Ingredients (Ajza) */}
            {foodDetailModal.mainIngredients && (
              <div>
                <h5 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  Main Ingredients (Bunyadi Ajza)
                </h5>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(Array.isArray(foodDetailModal.mainIngredients) ? foodDetailModal.mainIngredients : [foodDetailModal.mainIngredients]).map((ing, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        fontSize: '0.75rem',
                        color: '#cbd5e1'
                      }}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 💡 SEHATMAND COOKING VERSION & LOW-OIL TIP */}
            {foodDetailModal.healthyTip && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.82rem',
                color: '#34d399',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>💡 Sehatmand Tareeqa (Healthy Cooking Hack):</strong>
                  <div style={{ marginTop: '2px', color: '#e2e8f0', lineHeight: 1.45 }}>
                    {foodDetailModal.healthyTip}
                  </div>
                </div>
              </div>
            )}

            {/* Khasiyat & Health Benefits */}
            {foodDetailModal.benefits && (
              <div>
                <h5 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                  Khasiyat & Benefits
                </h5>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {foodDetailModal.benefits}
                </p>
              </div>
            )}

            {/* Kon Log Kha Sakte Hain (Who Can Eat / Suitability) */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.82rem',
              color: '#34d399'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Kon Log Kha Sakte Hain (Suitable For & Best Choice):</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {(foodDetailModal.whoCanEat && foodDetailModal.whoCanEat.length > 0 
                  ? foodDetailModal.whoCanEat 
                  : ['Ghar Ke Sab Afrad (Family Friendly)', 'Balanced Daily Nutrition']
                ).map((target, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#a7f3d0',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    ✅ {target}
                  </span>
                ))}
              </div>
            </div>

            {/* Health Considerations / Who Should Limit */}
            {foodDetailModal.whoShouldLimit?.length > 0 && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '0.8rem',
                color: '#f59e0b',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Health Cautions (General Information Only):</strong>
                  <div style={{ marginTop: '2px' }}>
                    Who should limit/monitor: {foodDetailModal.whoShouldLimit.join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  handleAddToPlate(foodDetailModal, 1);
                  setFoodDetailModal(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Layers size={16} /> + Add to My Plate / Thali
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFoodForQuickLog(foodDetailModal);
                  setQuickQuantity(1);
                  setFoodDetailModal(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={16} /> Quick Log Single
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK SINGLE-DISH LOGGER MODAL ── */}
      {selectedFoodForQuickLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
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
            maxWidth: '480px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            color: '#f8fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                  Quick Meal Logger
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
                  {selectedFoodForQuickLog.baseName || selectedFoodForQuickLog.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFoodForQuickLog(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Meal Slot */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Select Meal Slot:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['breakfast', 'lunch', 'dinner', 'snack'].map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setMealSlot(slot)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      border: mealSlot === slot ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      background: mealSlot === slot ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: mealSlot === slot ? '#10b981' : '#cbd5e1'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Picker */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Quantity ({selectedFoodForQuickLog.typicalServing?.unit || 'serving'}):
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {quickPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuickQuantity(preset)}
                    style={{
                      flex: 1,
                      minWidth: '50px',
                      padding: '8px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: quickQuantity === preset ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      background: quickQuantity === preset ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: quickQuantity === preset ? '#10b981' : '#cbd5e1'
                    }}
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Range */}
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Estimated Range (±15%)</span>
                <strong style={{ fontSize: '1.05rem', color: '#f59e0b' }}>{quickMinCal} – {quickMaxCal} kcal</strong>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                Midpoint: <strong style={{ color: '#10b981' }}>{quickCalories} kcal</strong>
              </div>
            </div>

            {/* Notes */}
            <input
              type="text"
              placeholder="Optional notes (e.g. kam tail, double roti)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />

            {/* Action */}
            <button
              type="button"
              onClick={handleQuickLogSingle}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: '#10b981',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              {isSubmitting ? 'Recording...' : `Log to ${mealSlot.toUpperCase()}`}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FoodLogView;
