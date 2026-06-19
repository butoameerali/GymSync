import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, CheckCircle, Activity, Bot, ShieldAlert, Star, Search, Dumbbell } from 'lucide-react';
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES } from '../../data/exercises';
import { useNavigate } from 'react-router-dom';
import './AITrainer.css';

const AITrainer = () => {
  const [activeMode, setActiveMode] = useState('library'); // 'library', 'ai', 'assigned'
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  
  // Camera & Exercise states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [reps, setReps] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  
  const [feedback, setFeedback] = useState("Good");
  const [repState, setRepState] = useState("up"); // For tracking exercise phases

  const navigate = useNavigate();
  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const isBioFilled = localStorage.getItem('gymsync_bio_filled') === 'true';

  useEffect(() => {
    // Load favorites from local storage for demo
    const favs = JSON.parse(localStorage.getItem('gymsync_favorites') || '[]');
    setFavorites(favs);
  }, []);

  const toggleFavorite = (id) => {
    let newFavs;
    if (favorites.includes(id)) {
      newFavs = favorites.filter(favId => favId !== id);
    } else {
      newFavs = [...favorites, id];
    }
    setFavorites(newFavs);
    localStorage.setItem('gymsync_favorites', JSON.stringify(newFavs));
  };

  const [aiPlan, setAiPlan] = useState([]);
  useEffect(() => {
    if (activeMode === 'ai') {
      const savedPlan = JSON.parse(localStorage.getItem('gymsync_ai_plan') || '[]');
      setAiPlan(savedPlan);
    }
  }, [activeMode]);

  // Advanced Coach Tracking State
  const [activeTimer, setActiveTimer] = useState(0);
  const trackerRef = useRef({
    type: 'reps', // 'reps' or 'timer'
    repPhase: 'up',
    lastRepTime: 0,
    timerStart: 0,
    timerAccumulated: 0,
    isHolding: false
  });

  useEffect(() => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current || !window.Pose) {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      return;
    }

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // Determine exercise configuration dynamically
    const exName = (currentExercise?.name || '').toLowerCase();
    const isTimerBased = exName.includes('plank') || exName.includes('hold') || exName.includes('wall sit');
    trackerRef.current.type = isTimerBased ? 'timer' : 'reps';

    const calculateAngle = (a, b, c) => {
      const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let angle = Math.abs(radians * 180.0 / Math.PI);
      if (angle > 180.0) angle = 360 - angle;
      return angle;
    };

    pose.onResults((results) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.poseLandmarks) {
        if (window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, {color: '#3b82f6', lineWidth: 4});
          window.drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#10b981', lineWidth: 2, radius: 4});
        }

        // Essential Landmarks
        const ls = results.poseLandmarks[11]; // Left Shoulder
        const rs = results.poseLandmarks[12]; // Right Shoulder
        const le = results.poseLandmarks[13]; // Left Elbow
        const lh = results.poseLandmarks[23]; // Left Hip
        const lk = results.poseLandmarks[25]; // Left Knee
        const la = results.poseLandmarks[27]; // Left Ankle
        const lw = results.poseLandmarks[15]; // Left Wrist
        const lfi = results.poseLandmarks[31]; // Left Foot Index (Toe)

        // Helper function for 3D Distance
        const calculateDistance = (a, b) => {
           return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        };

        const now = Date.now();
        const tracker = trackerRef.current;
        let isDown = false;
        let formWarning = null;

        // Biomechanic Family Detection
        const isSquat = exName.includes('squat') || exName.includes('press') && exName.includes('leg') || exName.includes('lunge');
        const isHinge = exName.includes('deadlift') || exName.includes('swing') || exName.includes('good morning');
        const isPush = exName.includes('push') || (exName.includes('press') && !exName.includes('leg'));
        const isPull = exName.includes('pull') || exName.includes('row') || exName.includes('pulldown');
        const isCurl = exName.includes('curl') || exName.includes('extension');

        // VISIBILITY CHECK: Prevent ghost reps when user is off-screen
        // MediaPipe extrapolates off-screen joints, so we MUST check if coordinates are within [0.0, 1.0] viewport bounds!
        const isVisible = (lm) => {
           return lm && lm.visibility > 0.5 && lm.x >= -0.1 && lm.x <= 1.1 && lm.y >= -0.1 && lm.y <= 1.1;
        };
        let hasVisibility = true;

        if (isSquat || isHinge) {
           hasVisibility = isVisible(lh) && isVisible(lk) && isVisible(la);
        } else if (isPush || isCurl || isPull) {
           hasVisibility = isVisible(ls) && isVisible(le) && isVisible(lw);
        }

        if (!hasVisibility) {
           setFeedback("⚠️ Please step back! Full body must be visible.");
           canvasCtx.restore();
           return;
        }

        // --- DYNAMIC KINETIC ENGINE ---
        if (tracker.type === 'reps') {
          
          if (isSquat) {
            // SQUATTING FAMILY: Tracks Knee Angle & Knee-over-Toe
            const kneeAngle = calculateAngle(lh, lk, la);
            isDown = kneeAngle < 100; // Deep flexion

            if (lk.x > la.x && lk.x > lfi.x + 0.05) {
               formWarning = "⚠️ Keep your knees behind your toes!";
            } else if (lk.x < la.x && lk.x < lfi.x - 0.05) {
               formWarning = "⚠️ Keep your knees behind your toes!";
            }
          } 
          else if (isHinge) {
            // HINGING FAMILY: Tracks Hip Angle & Spinal Rounding
            const hipAngle = calculateAngle(ls, lh, lk);
            isDown = hipAngle < 110; // Hips hinged back

            // Check if back is straight (Shoulder -> Hip should be a straight line, but MediaPipe doesn't track mid-spine reliably)
            // We use relative shoulder drop without knee bending
            const kneeFlexion = calculateAngle(lh, lk, la);
            if (isDown && kneeFlexion < 120) {
               formWarning = "⚠️ This is a deadlift, not a squat! Keep legs straighter.";
            }
          }
          else if (isPush) {
            // PUSHING FAMILY: Tracks Elbow Flexion
            const elbowAngle = calculateAngle(ls, le, lw);
            isDown = elbowAngle < 90; 

            // Form Check: For horizontal presses (Push-ups, Bench), check if back/hips are straight
            const isHorizontal = Math.abs(ls.y - lh.y) < 0.4;
            if (exName.includes('push-up') || exName.includes('pushup')) {
               if (!isHorizontal && tracker.repPhase === 'up') {
                  formWarning = "⚠️ Get into a horizontal plank position!";
               }
            }
          }
          else if (isPull) {
            // PULLING FAMILY: Shoulder approaches Wrist
            const dist = calculateDistance(ls, lw);
            // In a pull-up or row, at the peak, wrists are close to shoulders
            isDown = dist < 0.3; // Very close
            
            if (!isDown && dist < 0.5) {
               formWarning = "⚠️ Extend your arms fully for a complete rep!";
            }
          }
          else if (isCurl) {
            // ISOLATION ARMS: Tracks Elbow Flexion + Stationary Upper Arm
            const elbowAngle = calculateAngle(ls, le, lw);
            isDown = elbowAngle < 70; // Curling up

            // Form Check: Upper arm must remain stationary
            const upperArmVerticalAngle = Math.abs(Math.atan2(le.y - ls.y, le.x - ls.x) * 180 / Math.PI);
            // If the elbow swings wildly forward (angle > 110 or < 70 from straight down), warn them
            if (upperArmVerticalAngle < 70 || upperArmVerticalAngle > 110) {
               formWarning = "⚠️ Stop swinging! Keep your upper arm completely stationary.";
            }
          }
          else {
            // FALLBACK: Basic motion tracking
            isDown = lw.y < ls.y;
          }

          // Smart Counting Debouncer
          if (isDown && tracker.repPhase === 'up') {
            tracker.repPhase = 'down';
            setFeedback(formWarning || "Hold the peak...");
          } else if (!isDown && tracker.repPhase === 'down') {
            if (now - tracker.lastRepTime > 500) { // 500ms debounce
              setReps(r => r + 1);
              setFeedback(formWarning || "Perfect form! Good rep.");
              tracker.lastRepTime = now;
            }
            tracker.repPhase = 'up';
          } else if (formWarning && !isDown) {
            setFeedback(formWarning);
          }

        } else if (tracker.type === 'timer') {
          let isCorrectPosture = false;
          let formWarning = null;

          if (exName.includes('plank')) {
            // Check if Shoulder, Hip, and Ankle are aligned
            // Y-axis tolerance to detect sagging or hiking
            const expectedHipY = (ls.y + la.y) / 2;
            const hipDeviation = lh.y - expectedHipY;

            if (hipDeviation > 0.15) {
              formWarning = "⚠️ Hips are too low! Keep your back straight.";
            } else if (hipDeviation < -0.15) {
              formWarning = "⚠️ Hips are too high! Lower your back.";
            } else {
              isCorrectPosture = true;
            }
          } else {
            isCorrectPosture = true; // Fallback for other holds
          }

          if (isCorrectPosture) {
            if (!tracker.isHolding) {
              tracker.isHolding = true;
              tracker.timerStart = now;
              setFeedback("Great posture! Timer running.");
            } else {
              const currentActive = tracker.timerAccumulated + Math.floor((now - tracker.timerStart) / 1000);
              setActiveTimer(currentActive);
            }
          } else {
            if (tracker.isHolding) {
              tracker.isHolding = false;
              tracker.timerAccumulated += Math.floor((now - tracker.timerStart) / 1000);
            }
            setFeedback(formWarning || "Fix your posture to resume the timer.");
          }
        }
      } else {
        setFeedback("Please step fully into the frame.");
        trackerRef.current.isHolding = false;
      }
      canvasCtx.restore();
    });

    let camera = null;
    try {
      camera = new window.Camera(videoElement, {
        onFrame: async () => {
          if (videoElement.readyState >= 2) {
            await pose.send({image: videoElement});
          }
        },
        width: 640,
        height: 480
      });
      camera.start().catch(err => {
        console.error("Camera start error:", err);
        setFeedback("Camera permission denied.");
      });
      cameraRef.current = camera;
    } catch (err) {
      console.error("Camera init error:", err);
      setFeedback("Failed to initialize camera.");
    }

    return () => {
      if (camera) camera.stop();
    };
  }, [isCameraActive, currentExercise]);

  const startExercise = (exercise) => {
    setCurrentExercise(exercise);
    setIsCameraActive(false);
    setReps(0);
  };

  const handleComplete = () => {
    const pointsEarned = isCameraActive ? 3 : 1;
    
    // Save to history (Temporary cache for guests, Persistent for users)
    const storageKey = isGuest ? 'gymsync_guest_history' : `gymsync_${localStorage.getItem('gymsync_user_name')?.replace(/\s+/g, '_')}_history`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.push({
      ...currentExercise,
      date: new Date().toISOString(),
      pointsEarned,
      trackedViaAI: isCameraActive
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

    alert(isGuest ? `Exercise Cached Temporarily! Log in to save to your Profile.` : `Exercise Completed! +${pointsEarned} Points added to your Profile.`);
    setCurrentExercise(null);
  };

  const handleAIModeClick = () => {
    if (isGuest) {
      alert("Guests cannot access Premium AI Scheduling.");
      return;
    }
    if (!isBioFilled) {
      alert("Your Profile Bio is incomplete. The AI needs your Height, Weight, Body Type, and Goals to generate a schedule.");
      navigate('/profile');
      return;
    }
    setActiveMode('ai');
  };

  // Filter Library
  const filteredLibrary = EXERCISE_LIBRARY.filter(ex => {
    if (activeCategory === 'Favorites') return favorites.includes(ex.id) && ex.name.toLowerCase().includes(search.toLowerCase());
    if (activeCategory !== 'All' && ex.category !== activeCategory) return false;
    return ex.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="ai-trainer-page">
      <div className="container">
        <div className="trainer-header glass-panel">
          <h1><Dumbbell size={36} color="var(--primary-accent)"/> Workout Hub</h1>
          <p>Explore 100+ exercises, track your form, and get AI-scheduled routines.</p>
        </div>

        <div className="trainer-tabs">
          <button className={`tab-btn ${activeMode === 'library' ? 'active' : ''}`} onClick={() => {setActiveMode('library'); setCurrentExercise(null);}}>
            Your Exercises
          </button>
          <button className={`tab-btn ${activeMode === 'ai' ? 'active' : ''}`} onClick={handleAIModeClick}>
            AI Generated Plan
          </button>
          <button className={`tab-btn ${activeMode === 'assigned' ? 'active' : ''}`} onClick={() => {setActiveMode('assigned'); setCurrentExercise(null);}}>
            Trainer Assigned
          </button>
        </div>

        {/* ACTIVE EXERCISE VIEW */}
        {currentExercise && (
          <div className="active-exercise-view glass-panel">
            <div className="view-header">
              <h2>{currentExercise.name}</h2>
              <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                <span className="category-badge">{currentExercise.category}</span>
                <span className="category-badge" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b'}}>{currentExercise.equipment || 'No Equipment'}</span>
              </div>
            </div>
            
            <div className="tracking-mode-toggle">
              <button className={`mode-btn ${!isCameraActive ? 'active' : ''}`} onClick={() => setIsCameraActive(false)}>
                Manual Entry (+1 Pt)
              </button>
              <button className={`mode-btn ${isCameraActive ? 'active' : ''}`} onClick={() => setIsCameraActive(true)}>
                <Camera size={16}/> AI Camera Tracking (+3 Pts)
              </button>
            </div>

            {isCameraActive ? (
              <div className="camera-viewport">
                {/* Hidden video element for MediaPipe input */}
                <video ref={videoRef} style={{ display: 'none' }} playsInline></video>
                
                {/* Visible canvas for drawn skeleton */}
                <canvas ref={canvasRef} width="640" height="480" style={{ width: '100%', height: '100%', objectFit: 'contain' }}></canvas>
                
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', padding: '5px 15px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--primary-accent)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }}></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'none' }} className="d-sm-block">AI Tracker Active</span>
                </div>

                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(59, 130, 246, 0.2)', padding: '5px 15px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.5)', backdropFilter: 'blur(5px)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: '600' }}>💡 Tip: Position camera to your side for best accuracy</span>
                </div>

                <div className="live-stats">
                  {trackerRef.current.type === 'timer' ? (
                    <div className="stat-box" style={{ textAlign: 'center' }}>
                      <span className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Timer</span>
                      <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-accent)' }}>{activeTimer}s</div>
                    </div>
                  ) : (
                    <div className="stat-box" style={{ textAlign: 'center' }}>
                      <span className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Reps</span>
                      <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{reps}</div>
                    </div>
                  )}
                  <div className="stat-box" style={{ textAlign: 'center', flex: 1, marginLeft: '20px' }}>
                    <span className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Form Feedback</span>
                    <div className="stat-value" style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '10px', color: feedback.includes('⚠️') ? '#ef4444' : '#10b981' }}>
                      {feedback}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="manual-viewport" style={{padding: '30px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px'}}>
                <p style={{fontSize: '1.2rem', marginBottom: '20px'}}>{currentExercise.instructions}</p>
                
                {currentExercise.isTimed ? (
                  <div>
                     <p style={{fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-accent)'}}>00:30</p>
                     <p style={{color: 'var(--text-secondary)'}}>Timer Exercise</p>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'}}>
                    <label style={{color: 'var(--text-secondary)'}}>How many reps did you complete?</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={reps} 
                      onChange={e => setReps(parseInt(e.target.value) || 0)}
                      style={{fontSize: '2rem', fontWeight: 'bold', width: '100px', textAlign: 'center', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px'}}
                    />
                  </div>
                )}
                <p style={{color: 'var(--text-secondary)', marginTop: '15px'}}>Press complete when finished to save your record.</p>
              </div>
            )}

            <div className="exercise-footer" style={{marginTop: '20px', display: 'flex', gap: '15px'}}>
              <button className="btn btn-success w-100" onClick={handleComplete}>
                <CheckCircle size={20}/> Complete & Save Record
              </button>
              <button className="btn btn-outline w-100" onClick={() => setCurrentExercise(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}


        {/* LIBRARY VIEW */}
        {activeMode === 'library' && !currentExercise && (
          <div className="library-view glass-panel">
            <div className="library-filters">
              <div className="search-bar">
                <Search size={20} color="var(--text-secondary)"/>
                <input type="text" placeholder="Search 100+ exercises..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="category-scroll">
                <button className={`cat-pill ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>All</button>
                <button className={`cat-pill ${activeCategory === 'Favorites' ? 'active' : ''}`} onClick={() => setActiveCategory('Favorites')}>★ Favorites</button>
                {EXERCISE_CATEGORIES.map(cat => (
                  <button key={cat} className={`cat-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="exercise-grid">
              {filteredLibrary.map(ex => (
                <div key={ex.id} className="exercise-card">
                  <div className="ex-card-header">
                    <h4>{ex.name}</h4>
                    <button className="fav-btn" onClick={() => toggleFavorite(ex.id)}>
                      <Star size={20} color={favorites.includes(ex.id) ? "#f59e0b" : "var(--text-secondary)"} fill={favorites.includes(ex.id) ? "#f59e0b" : "none"}/>
                    </button>
                  </div>
                  <span className="ex-category">{ex.category}</span>
                  <p className="ex-instructions">{ex.instructions.substring(0, 60)}...</p>
                  <button className="btn btn-primary btn-sm w-100 mt-10" onClick={() => startExercise(ex)}>Start Exercise</button>
                </div>
              ))}
              {filteredLibrary.length === 0 && <p style={{gridColumn: '1/-1', textAlign: 'center'}}>No exercises found.</p>}
            </div>
          </div>
        )}

        {/* AI GENERATED PLAN VIEW */}
        {activeMode === 'ai' && !currentExercise && (
          <div className="ai-plan-view glass-panel">
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
              <Bot size={40} color="#3b82f6"/>
              <div>
                <h2>Your Custom AI Schedule</h2>
                <p style={{color: 'var(--text-secondary)'}}>Generated by your Personal AI Coach</p>
              </div>
            </div>
            
            {aiPlan.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px 0'}}>
                <p style={{color: 'var(--text-secondary)'}}>No active AI Plan found.</p>
                <p style={{fontSize: '0.9rem', marginTop: '10px'}}>Open the <strong>Global Chat</strong> and ask your AI Coach to generate a workout plan for you!</p>
              </div>
            ) : (
              <div className="exercise-grid">
                {aiPlan.map((exName, index) => {
                  // Try to find matching exercise in library
                  const matchedEx = EXERCISE_LIBRARY.find(e => e.name.toLowerCase().includes(exName.toLowerCase()) || exName.toLowerCase().includes(e.name.toLowerCase()));
                  const targetEx = matchedEx || { id: `custom-${index}`, name: exName, category: "Custom", instructions: "Follow AI instructions", points: 1 };
                  
                  return (
                    <div key={index} className="exercise-card" style={{border: '1px solid rgba(59, 130, 246, 0.3)'}}>
                      <div className="ex-card-header">
                        <h4>{targetEx.name}</h4>
                        <span style={{fontSize: '0.8rem', color: '#3b82f6'}}>Today's Plan</span>
                      </div>
                      <span className="ex-category">{targetEx.category}</span>
                      <button className="btn btn-primary btn-sm w-100 mt-10" onClick={() => startExercise(targetEx)}>Start Target</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AITrainer;
