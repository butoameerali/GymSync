import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Dumbbell, Plus, Search, Edit2, Trash2, Filter, Activity, CheckCircle2, AlertCircle, RefreshCw, Layers, ExternalLink } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';

const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body', 'Other'];
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENTS = ['All', 'Bodyweight', 'Dumbbells', 'Barbell', 'Cables', 'Machine', 'Kettlebell', 'Bands'];

const ExerciseLibraryPage = () => {
  const { authHeaders } = useAdminAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    category: 'Chest',
    targetMuscles: '',
    secondaryMuscles: '',
    equipmentRequired: 'Dumbbells',
    difficulty: 'Beginner',
    defaultSets: 3,
    defaultReps: 10,
    defaultDuration: 0,
    instructions: '',
    coachingCues: '',
    commonMistakes: '',
    mediaUrl: '',
    gifUrl: '',
    videoUrl: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exercises?limit=200', {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.items || (Array.isArray(data) ? data : []);
        setExercises(list);
      }
    } catch (err) {
      console.error('Fetch exercises error:', err);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const openCreateModal = () => {
    setEditingExercise(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = (ex) => {
    setEditingExercise(ex);
    setFormData({
      name: ex.name || '',
      category: ex.category || 'Chest',
      targetMuscles: Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.targetMuscles || ''),
      secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles.join(', ') : (ex.secondaryMuscles || ''),
      equipmentRequired: ex.equipmentRequired || 'Bodyweight',
      difficulty: ex.difficulty || 'Beginner',
      defaultSets: ex.defaultSets || 3,
      defaultReps: ex.defaultReps || 10,
      defaultDuration: ex.defaultDuration || 0,
      instructions: ex.instructions || ex.description || '',
      coachingCues: Array.isArray(ex.coachingCues) ? ex.coachingCues.join(', ') : (ex.coachingCues || ''),
      commonMistakes: Array.isArray(ex.commonMistakes) ? ex.commonMistakes.join(', ') : (ex.commonMistakes || ''),
      mediaUrl: ex.mediaUrl || '',
      gifUrl: ex.gifUrl || '',
      videoUrl: ex.videoUrl || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toast.warning('Exercise name is required');
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        targetMuscles: formData.targetMuscles.split(',').map(s => s.trim()).filter(Boolean),
        secondaryMuscles: formData.secondaryMuscles.split(',').map(s => s.trim()).filter(Boolean),
        equipmentRequired: formData.equipmentRequired,
        difficulty: formData.difficulty,
        defaultSets: Number(formData.defaultSets) || 3,
        defaultReps: Number(formData.defaultReps) || 10,
        defaultDuration: Number(formData.defaultDuration) || 0,
        instructions: formData.instructions,
        description: formData.instructions,
        coachingCues: formData.coachingCues.split(',').map(s => s.trim()).filter(Boolean),
        commonMistakes: formData.commonMistakes.split(',').map(s => s.trim()).filter(Boolean),
        mediaUrl: formData.mediaUrl || formData.gifUrl,
        gifUrl: formData.gifUrl || formData.mediaUrl,
        videoUrl: formData.videoUrl
      };

      const url = editingExercise ? `/api/exercises/${editingExercise._id}` : '/api/exercises';
      const method = editingExercise ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingExercise ? 'Exercise updated successfully!' : 'New exercise added to database!');
        setShowModal(false);
        fetchExercises();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || errData.error || 'Failed to save exercise');
      }
    } catch (err) {
      toast.error('Network error saving exercise');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the database?`)) return;

    try {
      const res = await fetch(`/api/exercises/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (res.ok) {
        toast.success('Exercise deleted');
        setExercises(prev => prev.filter(e => e._id !== id));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to delete exercise');
      }
    } catch (err) {
      toast.error('Network error deleting exercise');
    }
  };

  // Filter exercises
  const filteredExercises = exercises.filter(ex => {
    if (selectedCategory !== 'All' && (ex.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (selectedDifficulty !== 'All' && (ex.difficulty || '').toLowerCase() !== selectedDifficulty.toLowerCase()) {
      return false;
    }
    if (selectedEquipment !== 'All') {
      const eq = (ex.equipmentRequired || '').toLowerCase();
      if (!eq.includes(selectedEquipment.toLowerCase())) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (ex.name || '').toLowerCase();
      const muscles = Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(' ').toLowerCase() : '';
      if (!name.includes(q) && !muscles.includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={28} color="#3b82f6" />
            Exercise Library
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: '4px' }}>
            Author, categorize, and configure exercises for workout programs. All exercises are saved in the database.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
          }}
        >
          <Plus size={18} />
          Add New Exercise
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
        {/* Search & Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by exercise name or muscle..."
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
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
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
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>Difficulty: {d}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
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
              {EQUIPMENTS.map(eq => (
                <option key={eq} value={eq}>Equipment: {eq}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: selectedCategory === cat ? '1px solid #3b82f6' : '1px solid #374151',
                background: selectedCategory === cat ? 'rgba(59, 130, 246, 0.2)' : '#1f2937',
                color: selectedCategory === cat ? '#60a5fa' : '#9ca3af',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Exercises */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '10px' }} />
          <p>Loading exercise catalog from database...</p>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#111827',
          borderRadius: '12px',
          border: '1px dashed #374151'
        }}>
          <Dumbbell size={40} color="#4b5563" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#e5e7eb', marginBottom: '6px' }}>No exercises found</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '16px' }}>
            Try adjusting your search criteria or add a brand new exercise to the database.
          </p>
          <button
            onClick={openCreateModal}
            className="btn-admin btn-admin-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add First Exercise
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '18px'
        }}>
          {filteredExercises.map(ex => (
            <div
              key={ex._id || ex.exerciseId}
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div>
                {/* Header & Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f9fafb', margin: 0 }}>
                    {ex.name}
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    whiteSpace: 'nowrap'
                  }}>
                    {ex.category || 'General'}
                  </span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.75rem', background: '#1f2937', color: '#d1d5db', padding: '2px 8px', borderRadius: '4px' }}>
                    {ex.difficulty || 'Beginner'}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#1f2937', color: '#9ca3af', padding: '2px 8px', borderRadius: '4px' }}>
                    {ex.equipmentRequired || 'Bodyweight'}
                  </span>
                  {ex.defaultSets && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', padding: '2px 8px', borderRadius: '4px' }}>
                      {ex.defaultSets} sets × {ex.defaultReps || 10} reps
                    </span>
                  )}
                </div>

                {/* Target Muscles */}
                {Array.isArray(ex.targetMuscles) && ex.targetMuscles.length > 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#93c5fd', marginBottom: '8px' }}>
                    <strong>Targets:</strong> {ex.targetMuscles.join(', ')}
                  </p>
                )}

                {/* Instructions */}
                {(ex.instructions || ex.description) && (
                  <p style={{
                    fontSize: '0.82rem',
                    color: '#9ca3af',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '14px'
                  }}>
                    {ex.instructions || ex.description}
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #1f2937',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(ex.gifUrl || ex.mediaUrl || ex.videoUrl) && (
                    <a
                      href={ex.gifUrl || ex.mediaUrl || ex.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#60a5fa',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={13} /> Media
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(ex)}
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
                    onClick={() => handleDelete(ex._id, ex.name)}
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

      {/* Create / Edit Exercise Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExercise ? `Edit Exercise: ${editingExercise.name}` : 'Add New Exercise to Database'}
        maxWidth="750px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Exercise Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Incline Dumbbell Bench Press"
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
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
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
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Equipment Required
              </label>
              <input
                type="text"
                value={formData.equipmentRequired}
                onChange={(e) => setFormData({ ...formData, equipmentRequired: e.target.value })}
                placeholder="e.g. Dumbbells, Incline Bench"
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Target Muscles (comma separated)
              </label>
              <input
                type="text"
                value={formData.targetMuscles}
                onChange={(e) => setFormData({ ...formData, targetMuscles: e.target.value })}
                placeholder="e.g. Upper Chest, Triceps, Anterior Deltoids"
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
                Secondary Muscles (optional)
              </label>
              <input
                type="text"
                value={formData.secondaryMuscles}
                onChange={(e) => setFormData({ ...formData, secondaryMuscles: e.target.value })}
                placeholder="e.g. Serratus, Core"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Default Sets
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.defaultSets}
                onChange={(e) => setFormData({ ...formData, defaultSets: e.target.value })}
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
                Default Reps
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.defaultReps}
                onChange={(e) => setFormData({ ...formData, defaultReps: e.target.value })}
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
                Duration (sec, optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.defaultDuration}
                onChange={(e) => setFormData({ ...formData, defaultDuration: e.target.value })}
                placeholder="e.g. 45"
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

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
              Execution Instructions &amp; Setup Form
            </label>
            <textarea
              rows="3"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Step 1: Set bench to 30-45 degrees. Step 2: Retract scapulae and press weights smoothly..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#1f2937',
                border: '1px solid #374151',
                color: '#fff',
                fontSize: '0.88rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '6px' }}>
                Coaching Cues (comma separated)
              </label>
              <input
                type="text"
                value={formData.coachingCues}
                onChange={(e) => setFormData({ ...formData, coachingCues: e.target.value })}
                placeholder="Chest up, elbows tucked at 45°, squeeze at peak"
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
                GIF / Demonstration URL (optional)
              </label>
              <input
                type="text"
                value={formData.gifUrl}
                onChange={(e) => setFormData({ ...formData, gifUrl: e.target.value })}
                placeholder="https://.../exercise.gif or mp4"
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

          {/* Modal Action Buttons */}
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
              {submitting ? 'Saving...' : (editingExercise ? 'Update Exercise' : 'Save Exercise to Database')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExerciseLibraryPage;
