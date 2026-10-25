import React, { useState, useEffect, useCallback } from 'react';
import { Utensils, Flame, Droplets, RefreshCw, MessageSquare, CheckCircle2, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';
import DietCatalogue from '../../components/trainee/DietCatalogue';

const MyAIDietHub = ({ aiPlan }) => {
  const [activeUserDiet, setActiveUserDiet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [activeDayTab, setActiveDayTab] = useState('today');

  // Load active diet from server or fallback to props
  const fetchActiveDiet = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('gymsync_token');
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');

    // Check localStorage cache first
    try {
      const local = localStorage.getItem(`gymsync_${userKey}_active_diet`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && (parsed.title || parsed.meals)) {
          setActiveUserDiet(parsed);
        }
      }
    } catch {}

    // Fetch authoritative active diet from backend
    if (token) {
      try {
        const res = await fetch('/api/plans/user-diets/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const serverDiet = await res.json();
          if (serverDiet && (serverDiet.title || serverDiet.meals)) {
            setActiveUserDiet(serverDiet);
            localStorage.setItem(`gymsync_${userKey}_active_diet`, JSON.stringify(serverDiet));
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch active user diet from API:', err);
      }
    }

    // Fallback: check if aiPlan has an active diet attached
    const propDiet = aiPlan?.structuredDiet || aiPlan?.diet || null;
    if (propDiet && (propDiet.title || propDiet.meals)) {
      setActiveUserDiet(propDiet);
    }

    setLoading(false);
  }, [aiPlan]);

  useEffect(() => {
    fetchActiveDiet();
  }, [fetchActiveDiet]);

  const handleOpenNutritionist = (customCommand = '') => {
    window.dispatchEvent(new CustomEvent('gymsync_open_nutritionist', {
      detail: {
        command: customCommand || "What should I eat today according to my workout plan?"
      }
    }));
  };

  const handleSwapMeal = (mealName) => {
    handleOpenNutritionist(`I want to swap or replace an ingredient in my ${mealName}. What are my macro-friendly alternatives?`);
  };

  const handleDietAdopted = (newDiet) => {
    setActiveUserDiet(newDiet);
    setShowCatalogue(false);
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    try {
      localStorage.setItem(`gymsync_${userKey}_active_diet`, JSON.stringify(newDiet));
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <p>Loading verified nutrition protocol...</p>
      </div>
    );
  }

  // ── CASE 1: NO ACTIVE DIET ASSIGNED (Strict Diet Safety State) ──
  if (!activeUserDiet || (!activeUserDiet.meals && !activeUserDiet.foodItems)) {
    return (
      <div className="my-ai-diet-hub" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* SAFETY PROTOCOL CARD */}
        <div className="glass-panel" style={{
          padding: '28px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.06) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Diet Safety Protocol: Verified Plans Only
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                GymSync does not automatically generate unverified diet calories without certified clinical review.
              </p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            To safeguard your metabolic health, prevent nutrient deficiencies, and respect food allergies, nutrition plans must either be prescribed by a certified fitness instructor or adopted from verified dietary templates.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => handleOpenNutritionist('I want help understanding my nutrition options and finding a certified diet template.')}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'var(--card-bg-light)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <MessageSquare size={16} />
              Consult AI Nutritionist
            </button>
          </div>
        </div>

        {/* INLINE INSTRUCTOR DIET CATALOGUE */}
        <DietCatalogue onDietAdopted={handleDietAdopted} />
      </div>
    );
  }

  // ── CASE 2: USER HAS AN AUTHORITATIVE ACTIVE DIET ASSIGNED ──
  const calories = activeUserDiet.calories || activeUserDiet.actualTotals?.totalDailyCalories || activeUserDiet.targetCalories || 0;
  const protein = activeUserDiet.protein || activeUserDiet.actualTotals?.totalProtein || activeUserDiet.targetProtein || 0;
  const carbs = activeUserDiet.carbs || activeUserDiet.actualTotals?.totalCarbs || activeUserDiet.targetCarbs || 0;
  const fat = activeUserDiet.fat || activeUserDiet.actualTotals?.totalFat || activeUserDiet.targetFat || 0;
  const hydration = activeUserDiet.hydrationTargetLiters || activeUserDiet.hydrationLiters || 3.0;

  const meals = activeUserDiet.meals || [];

  return (
    <div className="my-ai-diet-hub" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HERO / STATUS CARD */}
      <div className="glass-panel" style={{
        padding: '24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.4rem' }}>🥗</span>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeUserDiet.title || 'My Active Nutrition Protocol'}
            </h2>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.35)'
            }}>
              Verified Protocol
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Formulated by <strong>{activeUserDiet.instructorName || activeUserDiet.createdBy || 'Certified Fitness Instructor'}</strong> • Goal: <strong>{activeUserDiet.goal || activeUserDiet.category || 'Balanced Fitness'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowCatalogue(!showCatalogue)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'var(--card-bg-light)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Utensils size={16} />
            {showCatalogue ? 'Hide Catalogue' : 'Browse Other Diets'}
          </button>

          <button
            type="button"
            onClick={() => handleOpenNutritionist()}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            <MessageSquare size={16} />
            Ask Nutritionist
          </button>
        </div>
      </div>

      {/* CONDITIONAL: SHOW CATALOGUE FOR SWAPPING DIETS */}
      {showCatalogue && (
        <div style={{ marginBottom: '16px' }}>
          <DietCatalogue onDietAdopted={handleDietAdopted} />
        </div>
      )}

      {/* DAILY MACRO METRICS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        {/* Calories */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Daily Energy</span>
            <Flame size={18} color="#f97316" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {calories} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>kcal</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 500 }}>Calibrated target</span>
        </div>

        {/* Protein */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Target Protein</span>
            <span style={{ fontSize: '1rem' }}>🥩</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {protein} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>g</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 500 }}>Muscle recovery</span>
        </div>

        {/* Carbs */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Carbohydrates</span>
            <span style={{ fontSize: '1rem' }}>🍚</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {carbs} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>g</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 500 }}>Training energy</span>
        </div>

        {/* Fats */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Healthy Fats</span>
            <span style={{ fontSize: '1rem' }}>🥑</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {fat} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>g</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 500 }}>Hormone health</span>
        </div>

        {/* Hydration */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Hydration Goal</span>
            <Droplets size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {hydration} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>L</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 500 }}>Daily water target</span>
        </div>
      </div>

      {/* MEAL SCHEDULE CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
          Prescribed Meals ({meals.length})
        </h3>
        {meals.map((meal, mIdx) => {
          const items = meal.foodItems || meal.items || [];
          const mealName = meal.name || meal.mealName || `Meal ${mIdx + 1}`;
          return (
            <div
              key={mIdx}
              className="glass-panel"
              style={{
                padding: '18px 22px',
                borderRadius: '14px',
                background: 'var(--card-bg-light)',
                border: '1px solid var(--card-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {mealName}
                  </span>
                  {meal.timing && (
                    <span style={{ marginLeft: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--card-bg)', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      ⏰ {meal.timing}
                    </span>
                  )}
                  {meal.calories > 0 && (
                    <span style={{ marginLeft: '8px', fontSize: '0.76rem', color: '#10b981', fontWeight: 600 }}>
                      • {meal.calories} kcal
                    </span>
                  )}
                  {meal.purpose && (
                    <span style={{ marginLeft: '8px', fontSize: '0.76rem', color: '#34d399', fontStyle: 'italic' }}>
                      • {meal.purpose}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSwapMeal(mealName)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#34d399',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={12} />
                  Swap Ingredient with AI
                </button>
              </div>

              {/* Meal Items */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {items.map((item, iIdx) => {
                  const itemName = item.name || item.food;
                  const itemPortion = item.portion || (item.quantity ? `${item.quantity} ${item.unit || 'g'}` : '');
                  return (
                    <div
                      key={iIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={15} color="#10b981" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#e2e8f0' }}>
                          {itemName}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                        {itemPortion}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK SPORTS NUTRITION TIPS FOOTER */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        borderRadius: '12px',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <ShieldCheck size={20} color="#60a5fa" style={{ minWidth: '20px' }} />
        <span style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
          <strong>Safety Note:</strong> Your nutrition protocol is prescribed by certified fitness professionals. To swap an ingredient (e.g. dairy, poultry, or lentils), click <em>"Swap Ingredient with AI"</em> to find equivalent macronutrient replacements.
        </span>
      </div>

    </div>
  );
};

export default MyAIDietHub;
