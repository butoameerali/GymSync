import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, CheckCircle, Activity, Bot, ShieldAlert, Star, Search, Dumbbell, Lock, Play } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentModal from '../../components/common/PaymentModal';
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES } from '../../data/exercises';
import { useNavigate } from 'react-router-dom';
import './AITrainer.css';

const AITrainer = () => {
  const [activeMode, setActiveMode] = useState('library'); // 'library', 'ai', 'assigned'
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeEquipment, setActiveEquipment] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  
  // Exercise states
  const [currentExercise, setCurrentExercise] = useState(null);
  const [reps, setReps] = useState(0);

  const navigate = useNavigate();
  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const [isBioFilled, setIsBioFilled] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscribedState, setIsSubscribedState] = useState(true);
  const [dbExercises, setDbExercises] = useState([]);
  const [preMadePlans, setPreMadePlans] = useState([]);

  useEffect(() => {
    // Load favorites from local storage for demo
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const favs = JSON.parse(localStorage.getItem(`gymsync_${userKey}_favorites`) || '[]');
    setFavorites(favs);

    const storedProgress = JSON.parse(localStorage.getItem(`gymsync_${userKey}_workout_progress`) || '{"completedDays":[], "lastWorkoutCompletionTime":null}');
    setWorkoutProgress(storedProgress);
    const storedPlan = JSON.parse(localStorage.getItem(`gymsync_${userKey}_ai_plan`) || 'null');
    setAiPlan(storedPlan);

    localStorage.setItem('gymsync_subscribed', 'true');
    setIsSubscribedState(true);

    // Fetch exercises from MongoDB
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setDbExercises(data);
      })
      .catch(err => console.error('Fetch Exercises Error:', err));

    // Fetch Pre-Made Plans for Scenario B Fallback
    fetch('/api/plans/premade')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPreMadePlans(data);
      })
      .catch(err => console.error('Fetch Pre-Made Plans Error:', err));

    const checkBioState = () => {
      const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
      const filled = localStorage.getItem('gymsync_bio_filled') === 'true' || localStorage.getItem(`gymsync_${userKey}_bio_filled`) === 'true';
      setIsBioFilled(!!filled);
    };

    checkBioState();
    window.addEventListener('gymsync_bio_updated', checkBioState);
    return () => window.removeEventListener('gymsync_bio_updated', checkBioState);
  }, []);

  const toggleFavorite = (id) => {
    let newFavs;
    if (favorites.includes(id)) {
      newFavs = favorites.filter(favId => favId !== id);
    } else {
      newFavs = [...favorites, id];
    }
    setFavorites(newFavs);
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    localStorage.setItem(`gymsync_${userKey}_favorites`, JSON.stringify(newFavs));
  };

  const [aiPlan, setAiPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [intakeDays, setIntakeDays] = useState(3);
  const [intakeEquipment, setIntakeEquipment] = useState('Full Gym');
  const [intakePushups, setIntakePushups] = useState(10);
  
  // Interactive Workout Tracker States
  const [workoutProgress, setWorkoutProgress] = useState({ completedDays: [], lastWorkoutCompletionTime: null });
  const [activeWorkoutDay, setActiveWorkoutDay] = useState(null); // The day currently being tracked
  const [checkedExercises, setCheckedExercises] = useState([]); // Array of indexes
  const [timeUntilNext, setTimeUntilNext] = useState(null);

  const fetchPlanWithBenchmarks = (days = intakeDays, eq = intakeEquipment, pushups = intakePushups) => {
    setIsGeneratingPlan(true);
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const bioData = JSON.parse(localStorage.getItem(`gymsync_${userKey}_bio_data`) || '{}');
    
    const payload = {
      ...bioData,
      trainingDaysPerWeek: days,
      equipmentAccess: eq,
      pushupBaseline: pushups
    };

    fetch('/api/ai/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to generate a workout plan.');
      return data;
    })
    .then(data => {
      setAiPlan(data);
      localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(data));
      setIsGeneratingPlan(false);
      if (data.interactive_calendar && data.interactive_calendar.length > 0) {
        setSelectedCalendarDay(data.interactive_calendar[0]);
      }
    })
    .catch(err => {
      console.error(err);
      toast.error(err.message || 'Unable to generate your workout plan.');
      setIsGeneratingPlan(false);
    });
  };
  
  useEffect(() => {
    if (activeMode === 'ai' && !aiPlan && !isGeneratingPlan && isBioFilled) {
      fetchPlanWithBenchmarks();
    }
  }, [activeMode, aiPlan, isGeneratingPlan, isBioFilled]);

  // Countdown Timer Logic
  useEffect(() => {
    let intervalId;
    if (workoutProgress.lastWorkoutCompletionTime) {
      const checkTimer = () => {
        const lastTime = new Date(workoutProgress.lastWorkoutCompletionTime);
        const midnight = new Date(lastTime);
        midnight.setHours(24, 0, 0, 0); // Next midnight
        
        const now = new Date();
        const diff = midnight - now;

        if (diff > 0) {
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setTimeUntilNext(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
        } else {
          setTimeUntilNext(null);
        }
      };
      
      checkTimer();
      intervalId = setInterval(checkTimer, 1000);
    } else {
      setTimeUntilNext(null);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [workoutProgress.lastWorkoutCompletionTime]);

  const [activeTimer, setActiveTimer] = useState(0);

  const startExercise = (exercise) => {
    setCurrentExercise(exercise);
    setReps(exercise.reps || 0);
  };

  const handleCheckExercise = (idx) => {
    setCheckedExercises(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const completeActiveWorkout = () => {
    if (!activeWorkoutDay || workoutProgress.completedDays.includes(activeWorkoutDay)) return;
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const newCompletedDays = [...workoutProgress.completedDays, activeWorkoutDay];
    const timestamp = new Date().toISOString();
    
    const newProgress = {
      completedDays: newCompletedDays,
      lastWorkoutCompletionTime: timestamp
    };
    
    setWorkoutProgress(newProgress);
    localStorage.setItem(`gymsync_${userKey}_workout_progress`, JSON.stringify(newProgress));
    
    setActiveWorkoutDay(null);
    setCheckedExercises([]);
    
    toast.success(`Workout Day ${activeWorkoutDay} Completed! You earned +50 XP. Rest well!`);
  };

  const handleComplete = () => {
    const pointsEarned = 1;
    
    // Save to history (Temporary cache for guests, Persistent for users)
    const storageKey = isGuest ? 'gymsync_Guest_User_history' : `gymsync_${localStorage.getItem('gymsync_user_name')?.replace(/\s+/g, '_')}_history`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.push({
      ...currentExercise,
      date: new Date().toISOString(),
      pointsEarned,
      trackedViaAI: false
    });
    localStorage.setItem(storageKey, JSON.stringify(history));

    if (!isGuest) {
      // Add points
      const userKey = localStorage.getItem('gymsync_user_name')?.replace(/\s+/g, '_');
      const currentPoints = parseInt(localStorage.getItem(`gymsync_${userKey}_points`) || '0');
      const currentStreak = parseInt(localStorage.getItem(`gymsync_${userKey}_streak`) || '0');
      
      localStorage.setItem(`gymsync_${userKey}_points`, currentPoints + pointsEarned);
      localStorage.setItem(`gymsync_${userKey}_streak`, currentStreak === 0 ? 1 : currentStreak);
    }

    if (currentExercise.aiWorkoutIndex !== undefined) {
      setCheckedExercises(prev => {
        if (!prev.includes(currentExercise.aiWorkoutIndex)) {
          return [...prev, currentExercise.aiWorkoutIndex];
        }
        return prev;
      });
    }

    toast.success(isGuest ? `Exercise Cached Temporarily! Log in to save to your Profile.` : `Exercise Completed! +${pointsEarned} Point added to your Profile.`);
    setCurrentExercise(null);
  };

  const handleAIModeClick = () => {
    setActiveMode('ai');
  };

  // Filter Library
  const filteredLibrary = EXERCISE_LIBRARY.filter(ex => {
    // 1. Check category / favorites
    if (activeCategory === 'Favorites' && !favorites.includes(ex.id)) return false;
    if (activeCategory !== 'All' && activeCategory !== 'Favorites' && ex.category !== activeCategory) return false;
    
    // 2. Check equipment
    const isBodyweight = ex.equipment === 'Bodyweight' || ex.equipment === 'none';
    if (activeEquipment === 'No Equipment' && !isBodyweight) return false;
    if (activeEquipment === 'With Equipment' && isBodyweight) return false;

    // 3. Check search
    return ex.name.toLowerCase().includes(search.toLowerCase());
  });

  const proPrice = localStorage.getItem('gymsync_pro_plan_price') || '9.99';

  return (
    <div className="ai-trainer-page">
      <div className="container">
        <div className="trainer-header glass-panel">
          <h1><Dumbbell size={36} color="var(--primary-accent)"/> Workout Hub</h1>
          <p>Explore 100+ exercises, track your form, and get AI-scheduled routines.</p>
        </div>

        <div className="trainer-tabs">
          <button className={`tab-btn ${activeMode === 'library' ? 'active' : ''}`} onClick={() => {setActiveMode('library'); setCurrentExercise(null);}}>
            All Exercises
          </button>
          <button className={`tab-btn ${activeMode === 'ai' ? 'active' : ''}`} onClick={handleAIModeClick}>
            Your Exercises
          </button>
          <button className={`tab-btn ${activeMode === 'assigned' ? 'active' : ''}`} onClick={() => {setActiveMode('assigned'); setCurrentExercise(null);}}>
            Trainer Assigned
          </button>
        </div>

        {/* ACTIVE EXERCISE VIEW WITH GIF / VIDEO DEMONSTRATION PLAYER */}
        {currentExercise && (
          <div className="active-exercise-view glass-panel" style={{border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.2)'}}>
            <div className="view-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <h2>{currentExercise.name}</h2>
                <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                  <span className="category-badge">{Array.isArray(currentExercise.targetMuscles) ? currentExercise.targetMuscles.join(', ') : (currentExercise.category || 'General')}</span>
                  <span className="category-badge" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b'}}>{currentExercise.equipmentRequired || currentExercise.equipment || 'Bodyweight'}</span>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setCurrentExercise(null)}>✕ Close</button>
            </div>

            {/* VISUAL DEMONSTRATION PLAYER (GIF / VIDEO) */}
            <div style={{marginTop: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--card-border)', textAlign: 'center'}}>
              {currentExercise.mediaUrl ? (
                currentExercise.mediaUrl.endsWith('.mp4') || currentExercise.mediaUrl.endsWith('.webm') ? (
                  <video src={currentExercise.mediaUrl} controls autoPlay loop style={{width: '100%', maxHeight: '350px', objectFit: 'contain'}} />
                ) : (
                  <img src={currentExercise.mediaUrl} alt={currentExercise.name} style={{width: '100%', maxHeight: '350px', objectFit: 'contain'}} />
                )
              ) : (
                <div style={{padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
                  <div style={{width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Dumbbell size={40} color="#3b82f6" />
                  </div>
                  <div>
                    <h4 style={{color: 'var(--text-primary)', marginBottom: '5px'}}>Visual Demonstration Preview</h4>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Maintain proper form & neutral posture during performance.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="manual-viewport" style={{padding: '20px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', marginTop: '20px'}}>
              <h4 style={{color: 'var(--primary-accent)', marginBottom: '8px'}}>Form & Performance Instructions</h4>
              <p style={{fontSize: '1rem', lineHeight: 1.5, color: 'var(--text-secondary)'}}>{currentExercise.description || currentExercise.instructions || 'Maintain controlled breathing and steady tempo.'}</p>
              
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px'}}>
                <label style={{color: 'var(--text-primary)', fontWeight: 'bold'}}>Completed Reps Target</label>
                <input 
                  type="number" 
                  min="0" 
                  value={reps} 
                  onChange={e => setReps(parseInt(e.target.value) || 0)}
                  style={{fontSize: '2rem', fontWeight: 'bold', width: '120px', textAlign: 'center', background: 'rgba(0,0,0,0.4)', color: '#10b981', border: '2px solid #10b981', padding: '8px', borderRadius: '12px'}}
                />
              </div>
            </div>

            <div className="exercise-footer" style={{marginTop: '20px', display: 'flex', gap: '15px'}}>
              <button className="btn btn-success w-100" onClick={handleComplete}>
                <CheckCircle size={20}/> Log Reps & Save Record
              </button>
              <button className="btn btn-outline w-100" onClick={() => setCurrentExercise(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}


        {/* LIBRARY VIEW (ALL EXERCISES FROM MONGODB) */}
        {activeMode === 'library' && !currentExercise && (
          <div className="library-view glass-panel">
            <div className="library-filters">
              <div className="search-bar">
                <Search size={20} color="var(--text-secondary)"/>
                <input type="text" placeholder="Search 600+ exercises from database..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="category-scroll">
                <button className={`cat-pill ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>All Categories</button>
                <button className={`cat-pill ${activeCategory === 'Favorites' ? 'active' : ''}`} onClick={() => setActiveCategory('Favorites')}>★ Favorites</button>
                {EXERCISE_CATEGORIES.map(cat => (
                  <button key={cat} className={`cat-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
                ))}
              </div>
              <div className="category-scroll" style={{marginTop: '10px'}}>
                <button className={`cat-pill ${activeEquipment === 'All' ? 'active' : ''}`} onClick={() => setActiveEquipment('All')}>All Equipment</button>
                <button className={`cat-pill ${activeEquipment === 'No Equipment' ? 'active' : ''}`} onClick={() => setActiveEquipment('No Equipment')}>No Equipment</button>
                <button className={`cat-pill ${activeEquipment === 'With Equipment' ? 'active' : ''}`} onClick={() => setActiveEquipment('With Equipment')}>With Equipment</button>
              </div>
            </div>

            <div className="exercise-grid">
              {(dbExercises.length > 0 ? dbExercises : EXERCISE_LIBRARY).filter(ex => {
                const exName = ex.name || '';
                const exMuscles = Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.category || '');
                const exEquipment = ex.equipmentRequired || ex.equipment || 'Bodyweight';
                const isBodyweight = exEquipment.toLowerCase().includes('bodyweight') || exEquipment.toLowerCase().includes('none');

                if (activeCategory === 'Favorites' && !favorites.includes(ex._id || ex.id)) return false;
                if (activeCategory !== 'All' && activeCategory !== 'Favorites' && !exMuscles.toLowerCase().includes(activeCategory.toLowerCase())) return false;
                if (activeEquipment === 'No Equipment' && !isBodyweight) return false;
                if (activeEquipment === 'With Equipment' && isBodyweight) return false;

                return exName.toLowerCase().includes(search.toLowerCase()) || exMuscles.toLowerCase().includes(search.toLowerCase());
              }).slice(0, 120).map(ex => (
                <div key={ex._id || ex.id} className="exercise-card">
                  <div className="ex-card-header">
                    <h4>{ex.name}</h4>
                    <button className="fav-btn" onClick={() => toggleFavorite(ex._id || ex.id)}>
                      <Star size={20} color={favorites.includes(ex._id || ex.id) ? "#f59e0b" : "var(--text-secondary)"} fill={favorites.includes(ex._id || ex.id) ? "#f59e0b" : "none"}/>
                    </button>
                  </div>
                  <span className="ex-category">{Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.category || 'General')}</span>
                  <p className="ex-instructions">{(ex.description || ex.instructions || 'Maintain proper form.').substring(0, 65)}...</p>
                  <button className="btn btn-primary btn-sm w-100 mt-10" onClick={() => startExercise(ex)}>Start Exercise</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI GENERATED PLAN VIEW WITH INTERACTIVE CALENDAR & SIDE-DRAWER */}
        {activeMode === 'ai' && !currentExercise && (
          <div className="ai-plan-view glass-panel">
            {!isBioFilled ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', margin: '10px 0' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                  <Activity size={36} color="#f59e0b" />
                </div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Profile Bio Details Incomplete</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '520px', margin: '0 auto 25px auto', lineHeight: 1.6 }}>
                  To generate your personalized AI workout calendar and 100% natural nutrition plan, please complete your bio details in your Profile.
                </p>
                <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }} onClick={() => navigate('/profile')}>
                  Complete Profile Bio
                </button>
              </div>
            ) : (
              <>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <Bot size={40} color="#3b82f6"/>
                    <div>
                      <h2>Dynamic AI Calendar & Intake Engine</h2>
                      <p style={{color: 'var(--text-secondary)'}}>100% Natural Diet & Microcycle Progressive Overload Matrix</p>
                    </div>
                  </div>
                  <span className="category-badge" style={{background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem'}}>
                    Status: {aiPlan?.intake_status || 'COMPLETE'}
                  </span>
                </div>

                {/* PHASE 1: BENCHMARK CALIBRATION CONTROLS BAR */}
                <div style={{background: 'var(--panel-bg)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '16px', marginBottom: '25px'}}>
                  <h4 style={{fontSize: '1rem', color: 'var(--primary-accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Activity size={18}/> Phase 1: Smart Intake & Stamina Calibration
                  </h4>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end'}}>
                    <div>
                      <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px'}}>Weekly Frequency</label>
                      <select 
                        className="search-input"
                        value={intakeDays} 
                        onChange={e => setIntakeDays(parseInt(e.target.value))}
                      >
                        <option value={2}>2 Days / Week</option>
                        <option value={3}>3 Days / Week (Recommended)</option>
                        <option value={4}>4 Days / Week</option>
                        <option value={5}>5 Days / Week</option>
                        <option value={6}>6 Days / Week</option>
                      </select>
                    </div>

                    <div>
                      <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px'}}>Available Equipment</label>
                      <select 
                        className="search-input"
                        value={intakeEquipment} 
                        onChange={e => setIntakeEquipment(e.target.value)}
                      >
                        <option value="Full Gym">Full Gym Setup</option>
                        <option value="Dumbbells">Dumbbells & Bench</option>
                        <option value="Resistance Bands">Resistance Bands</option>
                        <option value="Bodyweight only">Bodyweight only (No Equipment)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px'}}>Anchor Push-up Baseline ({intakePushups} Reps)</label>
                      <input 
                        type="range" 
                        min="3" 
                        max="30" 
                        value={intakePushups} 
                        onChange={e => setIntakePushups(parseInt(e.target.value))}
                        style={{width: '100%', accentColor: '#3b82f6'}}
                      />
                    </div>

                    <button 
                      className="btn btn-primary" 
                      onClick={() => fetchPlanWithBenchmarks(intakeDays, intakeEquipment, intakePushups)}
                      style={{padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem'}}
                    >
                      Recalibrate Volume
                    </button>
                  </div>
                </div>
                {isGeneratingPlan ? (
              <div style={{textAlign: 'center', padding: '40px 0'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto'}}></div>
                <p style={{color: 'var(--text-secondary)'}}>Ingesting GymSync Datasets & Building 30-Day Dynamic Overload Calendar...</p>
              </div>
            ) : aiPlan ? (
              <div className="ai-structured-plan">
                {/* PHASE 2: MEDICAL SAFETY HARD FILTERS */}
                {aiPlan.medical_warnings && aiPlan.medical_warnings.length > 0 && (
                   <div style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '15px', borderRadius: '12px', marginBottom: '20px'}}>
                     <h3 style={{color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px'}}><ShieldAlert size={20}/> Phase 2: Medical Safety Hard-Filters Active</h3>
                     <ul style={{marginTop: '10px', paddingLeft: '20px'}}>
                       {aiPlan.medical_warnings.map((warn, i) => (
                         <li key={i} style={{color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.9rem'}}>{warn}</li>
                       ))}
                     </ul>
                   </div>
                )}

                {/* PHASE 3: INTERACTIVE CALENDAR & SIDE-DRAWER UI */}
                <h3 style={{marginBottom: '15px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  📅 Phase 3: Interactive 28-Day Calendar Dashboard
                </h3>
                <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px'}}>
                  Click on any date to inspect that day's whole food diet protocol and specific microcycle exercise overload.
                </p>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                  {/* CALENDAR GRID VIEW */}
                  <div style={{background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--card-border)'}}>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center'}}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
                        <div key={idx} style={{fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingBottom: '5px'}}>{d}</div>
                      ))}

                      {(aiPlan.interactive_calendar || []).map(dayItem => {
                        const isSelected = selectedCalendarDay?.dayNumber === dayItem.dayNumber;
                        const isWorkout = dayItem.isWorkoutDay;

                        return (
                          <div 
                            key={dayItem.dayNumber}
                            onClick={() => setSelectedCalendarDay(dayItem)}
                            style={{
                              padding: '10px 4px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              background: isSelected 
                                ? '#3b82f6' 
                                : isWorkout 
                                  ? 'rgba(16, 185, 129, 0.25)' 
                                  : 'rgba(255, 255, 255, 0.05)',
                              border: isSelected 
                                ? '2px solid white' 
                                : isWorkout 
                                  ? '1px solid rgba(16, 185, 129, 0.5)' 
                                  : '1px solid transparent',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <span style={{fontWeight: 'bold', fontSize: '0.95rem', display: 'block', color: isSelected ? 'white' : isWorkout ? '#10b981' : 'var(--text-secondary)'}}>
                              {dayItem.dayNumber}
                            </span>
                            <span style={{fontSize: '0.65rem', display: 'block', marginTop: '2px', color: isSelected ? 'white' : 'var(--text-secondary)'}}>
                              Wk {dayItem.weekNumber}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{display: 'flex', gap: '15px', marginTop: '15px', fontSize: '0.8rem', justifyContent: 'center'}}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><span style={{width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.8)'}}></span> Active Workout</span>
                      <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><span style={{width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)'}}></span> Rest / Recovery</span>
                      <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}><span style={{width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6'}}></span> Selected</span>
                    </div>
                  </div>

                  {/* SIDE-DRAWER / DETAIL PANEL */}
                  {selectedCalendarDay && (
                    <div style={{background: 'var(--panel-bg)', padding: '20px', borderRadius: '16px', border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '15px'}}>
                        <div>
                          <h3 style={{fontSize: '1.2rem', color: 'var(--text-primary)'}}>Day {selectedCalendarDay.dayNumber} Details</h3>
                          <p style={{fontSize: '0.85rem', color: '#3b82f6'}}>{selectedCalendarDay.phaseName}</p>
                        </div>
                        <span className="category-badge" style={{
                          background: selectedCalendarDay.isWorkoutDay ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-border)',
                          color: selectedCalendarDay.isWorkoutDay ? '#10b981' : 'var(--text-secondary)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {selectedCalendarDay.isWorkoutDay ? selectedCalendarDay.focusArea : 'Rest & Recovery'}
                        </span>
                      </div>

                      {/* WORKOUT SPLIT FOR SELECTED DAY */}
                      <h4 style={{fontSize: '0.95rem', color: '#3b82f6', marginBottom: '10px'}}>🏋️ Workout Split</h4>
                      {typeof selectedCalendarDay.workoutSplit === 'string' ? (
                        <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', marginBottom: '20px'}}>
                          {selectedCalendarDay.workoutSplit}
                        </p>
                      ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '240px', overflowY: 'auto'}}>
                          {selectedCalendarDay.workoutSplit.map((ex, idx) => {
                            const targetEx = EXERCISE_LIBRARY.find(e => e.id === ex.id) || { ...ex, category: 'AI Custom', instructions: 'Follow AI targets', points: 1 };
                            const isActiveWorkout = activeWorkoutDay === selectedCalendarDay.dayNumber;
                            const isChecked = checkedExercises.includes(idx);
                            
                            return (
                              <div 
                                key={idx} 
                                onClick={() => startExercise({ ...targetEx, ...ex, aiWorkoutIndex: idx })}
                                className="ai-exercise-card"
                                style={{
                                  background: isChecked ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-bg)', 
                                  padding: '10px 12px', 
                                  borderRadius: '8px', 
                                  border: isChecked ? '1px solid #10b981' : '1px solid var(--card-border)', 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  transform: 'scale(1)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.02)';
                                  e.currentTarget.style.borderColor = isChecked ? '#10b981' : 'var(--primary-accent)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.borderColor = isChecked ? '#10b981' : 'var(--card-border)';
                                }}
                              >
                                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                  {isActiveWorkout && (
                                    <div 
                                      style={{width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', borderColor: isChecked ? '#10b981' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCheckExercise(idx);
                                      }}
                                    >
                                      {isChecked && <CheckCircle size={16} color="#10b981" />}
                                    </div>
                                  )}
                                  <div>
                                    <h5 style={{fontSize: '0.9rem', margin: 0, color: isChecked ? '#10b981' : 'var(--text-primary)', textDecoration: isChecked ? 'line-through' : 'none'}}>{ex.name}</h5>
                                    <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{ex.target} • {ex.equipment}</span>
                                  </div>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                  <div style={{textAlign: 'right'}}>
                                    <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: isChecked ? '#10b981' : 'var(--primary-accent)', display: 'block'}}>{ex.sets} Sets × {ex.reps} Reps</span>
                                    <span style={{fontSize: '0.7rem', color: '#f59e0b'}}>{ex.rpe}</span>
                                  </div>
                                  <div style={{width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <Play size={16} color="var(--primary-accent)" style={{marginLeft: '2px'}} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* DIET PLAN FOR SELECTED DAY */}
                      <h4 style={{fontSize: '0.95rem', color: '#10b981', marginBottom: '10px'}}>🥗 Natural Whole Food Diet</h4>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto'}}>
                        {(aiPlan.daily_diet_plan || []).map((diet, dIdx) => (
                          <div key={dIdx} style={{background: 'var(--card-bg)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem'}}>
                            <strong style={{color: 'var(--primary-accent)'}}>{diet.meal}: </strong>
                            <span style={{color: 'var(--text-secondary)'}}>{diet.food}</span>
                          </div>
                        ))}
                      </div>

                      {/* WORKOUT CONTROLS */}
                      <div style={{marginTop: '20px', borderTop: '1px solid var(--card-border)', paddingTop: '15px'}}>
                        {workoutProgress.completedDays.includes(selectedCalendarDay.dayNumber) ? (
                          <div style={{textAlign: 'center', padding: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '8px'}}>
                            <CheckCircle size={24} style={{marginBottom: '5px'}}/>
                            <div style={{fontWeight: 'bold'}}>Workout Completed</div>
                          </div>
                        ) : activeWorkoutDay === selectedCalendarDay.dayNumber ? (
                          <button 
                            className="btn btn-primary" 
                            style={{width: '100%', background: '#10b981'}}
                            disabled={checkedExercises.length !== (selectedCalendarDay.workoutSplit?.length || 0)}
                            onClick={completeActiveWorkout}
                          >
                            Complete Workout
                          </button>
                        ) : timeUntilNext && selectedCalendarDay.isWorkoutDay ? (
                          <div style={{textAlign: 'center', padding: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: '1px solid var(--card-border)'}}>
                            <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Next workout unlocks in</div>
                            <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'monospace'}}>{timeUntilNext}</div>
                          </div>
                        ) : selectedCalendarDay.isWorkoutDay ? (
                          <button 
                            className="btn btn-primary" 
                            style={{width: '100%'}}
                            onClick={() => setActiveWorkoutDay(selectedCalendarDay.dayNumber)}
                          >
                            Start Today's Workout
                          </button>
                        ) : (
                          <div style={{textAlign: 'center', padding: '10px', color: 'var(--text-secondary)'}}>
                            Enjoy your rest day!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    )}

      </div>
    </div>
  );
};

export default AITrainer;
