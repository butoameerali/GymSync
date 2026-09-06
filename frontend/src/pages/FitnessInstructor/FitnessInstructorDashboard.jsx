import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dumbbell, Plus, Edit2, Trash2, Calendar, Utensils, 
  MessageSquare, CheckCircle, Search, FileText, Activity, AlertCircle, RefreshCw 
} from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardShell from '../../components/layout/DashboardShell';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import './FitnessInstructorDashboard.css';

const FitnessInstructorDashboard = () => {
  const instructorName = localStorage.getItem('gymsync_user_name') || 'Fitness Instructor';
  const userRole = localStorage.getItem('gymsync_role') || 'FitnessInstructor';
  const [activeTab, setActiveTab] = useState('overview');

  // Loading and Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data Collections
  const [exercises, setExercises] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [articles, setArticles] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState('All');

  // Exercise Form Modal
  const [editingEx, setEditingEx] = useState(null);
  const [showExForm, setShowExForm] = useState(false);
  const [exForm, setExForm] = useState({
    name: '',
    category: 'Chest',
    targetMuscles: 'Chest, Triceps',
    equipmentRequired: 'Dumbbells',
    difficulty: 'Intermediate',
    instructions: '',
    mediaUrl: ''
  });

  // Program Form Modal
  const [showProgModal, setShowProgModal] = useState(false);
  const [editingProg, setEditingProg] = useState(null);
  const [progForm, setProgForm] = useState({
    title: '',
    days: 4,
    level: 'Intermediate',
    category: 'Muscle Building',
    description: ''
  });

  // Diet Form Modal
  const [showDietModal, setShowDietModal] = useState(false);
  const [editingDiet, setEditingDiet] = useState(null);
  const [dietForm, setDietForm] = useState({
    title: '',
    calories: '2500 kcal',
    goal: 'Muscle Gain',
    description: '',
    protein: '180g',
    carbs: '280g',
    fat: '65g'
  });

  // Article Form Modal
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    category: 'Training',
    content: '',
    readTime: '4 min',
    tags: 'Hypertrophy, Form, Health'
  });

  // Deletion Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
  });

  // 1. Fetch All Real Backend Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [exRes, progRes, dietRes, artRes, reqRes] = await Promise.all([
        fetch('/api/exercises'),
        fetch('/api/plans/premade?type=Workout'),
        fetch('/api/plans/premade?type=Diet'),
        fetch('/api/articles'),
        fetch('/api/instructor-requests', { headers: getHeaders() })
      ]);

      if (exRes.ok) setExercises(await exRes.json());
      if (progRes.ok) setPrograms(await progRes.json());
      if (dietRes.ok) setDietPlans(await dietRes.json());
      if (artRes.ok) setArticles(await artRes.json());
      if (reqRes.ok) setAdminRequests(await reqRes.json());
    } catch (err) {
      console.error('Failed to load instructor data:', err);
      setError('Failed to connect to GymSync services. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==========================================
  // EXERCISES CRUD
  // ==========================================
  const handleOpenExModal = (ex = null) => {
    if (ex) {
      setEditingEx(ex);
      setExForm({
        name: ex.name || '',
        category: ex.category || (Array.isArray(ex.targetMuscles) ? ex.targetMuscles[0] : 'Chest'),
        targetMuscles: Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.targetMuscles || ''),
        equipmentRequired: ex.equipmentRequired || 'Dumbbells',
        difficulty: ex.difficulty || 'Intermediate',
        instructions: ex.instructions || ex.description || '',
        mediaUrl: ex.mediaUrl || ''
      });
    } else {
      setEditingEx(null);
      setExForm({
        name: '',
        category: 'Chest',
        targetMuscles: 'Chest, Triceps',
        equipmentRequired: 'Dumbbells',
        difficulty: 'Intermediate',
        instructions: '',
        mediaUrl: ''
      });
    }
    setShowExForm(true);
  };

  const handleSaveExercise = async (e) => {
    e.preventDefault();
    if (!exForm.name.trim()) {
      return toast.warn('Exercise name is required');
    }

    try {
      const payload = {
        name: exForm.name.trim(),
        targetMuscles: exForm.targetMuscles.split(',').map(m => m.trim()).filter(Boolean),
        equipmentRequired: exForm.equipmentRequired,
        difficulty: exForm.difficulty,
        description: exForm.instructions,
        mediaUrl: exForm.mediaUrl
      };

      const url = editingEx ? `/api/exercises/${editingEx._id || editingEx.id}` : '/api/exercises';
      const method = editingEx ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to save exercise');
      }

      toast.success(editingEx ? 'Exercise updated!' : 'Exercise published to library!');
      setShowExForm(false);
      setEditingEx(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save exercise');
    }
  };

  // ==========================================
  // WORKOUT PROGRAMS CRUD
  // ==========================================
  const handleOpenProgModal = (p = null) => {
    if (p) {
      setEditingProg(p);
      setProgForm({
        title: p.title || '',
        days: p.details?.days || 4,
        level: p.details?.level || 'Intermediate',
        category: p.category || 'Muscle Building',
        description: p.description || ''
      });
    } else {
      setEditingProg(null);
      setProgForm({
        title: '',
        days: 4,
        level: 'Intermediate',
        category: 'Muscle Building',
        description: ''
      });
    }
    setShowProgModal(true);
  };

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!progForm.title.trim()) return toast.warn('Program title is required');

    try {
      const payload = {
        title: progForm.title.trim(),
        type: 'Workout',
        category: progForm.category,
        description: progForm.description,
        details: {
          days: Number(progForm.days) || 4,
          level: progForm.level,
          target: progForm.category
        }
      };

      const url = editingProg ? `/api/plans/premade/${editingProg._id}` : '/api/plans/premade';
      const method = editingProg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save workout program');

      toast.success(editingProg ? 'Workout program updated!' : 'Workout program created and persisted!');
      setShowProgModal(false);
      setEditingProg(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save program');
    }
  };

  // ==========================================
  // DIET PLANS CRUD
  // ==========================================
  const handleOpenDietModal = (d = null) => {
    if (d) {
      setEditingDiet(d);
      setDietForm({
        title: d.title || '',
        calories: d.details?.calories || '2500 kcal',
        goal: d.details?.goal || d.category || 'Muscle Gain',
        description: d.description || '',
        protein: d.details?.protein || '180g',
        carbs: d.details?.carbs || '280g',
        fat: d.details?.fat || '65g'
      });
    } else {
      setEditingDiet(null);
      setDietForm({
        title: '',
        calories: '2500 kcal',
        goal: 'Muscle Gain',
        description: '',
        protein: '180g',
        carbs: '280g',
        fat: '65g'
      });
    }
    setShowDietModal(true);
  };

  const handleSaveDiet = async (e) => {
    e.preventDefault();
    if (!dietForm.title.trim()) return toast.warn('Diet title is required');

    try {
      const payload = {
        title: dietForm.title.trim(),
        type: 'Diet',
        category: dietForm.goal,
        description: dietForm.description,
        details: {
          calories: dietForm.calories,
          goal: dietForm.goal,
          protein: dietForm.protein,
          carbs: dietForm.carbs,
          fat: dietForm.fat
        }
      };

      const url = editingDiet ? `/api/plans/premade/${editingDiet._id}` : '/api/plans/premade';
      const method = editingDiet ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save diet plan');

      toast.success(editingDiet ? 'Diet plan updated!' : 'Diet plan created and persisted!');
      setShowDietModal(false);
      setEditingDiet(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save diet plan');
    }
  };

  // ==========================================
  // ARTICLES CRUD
  // ==========================================
  const handleOpenArticleModal = (a = null) => {
    if (a) {
      setEditingArticle(a);
      setArticleForm({
        title: a.title || '',
        category: a.category || 'Training',
        content: a.content || '',
        readTime: a.readTime || '4 min',
        tags: Array.isArray(a.tags) ? a.tags.join(', ') : (a.tags || '')
      });
    } else {
      setEditingArticle(null);
      setArticleForm({
        title: '',
        category: 'Training',
        content: '',
        readTime: '4 min',
        tags: 'Hypertrophy, Form, Health'
      });
    }
    setShowArticleModal(true);
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!articleForm.title.trim() || !articleForm.content.trim()) {
      return toast.warn('Title and article content are required');
    }

    try {
      const payload = {
        title: articleForm.title.trim(),
        category: articleForm.category,
        content: articleForm.content.trim(),
        readTime: articleForm.readTime,
        tags: articleForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      const url = editingArticle ? `/api/articles/${editingArticle._id}` : '/api/articles';
      const method = editingArticle ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save article');

      toast.success(editingArticle ? 'Article updated!' : 'Educational article published!');
      setShowArticleModal(false);
      setEditingArticle(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save article');
    }
  };

  // ==========================================
  // ADMIN REQUESTS
  // ==========================================
  const handleCompleteRequest = async (requestId) => {
    try {
      const res = await fetch(`/api/instructor-requests/${requestId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Completed',
          responseNotes: `Completed by ${instructorName} on ${new Date().toLocaleDateString()}`
        })
      });

      if (!res.ok) throw new Error('Failed to update task');

      toast.success('Task marked as completed and sent to Admin!');
      fetchData();
    } catch (err) {
      toast.error('Failed to complete task');
    }
  };

  // ==========================================
  // GENERIC DELETION HANDLER
  // ==========================================
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      let url = '';
      if (itemToDelete.type === 'exercise') url = `/api/exercises/${itemToDelete.id}`;
      else if (itemToDelete.type === 'program' || itemToDelete.type === 'diet') url = `/api/plans/premade/${itemToDelete.id}`;
      else if (itemToDelete.type === 'article') url = `/api/articles/${itemToDelete.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) throw new Error('Deletion failed');

      toast.success(`${itemToDelete.label} deleted successfully`);
      setItemToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = (ex.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = exerciseCategory === 'All' || 
                            (Array.isArray(ex.targetMuscles) ? ex.targetMuscles.includes(exerciseCategory) : ex.category === exerciseCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardShell
      userRole={userRole}
      userName={instructorName}
      title="Fitness Instructor Portal"
      subtitle="Curate exercises, workout routines, diet templates, and educational guides"
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="fitness-instructor-page">
        {loading ? (
          <div style={{ padding: '30px' }}>
            <SkeletonLoader count={4} height="80px" />
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={40} style={{ marginBottom: '10px' }} />
            <p>{error}</p>
            <button className="btn btn-outline" onClick={fetchData}>
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card glass-panel" onClick={() => setActiveTab('exercises')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon blue"><Dumbbell size={24} /></div>
                    <div>
                      <span className="stat-label">Exercise Library</span>
                      <h3 className="stat-value">{exercises.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('programs')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon purple"><Calendar size={24} /></div>
                    <div>
                      <span className="stat-label">Workout Programs</span>
                      <h3 className="stat-value">{programs.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('diet')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon green"><Utensils size={24} /></div>
                    <div>
                      <span className="stat-label">Diet Templates</span>
                      <h3 className="stat-value">{dietPlans.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('articles')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon amber"><FileText size={24} /></div>
                    <div>
                      <span className="stat-label">Educational Articles</span>
                      <h3 className="stat-value">{articles.length}</h3>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={18} color="var(--primary-accent)" /> Pending Admin Requests ({adminRequests.filter(r => r.status === 'Pending').length})
                    </h4>
                    {adminRequests.filter(r => r.status === 'Pending').length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No pending tasks from platform administrators. You're all caught up!</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {adminRequests.filter(r => r.status === 'Pending').map(r => (
                          <div key={r._id || r.id} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '12px', borderRadius: '10px' }}>
                            <strong>{r.topic}</strong>
                            <p style={{ margin: '4px 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.description}</p>
                            <button className="btn btn-sm btn-primary" onClick={() => handleCompleteRequest(r._id || r.id)}>
                              Mark Completed
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} color="#10b981" /> Quick Creation Shortcuts
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Publish new training content to the GymSync network. All created routines and nutrition guides persist directly to the database.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleOpenExModal()}>
                        <Plus size={14} /> New Exercise
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenProgModal()}>
                        <Plus size={14} /> New Program
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenDietModal()}>
                        <Plus size={14} /> New Diet Plan
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenArticleModal()}>
                        <Plus size={14} /> New Article
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EXERCISES */}
            {activeTab === 'exercises' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Exercise Library Management</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Curate movement instructions, target muscles, and video demonstrations</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleOpenExModal()}>
                    <Plus size={18} /> Add New Exercise
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input type="text" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select 
                    className="search-input" 
                    style={{ width: 'auto', minWidth: '160px' }}
                    value={exerciseCategory} 
                    onChange={e => setExerciseCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Legs">Legs</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Core">Core</option>
                  </select>
                </div>

                {filteredExercises.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Dumbbell size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No exercises match your search filters.</p>
                  </div>
                ) : (
                  <div className="exercise-grid">
                    {filteredExercises.map((ex) => (
                      <div key={ex._id || ex.id} className="exercise-card">
                        <div className="ex-card-header">
                          <h4>{ex.name}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-icon btn-sm" onClick={() => handleOpenExModal(ex)} title="Edit Exercise">
                              <Edit2 size={15} color="var(--primary-accent)" />
                            </button>
                            <button 
                              className="btn btn-icon btn-sm" 
                              onClick={() => setItemToDelete({ id: ex._id || ex.id, type: 'exercise', label: ex.name })}
                              title="Delete Exercise"
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <span className="category-badge">{Array.isArray(ex.targetMuscles) ? ex.targetMuscles[0] : (ex.category || 'General')}</span>
                          <span className="category-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>{ex.difficulty || 'Intermediate'}</span>
                        </div>
                        <p className="ex-instructions"><strong>Equipment:</strong> {ex.equipmentRequired || 'Bodyweight'}</p>
                        <p className="ex-instructions" style={{ fontSize: '0.85rem' }}>
                          {(ex.description || ex.instructions || 'No detailed instructions provided.').substring(0, 85)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: WORKOUT PROGRAMS */}
            {activeTab === 'programs' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Curated Workout Programs</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Pre-made multi-week training routines for platform members</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleOpenProgModal()}>
                    <Plus size={18} /> Create Program
                  </button>
                </div>

                {programs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No workout programs created yet. Click above to create one.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {programs.map(p => (
                      <div key={p._id || p.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{p.title}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-icon btn-sm" onClick={() => handleOpenProgModal(p)} title="Edit Program">
                              <Edit2 size={15} color="var(--primary-accent)" />
                            </button>
                            <button 
                              className="btn btn-icon btn-sm" 
                              onClick={() => setItemToDelete({ id: p._id, type: 'program', label: p.title })}
                              title="Delete Program"
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Frequency: <strong>{p.details?.days || 3} Days / Week</strong> • Level: <strong>{p.details?.level || 'Intermediate'}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {p.description || 'Pre-designed structured workout routine.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DIET PLANS */}
            {activeTab === 'diet' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Nutritional Diet Templates</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Macro-balanced meal plans for hypertrophy, fat loss, and maintenance</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleOpenDietModal()}>
                    <Plus size={18} /> Create Diet Plan
                  </button>
                </div>

                {dietPlans.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Utensils size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No diet templates created yet. Click above to add one.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {dietPlans.map(d => (
                      <div key={d._id || d.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: '#10b981' }}>{d.title}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-icon btn-sm" onClick={() => handleOpenDietModal(d)} title="Edit Diet">
                              <Edit2 size={15} color="var(--primary-accent)" />
                            </button>
                            <button 
                              className="btn btn-icon btn-sm" 
                              onClick={() => setItemToDelete({ id: d._id, type: 'diet', label: d.title })}
                              title="Delete Diet"
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Target: <strong>{d.details?.calories || '2,500 kcal'}</strong> • Goal: <strong>{d.category || d.details?.goal || 'General'}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {d.description || 'Structured macronutrient distribution protocol.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: EDUCATIONAL ARTICLES */}
            {activeTab === 'articles' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Educational Articles & Guides</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Evidence-based training articles and biomechanics guides</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleOpenArticleModal()}>
                    <Plus size={18} /> Publish Article
                  </button>
                </div>

                {articles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No articles published yet. Click above to write an article.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {articles.map(a => (
                      <div key={a._id || a.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{a.title}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-icon btn-sm" onClick={() => handleOpenArticleModal(a)} title="Edit Article">
                              <Edit2 size={15} color="var(--primary-accent)" />
                            </button>
                            <button 
                              className="btn btn-icon btn-sm" 
                              onClick={() => setItemToDelete({ id: a._id, type: 'article', label: a.title })}
                              title="Delete Article"
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          By {a.author || instructorName} • Category: {a.category} • {a.readTime || '4 min'} read
                        </p>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          {(a.content || '').substring(0, 180)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: ADMIN REQUESTS */}
            {activeTab === 'requests' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}>Administrative Requests & Tasks</h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Tasks assigned by platform SuperAdmins to fitness instructors</p>
                </div>

                {adminRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No active administrative requests.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {adminRequests.map(r => (
                      <div 
                        key={r._id || r.id} 
                        className="glass-panel" 
                        style={{ 
                          padding: '20px', 
                          borderRadius: '14px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          flexWrap: 'wrap', 
                          gap: '15px', 
                          border: r.status === 'Pending' ? '1px solid #f59e0b' : '1px solid var(--card-border)' 
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <span className="category-badge" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6', marginBottom: '6px' }}>
                            From: {r.from || 'Admin'}
                          </span>
                          <h4 style={{ margin: '6px 0', color: 'var(--text-primary)' }}>{r.topic}</h4>
                          <p style={{ margin: '0 0 6px 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{r.description}</p>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Status: <strong>{r.status}</strong> {r.completedBy ? `(Completed by ${r.completedBy})` : ''}
                          </span>
                        </div>
                        {r.status === 'Pending' ? (
                          <button className="btn btn-primary btn-sm" onClick={() => handleCompleteRequest(r._id || r.id)}>
                            <CheckCircle size={14} /> Mark Completed
                          </button>
                        ) : (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <CheckCircle size={16} /> Completed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* MODAL: EXERCISE CREATE / EDIT */}
        <Modal isOpen={showExForm} onClose={() => setShowExForm(false)} title={editingEx ? 'Update Exercise' : 'Add New Exercise to Library'}>
          <form onSubmit={handleSaveExercise} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Exercise Name</label>
              <input type="text" className="search-input" required value={exForm.name} onChange={e => setExForm({ ...exForm, name: e.target.value })} placeholder="e.g. Incline Dumbbell Press" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Difficulty</label>
                <select className="search-input" value={exForm.difficulty} onChange={e => setExForm({ ...exForm, difficulty: e.target.value })}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Equipment</label>
                <input type="text" className="search-input" value={exForm.equipmentRequired} onChange={e => setExForm({ ...exForm, equipmentRequired: e.target.value })} placeholder="Dumbbells, Bench" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Target Muscles (comma separated)</label>
              <input type="text" className="search-input" value={exForm.targetMuscles} onChange={e => setExForm({ ...exForm, targetMuscles: e.target.value })} placeholder="Chest, Triceps, Deltoids" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Media URL (Video / GIF)</label>
              <input type="text" className="search-input" value={exForm.mediaUrl} onChange={e => setExForm({ ...exForm, mediaUrl: e.target.value })} placeholder="https://example.com/demo.mp4" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Execution Instructions</label>
              <textarea rows="3" className="search-input" value={exForm.instructions} onChange={e => setExForm({ ...exForm, instructions: e.target.value })} placeholder="Step-by-step form cues..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowExForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingEx ? 'Save Changes' : 'Publish Exercise'}</button>
            </div>
          </form>
        </Modal>

        {/* MODAL: WORKOUT PROGRAM CREATE / EDIT */}
        <Modal isOpen={showProgModal} onClose={() => setShowProgModal(false)} title={editingProg ? 'Edit Workout Program' : 'Create Curated Workout Program'}>
          <form onSubmit={handleSaveProgram} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Program Title</label>
              <input type="text" required placeholder="e.g. 4-Week Hypertrophy Split" className="search-input" value={progForm.title} onChange={e => setProgForm({ ...progForm, title: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Days per Week</label>
                <input type="number" min="1" max="7" className="search-input" value={progForm.days} onChange={e => setProgForm({ ...progForm, days: parseInt(e.target.value) || 3 })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Experience Level</label>
                <select className="search-input" value={progForm.level} onChange={e => setProgForm({ ...progForm, level: e.target.value })}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Category Goal</label>
              <select className="search-input" value={progForm.category} onChange={e => setProgForm({ ...progForm, category: e.target.value })}>
                <option value="Muscle Building">Muscle Building</option>
                <option value="Weight Loss">Weight Loss</option>
                <option value="Strength & Power">Strength & Power</option>
                <option value="Endurance">Endurance</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Description</label>
              <textarea rows="3" className="search-input" placeholder="Program overview, schedule details, rest days..." value={progForm.description} onChange={e => setProgForm({ ...progForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowProgModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingProg ? 'Save Changes' : 'Save Program'}</button>
            </div>
          </form>
        </Modal>

        {/* MODAL: DIET PLAN CREATE / EDIT */}
        <Modal isOpen={showDietModal} onClose={() => setShowDietModal(false)} title={editingDiet ? 'Edit Diet Template' : 'Create Nutritional Diet Template'}>
          <form onSubmit={handleSaveDiet} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Diet Plan Title</label>
              <input type="text" required placeholder="e.g. Clean Bulk High-Protein Protocol" className="search-input" value={dietForm.title} onChange={e => setDietForm({ ...dietForm, title: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Target Daily Calories</label>
                <input type="text" required placeholder="e.g. 2800 kcal" className="search-input" value={dietForm.calories} onChange={e => setDietForm({ ...dietForm, calories: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Target Goal</label>
                <select className="search-input" value={dietForm.goal} onChange={e => setDietForm({ ...dietForm, goal: e.target.value })}>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Fat Loss">Fat Loss</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Protein</label>
                <input type="text" className="search-input" value={dietForm.protein} onChange={e => setDietForm({ ...dietForm, protein: e.target.value })} placeholder="180g" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Carbs</label>
                <input type="text" className="search-input" value={dietForm.carbs} onChange={e => setDietForm({ ...dietForm, carbs: e.target.value })} placeholder="280g" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Fats</label>
                <input type="text" className="search-input" value={dietForm.fat} onChange={e => setDietForm({ ...dietForm, fat: e.target.value })} placeholder="65g" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Meal Schedule & Guidelines</label>
              <textarea rows="3" className="search-input" placeholder="Daily meal distribution, hydration notes..." value={dietForm.description} onChange={e => setDietForm({ ...dietForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowDietModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingDiet ? 'Save Changes' : 'Save Diet Plan'}</button>
            </div>
          </form>
        </Modal>

        {/* MODAL: ARTICLE CREATE / EDIT */}
        <Modal isOpen={showArticleModal} onClose={() => setShowArticleModal(false)} title={editingArticle ? 'Edit Article' : 'Publish Educational Article'}>
          <form onSubmit={handleSaveArticle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Article Title</label>
              <input type="text" required placeholder="e.g. 5 Essential Rules for Progressive Overload" className="search-input" value={articleForm.title} onChange={e => setArticleForm({ ...articleForm, title: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Category</label>
                <select className="search-input" value={articleForm.category} onChange={e => setArticleForm({ ...articleForm, category: e.target.value })}>
                  <option value="Training">Training</option>
                  <option value="Nutrition">Nutrition</option>
                  <option value="Recovery">Recovery</option>
                  <option value="Biomechanics">Biomechanics</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Estimated Read Time</label>
                <input type="text" className="search-input" value={articleForm.readTime} onChange={e => setArticleForm({ ...articleForm, readTime: e.target.value })} placeholder="4 min" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Tags (comma separated)</label>
              <input type="text" className="search-input" value={articleForm.tags} onChange={e => setArticleForm({ ...articleForm, tags: e.target.value })} placeholder="Hypertrophy, Strength, Form" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Full Article Body</label>
              <textarea rows="6" required className="search-input" placeholder="Write evidence-based training guide..." value={articleForm.content} onChange={e => setArticleForm({ ...articleForm, content: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowArticleModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingArticle ? 'Update Article' : 'Publish Article'}</button>
            </div>
          </form>
        </Modal>

        {/* REUSABLE CONFIRMATION MODAL */}
        <ConfirmDialog
          isOpen={Boolean(itemToDelete)}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${itemToDelete?.label}`}
          message={`Are you sure you want to permanently delete "${itemToDelete?.label}"? This item will be removed from GymSync.`}
          confirmText="Delete Permanently"
          isDanger={true}
          loading={isDeleting}
        />
      </div>
    </DashboardShell>
  );
};

export default FitnessInstructorDashboard;
