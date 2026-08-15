import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, Plus, Edit2, Video, Image, BookOpen, Calendar, Utensils, 
  MessageSquare, CheckCircle, Search, Filter, ShieldAlert, Award, FileText 
} from 'lucide-react';
import { toast } from 'react-toastify';
import './FitnessInstructorDashboard.css';

const FitnessInstructorDashboard = () => {
  const instructorName = localStorage.getItem('gymsync_user_name') || 'Fitness Instructor';
  const [activeTab, setActiveTab] = useState('exercises'); // 'exercises', 'programs', 'diet', 'articles', 'requests'

  // Exercises state
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [editingEx, setEditingEx] = useState(null);
  const [showExForm, setShowExForm] = useState(false);

  const [exForm, setExForm] = useState({
    name: '',
    category: 'Chest',
    targetMuscles: 'Chest, Triceps',
    equipmentRequired: 'Dumbbells',
    difficulty: 'Intermediate',
    instructions: '',
    mediaUrl: '',
    points: 5
  });

  // Workout Programs state
  const [programs, setPrograms] = useState([
    { id: 1, title: 'Hypertrophy 4-Week Mass Split', days: 4, level: 'Intermediate', category: 'Muscle Building' },
    { id: 2, title: 'Fat Loss & Core Shred', days: 5, level: 'Beginner', category: 'Weight Loss' }
  ]);
  const [showProgForm, setShowProgForm] = useState(false);
  const [progForm, setProgForm] = useState({ title: '', days: 4, level: 'Intermediate', category: 'General' });

  // Diet Plans state
  const [dietPlans, setDietPlans] = useState([
    { id: 1, title: 'High Protein Clean Bulk', calories: '2800 kcal', goal: 'Muscle Gain' },
    { id: 2, title: 'Keto Low-Carb Shred', calories: '1900 kcal', goal: 'Fat Loss' }
  ]);
  const [showDietForm, setShowDietForm] = useState(false);
  const [dietForm, setDietForm] = useState({ title: '', calories: '2500 kcal', goal: 'Muscle Gain' });

  // Educational Articles state
  const [articles, setArticles] = useState([
    { id: 1, title: '5 Essential Rules for Progressive Overload', author: instructorName, date: 'Today', readTime: '4 min' },
    { id: 2, title: 'Optimizing Post-Workout Protein Synthesis', author: instructorName, date: 'Yesterday', readTime: '6 min' }
  ]);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articleForm, setArticleForm] = useState({ title: '', content: '', readTime: '5 min' });

  // Admin Requests state
  const [adminRequests, setAdminRequests] = useState([
    { id: 1, from: 'SuperAdmin', topic: 'Update Lower Body Exercise Demos', status: 'Pending', date: 'Today' },
    { id: 2, from: 'Senior Admin', topic: 'Create 3-Day Home Dumbbell Routine', status: 'Completed', date: 'Yesterday' }
  ]);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const res = await fetch('/api/exercises');
      if (res.ok) {
        const data = await res.json();
        setExercises(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch exercises', e);
    }
  };

  const handleSaveExercise = async (e) => {
    e.preventDefault();
    if (!exForm.name.trim()) {
      toast.warn('Exercise name is required');
      return;
    }

    try {
      const payload = {
        ...exForm,
        targetMuscles: exForm.targetMuscles.split(',').map(m => m.trim()),
        description: exForm.instructions
      };

      const url = editingEx ? `/api/exercises/${editingEx._id}` : '/api/exercises';
      const method = editingEx ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingEx ? 'Exercise updated successfully!' : 'Exercise created successfully!');
        setShowExForm(false);
        setEditingEx(null);
        setExForm({ name: '', category: 'Chest', targetMuscles: 'Chest, Triceps', equipmentRequired: 'Dumbbells', difficulty: 'Intermediate', instructions: '', mediaUrl: '', points: 5 });
        fetchExercises();
      } else {
        toast.error('Failed to save exercise');
      }
    } catch (err) {
      toast.error('Error saving exercise');
    }
  };

  const handleEditClick = (ex) => {
    setEditingEx(ex);
    setExForm({
      name: ex.name || '',
      category: ex.category || 'Chest',
      targetMuscles: Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.targetMuscles || ''),
      equipmentRequired: ex.equipmentRequired || ex.equipment || 'Dumbbells',
      difficulty: ex.difficulty || 'Intermediate',
      instructions: ex.instructions || ex.description || '',
      mediaUrl: ex.mediaUrl || '',
      points: ex.points || 5
    });
    setShowExForm(true);
  };

  const handleCreateProgram = (e) => {
    e.preventDefault();
    if (!progForm.title) return;
    setPrograms([...programs, { id: Date.now(), ...progForm }]);
    setShowProgForm(false);
    setProgForm({ title: '', days: 4, level: 'Intermediate', category: 'General' });
    toast.success('Workout Program Created!');
  };

  const handleCreateDiet = (e) => {
    e.preventDefault();
    if (!dietForm.title) return;
    setDietPlans([...dietPlans, { id: Date.now(), ...dietForm }]);
    setShowDietForm(false);
    setDietForm({ title: '', calories: '2500 kcal', goal: 'Muscle Gain' });
    toast.success('Diet Plan Created!');
  };

  const handleCreateArticle = (e) => {
    e.preventDefault();
    if (!articleForm.title) return;
    setArticles([...articles, { id: Date.now(), ...articleForm, author: instructorName, date: 'Just now' }]);
    setShowArticleForm(false);
    setArticleForm({ title: '', content: '', readTime: '5 min' });
    toast.success('Article Published!');
  };

  const handleRespondRequest = (id) => {
    setAdminRequests(adminRequests.map(r => r.id === id ? { ...r, status: 'Completed' } : r));
    toast.success('Request marked as responded/completed!');
  };

  return (
    <div className="instructor-dashboard-page container" style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      {/* Header Banner */}
      <div className="glass-panel instructor-header" style={{ padding: '30px', borderRadius: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Award size={32} color="var(--primary-accent)" />
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Fitness Instructor Portal</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Welcome back, <strong>{instructorName}</strong>. Curate exercise libraries, build routines & collaborate with Admins.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingEx(null); setShowExForm(true); }}>
          <Plus size={18} /> Create New Exercise
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="trainer-tabs" style={{ marginBottom: '30px' }}>
        <button className={`tab-btn ${activeTab === 'exercises' ? 'active' : ''}`} onClick={() => setActiveTab('exercises')}>
          <Dumbbell size={18} /> Exercise Library ({exercises.length})
        </button>
        <button className={`tab-btn ${activeTab === 'programs' ? 'active' : ''}`} onClick={() => setActiveTab('programs')}>
          <Calendar size={18} /> Workout Programs
        </button>
        <button className={`tab-btn ${activeTab === 'diet' ? 'active' : ''}`} onClick={() => setActiveTab('diet')}>
          <Utensils size={18} /> Diet Plans
        </button>
        <button className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`} onClick={() => setActiveTab('articles')}>
          <BookOpen size={18} /> Articles
        </button>
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          <MessageSquare size={18} /> Admin Requests ({adminRequests.filter(r => r.status === 'Pending').length})
        </button>
      </div>

      {/* TAB 1: EXERCISES LIBRARY */}
      {activeTab === 'exercises' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input type="text" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* EXERCISE FORM MODAL / EXPANDABLE */}
          {showExForm && (
            <div className="glass-panel" style={{ padding: '25px', borderRadius: '16px', marginBottom: '30px', border: '1px solid #3b82f6', background: 'rgba(15,23,42,0.95)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#3b82f6' }}>{editingEx ? 'Update Exercise' : 'Add New Exercise to Library'}</h3>
              <form onSubmit={handleSaveExercise} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Exercise Name</label>
                  <input type="text" className="search-input" required value={exForm.name} onChange={e => setExForm({ ...exForm, name: e.target.value })} placeholder="e.g. Incline Dumbbell Press" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Category</label>
                  <select className="search-input" value={exForm.category} onChange={e => setExForm({ ...exForm, category: e.target.value })}>
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Legs">Legs</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Core">Core</option>
                    <option value="Full Body">Full Body</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Difficulty Level</label>
                  <select className="search-input" value={exForm.difficulty} onChange={e => setExForm({ ...exForm, difficulty: e.target.value })}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Target Muscles (comma separated)</label>
                  <input type="text" className="search-input" value={exForm.targetMuscles} onChange={e => setExForm({ ...exForm, targetMuscles: e.target.value })} placeholder="Chest, Triceps, Anterior Deltoid" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Required Equipment</label>
                  <input type="text" className="search-input" value={exForm.equipmentRequired} onChange={e => setExForm({ ...exForm, equipmentRequired: e.target.value })} placeholder="Dumbbells, Adjustable Bench" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Media URL (Video .mp4 / Image / GIF)</label>
                  <input type="text" className="search-input" value={exForm.mediaUrl} onChange={e => setExForm({ ...exForm, mediaUrl: e.target.value })} placeholder="https://example.com/demo.gif" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Detailed Form & Execution Instructions</label>
                  <textarea rows="3" className="search-input" value={exForm.instructions} onChange={e => setExForm({ ...exForm, instructions: e.target.value })} placeholder="Describe grip width, torso angle, tempo, and breathing..." />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">{editingEx ? 'Save Changes' : 'Publish Exercise'}</button>
                  <button type="button" className="btn btn-outline" onClick={() => { setShowExForm(false); setEditingEx(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* GRID OF EXERCISES */}
          <div className="exercise-grid">
            {exercises.filter(ex => ex.name.toLowerCase().includes(search.toLowerCase())).map((ex) => (
              <div key={ex._id || ex.id} className="exercise-card">
                <div className="ex-card-header">
                  <h4>{ex.name}</h4>
                  <button className="btn btn-icon btn-sm" onClick={() => handleEditClick(ex)}>
                    <Edit2 size={16} color="var(--primary-accent)" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span className="category-badge">{ex.category || 'General'}</span>
                  <span className="category-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>{ex.difficulty || 'Intermediate'}</span>
                </div>
                <p className="ex-instructions"><strong>Equipment:</strong> {ex.equipmentRequired || ex.equipment || 'Bodyweight'}</p>
                <p className="ex-instructions" style={{ fontSize: '0.85rem' }}>{(ex.instructions || ex.description || 'No instructions provided.').substring(0, 75)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: WORKOUT PROGRAMS */}
      {activeTab === 'programs' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Curated Workout Programs</h3>
            <button className="btn btn-primary" onClick={() => setShowProgForm(true)}><Plus size={18} /> Create Program</button>
          </div>

          {showProgForm && (
            <form onSubmit={handleCreateProgram} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" required placeholder="Program Title" className="search-input" value={progForm.title} onChange={e => setProgForm({ ...progForm, title: e.target.value })} />
              <input type="number" min="1" max="7" placeholder="Days per Week" className="search-input" value={progForm.days} onChange={e => setProgForm({ ...progForm, days: parseInt(e.target.value) || 3 })} />
              <button type="submit" className="btn btn-primary">Save Program</button>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {programs.map(p => (
              <div key={p.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>{p.title}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Frequency: {p.days} Days / Week • Level: {p.level}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DIET PLANS */}
      {activeTab === 'diet' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Nutritional Diet Templates</h3>
            <button className="btn btn-primary" onClick={() => setShowDietForm(true)}><Plus size={18} /> Create Diet Plan</button>
          </div>

          {showDietForm && (
            <form onSubmit={handleCreateDiet} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" required placeholder="Diet Plan Title" className="search-input" value={dietForm.title} onChange={e => setDietForm({ ...dietForm, title: e.target.value })} />
              <input type="text" placeholder="Target Calories" className="search-input" value={dietForm.calories} onChange={e => setDietForm({ ...dietForm, calories: e.target.value })} />
              <button type="submit" className="btn btn-primary">Save Diet Plan</button>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {dietPlans.map(d => (
              <div key={d.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#10b981' }}>{d.title}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target: {d.calories} • Goal: {d.goal}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EDUCATIONAL ARTICLES */}
      {activeTab === 'articles' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Educational Articles & Guides</h3>
            <button className="btn btn-primary" onClick={() => setShowArticleForm(true)}><Plus size={18} /> Publish Article</button>
          </div>

          {showArticleForm && (
            <form onSubmit={handleCreateArticle} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" required placeholder="Article Title" className="search-input" value={articleForm.title} onChange={e => setArticleForm({ ...articleForm, title: e.target.value })} />
              <textarea rows="4" placeholder="Article Content..." className="search-input" value={articleForm.content} onChange={e => setArticleForm({ ...articleForm, content: e.target.value })} />
              <button type="submit" className="btn btn-primary">Publish Now</button>
            </form>
          )}

          <div style={{ display: 'grid', gap: '15px' }}>
            {articles.map(a => (
              <div key={a.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{a.title}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {a.author} • Published {a.date} • {a.readTime} read</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ADMIN REQUESTS */}
      {activeTab === 'requests' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Administrative Requests & Tasks</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            {adminRequests.map(r => (
              <div key={r.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', border: r.status === 'Pending' ? '1px solid #f59e0b' : '1px solid var(--card-border)' }}>
                <div>
                  <span className="category-badge" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6', marginBottom: '6px' }}>From: {r.from}</span>
                  <h4 style={{ margin: '6px 0', color: 'var(--text-primary)' }}>{r.topic}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Received: {r.date}</span>
                </div>
                {r.status === 'Pending' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => handleRespondRequest(r.id)}>
                    Mark Responded & Complete
                  </button>
                ) : (
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}><CheckCircle size={16} /> Completed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FitnessInstructorDashboard;
