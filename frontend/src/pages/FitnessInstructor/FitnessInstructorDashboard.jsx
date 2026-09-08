import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dumbbell, Plus, Edit2, Trash2, Calendar, Utensils, 
  MessageSquare, CheckCircle, Search, FileText, Activity, AlertCircle, RefreshCw,
  Archive, RotateCcw, Cpu, ShieldCheck, Sparkles, Upload, Flame, Layers, Video, HeartPulse
} from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardShell from '../../components/layout/DashboardShell';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import WorkoutProgramBuilderModal from '../../components/instructor/WorkoutProgramBuilderModal';
import DietTemplateBuilderModal from '../../components/instructor/DietTemplateBuilderModal';
import ArticleBuilderModal from '../../components/instructor/ArticleBuilderModal';
import { REGISTERED_DETECTORS } from '../../ai-detectors/registry';
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
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'archived' | 'all'

  // Exercise Form Modal
  const [editingEx, setEditingEx] = useState(null);
  const [showExForm, setShowExForm] = useState(false);
  const [exModalTab, setExModalTab] = useState('basic'); // 'basic' | 'biomechanics' | 'programming' | 'cues' | 'safety' | 'media'
  const [isAnalyzingEx, setIsAnalyzingEx] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [exForm, setExForm] = useState({
    name: '',
    category: 'Chest',
    targetMuscles: 'Chest, Triceps',
    secondaryMuscles: 'Anterior Deltoids',
    movementPatterns: 'horizontal push',
    tags: 'compound, hypertrophy',
    sportTags: 'general',
    equipmentRequired: 'Bodyweight',
    difficulty: 'Beginner',
    primaryPurpose: '',
    secondaryPurpose: '',
    defaultSets: 3,
    defaultReps: 10,
    defaultDuration: 0,
    instructions: '',
    description: '',
    coachingCues: '',
    commonMistakes: '',
    progressions: '',
    regressions: '',
    contraindications: '',
    jointPainAvoidIf: '',
    metValue: 5.0,
    mediaUrl: '',
    aiGeneratedMetadata: false,
    aiDetection: {
      enabled: false,
      detectorId: 'pushup_v1',
      detectorVersion: '1.0'
    }
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
        fetch('/api/exercises?includeArchived=true'),
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
  // EXERCISES CRUD & ARCHIVE MANAGEMENT
  // ==========================================
  const handleOpenExModal = (ex = null) => {
    setExModalTab('basic');
    if (ex) {
      setEditingEx(ex);
      setExForm({
        name: ex.name || '',
        category: ex.category || (Array.isArray(ex.targetMuscles) ? ex.targetMuscles[0] : 'Chest'),
        targetMuscles: Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.targetMuscles || ''),
        secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles.join(', ') : (ex.secondaryMuscles || ''),
        movementPatterns: Array.isArray(ex.movementPatterns) ? ex.movementPatterns.join(', ') : (ex.movementPattern || 'horizontal push'),
        tags: Array.isArray(ex.tags) ? ex.tags.join(', ') : (ex.tags || ''),
        sportTags: Array.isArray(ex.sportTags) ? ex.sportTags.join(', ') : (ex.sportTags || ''),
        equipmentRequired: ex.equipmentRequired || 'Bodyweight',
        difficulty: ex.difficulty || 'Beginner',
        primaryPurpose: ex.primaryPurpose || '',
        secondaryPurpose: ex.secondaryPurpose || '',
        defaultSets: ex.defaultSets || 3,
        defaultReps: ex.defaultReps || 10,
        defaultDuration: ex.defaultDuration || 0,
        instructions: ex.instructions || ex.description || '',
        description: ex.description || '',
        coachingCues: Array.isArray(ex.coachingCues) ? ex.coachingCues.join('; ') : (ex.coachingCues || ''),
        commonMistakes: Array.isArray(ex.commonMistakes) ? ex.commonMistakes.join('; ') : (ex.commonMistakes || ''),
        progressions: Array.isArray(ex.progressions) ? ex.progressions.join(', ') : (ex.progressions || ''),
        regressions: Array.isArray(ex.regressions) ? ex.regressions.join(', ') : (ex.regressions || ''),
        contraindications: Array.isArray(ex.contraindications) ? ex.contraindications.join(', ') : (ex.contraindications || ''),
        jointPainAvoidIf: Array.isArray(ex.jointPainAvoidIf) ? ex.jointPainAvoidIf.join(', ') : (ex.jointPainAvoidIf || ''),
        metValue: ex.calorieEstimation?.metValue || 5.0,
        mediaUrl: ex.mediaUrl || '',
        aiGeneratedMetadata: Boolean(ex.aiGeneratedMetadata),
        aiDetection: {
          enabled: Boolean(ex.aiDetection?.enabled || ex.isAiTrackable),
          detectorId: ex.aiDetection?.detectorId || 'pushup_v1',
          detectorVersion: ex.aiDetection?.detectorVersion || '1.0'
        }
      });
    } else {
      setEditingEx(null);
      setExForm({
        name: '',
        category: 'Chest',
        targetMuscles: 'Chest, Triceps',
        secondaryMuscles: 'Anterior Deltoids',
        movementPatterns: 'horizontal push',
        tags: 'compound, hypertrophy',
        sportTags: 'general',
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        primaryPurpose: '',
        secondaryPurpose: '',
        defaultSets: 3,
        defaultReps: 10,
        defaultDuration: 0,
        instructions: '',
        description: '',
        coachingCues: '',
        commonMistakes: '',
        progressions: '',
        regressions: '',
        contraindications: '',
        jointPainAvoidIf: '',
        metValue: 5.0,
        mediaUrl: '',
        aiGeneratedMetadata: false,
        aiDetection: {
          enabled: false,
          detectorId: 'pushup_v1',
          detectorVersion: '1.0'
        }
      });
    }
    setShowExForm(true);
  };

  const handleAiAssistExercise = async () => {
    if (!exForm.name || !exForm.name.trim()) {
      return toast.warn('Please enter an exercise name first to analyze with AI');
    }
    setIsAnalyzingEx(true);
    try {
      const res = await fetch('/api/exercises/ai-assist', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: exForm.name.trim(),
          category: exForm.category,
          equipmentRequired: exForm.equipmentRequired,
          difficulty: exForm.difficulty
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze exercise');

      const d = data.draft;
      setExForm(prev => ({
        ...prev,
        movementPatterns: Array.isArray(d.movementPatterns) ? d.movementPatterns.join(', ') : (d.movementPatterns || prev.movementPatterns),
        targetMuscles: Array.isArray(d.targetMuscles) ? d.targetMuscles.join(', ') : (d.targetMuscles || prev.targetMuscles),
        secondaryMuscles: Array.isArray(d.secondaryMuscles) ? d.secondaryMuscles.join(', ') : (d.secondaryMuscles || prev.secondaryMuscles),
        tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || prev.tags),
        sportTags: Array.isArray(d.sportTags) ? d.sportTags.join(', ') : (d.sportTags || prev.sportTags),
        primaryPurpose: d.primaryPurpose || prev.primaryPurpose,
        secondaryPurpose: d.secondaryPurpose || prev.secondaryPurpose,
        coachingCues: Array.isArray(d.coachingCues) ? d.coachingCues.join('; ') : (d.coachingCues || prev.coachingCues),
        commonMistakes: Array.isArray(d.commonMistakes) ? d.commonMistakes.join('; ') : (d.commonMistakes || prev.commonMistakes),
        progressions: Array.isArray(d.progressions) ? d.progressions.join(', ') : (d.progressions || prev.progressions),
        regressions: Array.isArray(d.regressions) ? d.regressions.join(', ') : (d.regressions || prev.regressions),
        contraindications: Array.isArray(d.contraindications) ? d.contraindications.join(', ') : (d.contraindications || prev.contraindications),
        metValue: d.metValue || prev.metValue,
        instructions: d.instructions || prev.instructions,
        aiGeneratedMetadata: true
      }));
      toast.success('✨ Qwen sports science metadata generated! Review the tabs before saving.');
    } catch (err) {
      toast.error(err.message || 'AI assistance unavailable');
    } finally {
      setIsAnalyzingEx(false);
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch('/api/exercises/upload-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Media upload failed');
      setExForm(prev => ({ ...prev, mediaUrl: data.mediaUrl }));
      toast.success('Media uploaded successfully!');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSaveExercise = async (e) => {
    e.preventDefault();
    if (!exForm.name.trim()) {
      return toast.warn('Exercise name is required');
    }

    try {
      const splitClean = (val) => typeof val === 'string' ? val.split(/[;,]/).map(s => s.trim()).filter(Boolean) : (Array.isArray(val) ? val : []);

      const payload = {
        name: exForm.name.trim(),
        category: exForm.category,
        targetMuscles: splitClean(exForm.targetMuscles),
        secondaryMuscles: splitClean(exForm.secondaryMuscles),
        movementPatterns: splitClean(exForm.movementPatterns),
        tags: splitClean(exForm.tags),
        sportTags: splitClean(exForm.sportTags),
        equipmentRequired: exForm.equipmentRequired,
        difficulty: exForm.difficulty,
        primaryPurpose: exForm.primaryPurpose,
        secondaryPurpose: exForm.secondaryPurpose,
        defaultSets: Number(exForm.defaultSets) || 3,
        defaultReps: Number(exForm.defaultReps) || 10,
        defaultDuration: Number(exForm.defaultDuration) || 0,
        instructions: exForm.instructions,
        description: exForm.description || exForm.instructions,
        coachingCues: splitClean(exForm.coachingCues),
        commonMistakes: splitClean(exForm.commonMistakes),
        progressions: splitClean(exForm.progressions),
        regressions: splitClean(exForm.regressions),
        contraindications: splitClean(exForm.contraindications),
        jointPainAvoidIf: splitClean(exForm.jointPainAvoidIf),
        calorieEstimation: {
          metValue: Number(exForm.metValue) || 5.0,
          intensity: exForm.difficulty === 'Advanced' ? 'high' : 'moderate',
          estimatedKcalPerMinute: ((Number(exForm.metValue) || 5.0) * 3.5 * 70 / 200)
        },
        mediaUrl: exForm.mediaUrl,
        aiGeneratedMetadata: Boolean(exForm.aiGeneratedMetadata),
        instructorApproved: true,
        aiDetection: exForm.aiDetection.enabled ? {
          enabled: true,
          detectorId: exForm.aiDetection.detectorId,
          detectorVersion: exForm.aiDetection.detectorVersion || '1.0'
        } : {
          enabled: false,
          detectorId: null,
          detectorVersion: null
        }
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
        throw new Error(d.error || d.message || 'Failed to save exercise');
      }

      toast.success(editingEx ? 'Exercise updated!' : 'Exercise published to library!');
      setShowExForm(false);
      setEditingEx(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save exercise');
    }
  };

  const handleToggleArchive = async (ex) => {
    try {
      const isArchived = ex.status === 'archived';
      const targetStatus = isArchived ? 'active' : 'archived';
      const res = await fetch(`/api/exercises/${ex._id || ex.id}/archive`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: targetStatus })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to update exercise status');
      }

      toast.success(`Exercise "${ex.name}" ${isArchived ? 'restored to active library' : 'moved to archive'}!`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // ==========================================
  // WORKOUT PROGRAMS CRUD
  // ==========================================
  // ==========================================
  // WORKOUT PROGRAMS CRUD
  // ==========================================
  const handleOpenProgModal = (p = null) => {
    setEditingProg(p);
    setShowProgModal(true);
  };

  const handleSaveProgram = async (payload) => {
    try {
      const url = editingProg ? `/api/plans/premade/${editingProg._id}` : '/api/plans/premade';
      const method = editingProg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save workout program');
      }

      toast.success(editingProg ? 'Workout program updated!' : 'Workout program created & published!');
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
    setEditingDiet(d);
    setShowDietModal(true);
  };

  const handleSaveDiet = async (payload) => {
    try {
      const url = editingDiet ? `/api/plans/premade/${editingDiet._id}` : '/api/plans/premade';
      const method = editingDiet ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save diet template');
      }

      toast.success(editingDiet ? 'Diet template updated!' : 'Diet template created & published!');
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
    setEditingArticle(a);
    setShowArticleModal(true);
  };

  const handleSaveArticle = async (payload) => {
    try {
      const url = editingArticle ? `/api/articles/${editingArticle._id}` : '/api/articles';
      const method = editingArticle ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save article');
      }

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
  const handleStartRequest = async (requestId) => {
    try {
      const res = await fetch(`/api/instructor-requests/${requestId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'In Progress' })
      });

      if (!res.ok) throw new Error('Failed to update task');

      toast.success('Task status set to "In Progress"');
      fetchData();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleCompleteRequest = async (requestId, notes = '') => {
    try {
      const res = await fetch(`/api/instructor-requests/${requestId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Completed',
          responseNotes: notes || `Completed by ${instructorName} on ${new Date().toLocaleDateString()}`
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

  const activeExCount = exercises.filter(e => e.status !== 'archived').length;
  const archivedExCount = exercises.filter(e => e.status === 'archived').length;

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = (ex.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (ex.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = exerciseCategory === 'All' || 
                            ex.category === exerciseCategory ||
                            (Array.isArray(ex.targetMuscles) && ex.targetMuscles.includes(exerciseCategory));
    const exStatus = ex.status === 'archived' ? 'archived' : 'active';
    const matchesStatus = statusFilter === 'all' || exStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <DashboardShell
      userRole={userRole}
      userName={instructorName}
      title="Fitness Instructor Portal"
      subtitle="Authoritative Exercise Library, AI Detector Configuration, and Training Programs"
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
                  <div className="stat-card glass-panel" onClick={() => { setActiveTab('exercises'); setStatusFilter('all'); }} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon blue"><Dumbbell size={24} /></div>
                    <div>
                      <span className="stat-label">Exercise Library</span>
                      <h3 className="stat-value">{exercises.length}</h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {activeExCount} Active • {archivedExCount} Archived
                      </span>
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
                      <Activity size={18} color="#10b981" /> Fitness Authority Actions
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      As Fitness Instructor, you define the authoritative movement library and assign approved computer-vision AI detectors used across GymSync.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleOpenExModal()}>
                        <Plus size={14} /> New Exercise Definition
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenProgModal()}>
                        <Plus size={14} /> New Program
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenDietModal()}>
                        <Plus size={14} /> New Diet Plan
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenArticleModal()}>
                        <Plus size={14} /> New Guide
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EXERCISES (FITNESS AUTHORITY CORE) */}
            {activeTab === 'exercises' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Exercise Library & AI Vision Configuration</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                      Authoritative movement standards, coaching cues, defaults, and certified AI detectors
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleOpenExModal()}>
                    <Plus size={18} /> Add Exercise to Library
                  </button>
                </div>

                {/* Status Toggle Bar */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button 
                    className={`btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setStatusFilter('active')}
                  >
                    Active Exercises ({activeExCount})
                  </button>
                  <button 
                    className={`btn btn-sm ${statusFilter === 'archived' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setStatusFilter('archived')}
                  >
                    Archived Library ({archivedExCount})
                  </button>
                  <button 
                    className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All Exercises ({exercises.length})
                  </button>
                </div>

                {/* Search & Category Filter */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input type="text" placeholder="Search exercises by name or category..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select 
                    className="search-input" 
                    style={{ width: 'auto', minWidth: '160px' }}
                    value={exerciseCategory} 
                    onChange={e => setExerciseCategory(e.target.value)}
                  >
                    <option value="All">All Muscle Categories</option>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Legs">Legs</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Core">Core</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Full Body">Full Body</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {filteredExercises.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Dumbbell size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No exercises found matching your filter selection ({statusFilter} / {exerciseCategory}).</p>
                  </div>
                ) : (
                  <div className="exercise-grid">
                    {filteredExercises.map((ex) => (
                      <div key={ex._id || ex.id} className={`exercise-card ${ex.status === 'archived' ? 'archived' : ''}`}>
                        <div className="ex-card-header">
                          <h4 style={{ color: 'var(--text-primary)' }}>{ex.name}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-icon btn-sm" onClick={() => handleOpenExModal(ex)} title="Edit Exercise Details & Detector">
                              <Edit2 size={15} color="var(--primary-accent)" />
                            </button>
                            <button 
                              className="btn btn-icon btn-sm" 
                              onClick={() => handleToggleArchive(ex)}
                              title={ex.status === 'archived' ? 'Restore Exercise to Active Library' : 'Archive Exercise'}
                              style={{ color: ex.status === 'archived' ? '#10b981' : '#f59e0b' }}
                            >
                              {ex.status === 'archived' ? <RotateCcw size={15} /> : <Archive size={15} />}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <span className={`category-badge ${ex.status === 'archived' ? 'archived-badge' : 'active-badge'}`}>
                            {ex.status === 'archived' ? 'Archived' : 'Active'}
                          </span>
                          <span className="category-badge">{ex.category || (Array.isArray(ex.targetMuscles) ? ex.targetMuscles[0] : 'Chest')}</span>
                          <span className="category-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                            {ex.difficulty || 'Beginner'}
                          </span>
                          {(ex.aiDetection?.enabled || ex.isAiTrackable) && (
                            <span className="category-badge ai-badge" title={`Approved Detector: ${ex.aiDetection?.detectorId || 'AI'}`}>
                              <Cpu size={12} /> AI Trackable
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div><strong>Target Muscles:</strong> {Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.targetMuscles || 'Full Body')}</div>
                          <div><strong>Equipment:</strong> {ex.equipmentRequired || 'Bodyweight'}</div>
                          <div><strong>Default Target:</strong> {ex.defaultSets || 3} sets × {ex.defaultReps || 10} reps {ex.defaultDuration > 0 ? `(${ex.defaultDuration}s)` : ''}</div>
                        </div>

                        <p className="ex-instructions" style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                          {(ex.instructions || ex.description || 'No coaching cues specified.').substring(0, 95)}...
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
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                            <span className="category-badge" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                              From: {r.from || 'Admin'}
                            </span>
                            <span className="category-badge" style={{
                              background: r.priority === 'Urgent' ? 'rgba(239,68,68,0.2)' : r.priority === 'High' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)',
                              color: r.priority === 'Urgent' ? '#ef4444' : r.priority === 'High' ? '#f59e0b' : '#10b981'
                            }}>
                              {r.priority || 'Medium'} Priority
                            </span>
                            <span className="category-badge" style={{
                              background: r.status === 'Completed' ? 'rgba(16,185,129,0.2)' : r.status === 'In Progress' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)',
                              color: r.status === 'Completed' ? '#10b981' : r.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                            }}>
                              {r.status}
                            </span>
                          </div>
                          <h4 style={{ margin: '6px 0', color: 'var(--text-primary)' }}>{r.topic}</h4>
                          <p style={{ margin: '0 0 6px 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{r.description}</p>
                          {r.responseNotes && (
                            <p style={{ margin: '4px 0 6px 0', fontSize: '0.82rem', color: '#10b981', background: 'rgba(16,185,129,0.06)', padding: '6px 10px', borderRadius: '6px' }}>
                              📝 <strong>Resolution:</strong> {r.responseNotes}
                            </p>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Assigned To: <strong>{r.assignedTo || 'All Instructors'}</strong> {r.completedBy ? `• Completed by ${r.completedBy} on ${new Date(r.completedAt).toLocaleDateString()}` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {r.status === 'Pending' && (
                            <button className="btn btn-outline btn-sm" onClick={() => handleStartRequest(r._id || r.id)}>
                              Start Task
                            </button>
                          )}
                          {r.status !== 'Completed' ? (
                            <button className="btn btn-primary btn-sm" onClick={() => handleCompleteRequest(r._id || r.id)}>
                              <CheckCircle size={14} /> Mark Completed
                            </button>
                          ) : (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                              <CheckCircle size={16} /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* MODAL: EXERCISE CREATE / EDIT */}
        <Modal 
          isOpen={showExForm} 
          onClose={() => setShowExForm(false)} 
          title={editingEx ? `Edit Exercise: ${editingEx.name}` : 'Exercise Authoring Studio & Knowledge Base'}
          maxWidth="840px"
        >
          <form onSubmit={handleSaveExercise} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Top Row: Name + AI Assist Trigger */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Exercise Name *</label>
                <input 
                  type="text" 
                  className="search-input" 
                  required 
                  value={exForm.name} 
                  onChange={e => setExForm({ ...exForm, name: e.target.value })} 
                  placeholder="e.g. Incline Dumbbell Press" 
                />
              </div>
              <button
                type="button"
                onClick={handleAiAssistExercise}
                disabled={isAnalyzingEx || !exForm.name.trim()}
                className="btn btn-primary"
                style={{
                  height: '42px',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  padding: '0 16px',
                  opacity: isAnalyzingEx ? 0.7 : 1,
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
                title="Use Qwen AI sports science brain to draft biomechanics, cues, and safety"
              >
                <Sparkles size={16} />
                {isAnalyzingEx ? 'Analyzing...' : '✨ Analyze with Qwen'}
              </button>
            </div>

            {/* Manual Authoring & AI Assist Helper Banner */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              background: exForm.aiGeneratedMetadata ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)', 
              border: exForm.aiGeneratedMetadata ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--card-border)', 
              borderRadius: '10px', 
              padding: '8px 14px', 
              fontSize: '0.8rem', 
              color: exForm.aiGeneratedMetadata ? '#93c5fd' : 'var(--text-secondary)' 
            }}>
              <span>
                ✍️ <strong>Instructor Control:</strong> You have 100% control to type, edit, or adjust any field manually. Qwen AI is an optional assistant to draft initial metadata.
              </span>
              {exForm.aiGeneratedMetadata && (
                <span style={{ color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  <Sparkles size={14} /> AI Draft (Review Mode)
                </span>
              )}
            </div>

            {/* Tab Navigation (Pills format without scrollbar) */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              borderBottom: '1px solid var(--card-border)', 
              paddingBottom: '10px', 
              flexWrap: 'wrap' 
            }}>
              {[
                { id: 'basic', label: '🏷️ Identity & Basics' },
                { id: 'biomechanics', label: '🧬 Biomechanics & Muscles' },
                { id: 'programming', label: '⏱️ Prescriptions' },
                { id: 'cues', label: '🎯 Cues & Errors' },
                { id: 'safety', label: '🛡️ Safety & Health' },
                { id: 'media', label: '⚡ Energy & Media' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExModalTab(t.id)}
                  style={{
                    background: exModalTab === t.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: exModalTab === t.id ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: exModalTab === t.id ? '#93c5fd' : 'var(--text-secondary)',
                    borderRadius: '10px',
                    padding: '7px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: IDENTITY & BASICS */}
            {exModalTab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Muscle Category</label>
                    <select className="search-input" value={exForm.category} onChange={e => setExForm({ ...exForm, category: e.target.value })}>
                      <option value="Chest">Chest</option>
                      <option value="Back">Back</option>
                      <option value="Legs">Legs</option>
                      <option value="Shoulders">Shoulders</option>
                      <option value="Arms">Arms</option>
                      <option value="Core">Core</option>
                      <option value="Cardio">Cardio</option>
                      <option value="Full Body">Full Body</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Difficulty Level</label>
                    <select className="search-input" value={exForm.difficulty} onChange={e => setExForm({ ...exForm, difficulty: e.target.value })}>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Equipment Required</label>
                    <input type="text" className="search-input" value={exForm.equipmentRequired} onChange={e => setExForm({ ...exForm, equipmentRequired: e.target.value })} placeholder="Bodyweight, Dumbbells, Barbell, Cable" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Tags (comma-separated)</label>
                    <input type="text" className="search-input" value={exForm.tags} onChange={e => setExForm({ ...exForm, tags: e.target.value })} placeholder="compound, hypertrophy, unilateral, power" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Exercise Description / Overview</label>
                  <textarea rows="2" className="search-input" value={exForm.description} onChange={e => setExForm({ ...exForm, description: e.target.value })} placeholder="High-level biomechanical overview and context..." />
                </div>
              </div>
            )}

            {/* TAB 2: BIOMECHANICS & MUSCLES */}
            {exModalTab === 'biomechanics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Primary Movement Pattern *</label>
                    <select className="search-input" value={exForm.movementPatterns} onChange={e => setExForm({ ...exForm, movementPatterns: e.target.value })}>
                      <option value="horizontal push">Horizontal Push (Bench Press, Push-ups)</option>
                      <option value="vertical push">Vertical Push (Overhead Press, Dips)</option>
                      <option value="horizontal pull">Horizontal Pull (Rows, Face Pulls)</option>
                      <option value="vertical pull">Vertical Pull (Pull-ups, Lat Pulldowns)</option>
                      <option value="squat">Squat (Squats, Leg Press)</option>
                      <option value="hinge">Hinge (Deadlifts, Hip Thrusts)</option>
                      <option value="lunge">Lunge (Split Squats, Walking Lunges)</option>
                      <option value="rotation">Rotation (Russian Twists, Woodchops)</option>
                      <option value="anti-rotation">Anti-Rotation (Pallof Press)</option>
                      <option value="anti-extension">Anti-Extension (Planks, Rollouts)</option>
                      <option value="carry">Carry (Farmer's Walk)</option>
                      <option value="locomotion">Locomotion (Jogging, Running)</option>
                      <option value="sprinting">Sprinting (High-speed sprints)</option>
                      <option value="jumping">Jumping (Box Jumps, Plyometrics)</option>
                      <option value="mobility">Mobility (Dynamic Stretches)</option>
                      <option value="activation">Activation (Glute bridges, Band walks)</option>
                      <option value="conditioning">Conditioning (Burpees, Battle ropes)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Sport Relevance Tags</label>
                    <input type="text" className="search-input" value={exForm.sportTags} onChange={e => setExForm({ ...exForm, sportTags: e.target.value })} placeholder="general, cricket, football, running, combat" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Primary Target Muscles</label>
                    <input type="text" className="search-input" value={exForm.targetMuscles} onChange={e => setExForm({ ...exForm, targetMuscles: e.target.value })} placeholder="e.g. Pectoralis Major, Anterior Deltoid" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Secondary Supporting Muscles</label>
                    <input type="text" className="search-input" value={exForm.secondaryMuscles} onChange={e => setExForm({ ...exForm, secondaryMuscles: e.target.value })} placeholder="e.g. Triceps Brachii, Serratus Anterior" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Primary Purpose</label>
                    <input type="text" className="search-input" value={exForm.primaryPurpose} onChange={e => setExForm({ ...exForm, primaryPurpose: e.target.value })} placeholder="Build horizontal pressing strength and pectoralis hypertrophy" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Secondary / Functional Purpose</label>
                    <input type="text" className="search-input" value={exForm.secondaryPurpose} onChange={e => setExForm({ ...exForm, secondaryPurpose: e.target.value })} placeholder="Stabilize glenohumeral joint and scapular rhythm" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRESCRIPTIONS & PROGRAMMING */}
            {exModalTab === 'programming' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                    Default Progression Baseline
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Default Sets</label>
                      <input type="number" min="1" max="10" className="search-input" value={exForm.defaultSets} onChange={e => setExForm({ ...exForm, defaultSets: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Default Reps</label>
                      <input type="number" min="1" max="100" className="search-input" value={exForm.defaultReps} onChange={e => setExForm({ ...exForm, defaultReps: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px' }}>Duration (s, if static hold)</label>
                      <input type="number" min="0" max="600" className="search-input" value={exForm.defaultDuration} onChange={e => setExForm({ ...exForm, defaultDuration: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CUES & ERRORS */}
            {exModalTab === 'cues' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Coaching Cues (semicolon-separated)</label>
                  <input type="text" className="search-input" value={exForm.coachingCues} onChange={e => setExForm({ ...exForm, coachingCues: e.target.value })} placeholder="Retract scapulae; Keep elbows at 45 degrees; Drive feet into ground" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Common Mistakes to Avoid (semicolon-separated)</label>
                  <input type="text" className="search-input" value={exForm.commonMistakes} onChange={e => setExForm({ ...exForm, commonMistakes: e.target.value })} placeholder="Flaring elbows to 90 degrees; Bouncing weight off chest" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Regressions (Easier variations)</label>
                    <input type="text" className="search-input" value={exForm.regressions} onChange={e => setExForm({ ...exForm, regressions: e.target.value })} placeholder="Push-ups, Dumbbell Floor Press" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Progressions (Harder variations)</label>
                    <input type="text" className="search-input" value={exForm.progressions} onChange={e => setExForm({ ...exForm, progressions: e.target.value })} placeholder="Pause Bench Press, Incline Dumbbell Press" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>Step-by-Step Instructions</label>
                  <textarea rows="3" className="search-input" value={exForm.instructions} onChange={e => setExForm({ ...exForm, instructions: e.target.value })} placeholder="1. Lie flat on bench with feet planted...\n2. Unrack with arms extended...\n3. Inhale and lower with control..." />
                </div>
              </div>
            )}

            {/* TAB 5: SAFETY & HEALTH */}
            {exModalTab === 'safety' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600, color: '#f87171' }}>
                    Contraindications & Medical Exclusions (comma-separated)
                  </label>
                  <input type="text" className="search-input" value={exForm.contraindications} onChange={e => setExForm({ ...exForm, contraindications: e.target.value })} placeholder="Rotator cuff impingement, Acute wrist fracture, Herniated disc" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                    Joint Pain Exclusions (comma-separated)
                  </label>
                  <input type="text" className="search-input" value={exForm.jointPainAvoidIf} onChange={e => setExForm({ ...exForm, jointPainAvoidIf: e.target.value })} placeholder="shoulders, wrists, elbows, lower back" />
                </div>
              </div>
            )}

            {/* TAB 6: ENERGY & MEDIA */}
            {exModalTab === 'media' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* MET Value for Calorie Estimation */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                    ⚡ MET (Metabolic Equivalent) Value: <strong style={{ color: '#10b981' }}>{exForm.metValue || 5.0}</strong>
                  </label>
                  <input 
                    type="range" 
                    min="2" 
                    max="14" 
                    step="0.5" 
                    value={exForm.metValue || 5.0} 
                    onChange={e => setExForm({ ...exForm, metValue: parseFloat(e.target.value) })}
                    style={{ width: '100%' }} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <span>Light (2.5)</span>
                    <span>Moderate (5.0)</span>
                    <span>Vigorous (8.0)</span>
                    <span>Maximum (12+)</span>
                  </div>
                  <span style={{ display: 'block', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Est. burn rate for 70kg athlete: <strong>~{Math.round(((exForm.metValue || 5.0) * 3.5 * 70 / 200) * 60)} kcal/hour</strong>
                  </span>
                </div>

                {/* Media File Upload & URL */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
                    Upload Exercise Demonstration Media (Image / Video / GIF)
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
                      <Upload size={15} />
                      {isUploadingMedia ? 'Uploading...' : 'Choose File'}
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={handleMediaUpload} 
                        disabled={isUploadingMedia} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    <input 
                      type="text" 
                      className="search-input" 
                      style={{ flex: 1 }} 
                      value={exForm.mediaUrl} 
                      onChange={e => setExForm({ ...exForm, mediaUrl: e.target.value })} 
                      placeholder="Or paste URL: https://example.com/demo.mp4" 
                    />
                  </div>
                  {exForm.mediaUrl && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Attached Media URL active
                    </div>
                  )}
                </div>

                {/* AI Vision Detector Configuration */}
                <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={exForm.aiDetection.enabled} 
                        onChange={e => setExForm({
                          ...exForm,
                          aiDetection: {
                            ...exForm.aiDetection,
                            enabled: e.target.checked
                          }
                        })} 
                      />
                      <Cpu size={15} color="var(--primary-accent)" /> Enable AI Pose / Rep Detector
                    </label>
                  </div>

                  {exForm.aiDetection.enabled && (
                    <div style={{ marginTop: '8px' }}>
                      <select 
                        className="search-input" 
                        value={exForm.aiDetection.detectorId} 
                        onChange={e => {
                          const selected = REGISTERED_DETECTORS.find(d => d.id === e.target.value);
                          setExForm({
                            ...exForm,
                            aiDetection: {
                              ...exForm.aiDetection,
                              detectorId: e.target.value,
                              detectorVersion: selected ? selected.version : '1.0'
                            }
                          });
                        }}
                      >
                        {REGISTERED_DETECTORS.map(det => (
                          <option key={det.id} value={det.id}>
                            {det.name} ({det.status === 'production' ? 'Production' : 'Experimental'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--card-border)' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowExForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingEx ? 'Save Exercise Changes' : 'Publish Exercise'}</button>
            </div>
          </form>
        </Modal>

        {/* BUILDER MODAL: WORKOUT PROGRAM */}
        <WorkoutProgramBuilderModal
          isOpen={showProgModal}
          onClose={() => { setShowProgModal(false); setEditingProg(null); }}
          onSave={handleSaveProgram}
          editingProgram={editingProg}
          availableExercises={exercises.filter(e => e.status !== 'archived')}
        />

        {/* BUILDER MODAL: NUTRITIONAL DIET TEMPLATE */}
        <DietTemplateBuilderModal
          isOpen={showDietModal}
          onClose={() => { setShowDietModal(false); setEditingDiet(null); }}
          onSave={handleSaveDiet}
          editingDiet={editingDiet}
        />

        {/* BUILDER MODAL: EDUCATIONAL ARTICLE & GUIDE */}
        <ArticleBuilderModal
          isOpen={showArticleModal}
          onClose={() => { setShowArticleModal(false); setEditingArticle(null); }}
          onSave={handleSaveArticle}
          editingArticle={editingArticle}
          availableExercises={exercises.filter(e => e.status !== 'archived')}
        />

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
