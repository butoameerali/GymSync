import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Utensils, Plus, Search, Edit2, Trash2, Apple, Flame, Clock, RefreshCw, CheckCircle2, ChevronDown, Layers } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';

const DIETARY_TYPES = ['All', 'Balanced', 'High-Protein', 'Keto', 'Low Carb', 'Vegetarian', 'Vegan', 'Mediterranean'];
const GOALS = ['All', 'Fat Loss', 'Muscle Gain', 'Weight Loss', 'Body Recomposition', 'General Fitness', 'Endurance'];

const MEAL_TYPES = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Post-Workout', 'Snack'];

const DietLibraryPage = () => {
  const { authHeaders, user, role } = useAdminAuth();
  const [diets, setDiets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingDiet, setEditingDiet] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialForm = {
    title: '',
    goal: 'Fat Loss',
    difficulty: 'Beginner',
    durationWeeks: 4,
    dietaryType: 'Balanced',
    description: '',
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
    allergies: '',
    dietaryRestrictions: '',
    meals: [
      {
        mealType: 'Breakfast',
        name: 'Energizing Oatmeal & Eggs',
        timing: '08:00 AM',
        calories: 500,
        protein: 35,
        carbs: 60,
        fat: 15,
        foodItems: [
          { name: 'Rolled Oats', quantity: 80, unit: 'g', calories: 300, protein: 10, carbs: 54, fat: 5, allergens: [] },
          { name: 'Whole Eggs', quantity: 2, unit: 'items', calories: 140, protein: 12, carbs: 1, fat: 10, allergens: ['Egg'] },
          { name: 'Egg Whites', quantity: 2, unit: 'items', calories: 60, protein: 13, carbs: 1, fat: 0, allergens: ['Egg'] }
        ]
      },
      {
        mealType: 'Lunch',
        name: 'Grilled Chicken, Brown Rice & Greens',
        timing: '01:00 PM',
        calories: 650,
        protein: 50,
        carbs: 70,
        fat: 16,
        foodItems: [
          { name: 'Chicken Breast', quantity: 180, unit: 'g', calories: 300, protein: 50, carbs: 0, fat: 6, allergens: [] },
          { name: 'Cooked Brown Rice', quantity: 200, unit: 'g', calories: 250, protein: 5, carbs: 52, fat: 2, allergens: [] },
          { name: 'Olive Oil', quantity: 10, unit: 'ml', calories: 90, protein: 0, carbs: 0, fat: 10, allergens: [] }
        ]
      }
    ]
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchDiets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans/premade?type=Diet&status=all&limit=100', {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.items || (Array.isArray(data) ? data : []);
        setDiets(list);
      }
    } catch (err) {
      console.error('Fetch diets error:', err);
      toast.error('Failed to load diet templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiets();
  }, []);

  const openCreateModal = () => {
    setEditingDiet(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = (diet) => {
    setEditingDiet(diet);
    setFormData({
      title: diet.title || '',
      goal: diet.goal || 'General Fitness',
      difficulty: diet.difficulty || 'Beginner',
      durationWeeks: diet.durationWeeks || 4,
      dietaryType: diet.dietaryType || 'Balanced',
      description: diet.description || '',
      calories: diet.calories || 2000,
      protein: diet.protein || 150,
      carbs: diet.carbs || 200,
      fat: diet.fat || 65,
      allergies: Array.isArray(diet.allergies) ? diet.allergies.join(', ') : '',
      dietaryRestrictions: Array.isArray(diet.dietaryRestrictions) ? diet.dietaryRestrictions.join(', ') : '',
      meals: Array.isArray(diet.meals) && diet.meals.length > 0 ? diet.meals : initialForm.meals
    });
    setShowModal(true);
  };

  // Recalculate totals from meals & food items
  const recalculateDailyMacros = (currentMeals) => {
    let totCal = 0, totP = 0, totC = 0, totF = 0;
    currentMeals.forEach(meal => {
      let mCal = 0, mP = 0, mC = 0, mF = 0;
      (meal.foodItems || []).forEach(item => {
        mCal += Number(item.calories) || 0;
        mP += Number(item.protein) || 0;
        mC += Number(item.carbs) || 0;
        mF += Number(item.fat) || 0;
      });
      meal.calories = Math.round(mCal);
      meal.protein = Math.round(mP);
      meal.carbs = Math.round(mC);
      meal.fat = Math.round(mF);

      totCal += mCal;
      totP += mP;
      totC += mC;
      totF += mF;
    });

    return {
      updatedMeals: currentMeals,
      calories: Math.round(totCal),
      protein: Math.round(totP),
      carbs: Math.round(totC),
      fat: Math.round(totF)
    };
  };

  const handleAddMeal = () => {
    const newMeal = {
      mealType: 'Snack',
      name: 'Afternoon Nutrition Fuel',
      timing: '04:00 PM',
      calories: 250,
      protein: 20,
      carbs: 30,
      fat: 5,
      foodItems: [
        { name: 'Greek Yogurt (0% fat)', quantity: 200, unit: 'g', calories: 120, protein: 20, carbs: 8, fat: 0, allergens: ['Dairy'] },
        { name: 'Berries / Banana', quantity: 100, unit: 'g', calories: 80, protein: 1, carbs: 20, fat: 0, allergens: [] }
      ]
    };
    const nextMeals = [...formData.meals, newMeal];
    const computed = recalculateDailyMacros(nextMeals);
    setFormData({
      ...formData,
      meals: computed.updatedMeals,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat
    });
  };

  const handleRemoveMeal = (mealIndex) => {
    if (formData.meals.length <= 1) {
      return toast.warning('A diet template must have at least 1 meal.');
    }
    const nextMeals = formData.meals.filter((_, idx) => idx !== mealIndex);
    const computed = recalculateDailyMacros(nextMeals);
    setFormData({
      ...formData,
      meals: computed.updatedMeals,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat
    });
  };

  const handleAddFoodItem = (mealIndex) => {
    const nextMeals = [...formData.meals];
    const currentItems = nextMeals[mealIndex].foodItems || [];
    nextMeals[mealIndex].foodItems = [
      ...currentItems,
      { name: 'New Food Item', quantity: 100, unit: 'g', calories: 100, protein: 5, carbs: 15, fat: 2, allergens: [] }
    ];
    const computed = recalculateDailyMacros(nextMeals);
    setFormData({
      ...formData,
      meals: computed.updatedMeals,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat
    });
  };

  const handleRemoveFoodItem = (mealIndex, itemIndex) => {
    const nextMeals = [...formData.meals];
    nextMeals[mealIndex].foodItems = nextMeals[mealIndex].foodItems.filter((_, i) => i !== itemIndex);
    const computed = recalculateDailyMacros(nextMeals);
    setFormData({
      ...formData,
      meals: computed.updatedMeals,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat
    });
  };

  const handleFoodItemChange = (mealIndex, itemIndex, field, value) => {
    const nextMeals = [...formData.meals];
    const targetItem = { ...nextMeals[mealIndex].foodItems[itemIndex], [field]: value };
    nextMeals[mealIndex].foodItems[itemIndex] = targetItem;
    const computed = recalculateDailyMacros(nextMeals);
    setFormData({
      ...formData,
      meals: computed.updatedMeals,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return toast.warning('Diet plan title is required');
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        type: 'Diet',
        goal: formData.goal,
        category: formData.goal,
        difficulty: formData.difficulty,
        durationWeeks: Number(formData.durationWeeks) || 4,
        dietaryType: formData.dietaryType,
        description: formData.description,
        calories: Number(formData.calories) || 2000,
        protein: Number(formData.protein) || 150,
        carbs: Number(formData.carbs) || 200,
        fat: Number(formData.fat) || 65,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        dietaryRestrictions: formData.dietaryRestrictions ? formData.dietaryRestrictions.split(',').map(s => s.trim()).filter(Boolean) : [],
        meals: formData.meals,
        status: ['Admin', 'SuperAdmin'].includes(role) ? 'published' : 'pending_review'
      };

      const url = editingDiet ? `/api/plans/premade/${editingDiet._id}` : '/api/plans/premade';
      const method = editingDiet ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingDiet ? 'Diet plan updated!' : 'New diet plan created in database!');
        setShowModal(false);
        fetchDiets();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || errData.error || 'Failed to save diet plan');
      }
    } catch (err) {
      toast.error('Network error saving diet plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete diet plan "${title}"?`)) return;

    try {
      const res = await fetch(`/api/plans/premade/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (res.ok) {
        toast.success('Diet template deleted');
        setDiets(prev => prev.filter(d => d._id !== id));
      } else {
        toast.error('Failed to delete diet plan');
      }
    } catch (err) {
      toast.error('Network error deleting diet plan');
    }
  };

  // Filter diets
  const filteredDiets = diets.filter(d => {
    if (selectedGoal !== 'All' && (d.goal || '').toLowerCase() !== selectedGoal.toLowerCase()) {
      return false;
    }
    if (selectedType !== 'All' && (d.dietaryType || '').toLowerCase() !== selectedType.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const title = (d.title || '').toLowerCase();
      const desc = (d.description || '').toLowerCase();
      if (!title.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Utensils size={28} color="#10b981" />
            Diet &amp; Nutrition Library
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: '4px' }}>
            Author structured meal plans, macro splits, and recipe templates. Saved dynamically to the database.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}
        >
          <Plus size={18} />
          Create Diet Plan
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search diet plans by title or goal..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                background: '#1f2937',
                border: '1px solid #374151',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <div>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#1f2937',
                border: '1px solid #374151',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            >
              {GOALS.map(g => (
                <option key={g} value={g}>Goal: {g}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#1f2937',
                border: '1px solid #374151',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            >
              {DIETARY_TYPES.map(t => (
                <option key={t} value={t}>Type: {t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Diet Plans */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '10px' }} />
          <p>Loading diet templates from database...</p>
        </div>
      ) : filteredDiets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#111827',
          borderRadius: '12px',
          border: '1px dashed #374151'
        }}>
          <Apple size={40} color="#4b5563" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#e5e7eb', marginBottom: '6px' }}>No diet plans found</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '16px' }}>
            Build your first nutritional blueprint and connect it with workout programs.
          </p>
          <button
            onClick={openCreateModal}
            className="btn-admin btn-admin-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Create Diet Plan
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px'
        }}>
          {filteredDiets.map(diet => (
            <div
              key={diet._id}
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb', margin: 0 }}>
                    {diet.title}
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    whiteSpace: 'nowrap'
                  }}>
                    {diet.dietaryType || 'Balanced'}
                  </span>
                </div>

                {/* Macro summary pills */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  background: '#1f2937',
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  textAlign: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af', display: 'block' }}>CALORIES</span>
                    <strong style={{ fontSize: '0.92rem', color: '#f59e0b' }}>{diet.calories || 2000}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af', display: 'block' }}>PROTEIN</span>
                    <strong style={{ fontSize: '0.92rem', color: '#60a5fa' }}>{diet.protein || 150}g</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af', display: 'block' }}>CARBS</span>
                    <strong style={{ fontSize: '0.92rem', color: '#34d399' }}>{diet.carbs || 200}g</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#9ca3af', display: 'block' }}>FAT</span>
                    <strong style={{ fontSize: '0.92rem', color: '#f87171' }}>{diet.fat || 65}g</strong>
                  </div>
                </div>

                {/* Description */}
                {diet.description && (
                  <p style={{
                    fontSize: '0.84rem',
                    color: '#9ca3af',
                    lineHeight: 1.45,
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {diet.description}
                  </p>
                )}

                {/* Meals count & Author */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280', marginBottom: '14px' }}>
                  <span>{Array.isArray(diet.meals) ? diet.meals.length : 0} Daily Meals Configured</span>
                  <span>By {diet.createdBy || 'Instructor'}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #1f2937'
              }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: diet.status === 'published' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: diet.status === 'published' ? '#34d399' : '#f59e0b'
                }}>
                  {diet.status === 'published' ? 'Approved & Live' : 'Pending Review'}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(diet)}
                    style={{
                      background: '#1f2937',
                      color: '#93c5fd',
                      border: '1px solid #374151',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(diet._id, diet.title)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Diet Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDiet ? `Edit Diet Plan: ${editingDiet.title}` : 'Design New Diet Template'}
        maxWidth="850px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Diet Plan Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Lean Bulk 2,800 kcal Protocol"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Primary Goal
              </label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.88rem'
                }}
              >
                {GOALS.filter(g => g !== 'All').map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Dietary Type
              </label>
              <select
                value={formData.dietaryType}
                onChange={(e) => setFormData({ ...formData, dietaryType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.88rem'
                }}
              >
                {DIETARY_TYPES.filter(t => t !== 'All').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Macro Totals Header */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            textAlign: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Daily Calories</span>
              <strong style={{ fontSize: '1.15rem', color: '#f59e0b' }}>{formData.calories} kcal</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Protein</span>
              <strong style={{ fontSize: '1.15rem', color: '#60a5fa' }}>{formData.protein}g</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Carbs</span>
              <strong style={{ fontSize: '1.15rem', color: '#34d399' }}>{formData.carbs}g</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Total Fat</span>
              <strong style={{ fontSize: '1.15rem', color: '#f87171' }}>{formData.fat}g</strong>
            </div>
          </div>

          {/* Meals Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f3f4f6', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Apple size={18} color="#10b981" />
                Meals &amp; Food Breakdown ({formData.meals.length})
              </h4>

              <button
                type="button"
                onClick={handleAddMeal}
                style={{
                  background: '#1f2937',
                  color: '#34d399',
                  border: '1px solid #374151',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} /> Add Meal Slot
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {formData.meals.map((meal, mIdx) => (
                <div
                  key={mIdx}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '10px',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={meal.mealType}
                        onChange={(e) => {
                          const nextMeals = [...formData.meals];
                          nextMeals[mIdx].mealType = e.target.value;
                          setFormData({ ...formData, meals: nextMeals });
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#111827',
                          border: '1px solid #4b5563',
                          color: '#60a5fa',
                          fontSize: '0.82rem',
                          fontWeight: 600
                        }}
                      >
                        {MEAL_TYPES.map(mt => (
                          <option key={mt} value={mt}>{mt}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={meal.name}
                        onChange={(e) => {
                          const nextMeals = [...formData.meals];
                          nextMeals[mIdx].name = e.target.value;
                          setFormData({ ...formData, meals: nextMeals });
                        }}
                        placeholder="Meal Title"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#111827',
                          border: '1px solid #4b5563',
                          color: '#fff',
                          fontSize: '0.85rem'
                        }}
                      />

                      <input
                        type="text"
                        value={meal.timing || '08:00 AM'}
                        onChange={(e) => {
                          const nextMeals = [...formData.meals];
                          nextMeals[mIdx].timing = e.target.value;
                          setFormData({ ...formData, meals: nextMeals });
                        }}
                        placeholder="Time"
                        style={{
                          width: '90px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#111827',
                          border: '1px solid #4b5563',
                          color: '#9ca3af',
                          fontSize: '0.82rem'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {meal.calories} kcal ({meal.protein}P / {meal.carbs}C / {meal.fat}F)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMeal(mIdx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Delete Meal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Food Items inside this meal */}
                  <div style={{ background: '#111827', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af' }}>FOOD ITEMS</span>
                      <button
                        type="button"
                        onClick={() => handleAddFoodItem(mIdx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#60a5fa',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        + Add Food Item
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(meal.foodItems || []).map((item, fIdx) => (
                        <div key={fIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 24px', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleFoodItemChange(mIdx, fIdx, 'name', e.target.value)}
                            placeholder="Food name"
                            style={{ padding: '4px 6px', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#fff', fontSize: '0.8rem' }}
                          />
                          <input
                            type="number"
                            value={item.calories}
                            onChange={(e) => handleFoodItemChange(mIdx, fIdx, 'calories', Number(e.target.value))}
                            placeholder="kcal"
                            title="Calories"
                            style={{ padding: '4px 6px', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#f59e0b', fontSize: '0.8rem' }}
                          />
                          <input
                            type="number"
                            value={item.protein}
                            onChange={(e) => handleFoodItemChange(mIdx, fIdx, 'protein', Number(e.target.value))}
                            placeholder="Prot(g)"
                            title="Protein"
                            style={{ padding: '4px 6px', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#60a5fa', fontSize: '0.8rem' }}
                          />
                          <input
                            type="number"
                            value={item.carbs}
                            onChange={(e) => handleFoodItemChange(mIdx, fIdx, 'carbs', Number(e.target.value))}
                            placeholder="Carb(g)"
                            title="Carbs"
                            style={{ padding: '4px 6px', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#34d399', fontSize: '0.8rem' }}
                          />
                          <input
                            type="number"
                            value={item.fat}
                            onChange={(e) => handleFoodItemChange(mIdx, fIdx, 'fat', Number(e.target.value))}
                            placeholder="Fat(g)"
                            title="Fat"
                            style={{ padding: '4px 6px', borderRadius: '4px', background: '#1f2937', border: '1px solid #374151', color: '#f87171', fontSize: '0.8rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFoodItem(mIdx, fIdx)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description & Allergies */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Allergen Warnings (comma separated)
              </label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Dairy, Peanuts, Gluten"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Preparation Instructions / Notes
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Drink 3L water daily, prep meals in advance"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-admin btn-admin-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-admin btn-admin-primary"
            >
              {submitting ? 'Saving...' : (editingDiet ? 'Update Diet Template' : 'Save Diet Plan to Database')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DietLibraryPage;
