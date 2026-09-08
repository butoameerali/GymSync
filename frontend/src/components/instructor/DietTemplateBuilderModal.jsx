import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Utensils, Info, CheckCircle, Flame, Apple } from 'lucide-react';
import Modal from '../common/Modal';

const DietTemplateBuilderModal = ({
  isOpen,
  onClose,
  onSave,
  editingDiet = null
}) => {
  const [activeTab, setActiveTab] = useState('meta'); // 'meta' | 'meals'

  // Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('Muscle Gain');
  const [dietaryType, setDietaryType] = useState('High-Protein');
  const [allergies, setAllergies] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [status, setStatus] = useState('published');

  // Structured Meals
  const [meals, setMeals] = useState([
    {
      mealType: 'Breakfast',
      name: 'Power Breakfast',
      timing: '08:00 AM',
      foodItems: [
        { name: 'Oatmeal', quantity: 80, unit: 'g', calories: 300, protein: 10, carbs: 54, fat: 5 },
        { name: 'Whole Eggs', quantity: 3, unit: 'items', calories: 215, protein: 18, carbs: 2, fat: 15 }
      ],
      substitutions: ['Egg whites', 'Greek yogurt']
    },
    {
      mealType: 'Lunch',
      name: 'Lean Protein Lunch',
      timing: '01:00 PM',
      foodItems: [
        { name: 'Grilled Chicken Breast', quantity: 180, unit: 'g', calories: 300, protein: 55, carbs: 0, fat: 6 },
        { name: 'White Rice', quantity: 200, unit: 'g', calories: 260, protein: 5, carbs: 56, fat: 1 }
      ],
      substitutions: ['Lean beef', 'Quinoa']
    }
  ]);

  useEffect(() => {
    if (editingDiet) {
      setTitle(editingDiet.title || '');
      setDescription(editingDiet.description || '');
      setGoal(editingDiet.goal || editingDiet.category || 'Muscle Gain');
      setDietaryType(editingDiet.dietaryType || 'High-Protein');
      setAllergies(Array.isArray(editingDiet.allergies) ? editingDiet.allergies.join(', ') : (editingDiet.allergies || ''));
      setDietaryRestrictions(Array.isArray(editingDiet.dietaryRestrictions) ? editingDiet.dietaryRestrictions.join(', ') : (editingDiet.dietaryRestrictions || ''));
      setStatus(editingDiet.status || 'published');

      if (Array.isArray(editingDiet.meals) && editingDiet.meals.length > 0) {
        setMeals(editingDiet.meals);
      }
    } else {
      setTitle('');
      setDescription('');
      setGoal('Muscle Gain');
      setDietaryType('High-Protein');
      setAllergies('');
      setDietaryRestrictions('');
      setStatus('published');
      setMeals([
        {
          mealType: 'Breakfast',
          name: 'Power Breakfast',
          timing: '08:00 AM',
          foodItems: [
            { name: 'Oatmeal', quantity: 80, unit: 'g', calories: 300, protein: 10, carbs: 54, fat: 5 },
            { name: 'Whole Eggs', quantity: 3, unit: 'items', calories: 215, protein: 18, carbs: 2, fat: 15 }
          ],
          substitutions: ['Egg whites', 'Greek yogurt']
        },
        {
          mealType: 'Lunch',
          name: 'Lean Protein Lunch',
          timing: '01:00 PM',
          foodItems: [
            { name: 'Chicken Breast', quantity: 180, unit: 'g', calories: 300, protein: 55, carbs: 0, fat: 6 },
            { name: 'White Rice', quantity: 200, unit: 'g', calories: 260, protein: 5, carbs: 56, fat: 1 }
          ],
          substitutions: ['Lean beef', 'Quinoa']
        }
      ]);
    }
    setActiveTab('meta');
  }, [editingDiet, isOpen]);

  // Compute Totals Dynamically
  const totals = meals.reduce(
    (acc, meal) => {
      (meal.foodItems || []).forEach(item => {
        acc.calories += Number(item.calories) || 0;
        acc.protein += Number(item.protein) || 0;
        acc.carbs += Number(item.carbs) || 0;
        acc.fat += Number(item.fat) || 0;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const addMeal = () => {
    const newMeal = {
      mealType: 'Dinner',
      name: `Meal ${meals.length + 1}`,
      timing: '07:00 PM',
      foodItems: [
        { name: 'Protein Source', quantity: 150, unit: 'g', calories: 250, protein: 35, carbs: 0, fat: 8 }
      ],
      substitutions: []
    };
    setMeals([...meals, newMeal]);
  };

  const removeMeal = (mealIdx) => {
    if (meals.length <= 1) return;
    setMeals(meals.filter((_, i) => i !== mealIdx));
  };

  const addFoodItem = (mealIdx) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIdx].foodItems.push({
      name: '',
      quantity: 100,
      unit: 'g',
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 2
    });
    setMeals(updatedMeals);
  };

  const removeFoodItem = (mealIdx, itemIdx) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIdx].foodItems = updatedMeals[mealIdx].foodItems.filter((_, i) => i !== itemIdx);
    setMeals(updatedMeals);
  };

  const updateFoodField = (mealIdx, itemIdx, field, value) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIdx].foodItems[itemIdx][field] = value;
    setMeals(updatedMeals);
  };

  const updateMealField = (mealIdx, field, value) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIdx][field] = value;
    setMeals(updatedMeals);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      type: 'Diet',
      category: goal,
      goal,
      dietaryType,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
      dietaryRestrictions: dietaryRestrictions.split(',').map(s => s.trim()).filter(Boolean),
      description: description.trim(),
      status,
      meals,
      details: {
        calories: `${totals.calories} kcal`,
        goal,
        protein: `${totals.protein}g`,
        carbs: `${totals.carbs}g`,
        fat: `${totals.fat}g`
      }
    };

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDiet ? 'Edit Nutritional Diet Template' : 'Curate Nutritional Diet Template'}
      maxWidth="850px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Live Macro Summary Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          textAlign: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>DAILY CALORIES</span>
            <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>{totals.calories} kcal</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>PROTEIN</span>
            <strong style={{ fontSize: '1.1rem', color: '#3b82f6' }}>{totals.protein}g</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>CARBS</span>
            <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>{totals.carbs}g</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>FATS</span>
            <strong style={{ fontSize: '1.1rem', color: '#ec4899' }}>{totals.fat}g</strong>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'meta' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('meta')}
          >
            <Info size={14} /> 1. Template Overview
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'meals' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('meals')}
          >
            <Utensils size={14} /> 2. Meal Breakdown & Food Items ({meals.length} Meals)
          </button>
        </div>

        {/* TAB 1: METADATA */}
        {activeTab === 'meta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                Diet Plan Title *
              </label>
              <input
                type="text"
                required
                className="search-input"
                placeholder="e.g. Lean Bulk High-Protein Protocol"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Nutritional Goal
                </label>
                <select className="search-input" value={goal} onChange={e => setGoal(e.target.value)}>
                  <option value="Muscle Gain">Muscle Gain / Hypertrophy</option>
                  <option value="Fat Loss">Fat Loss / Cutting</option>
                  <option value="Maintenance">Maintenance & Recomp</option>
                  <option value="Athletic Performance">Athletic Performance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Dietary Style
                </label>
                <select className="search-input" value={dietaryType} onChange={e => setDietaryType(e.target.value)}>
                  <option value="High-Protein">High-Protein Balanced</option>
                  <option value="Keto">Ketogenic / Low-Carb</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan / Plant-Based</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="Paleo">Paleo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Lifecycle Status
                </label>
                <select className="search-input" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="published">Published (Visible to Users & AI)</option>
                  <option value="draft">Draft (Private to Instructor)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Common Allergens Excluded (comma separated)
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Peanuts, Dairy, Gluten, Shellfish"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                  Dietary Restrictions (comma separated)
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Halal, Kosher, Lactose-Free"
                  value={dietaryRestrictions}
                  onChange={e => setDietaryRestrictions(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                Nutrition Strategy & Meal Timing Notes
              </label>
              <textarea
                rows="3"
                className="search-input"
                placeholder="Explain hydration targets, pre/post workout nutrition, and electrolyte replenishment..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: MEALS & FOOD ITEMS */}
        {activeTab === 'meals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {meals.map((meal, mIdx) => (
              <div
                key={mIdx}
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '14px'
                }}
              >
                {/* Meal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      className="search-input"
                      style={{ padding: '4px 8px', fontSize: '0.82rem', width: '130px' }}
                      value={meal.mealType}
                      onChange={e => updateMealField(mIdx, 'mealType', e.target.value)}
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Morning Snack">Morning Snack</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Afternoon Snack">Afternoon Snack</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Post-Workout">Post-Workout</option>
                      <option value="Snack">Snack</option>
                    </select>
                    <input
                      type="text"
                      className="search-input"
                      style={{ padding: '4px 8px', fontSize: '0.82rem', width: '180px' }}
                      value={meal.name}
                      onChange={e => updateMealField(mIdx, 'name', e.target.value)}
                      placeholder="Meal Name"
                    />
                    <input
                      type="text"
                      className="search-input"
                      style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100px' }}
                      value={meal.timing}
                      onChange={e => updateMealField(mIdx, 'timing', e.target.value)}
                      placeholder="08:00 AM"
                    />
                  </div>
                  {meals.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-icon btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => removeMeal(mIdx)}
                      title="Remove Meal"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Food Items Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
                    gap: '6px',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    padding: '0 6px'
                  }}>
                    <span>FOOD ITEM</span>
                    <span>QTY</span>
                    <span>UNIT</span>
                    <span>CAL (kcal)</span>
                    <span>PROT (g)</span>
                    <span>CARB (g)</span>
                    <span></span>
                  </div>

                  {(meal.foodItems || []).map((item, fIdx) => (
                    <div
                      key={fIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
                        gap: '6px',
                        alignItems: 'center'
                      }}
                    >
                      <input
                        type="text"
                        className="search-input"
                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                        value={item.name}
                        onChange={e => updateFoodField(mIdx, fIdx, 'name', e.target.value)}
                        placeholder="Food item name"
                      />
                      <input
                        type="number"
                        className="search-input"
                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                        value={item.quantity}
                        onChange={e => updateFoodField(mIdx, fIdx, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                      <input
                        type="text"
                        className="search-input"
                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                        value={item.unit}
                        onChange={e => updateFoodField(mIdx, fIdx, 'unit', e.target.value)}
                        placeholder="g, ml, items"
                      />
                      <input
                        type="number"
                        className="search-input"
                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                        value={item.calories}
                        onChange={e => updateFoodField(mIdx, fIdx, 'calories', parseFloat(e.target.value) || 0)}
                      />
                      <input
                        type="number"
                        className="search-input"
                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                        value={item.protein}
                        onChange={e => updateFoodField(mIdx, fIdx, 'protein', parseFloat(e.target.value) || 0)}
                      />
                      <input
                        type="number"
                        className="search-input"
                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                        value={item.carbs}
                        onChange={e => updateFoodField(mIdx, fIdx, 'carbs', parseFloat(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        className="btn btn-icon btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={() => removeFoodItem(mIdx, fIdx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  onClick={() => addFoodItem(mIdx)}
                >
                  <Plus size={12} /> Add Food Item
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={addMeal}
            >
              <Plus size={14} /> Add Another Meal
            </button>
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Status: <strong style={{ color: status === 'published' ? '#10b981' : '#f59e0b' }}>{status.toUpperCase()}</strong>
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingDiet ? 'Save Diet Changes' : 'Save & Publish Diet'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default DietTemplateBuilderModal;
