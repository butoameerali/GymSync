import React, { useState } from 'react';
import { Utensils, Flame, Droplets, Sparkles, RefreshCw, MessageSquare, CheckCircle2, ChevronRight, Apple, Info } from 'lucide-react';

const MyAIDietHub = ({ aiPlan }) => {
  const [activeDayTab, setActiveDayTab] = useState('today');

  // Extract structured diet from passed aiPlan or localStorage
  let diet = aiPlan?.structuredDiet || aiPlan?.diet || null;
  if (!diet) {
    try {
      const storedPlan = JSON.parse(localStorage.getItem('gymsync_ai_workout_plan') || localStorage.getItem('gymsync_active_plan') || '{}');
      diet = storedPlan.structuredDiet || storedPlan.diet || null;
    } catch {
      diet = null;
    }
  }

  // Fallback if user profile exists
  const storedGoal = localStorage.getItem('gymsync_onboarding_primaryGoal') || aiPlan?.goal || 'Healthy Living';
  const calories = diet?.actualTotals?.totalDailyCalories || diet?.targetCalories || 2150;
  const protein = diet?.actualTotals?.totalProtein || diet?.targetProtein || 140;
  const carbs = diet?.actualTotals?.totalCarbs || diet?.targetCarbs || 230;
  const fat = diet?.actualTotals?.totalFat || diet?.targetFat || 60;
  const hydration = diet?.hydrationTargetLiters || 3.0;

  const defaultMeals = [
    {
      mealName: 'Breakfast',
      timing: '7:30 AM – 8:30 AM',
      purpose: 'Sustained Energy & Muscle Priming',
      items: [
        { food: 'Rolled Oats with Low-Fat Milk', portion: '1 bowl (60g oats + 200ml milk)' },
        { food: 'Boiled Eggs', portion: '2 whole large eggs' },
        { food: 'Banana or Berries', portion: '1 medium fruit' }
      ]
    },
    {
      mealName: 'Mid-Day Lunch',
      timing: '1:00 PM – 2:00 PM',
      purpose: 'Lean Protein & Complex Carbohydrates',
      items: [
        { food: 'Grilled Chicken Breast or Low-Fat Paneer', portion: '150g cooked' },
        { food: 'Brown Rice or Whole Wheat Roti', portion: '1.5 cups cooked or 2 rotis' },
        { food: 'Steamed Vegetables & Mixed Salad', portion: '1 large bowl with olive oil drizzle' }
      ]
    },
    {
      mealName: 'Pre/Post-Workout Snack',
      timing: '4:30 PM – 5:30 PM',
      purpose: 'Glycogen Fuel & Rapid Amino Acid Delivery',
      items: [
        { food: 'Greek Yogurt or Roasted Chickpeas', portion: '1 cup (150g)' },
        { food: 'Almonds or Walnuts', portion: '1 small handful (20g)' }
      ]
    },
    {
      mealName: 'Dinner',
      timing: '7:30 PM – 8:30 PM',
      purpose: 'Overnight Recovery & Micronutrient Balance',
      items: [
        { food: 'Baked Fish, Tofu, or Lentil Daal', portion: '150g or 1 large bowl' },
        { food: 'Sauteed Greens & Sweet Potato', portion: '1 cup steamed or roasted' }
      ]
    }
  ];

  const tomorrowMeals = [
    {
      mealName: 'Breakfast',
      timing: '7:30 AM – 8:30 AM',
      purpose: 'High Protein Recovery Kick-off',
      items: [
        { food: 'Whole Grain Toast with Peanut Butter', portion: '2 slices + 1.5 tbsp spread' },
        { food: 'Egg White Omelet with Spinach', portion: '3 egg whites + 1 whole egg' },
        { food: 'Fresh Orange or Apple', portion: '1 whole fruit' }
      ]
    },
    {
      mealName: 'Mid-Day Lunch',
      timing: '1:00 PM – 2:00 PM',
      purpose: 'Sustained Glycogen & Cellular Repair',
      items: [
        { food: 'Lentil Soup / Chickpea Curry with Rice', portion: '1 large bowl + 1 cup basmati' },
        { food: 'Cucumber & Tomato Salad', portion: '1 cup with lemon dressing' }
      ]
    },
    {
      mealName: 'Pre/Post-Workout Snack',
      timing: '4:30 PM – 5:30 PM',
      purpose: 'Hydration & Electrolyte replenishment',
      items: [
        { food: 'Whey Protein Shake or Buttermilk', portion: '1 scoop in 300ml water/milk' },
        { food: 'Banana', portion: '1 medium fruit' }
      ]
    },
    {
      mealName: 'Dinner',
      timing: '7:30 PM – 8:30 PM',
      purpose: 'Light Digestible Fuel for Deep Sleep',
      items: [
        { food: 'Grilled Chicken / Paneer Skewers', portion: '160g seasoned with herbs' },
        { food: 'Steamed Broccoli, Carrots & Quinoa', portion: '1 plate balanced portion' }
      ]
    }
  ];

  const mealsToDisplay = activeDayTab === 'today'
    ? (diet?.meals && diet.meals.length > 0 ? diet.meals : defaultMeals)
    : tomorrowMeals;

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
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
              My AI Nutrition Plan
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
              Active Protocol
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Personalized macro-balanced meals aligned with your <strong>{storedGoal}</strong> program.
          </p>
        </div>

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
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.15s ease'
          }}
        >
          <MessageSquare size={16} />
          💬 Customize with AI Nutritionist
        </button>
      </div>

      {/* DAILY MACRO METRICS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        {/* Calories */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Daily Energy</span>
            <Flame size={18} color="#f97316" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
            {calories} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>kcal</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 500 }}>Calibrated for training</span>
        </div>

        {/* Protein */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Target Protein</span>
            <span style={{ fontSize: '1rem' }}>🥩</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
            {protein} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>g</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 500 }}>Muscle repair & satiety</span>
        </div>

        {/* Carbs */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Carbohydrates</span>
            <span style={{ fontSize: '1rem' }}>🍚</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
            {carbs} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>g</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 500 }}>Clean workout glycogen</span>
        </div>

        {/* Fats */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Healthy Fats</span>
            <span style={{ fontSize: '1rem' }}>🥑</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
            {fat} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>g</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 500 }}>Hormone health</span>
        </div>

        {/* Hydration */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Hydration Goal</span>
            <Droplets size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
            {hydration} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>L</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 500 }}>Daily pure water</span>
        </div>
      </div>

      {/* DAY SWITCHER TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveDayTab('today')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            background: activeDayTab === 'today' ? '#10b981' : 'rgba(255,255,255,0.05)',
            border: activeDayTab === 'today' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
            color: activeDayTab === 'today' ? '#ffffff' : '#94a3b8',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
        >
          <span>🥗</span> Today's Meals
        </button>

        <button
          type="button"
          onClick={() => setActiveDayTab('tomorrow')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            background: activeDayTab === 'tomorrow' ? '#10b981' : 'rgba(255,255,255,0.05)',
            border: activeDayTab === 'tomorrow' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
            color: activeDayTab === 'tomorrow' ? '#ffffff' : '#94a3b8',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
        >
          <span>🌅</span> Tomorrow's Meals
        </button>
      </div>

      {/* MEAL SCHEDULE CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {mealsToDisplay.map((meal, mIdx) => (
          <div
            key={mIdx}
            className="glass-panel"
            style={{
              padding: '18px 22px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                  {meal.mealName}
                </span>
                {meal.timing && (
                  <span style={{ marginLeft: '10px', fontSize: '0.78rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '8px' }}>
                    ⏰ {meal.timing}
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
                onClick={() => handleSwapMeal(meal.mealName)}
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
              {(meal.items || []).map((item, iIdx) => (
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
                      {item.food}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                    {item.portion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
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
        <Info size={20} color="#60a5fa" style={{ minWidth: '20px' }} />
        <span style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
          <strong>Coach Tip:</strong> Eat your pre-workout snack 60–90 minutes before lifting for sustained power. Need to substitute dairy, chicken, or eggs? Tap <em>"Swap Ingredient with AI"</em> to receive instant, verified macro-equivalent food suggestions.
        </span>
      </div>

    </div>
  );
};

export default MyAIDietHub;
