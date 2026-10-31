import React, { useState, useEffect, useCallback } from 'react';
import { Utensils, Flame, Droplets, RefreshCw, MessageSquare, CheckCircle2, ShieldCheck, PlusCircle, ChefHat } from 'lucide-react';
import DietCatalogue from '../../components/trainee/DietCatalogue';
import MedicalDisclaimer from '../../components/common/MedicalDisclaimer';
import CustomDietBuilderModal from '../../components/trainee/CustomDietBuilderModal';

const MyAIDietHub = ({ aiPlan }) => {
  const [activeUserDiet, setActiveUserDiet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);

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
          if (serverDiet && (serverDiet.title || (serverDiet.meals && serverDiet.meals.length > 0))) {
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

    // Fallback: check if aiPlan has an active diet attached (trainer-prescribed)
    const propDiet = aiPlan?.structuredDiet || aiPlan?.diet || null;
    if (propDiet && (propDiet.title || (propDiet.meals && propDiet.meals.length > 0))) {
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

  // ── CASE 1: NO ACTIVE DIET ASSIGNED (Strict Empty State with 2 Action Buttons) ──
  if (!activeUserDiet || (!activeUserDiet.meals && !activeUserDiet.foodItems) || (Array.isArray(activeUserDiet.meals) && activeUserDiet.meals.length === 0)) {
    return (
      <div className="my-ai-diet-hub" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <MedicalDisclaimer variant="banner" style={{ margin: 0 }} />

        {/* EMPTY STATE CONTAINER */}
        <div className="glass-panel" style={{
          padding: '36px 28px',
          borderRadius: '16px',
          background: 'var(--card-bg-light)',
          border: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <Utensils size={28} />
          </div>

          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              No Active Diet Plan
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '580px', lineHeight: 1.6 }}>
              GymSync does not auto-generate unverified diets. Nutrition plans must either be chosen from certified trainer-made templates or built by you from the food list.
            </p>
          </div>

          {/* TWO REQUIRED BUTTONS */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { setShowCatalogue(true); }}
              style={{
                padding: '12px 22px',
                borderRadius: '10px',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#10b981',
                borderColor: '#10b981',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <Utensils size={16} />
              Choose a trainer diet plan
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCustomBuilder(true)}
              style={{
                padding: '12px 22px',
                borderRadius: '10px',
                fontSize: '0.92rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                borderColor: '#3b82f6',
                color: '#3b82f6'
              }}
            >
              <ChefHat size={16} />
              Build My Own Diet (Apna Khana Khud Chunein)
            </button>
          </div>
        </div>

        {/* TRAINER DIET CATALOGUE */}
        {showCatalogue && (
          <div style={{ marginTop: '8px' }}>
            <DietCatalogue onDietAdopted={handleDietAdopted} />
          </div>
        )}

        {/* CUSTOM DIET BUILDER MODAL */}
        <CustomDietBuilderModal
          isOpen={showCustomBuilder}
          onClose={() => setShowCustomBuilder(false)}
          onSavePlan={(newPlan) => {
            handleDietAdopted(newPlan);
            setShowCustomBuilder(false);
          }}
        />

        <MedicalDisclaimer variant="footer" />
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
    <div className="my-ai-diet-hub" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <MedicalDisclaimer variant="banner" style={{ margin: 0 }} />

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
            onClick={() => setShowCustomBuilder(true)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#3b82f6',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ChefHat size={16} />
            Log Today's Meal / Build Diet
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
            Ask Coach / Nutritionist
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
          <span className="macro-tag-green">Calibrated target</span>
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
          <span className="macro-tag-blue">Muscle recovery</span>
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
          <span className="macro-tag-amber">Training energy</span>
        </div>

        {/* Fat */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Healthy Fats</span>
            <span style={{ fontSize: '1rem' }}>🥑</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {fat} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>g</span>
          </div>
          <span className="macro-tag-purple">Hormone balance</span>
        </div>

        {/* Hydration */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'var(--card-bg-light)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Hydration Target</span>
            <Droplets size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {hydration} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Liters</span>
          </div>
          <span className="macro-tag-cyan">Daily water target</span>
        </div>
      </div>

      {/* MEALS BREAKDOWN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: '8px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Prescribed Daily Meals
        </h3>

        {meals.map((meal, mIdx) => {
          const items = meal.foodItems || meal.items || [];
          return (
            <div
              key={mIdx}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'var(--card-bg-light)',
                border: '1px solid var(--card-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981'
                  }}>
                    {meal.mealType || meal.type || `Meal ${mIdx + 1}`}
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {meal.name || meal.mealName || `Meal ${mIdx + 1}`}
                  </strong>
                  {meal.timing && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      • {meal.timing}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSwapMeal(meal.name || meal.mealName || `Meal ${mIdx + 1}`)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '6px 12px',
                    borderRadius: '8px',
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
                  Swap Ingredient
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
                        background: 'var(--card-bg-light)',
                        border: '1px solid var(--card-border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={15} color="#10b981" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {itemName}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
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
        <ShieldCheck size={20} color="#3b82f6" style={{ minWidth: '20px' }} />
        <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Safety Note:</strong> Your nutrition protocol is prescribed by certified fitness professionals. To swap an ingredient (e.g. dairy, poultry, or lentils), click <em>"Swap Ingredient"</em> to find equivalent macronutrient replacements.
        </span>
      </div>

      {/* CUSTOM DIET BUILDER MODAL */}
      <CustomDietBuilderModal
        isOpen={showCustomBuilder}
        onClose={() => setShowCustomBuilder(false)}
        onSavePlan={(newPlan) => {
          handleDietAdopted(newPlan);
          setShowCustomBuilder(false);
        }}
      />

      <MedicalDisclaimer variant="footer" />
    </div>
  );
};

export default MyAIDietHub;
