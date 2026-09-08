import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Camera, RefreshCw, CheckCircle, Activity, Bot, ShieldAlert, Star, Search, Dumbbell, Lock, Play, Sparkles, Eye, Video, FileText, Info, Clock, Moon, AlertTriangle, Utensils, BookOpen, Layers } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentModal from '../../components/common/PaymentModal';
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES } from '../../data/exercises';
import { useNavigate } from 'react-router-dom';
import AIDetectorContainer from '../../ai-detectors/AIDetectorContainer';
import './AITrainer.css';

// Code-split catalogue tabs for optimal initial load performance
const ProgramCatalogue = lazy(() => import('../../components/trainee/ProgramCatalogue'));
const DietCatalogue = lazy(() => import('../../components/trainee/DietCatalogue'));
const LearnArticles = lazy(() => import('../../components/trainee/LearnArticles'));

const AITrainer = () => {
  const [activeMode, setActiveMode] = useState('library'); // 'library', 'ai', 'assigned'
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeEquipment, setActiveEquipment] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [aiModeChoice, setAiModeChoice] = useState(null); // null | 'with_ai' | 'without_ai'
  
  // Exercise and set progression states
  const [currentExercise, setCurrentExercise] = useState(null);
  const [reps, setReps] = useState(10);
  const [currentSet, setCurrentSet] = useState(1);
  const [setLogs, setSetLogs] = useState([]);

  const navigate = useNavigate();
  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const [isBioFilled, setIsBioFilled] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscribedState, setIsSubscribedState] = useState(true);
  const [dbExercises, setDbExercises] = useState([]);
  const [activeUserProgram, setActiveUserProgram] = useState(null);

  useEffect(() => {
    // Load favorites from local storage for demo
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const favs = JSON.parse(localStorage.getItem(`gymsync_${userKey}_favorites`) || '[]');
    setFavorites(favs);

    const storedProgress = JSON.parse(localStorage.getItem(`gymsync_${userKey}_workout_progress`) || '{"completedDays":[], "completedExercises":[], "lastWorkoutCompletionTime":null}');
    setWorkoutProgress(storedProgress);
    const storedPlan = JSON.parse(localStorage.getItem(`gymsync_${userKey}_ai_plan`) || 'null');
    setAiPlan(storedPlan);

    // Fetch authoritative workout progress from MongoDB
    if (!isGuest) {
      fetch('/api/users/workout-progress', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        }
      })
        .then(res => res.ok ? res.json() : null)
        .then(serverProgress => {
          if (serverProgress && serverProgress.completedDays) {
            setWorkoutProgress(prev => ({
              ...prev,
              ...serverProgress,
              completedDays: serverProgress.completedDays || []
            }));
            localStorage.setItem(`gymsync_${userKey}_workout_progress`, JSON.stringify({
              ...storedProgress,
              ...serverProgress
            }));
          } else if (storedProgress && storedProgress.completedDays?.length) {
            // One-time fallback sync to server if server is empty
            fetch('/api/users/workout-progress', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
              },
              body: JSON.stringify(storedProgress)
            }).catch(e => console.warn('Sync local progress notice:', e));
          }
        })
        .catch(err => console.error('Fetch server workout progress error:', err));
    }

    localStorage.setItem('gymsync_subscribed', 'true');
    setIsSubscribedState(true);

    fetchActiveProgram();

    const checkBioState = () => {
      const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
      const filled = localStorage.getItem('gymsync_bio_filled') === 'true' || localStorage.getItem(`gymsync_${userKey}_bio_filled`) === 'true';
      setIsBioFilled(!!filled);
    };

    checkBioState();
    window.addEventListener('gymsync_bio_updated', checkBioState);
    return () => window.removeEventListener('gymsync_bio_updated', checkBioState);
  }, []);

  // Lazily fetch exercises from MongoDB on-demand only when Library tab is opened
  useEffect(() => {
    if (activeMode === 'library' && dbExercises.length === 0) {
      fetch('/api/exercises')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const items = Array.isArray(data) ? data : (data.items || []);
          if (items.length > 0) setDbExercises(items);
        })
        .catch(err => console.error('Fetch Exercises Error:', err));
    }
  }, [activeMode, dbExercises.length]);


  const fetchActiveProgram = () => {
    const token = localStorage.getItem('gymsync_token');
    if (!token) return;
    fetch('/api/plans/user-programs/active', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data._id) {
          setActiveUserProgram(data);
        } else {
          setActiveUserProgram(null);
        }
      })
      .catch(err => console.error('Fetch active program error:', err));
  };

  const handleLogProgramSession = async (userProgramId, weekNum, dayNum) => {
    try {
      const token = localStorage.getItem('gymsync_token');
      if (!token) return toast.error('Please log in');
      const res = await fetch(`/api/plans/user-programs/${userProgramId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          weekNumber: weekNum,
          dayNumber: dayNum,
          completed: true,
          durationMinutes: 45
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveUserProgram(updated);
        toast.success(`Day ${dayNum} of Week ${weekNum} completed! Workout streak updated.`);
      } else {
        toast.error('Could not log session progress');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

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

  // Normalize Plan Metadata (planId & planStartDate)
  useEffect(() => {
    if (aiPlan) {
      if (!aiPlan.planId || !aiPlan.planStartDate) {
        const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
        const updatedPlan = {
          ...aiPlan,
          planId: aiPlan.planId || `PLAN_${Date.now()}`,
          planStartDate: aiPlan.planStartDate || new Date().toISOString()
        };
        setAiPlan(updatedPlan);
        localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(updatedPlan));
      }
    }
  }, [aiPlan]);

  // Interactive Workout Tracker States
  const [workoutProgress, setWorkoutProgress] = useState({ completedDays: [], completedExercises: [], lastWorkoutCompletionTime: null });
  const [activeWorkoutDay, setActiveWorkoutDay] = useState(null);
  const [timeUntilNext, setTimeUntilNext] = useState(null);

  const fetchPlanWithBenchmarks = () => {
    setIsGeneratingPlan(true);
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const bioData = JSON.parse(localStorage.getItem(`gymsync_${userKey}_bio_data`) || '{}');
    
    const payload = {
      ...bioData,
      trainingDaysPerWeek: bioData.trainingDaysPerWeek || 3,
      equipmentAccess: bioData.equipmentAccess || 'Full Gym',
      pushupBaseline: bioData.pushupBaseline || 10
    };

    const token = localStorage.getItem('gymsync_token') || '';
    fetch('/api/ai/generate-plan', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to generate a workout plan.');
      return data;
    })
    .then(data => {
      const formattedPlan = {
        ...data,
        planId: `PLAN_${Date.now()}`,
        planStartDate: new Date().toISOString()
      };
      setAiPlan(formattedPlan);
      localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(formattedPlan));
      setIsGeneratingPlan(false);
      if (formattedPlan.interactive_calendar && formattedPlan.interactive_calendar.length > 0) {
        setSelectedCalendarDay(formattedPlan.interactive_calendar[0]);
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

  // Schedule & Lock Helper
  const getDayScheduleInfo = (dayItem) => {
    if (!aiPlan || !dayItem) return { status: 'LOCKED', scheduledDate: new Date(), isToday: false, isPast: false, isFuture: false, isCompleted: false };

    const planStart = new Date(aiPlan.planStartDate || Date.now());
    planStart.setHours(0, 0, 0, 0);

    const scheduledDate = new Date(planStart);
    scheduledDate.setDate(planStart.getDate() + (dayItem.dayNumber - 1));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = scheduledDate.getTime() === today.getTime();
    const isPast = scheduledDate.getTime() < today.getTime();
    const isFuture = scheduledDate.getTime() > today.getTime();

    const isCompleted = (workoutProgress.completedDays || []).includes(dayItem.dayNumber);

    let status = 'LOCKED';
    if (isCompleted) {
      status = 'COMPLETED';
    } else if (!dayItem.isWorkoutDay) {
      status = 'REST';
    } else if (isPast) {
      status = 'MISSED';
    } else if (isToday) {
      status = 'AVAILABLE';
    } else {
      status = 'LOCKED';
    }

    return { status, scheduledDate, isToday, isPast, isFuture, isCompleted };
  };

  const isExerciseCompletedInState = (dayNum, exIndex) => {
    if (!aiPlan) return false;
    return (workoutProgress.completedExercises || []).some(
      e => e.planId === aiPlan.planId && e.dayNumber === dayNum && e.exerciseIndex === exIndex
    );
  };

  const isExerciseUnlockedInState = (dayNum, exIndex) => {
    if (!selectedCalendarDay) return false;
    const { status } = getDayScheduleInfo(selectedCalendarDay);
    if (status === 'COMPLETED') return true;
    if (activeWorkoutDay !== dayNum) return false;
    if (exIndex === 0) return true;
    return isExerciseCompletedInState(dayNum, exIndex - 1);
  };

  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleCoachAction = async (actionPrompt, targetEx = null) => {
    setIsRecalculating(true);
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const bioData = JSON.parse(localStorage.getItem(`gymsync_${userKey}_bio_data`) || '{}');
    const token = localStorage.getItem('gymsync_token') || localStorage.getItem('token') || '';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: targetEx ? `${actionPrompt}: ${targetEx.name}` : actionPrompt,
          userContext: bioData,
          currentPlan: aiPlan,
          currentWorkout: selectedCalendarDay
        })
      });

      const data = await res.json();
      if (data.structuredAction?.workout) {
        const newSession = data.structuredAction.workout;
        const updatedCalendar = (aiPlan.interactive_calendar || []).map(day => {
          if (day.dayNumber === selectedCalendarDay.dayNumber) {
            return {
              ...day,
              focusArea: newSession.sessionObjective,
              sessionObjective: newSession.sessionObjective,
              warmup: newSession.warmup,
              workoutSplit: newSession.mainWorkout,
              cooldown: newSession.cooldown,
              timeBudget: newSession.timeBudget,
              rationale: newSession.rationale,
              externalActivity: newSession.externalActivity
            };
          }
          return day;
        });

        const updatedPlan = {
          ...aiPlan,
          interactive_calendar: updatedCalendar
        };

        setAiPlan(updatedPlan);
        localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(updatedPlan));
        setSelectedCalendarDay(updatedCalendar.find(d => d.dayNumber === selectedCalendarDay.dayNumber));
        toast.success(data.structuredAction.explanation || 'Workout adapted by AI Coach!');
      } else {
        toast.info(data.content);
      }
    } catch (err) {
      console.error('Coach Action Error:', err);
      toast.error('Unable to reach AI Coach right now.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const startExercise = (exercise) => {
    setCurrentExercise(exercise);
    setReps(exercise.reps || exercise.defaultReps || 10);
    setCurrentSet(1);
    setSetLogs([]);
    const isAiAvailable = Boolean(exercise.aiDetection?.enabled || exercise.isAiTrackable);
    if (!isAiAvailable) {
      setAiModeChoice('without_ai');
    } else {
      setAiModeChoice(null); // Present clean DO WITH AI vs DO WITHOUT AI choice
    }
  };

  // Progressive Set Logging Pipeline
  const handleLogSet = async ({ completedReps = null, mode = 'manual', aiResult = null } = {}) => {
    if (!currentExercise) return;

    const totalSets = currentExercise.sets || currentExercise.defaultSets || 3;
    const targetReps = currentExercise.reps || currentExercise.defaultReps || 10;
    const userReps = mode === 'ai'
      ? (typeof completedReps === 'number' ? completedReps : 0)
      : (typeof completedReps === 'number' ? completedReps : (reps || targetReps));

    if (userReps < targetReps) {
      toast.warning(mode === 'ai'
        ? `AI tracked ${userReps} of ${targetReps} required reps for Set ${currentSet}. Target not met, but logged!`
        : `Target was ${targetReps} reps for Set ${currentSet}. You logged ${userReps} reps.`
      );
    }

    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const dayNum = selectedCalendarDay?.dayNumber || activeWorkoutDay || 1;

    // Send Set Completion to MongoDB /api/users/exercise-record
    if (!isGuest) {
      try {
        await fetch('/api/users/exercise-record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
          },
          body: JSON.stringify({
            exerciseId: currentExercise.id || currentExercise._id || currentExercise.exerciseId || 'EX-GEN',
            exerciseName: currentExercise.name,
            dayNumber: dayNum,
            planId: aiPlan?.planId || null,
            setNumber: currentSet,
            totalSets,
            repsCompleted: userReps,
            targetReps,
            pointsEarned: currentExercise.points || 1,
            mode,
            aiConfidence: aiResult?.confidence || null,
            aiResult: aiResult || {}
          })
        });
      } catch (err) {
        console.warn('Failed to record set on server:', err);
      }
    }

    const updatedLogs = [...setLogs, { setNumber: currentSet, repsCompleted: userReps, mode }];
    setSetLogs(updatedLogs);

    if (currentSet < totalSets) {
      const nextSet = currentSet + 1;
      setCurrentSet(nextSet);
      toast.success(`Set ${currentSet} of ${totalSets} logged (${userReps} reps)! Rest up for Set ${nextSet}.`);
    } else {
      // All sets complete! Trigger full exercise completion
      completeExercise({
        exercise: currentExercise,
        mode,
        completedReps: userReps,
        aiResult
      });
    }
  };

  // Unified Exercise Completion Pipeline
  const completeExercise = async ({ exercise = currentExercise, mode = 'manual', completedReps = null, aiResult = null }) => {
    const exToComplete = exercise || currentExercise;
    if (!exToComplete) return;

    // Library exercises are educational only - cannot earn points or fake assigned completion
    if (exToComplete.aiWorkoutIndex === undefined) {
      toast.info("Educational library exercises are for reference and demonstration only.");
      return;
    }

    const totalSets = exToComplete.sets || exToComplete.defaultSets || 3;
    const targetReps = exToComplete.reps || exToComplete.defaultReps || 10;
    const userReps = typeof completedReps === 'number' ? completedReps : (reps || targetReps);

    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const pointsEarned = (exToComplete.points || 1) * totalSets;
    const isAssignedWorkoutEx = exToComplete.aiWorkoutIndex !== undefined;

    // 1. History Record
    const storageKey = isGuest ? 'gymsync_Guest_User_history' : `gymsync_${userKey}_history`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.push({
      ...exToComplete,
      date: new Date().toISOString(),
      pointsEarned,
      trackedViaAI: mode === 'ai',
      aiResult,
      completedReps: userReps,
      totalSets
    });
    localStorage.setItem(storageKey, JSON.stringify(history));

    // 2. User Points
    if (!isGuest) {
      const currentPoints = parseInt(localStorage.getItem(`gymsync_${userKey}_points`) || '0');
      localStorage.setItem(`gymsync_${userKey}_points`, (currentPoints + pointsEarned).toString());
    }

    // 3. Persistent Exercise Completion Tracking
    if (isAssignedWorkoutEx && aiPlan) {
      const dayNum = selectedCalendarDay?.dayNumber || activeWorkoutDay || 1;
      const exIndex = exToComplete.aiWorkoutIndex;

      const newRecord = {
        planId: aiPlan.planId,
        dayNumber: dayNum,
        exerciseId: exToComplete.id || exToComplete._id || `ex_${exIndex}`,
        exerciseIndex: exIndex,
        completedReps: userReps,
        totalSets,
        targetReps,
        completedAt: new Date().toISOString(),
        mode
      };

      const updatedExercises = [
        ...(workoutProgress.completedExercises || []).filter(e => !(e.planId === aiPlan.planId && e.dayNumber === dayNum && e.exerciseIndex === exIndex)),
        newRecord
      ];

      const newProgress = {
        ...workoutProgress,
        planId: aiPlan.planId,
        completedExercises: updatedExercises
      };

      setWorkoutProgress(newProgress);
      localStorage.setItem(`gymsync_${userKey}_workout_progress`, JSON.stringify(newProgress));

      // Persist to server /api/users/workout-progress
      if (!isGuest) {
        try {
          await fetch('/api/users/workout-progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
            },
            body: JSON.stringify({
              planId: aiPlan.planId,
              completedDays: newProgress.completedDays || [],
              lastWorkoutCompletionTime: newProgress.lastWorkoutCompletionTime,
              streak: parseInt(localStorage.getItem(`gymsync_${userKey}_streak`) || '0'),
              totalPoints: parseInt(localStorage.getItem(`gymsync_${userKey}_points`) || '0')
            })
          });
        } catch (saveErr) {
          console.warn('Sync workout progress notice:', saveErr);
        }
      }
    }

    toast.success(mode === 'ai' 
      ? `AI Pose Tracked! All ${totalSets} sets finished with ${Math.round((aiResult?.confidence || 0.85) * 100)}% accuracy. +${pointsEarned} pt.`
      : `Exercise Finished! All ${totalSets} sets completed. +${pointsEarned} pt.`
    );

    setCurrentExercise(null);
    setAiModeChoice(null);
    setCurrentSet(1);
    setSetLogs([]);
  };

  const completeActiveWorkout = async () => {
    if (!activeWorkoutDay || !selectedCalendarDay) return;

    const { status } = getDayScheduleInfo(selectedCalendarDay);
    if (status !== 'AVAILABLE' || activeWorkoutDay !== selectedCalendarDay.dayNumber) {
      toast.error("Only today's scheduled workout can be completed.");
      return;
    }

    if ((workoutProgress.completedDays || []).includes(activeWorkoutDay)) {
      toast.info("This workout day has already been completed.");
      return;
    }
    
    const daySplit = selectedCalendarDay.workoutSplit || [];
    if (Array.isArray(daySplit) && daySplit.length > 0) {
      const completedForDay = (workoutProgress.completedExercises || []).filter(
        e => e.planId === aiPlan?.planId && e.dayNumber === selectedCalendarDay.dayNumber
      );
      if (completedForDay.length < daySplit.length) {
        toast.warning(`Please complete all ${daySplit.length} exercises in today's split before completing the workout!`);
        return;
      }
    }

    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const newCompletedDays = [...(workoutProgress.completedDays || []), activeWorkoutDay];
    const timestamp = new Date().toISOString();
    
    // Streak logic (once per calendar day)
    const lastStreakDate = localStorage.getItem(`gymsync_${userKey}_last_streak_date`);
    const todayStr = new Date().toDateString();
    let currentStreak = parseInt(localStorage.getItem(`gymsync_${userKey}_streak`) || '0');
    
    if (lastStreakDate !== todayStr) {
      currentStreak += 1;
      localStorage.setItem(`gymsync_${userKey}_streak`, currentStreak.toString());
      localStorage.setItem(`gymsync_${userKey}_last_streak_date`, todayStr);
    }

    // Award +50 XP
    const currentPoints = parseInt(localStorage.getItem(`gymsync_${userKey}_points`) || '0') + 50;
    localStorage.setItem(`gymsync_${userKey}_points`, currentPoints.toString());

    const newProgress = {
      ...workoutProgress,
      planId: aiPlan?.planId,
      completedDays: newCompletedDays,
      lastWorkoutCompletionTime: timestamp,
      streak: currentStreak,
      totalPoints: currentPoints
    };
    
    setWorkoutProgress(newProgress);
    localStorage.setItem(`gymsync_${userKey}_workout_progress`, JSON.stringify(newProgress));

    // Authoritative Server Persistence
    if (!isGuest) {
      try {
        await fetch('/api/users/workout-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
          },
          body: JSON.stringify({
            planId: aiPlan?.planId,
            completedDays: newCompletedDays,
            lastWorkoutCompletionTime: timestamp,
            streak: currentStreak,
            totalPoints: currentPoints
          })
        });
      } catch (err) {
        console.warn('Server workout-progress save error:', err);
      }
    }
    
    setActiveWorkoutDay(null);
    toast.success(`🎉 Workout Day ${activeWorkoutDay} Completed! You earned +50 XP & extended your streak!`);
  };

  const handleAIModeClick = () => {
    setActiveMode('ai');
  };

  return (
    <div className="ai-trainer-page">
      <div className="container">
        <div className="trainer-header glass-panel">
          <h1><Dumbbell size={36} color="var(--primary-accent)"/> Workout Hub</h1>
          <p>Explore 100+ exercises, view detailed execution guides, video demonstrations & track your progress.</p>
        </div>

        <div className="trainer-tabs">
          <button className={`tab-btn ${activeMode === 'library' ? 'active' : ''}`} onClick={() => {setActiveMode('library'); setCurrentExercise(null);}}>
            Exercise Library
          </button>
          <button className={`tab-btn ${activeMode === 'programs' ? 'active' : ''}`} onClick={() => {setActiveMode('programs'); setCurrentExercise(null);}}>
            <Dumbbell size={15} style={{marginRight: '6px', verticalAlign: 'middle'}}/> Workout Programs
          </button>
          <button className={`tab-btn ${activeMode === 'diets' ? 'active' : ''}`} onClick={() => {setActiveMode('diets'); setCurrentExercise(null);}}>
            <Utensils size={15} style={{marginRight: '6px', verticalAlign: 'middle'}}/> Diet Plans
          </button>
          <button className={`tab-btn ${activeMode === 'learn' ? 'active' : ''}`} onClick={() => {setActiveMode('learn'); setCurrentExercise(null);}}>
            <BookOpen size={15} style={{marginRight: '6px', verticalAlign: 'middle'}}/> Guides & Knowledge
          </button>
          <button className={`tab-btn ${activeMode === 'ai' ? 'active' : ''}`} onClick={handleAIModeClick}>
            <Sparkles size={15} style={{marginRight: '6px', verticalAlign: 'middle'}}/> My AI Plan
          </button>
          <button className={`tab-btn ${activeMode === 'assigned' ? 'active' : ''}`} onClick={() => {setActiveMode('assigned'); setCurrentExercise(null);}}>
            Trainer Assigned
          </button>
        </div>

        {/* EXERCISE DETAIL VIEW WITH VIDEO / GIF DEMONSTRATION & STEP-BY-STEP INSTRUCTIONS */}
        {currentExercise && (() => {
          const isAiEnabled = Boolean(currentExercise.aiDetection?.enabled || currentExercise.isAiTrackable);
          const isAssigned = currentExercise.aiWorkoutIndex !== undefined;
          const totalSets = currentExercise.sets || currentExercise.defaultSets || 3;
          const targetReps = currentExercise.reps || currentExercise.defaultReps || 10;

          // Choice View: For AI-trackable assigned exercises when no choice made yet
          if (isAssigned && isAiEnabled && aiModeChoice === null) {
            return (
              <div className="active-exercise-view glass-panel" style={{border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.2)'}}>
                <div className="view-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', margin: 0 }}>{currentExercise.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Target: <strong>{totalSets} Sets × {targetReps} Reps</strong>
                    </p>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setCurrentExercise(null)}>✕ Close</button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '32px 24px', borderRadius: '16px', border: '1px solid var(--card-border)', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Choose Exercise Execution Mode</h3>
                  <p style={{ margin: '0 auto 26px auto', color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '520px' }}>
                    This exercise has certified computer vision AI pose detection available. Choose how you would like to complete today's workout:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', maxWidth: '640px', margin: '0 auto' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderRadius: '14px', textAlign: 'center' }}
                      onClick={() => setAiModeChoice('with_ai')}
                    >
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={28} />
                      </div>
                      <strong style={{ fontSize: '1.2rem' }}>DO WITH AI</strong>
                      <span style={{ fontSize: '0.82rem', opacity: 0.9, lineHeight: 1.4 }}>
                        Live camera pose tracking, automatic landmark checking & rep counting
                      </span>
                    </button>

                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderRadius: '14px', textAlign: 'center' }}
                      onClick={() => setAiModeChoice('without_ai')}
                    >
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={28} />
                      </div>
                      <strong style={{ fontSize: '1.2rem' }}>DO WITHOUT AI</strong>
                      <span style={{ fontSize: '0.82rem', opacity: 0.85, lineHeight: 1.4 }}>
                        Self-paced sets, manual set tracking per set, and direct logging
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // AI Tracking Mode
          if (isAiEnabled && aiModeChoice === 'with_ai') {
            return (
              <div className="active-exercise-view glass-panel" style={{border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.2)'}}>
                <div className="view-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                  <div>
                    <h2 style={{ margin: 0 }}>{currentExercise.name} (AI Tracking Mode)</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span className="category-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 600 }}>
                        Set {currentSet} of {totalSets}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Target: {targetReps} reps per set
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setAiModeChoice('without_ai')}>
                      Switch to Manual Mode
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setCurrentExercise(null)}>✕ Close</button>
                  </div>
                </div>

                {/* Progressive Set Indicator Pills */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                  {Array.from({ length: totalSets }).map((_, idx) => {
                    const sNum = idx + 1;
                    const isDone = sNum < currentSet;
                    const isCurrent = sNum === currentSet;
                    return (
                      <div 
                        key={sNum}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          background: isDone ? 'rgba(16, 185, 129, 0.2)' : isCurrent ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)',
                          color: isDone ? '#10b981' : isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                          border: isCurrent ? '1px solid #3b82f6' : '1px solid transparent'
                        }}
                      >
                        {isDone ? '✓ ' : ''}Set {sNum} of {totalSets}
                      </div>
                    );
                  })}
                </div>

                <AIDetectorContainer
                  detectorId={currentExercise.aiDetection?.detectorId || 'pushup_v1'}
                  exerciseName={currentExercise.name}
                  onCompleteSession={(result) => {
                    const detectedReps = typeof result?.reps === 'number'
                      ? result.reps
                      : (typeof result?.repCount === 'number' ? result.repCount : (typeof result?.count === 'number' ? result.count : 0));
                    handleLogSet({ mode: 'ai', completedReps: detectedReps, aiResult: result });
                  }}
                  onFallbackToManual={() => setAiModeChoice('without_ai')}
                />
              </div>
            );
          }

          // Manual Mode / Library Detail View
          const rawMedia = currentExercise.mediaUrl || currentExercise.gifUrl || currentExercise.videoUrl || (currentExercise.video !== 'none' ? currentExercise.video : null);
          const hasMedia = rawMedia && rawMedia !== 'none';
          const isVideoMedia = hasMedia && (rawMedia.endsWith('.mp4') || rawMedia.endsWith('.webm') || rawMedia.endsWith('.ogg') || rawMedia.includes('youtube.com') || rawMedia.includes('youtu.be'));

          return (
            <div className="active-exercise-view glass-panel" style={{border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.2)'}}>
              <div className="view-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', margin: 0 }}>{currentExercise.name}</h2>
                  <div style={{display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap'}}>
                    <span className="category-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                      Target: {Array.isArray(currentExercise.targetMuscles) ? currentExercise.targetMuscles.join(', ') : (currentExercise.category || 'General')}
                    </span>
                    <span className="category-badge" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b'}}>
                      Equipment: {currentExercise.equipmentRequired || currentExercise.equipment || 'Bodyweight'}
                    </span>
                    {currentExercise.difficulty && (
                      <span className="category-badge" style={{background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc'}}>
                        {currentExercise.difficulty}
                      </span>
                    )}
                    {isAiEnabled && isAssigned && (
                      <span className="category-badge" style={{background: 'rgba(16, 185, 129, 0.2)', color: '#34d399'}}>
                        ⚡ AI Pose Detection Available
                      </span>
                    )}
                    {!isAssigned && (
                      <span className="category-badge" style={{background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd'}}>
                        📖 Library Guide
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ padding: '8px 16px' }} onClick={() => setCurrentExercise(null)}>✕ Close</button>
              </div>

              {/* VISUAL DEMONSTRATION MEDIA PLAYER (GIF / VIDEO / PLACEHOLDER) */}
              <div style={{marginTop: '20px', background: 'rgba(0,0,0,0.6)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--card-border)', textAlign: 'center'}}>
                {hasMedia ? (
                  isVideoMedia ? (
                    rawMedia.includes('youtube.com') || rawMedia.includes('youtu.be') ? (
                      <iframe 
                        src={rawMedia.replace('watch?v=', 'embed/')} 
                        title={currentExercise.name}
                        style={{ width: '100%', height: '360px', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                      />
                    ) : (
                      <video src={rawMedia} controls autoPlay loop muted style={{width: '100%', maxHeight: '360px', objectFit: 'contain'}} />
                    )
                  ) : (
                    <img src={rawMedia} alt={currentExercise.name} style={{width: '100%', maxHeight: '360px', objectFit: 'contain'}} />
                  )
                ) : (
                  <div style={{padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px'}}>
                    <div style={{width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'}}>
                      <Video size={36} />
                    </div>
                    <div>
                      <h4 style={{color: 'var(--text-primary)', marginBottom: '5px', fontSize: '1.1rem'}}>No Exercise Video or GIF Uploaded</h4>
                      <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto'}}>
                        No media file has been attached for this exercise yet. Follow the step-by-step description below to perform the exercise with perfect form.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* HOW TO DO EXERCISE DESCRIPTION & INSTRUCTIONS */}
              <div className="manual-viewport" style={{padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', marginTop: '20px', border: '1px solid var(--card-border)'}}>
                <h4 style={{color: 'var(--primary-accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem'}}>
                  <FileText size={20}/> How To Do This Exercise
                </h4>
                <p style={{fontSize: '1rem', lineHeight: 1.6, color: 'var(--text-primary)', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--card-border)', margin: 0}}>
                  {currentExercise.description || currentExercise.instructions || 'Maintain proper posture, engage your core, breathe smoothly throughout the motion, and complete each rep with controlled tempo.'}
                </p>
                
                {/* QUICK SPECS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '20px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Target Area</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{Array.isArray(currentExercise.targetMuscles) ? currentExercise.targetMuscles.join(', ') : (currentExercise.category || 'General')}</strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Equipment</span>
                    <strong style={{ fontSize: '0.9rem', color: '#f59e0b' }}>{currentExercise.equipmentRequired || currentExercise.equipment || 'Bodyweight'}</strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{isAssigned ? 'Target Split' : 'Mode'}</span>
                    <strong style={{ fontSize: '0.9rem', color: isAssigned ? '#10b981' : '#60a5fa' }}>
                      {isAssigned ? `${totalSets} Sets × ${targetReps} Reps` : 'Educational Guide'}
                    </strong>
                  </div>
                </div>

                {/* PROGRESSIVE SETS LOGGING SECTION */}
                {isAssigned && (
                  <div style={{ marginTop: '24px', background: 'rgba(0,0,0,0.25)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        Progressive Sets ({currentSet} of {totalSets})
                      </span>
                      {setLogs.length > 0 && (
                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>
                          ✓ {setLogs.length} set(s) completed
                        </span>
                      )}
                    </div>

                    {/* Set Progress Badges */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                      {Array.from({ length: totalSets }).map((_, idx) => {
                        const sNum = idx + 1;
                        const isDone = sNum < currentSet;
                        const isCurrent = sNum === currentSet;
                        const log = setLogs.find(l => l.setNumber === sNum);
                        return (
                          <div 
                            key={sNum}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              background: isDone ? 'rgba(16, 185, 129, 0.2)' : isCurrent ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                              color: isDone ? '#10b981' : isCurrent ? '#60a5fa' : 'var(--text-secondary)',
                              border: isCurrent ? '1px solid #3b82f6' : '1px solid var(--card-border)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isDone ? <CheckCircle size={14} /> : null} Set {sNum} {log ? `(${log.repsCompleted}r)` : `(${targetReps}r)`}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Reps for Set {currentSet}
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          value={reps} 
                          onChange={e => setReps(parseInt(e.target.value) || 0)}
                          style={{ fontSize: '1.4rem', fontWeight: 'bold', width: '100px', textAlign: 'center', background: 'rgba(0,0,0,0.4)', color: '#10b981', border: '2px solid #10b981', padding: '6px', borderRadius: '10px' }}
                        />
                      </div>

                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, minWidth: '220px', height: '48px', marginTop: '20px' }}
                        onClick={() => handleLogSet({ completedReps: reps, mode: 'manual' })}
                      >
                        <CheckCircle size={18} /> {currentSet === totalSets ? `Log Final Set & Finish Exercise` : `Log Set ${currentSet} of ${totalSets}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION FOOTER */}
              <div className="exercise-footer" style={{marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: !isAssigned ? 'flex-end' : 'flex-start'}}>
                {!isAssigned ? (
                  <button className="btn btn-primary" style={{ minWidth: '150px' }} onClick={() => setCurrentExercise(null)}>
                    Close Guide
                  </button>
                ) : (
                  <>
                    {isAiEnabled && (
                      <button className="btn btn-outline" style={{ flex: 1, minWidth: '180px' }} onClick={() => setAiModeChoice('with_ai')}>
                        <Camera size={18} /> Switch to AI Camera
                      </button>
                    )}
                    <button className="btn btn-outline" style={{ minWidth: '100px' }} onClick={() => setCurrentExercise(null)}>
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ALL EXERCISES LIBRARY VIEW */}
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
                  <button 
                    className="btn btn-primary btn-sm w-100 mt-10" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => startExercise(ex)}
                  >
                    <Eye size={16} /> View Exercise
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRAINER ASSIGNED WORKOUTS VIEW */}
        {activeMode === 'assigned' && !currentExercise && (
          <div className="assigned-view glass-panel" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                <Dumbbell size={28} color="var(--primary-accent)" /> Trainer Assigned Exercises
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>
                Workout routines and exercises assigned by your Gym Owner or Personal Trainer.
              </p>
            </div>

            <div className="exercise-grid">
              {(dbExercises.length > 0 ? dbExercises.slice(0, 24) : EXERCISE_LIBRARY.slice(0, 24)).map(ex => (
                <div key={ex._id || ex.id} className="exercise-card">
                  <div className="ex-card-header">
                    <h4>{ex.name}</h4>
                    <span className="category-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px' }}>
                      Assigned
                    </span>
                  </div>
                  <span className="ex-category">{Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.category || 'General')}</span>
                  <p className="ex-instructions">{(ex.description || ex.instructions || 'Maintain proper form during performance.').substring(0, 65)}...</p>
                  <button 
                    className="btn btn-primary btn-sm w-100 mt-10" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => startExercise(ex)}
                  >
                    <Eye size={16} /> View Exercise
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKOUT PROGRAMS CATALOGUE VIEW */}
        {activeMode === 'programs' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading workout programs...</div>}>
            <ProgramCatalogue
              onSelectExercise={(exercise) => startExercise(exercise)}
              onApplied={() => {
                fetchActiveProgram();
                setActiveMode('ai');
              }}
            />
          </Suspense>
        )}

        {/* DIET TEMPLATES CATALOGUE VIEW */}
        {activeMode === 'diets' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading nutrition protocols...</div>}>
            <DietCatalogue />
          </Suspense>
        )}

        {/* GUIDES & KNOWLEDGE VIEW */}
        {activeMode === 'learn' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading educational guides...</div>}>
            <LearnArticles
              onSelectExercise={(exercise) => startExercise(exercise)}
            />
          </Suspense>
        )}

        {/* AI GENERATED PLAN VIEW WITH INTERACTIVE CALENDAR & SIDE-DRAWER */}
        {activeMode === 'ai' && !currentExercise && (
          <div className="ai-plan-view glass-panel">
            {/* ACTIVE APPLIED INSTRUCTOR PROGRAM BANNER */}
            {activeUserProgram && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
                border: '1px solid #3b82f6',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                  <div>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'inline-block',
                      marginBottom: '6px'
                    }}>
                      ACTIVE INSTRUCTOR PROGRAM (v{activeUserProgram.programVersion || 1})
                    </span>
                    <h3 style={{fontSize: '1.3rem', color: 'var(--text-primary)', margin: '0 0 4px 0'}}>
                      {activeUserProgram.title}
                    </h3>
                    <p style={{fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0}}>
                      Goal: <strong>{activeUserProgram.goal}</strong> • Difficulty: <strong>{activeUserProgram.difficulty}</strong> • {activeUserProgram.durationWeeks} Weeks
                    </p>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Schedule Status</div>
                    <div style={{fontSize: '1.15rem', fontWeight: 'bold', color: '#10b981'}}>
                      Week {activeUserProgram.progress?.currentWeek || 1} • Day {activeUserProgram.progress?.currentDay || 1}
                    </div>
                  </div>
                </div>

                {/* Scheduled routine session */}
                {(() => {
                  const currentWk = activeUserProgram.weeks?.find(w => w.weekNumber === (activeUserProgram.progress?.currentWeek || 1)) || activeUserProgram.weeks?.[0];
                  const currentDayObj = currentWk?.days?.find(d => d.dayNumber === (activeUserProgram.progress?.currentDay || 1)) || currentWk?.days?.[0];
                  if (!currentDayObj) return null;

                  return (
                    <div style={{marginTop: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px'}}>
                        <div>
                          <h4 style={{margin: 0, color: 'var(--text-primary)', fontSize: '1rem'}}>
                            Scheduled Today: {currentDayObj.focus || 'Core Routine'}
                          </h4>
                          <span style={{fontSize: '0.82rem', color: 'var(--text-secondary)'}}>
                            {(currentDayObj.exercises || []).length} structured exercises
                          </span>
                        </div>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleLogProgramSession(activeUserProgram._id, activeUserProgram.progress?.currentWeek || 1, activeUserProgram.progress?.currentDay || 1)}
                        >
                          <CheckCircle size={14} style={{marginRight: '4px'}} /> Complete Session
                        </button>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px'}}>
                        {(currentDayObj.exercises || []).map((ex, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              if (ex.exerciseId && typeof ex.exerciseId === 'object') startExercise(ex.exerciseId);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--card-border)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              cursor: ex.exerciseId ? 'pointer' : 'default',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem'}}>
                                {ex.exerciseId?.name || ex.name || `Exercise ${idx + 1}`}
                              </div>
                              <div style={{fontSize: '0.78rem', color: 'var(--text-secondary)'}}>
                                {ex.sets} sets × {ex.reps} reps {ex.rpe ? `• RPE ${ex.rpe}` : ''}
                              </div>
                            </div>
                            {ex.exerciseId && <Play size={14} color="#3b82f6" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

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
                  Complete Profile Bio Assessment Now
                </button>
              </div>
            ) : (
              <>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <Bot size={40} color="#3b82f6"/>
                    <div>
                      <h2>Dynamic AI Calendar & Workout Engine</h2>
                      <p style={{color: 'var(--text-secondary)'}}>Sequential progressive overload & schedule-aware workout state machine</p>
                    </div>
                  </div>
                  <span className="category-badge" style={{background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem'}}>
                    Plan Active: {aiPlan?.planDuration || 'Custom'}
                  </span>
                </div>

                {isGeneratingPlan ? (
                  <div style={{textAlign: 'center', padding: '40px 0'}}>
                    <div style={{width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto'}}></div>
                    <p style={{color: 'var(--text-secondary)'}}>Ingesting GymSync Datasets & Building Dynamic Overload Calendar...</p>
                  </div>
                ) : aiPlan ? (
                  <div className="ai-structured-plan">
                    {/* PHASE 2: MEDICAL SAFETY HARD FILTERS */}
                    {aiPlan.medical_warnings && aiPlan.medical_warnings.length > 0 && (
                      <div style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '15px', borderRadius: '12px', marginBottom: '20px'}}>
                        <h3 style={{color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px'}}><ShieldAlert size={20}/> Medical Safety Hard-Filters Active</h3>
                        <ul style={{marginTop: '10px', paddingLeft: '20px'}}>
                          {aiPlan.medical_warnings.map((warn, i) => (
                            <li key={i} style={{color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.9rem'}}>{warn}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* INTERACTIVE CALENDAR & SIDE-DRAWER UI */}
                    <h3 style={{marginBottom: '15px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      📅 Interactive Workout Schedule Dashboard
                    </h3>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px'}}>
                      Workouts unlock on their scheduled dates. Complete required exercises sequentially to unlock daily achievements.
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
                            const { status, scheduledDate } = getDayScheduleInfo(dayItem);

                            let bg = 'rgba(255, 255, 255, 0.04)';
                            let border = '1px solid transparent';
                            let textColor = 'var(--text-secondary)';

                            if (status === 'COMPLETED') {
                              bg = 'rgba(16, 185, 129, 0.25)';
                              border = '1px solid #10b981';
                              textColor = '#10b981';
                            } else if (status === 'AVAILABLE') {
                              bg = 'rgba(59, 130, 246, 0.25)';
                              border = '1px solid #3b82f6';
                              textColor = '#60a5fa';
                            } else if (status === 'MISSED') {
                              bg = 'rgba(239, 68, 68, 0.2)';
                              border = '1px solid #ef4444';
                              textColor = '#ef4444';
                            } else if (status === 'REST') {
                              bg = 'rgba(255, 255, 255, 0.05)';
                              border = '1px dashed rgba(255,255,255,0.15)';
                              textColor = 'var(--text-secondary)';
                            }

                            if (isSelected) {
                              border = '2px solid white';
                            }

                            return (
                              <div 
                                key={dayItem.dayNumber}
                                onClick={() => setSelectedCalendarDay(dayItem)}
                                title={`Day ${dayItem.dayNumber} - ${status} (${scheduledDate.toLocaleDateString()})`}
                                style={{
                                  padding: '10px 4px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  background: bg,
                                  border: border,
                                  position: 'relative',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <span style={{fontWeight: 'bold', fontSize: '0.95rem', display: 'block', color: isSelected ? 'white' : textColor}}>
                                  {dayItem.dayNumber}
                                </span>
                                <span style={{fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginTop: '2px', color: isSelected ? 'white' : 'var(--text-secondary)'}}>
                                  {status === 'LOCKED' ? <Lock size={9} /> : status === 'COMPLETED' ? <CheckCircle size={9} color="#10b981" /> : `Wk ${dayItem.weekNumber}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{display: 'flex', gap: '12px', marginTop: '15px', fontSize: '0.75rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                          <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><span style={{width: '8px', height: '8px', borderRadius: '50%', background: '#10b981'}}></span> Completed</span>
                          <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><span style={{width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6'}}></span> Available Today</span>
                          <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><span style={{width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444'}}></span> Missed</span>
                          <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)'}}></span> Rest</span>
                        </div>
                      </div>

                      {/* SIDE-DRAWER / DETAIL PANEL */}
                      {selectedCalendarDay && (() => {
                        const { status, scheduledDate } = getDayScheduleInfo(selectedCalendarDay);
                        const isToday = status === 'AVAILABLE';

                        return (
                          <div style={{background: 'var(--panel-bg)', padding: '20px', borderRadius: '16px', border: '1px solid #3b82f6', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '15px'}}>
                              <div>
                                <h3 style={{fontSize: '1.2rem', color: 'var(--text-primary)'}}>Day {selectedCalendarDay.dayNumber} Details</h3>
                                <p style={{fontSize: '0.85rem', color: '#3b82f6'}}>{selectedCalendarDay.phaseName || 'Routine'} • {scheduledDate.toLocaleDateString()}</p>
                              </div>
                              <span className="category-badge" style={{
                                background: status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : status === 'AVAILABLE' ? 'rgba(59, 130, 246, 0.2)' : status === 'MISSED' ? 'rgba(239, 68, 68, 0.2)' : 'var(--card-border)',
                                color: status === 'COMPLETED' ? '#10b981' : status === 'AVAILABLE' ? '#60a5fa' : status === 'MISSED' ? '#ef4444' : 'var(--text-secondary)',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.8rem'
                              }}>
                                {status === 'COMPLETED' ? '✅ Completed' : status === 'AVAILABLE' ? '▶️ Available Today' : status === 'MISSED' ? '🔴 Missed' : status === 'REST' ? '😴 Rest & Recovery' : '🔒 Locked'}
                              </span>
                            </div>

                            {/* 1. TODAY'S GOAL / ADAPTATION OBJECTIVE */}
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px' }}>
                              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#60a5fa', fontWeight: 600 }}>🎯 Today's Adaptation Goal</div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {selectedCalendarDay.sessionObjective || selectedCalendarDay.focusArea}
                              </div>
                            </div>

                            {/* 1B. COACH RATIONALE & EVENT AWARENESS CARD */}
                            {selectedCalendarDay.rationale && (
                              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  🧠 Coach Rationale & Life Context
                                </div>
                                {selectedCalendarDay.rationale.constraints?.length > 0 && (
                                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    <strong style={{ color: '#cbd5e1' }}>Context:</strong> {selectedCalendarDay.rationale.constraints.join(' • ')}
                                  </div>
                                )}
                                {selectedCalendarDay.rationale.rejectedExercises?.length > 0 && (
                                  <div style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '4px' }}>
                                    <strong>Fatigue Protected:</strong> {selectedCalendarDay.rationale.rejectedExercises.map(r => `${r.name} (${r.reason})`).join('; ')}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 2. REASONED WARM-UP SECTION */}
                            {selectedCalendarDay.warmup?.warmupExercises?.length > 0 && (
                              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}>🔥 Reasoned Warm-Up ({selectedCalendarDay.warmup.totalEstimatedMinutes || 5} Mins)</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {selectedCalendarDay.warmup.warmupExercises.map((w, wi) => (
                                    <div key={wi} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                      <strong style={{ color: 'var(--text-primary)' }}>{w.phase}:</strong> {w.name} ({w.repsOrDuration || w.duration})
                                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>{w.purpose}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 3. MAIN WORKOUT SPLIT FOR SELECTED DAY */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <h4 style={{ fontSize: '0.95rem', color: '#3b82f6', margin: 0 }}>🏋️ Main Resistance Work</h4>
                              {selectedCalendarDay.timeBudget?.totalEstimatedMinutes && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  ⏱️ Est. {selectedCalendarDay.timeBudget.totalEstimatedMinutes} Mins Total
                                </span>
                              )}
                            </div>

                            {status === 'LOCKED' ? (
                              <div style={{ textAlign: 'center', padding: '30px 20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed var(--card-border)', marginBottom: '20px' }}>
                                <Lock size={32} color="var(--text-secondary)" style={{ marginBottom: '8px' }} />
                                <h4 style={{ color: 'var(--text-primary)', marginBottom: '6px', fontSize: '1rem' }}>Workout Locked</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                  This workout split unlocks on <strong>{scheduledDate.toLocaleDateString()}</strong>.
                                </p>
                              </div>
                            ) : typeof selectedCalendarDay.workoutSplit === 'string' ? (
                              <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', marginBottom: '20px'}}>
                                {selectedCalendarDay.workoutSplit}
                              </p>
                            ) : (
                              <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto'}}>
                                {selectedCalendarDay.workoutSplit.map((ex, idx) => {
                                  const targetEx = EXERCISE_LIBRARY.find(e => e.id === ex.id) || { ...ex, category: 'AI Custom', instructions: 'Follow AI targets', points: 1 };
                                  const isExDone = isExerciseCompletedInState(selectedCalendarDay.dayNumber, idx);
                                  const isUnlocked = isExerciseUnlockedInState(selectedCalendarDay.dayNumber, idx);

                                  return (
                                    <div 
                                      key={idx} 
                                      onClick={() => {
                                        if (status === 'LOCKED') {
                                          toast.info(`Workout Day ${selectedCalendarDay.dayNumber} is locked until ${scheduledDate.toLocaleDateString()}`);
                                          return;
                                        }
                                        if (status === 'REST') {
                                          toast.info(`Day ${selectedCalendarDay.dayNumber} is a scheduled Rest & Recovery Day.`);
                                          return;
                                        }
                                        if (status === 'MISSED') {
                                          toast.error(`Workout Day ${selectedCalendarDay.dayNumber} was missed and cannot be started.`);
                                          return;
                                        }
                                        if (!isUnlocked && status !== 'COMPLETED') {
                                          toast.warning(`Please complete previous exercises in order first!`);
                                          return;
                                        }
                                        startExercise({ ...targetEx, ...ex, aiWorkoutIndex: idx });
                                      }}
                                      className="ai-exercise-card"
                                      style={{
                                        background: isExDone ? 'rgba(16, 185, 129, 0.15)' : !isUnlocked && status !== 'COMPLETED' ? 'rgba(0,0,0,0.3)' : 'var(--card-bg)', 
                                        padding: '12px 14px', 
                                        borderRadius: '10px', 
                                        border: isExDone ? '1px solid #10b981' : isUnlocked ? '1px solid #3b82f6' : '1px solid var(--card-border)', 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        gap: '8px',
                                        cursor: (status !== 'MISSED' && status !== 'REST' && (isUnlocked || status === 'COMPLETED')) ? 'pointer' : 'not-allowed',
                                        opacity: (status === 'MISSED' || status === 'REST' || (!isUnlocked && status !== 'COMPLETED')) ? 0.6 : 1,
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                          <div style={{width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', borderColor: isExDone ? '#10b981' : isUnlocked ? '#3b82f6' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            {isExDone ? <CheckCircle size={16} color="#10b981" /> : !isUnlocked && status !== 'COMPLETED' ? <Lock size={12} color="var(--text-secondary)" /> : <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{idx + 1}</span>}
                                          </div>
                                          <div>
                                            <h5 style={{fontSize: '0.92rem', margin: 0, color: isExDone ? '#10b981' : 'var(--text-primary)', textDecoration: isExDone ? 'line-through' : 'none'}}>
                                              {ex.name}
                                            </h5>
                                            <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{ex.target} • {ex.equipment}</span>
                                          </div>
                                        </div>
                                        <div style={{textAlign: 'right'}}>
                                          <span style={{fontSize: '0.82rem', fontWeight: 'bold', color: isExDone ? '#10b981' : 'var(--primary-accent)', display: 'block'}}>{ex.sets} Sets × {ex.reps} Reps</span>
                                          <span style={{fontSize: '0.7rem', color: '#f59e0b'}}>{ex.rpe}</span>
                                        </div>
                                      </div>

                                      {/* Why Selected & Purpose */}
                                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: '5px 8px', borderRadius: '6px' }}>
                                        💡 <strong style={{ color: '#38bdf8' }}>Why Selected:</strong> {ex.purpose || ex.reasonForSelection || 'Compound movement aligned with session objective.'}
                                      </div>

                                      {/* Interactive Action Bar */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleCoachAction('Why this exercise', ex); }}
                                            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                                          >
                                            Why this?
                                          </button>
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>•</span>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleCoachAction('Replace this exercise', ex); }}
                                            style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                                          >
                                            Replace
                                          </button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {(ex.isAiTrackable || ex.aiDetection?.enabled) && (
                                            <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>
                                              🎯 AI Vision
                                            </span>
                                          )}
                                          <button 
                                            className="btn btn-outline btn-sm" 
                                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                            disabled={status === 'MISSED' || (!isUnlocked && status !== 'COMPLETED')}
                                          >
                                            {status === 'MISSED' ? 'Missed' : isExDone ? 'Completed' : 'Start'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* 4. REASONED COOL-DOWN SECTION */}
                            {selectedCalendarDay.cooldown?.cooldownExercises?.length > 0 && (
                              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#10b981', display: 'block', marginBottom: '6px' }}>
                                  🧘 Reasoned Cool-Down & Recovery
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {selectedCalendarDay.cooldown.cooldownExercises.map((c, ci) => (
                                    <div key={ci} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                      <strong style={{ color: 'var(--text-primary)' }}>{c.name}:</strong> {c.duration}
                                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>{c.purpose}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 5. QUICK COACH RECALCULATE ACTIONS */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', padding: '10px 12px', borderRadius: '10px', marginBottom: '18px' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                ⚡ Real-Time Coach Session Adjustments:
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  disabled={isRecalculating}
                                  onClick={() => handleCoachAction('I only have dumbbells today')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                >
                                  🏋️ Dumbbells Only
                                </button>
                                <button
                                  type="button"
                                  disabled={isRecalculating}
                                  onClick={() => handleCoachAction('I only have 20 minutes today')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                >
                                  ⏱️ 20 Mins
                                </button>
                                <button
                                  type="button"
                                  disabled={isRecalculating}
                                  onClick={() => handleCoachAction('My knee hurts today')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                >
                                  🩺 Knee Discomfort
                                </button>
                                <button
                                  type="button"
                                  disabled={isRecalculating}
                                  onClick={() => handleCoachAction('I have a match tomorrow')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                >
                                  🏏 Match Tomorrow
                                </button>
                                <button
                                  type="button"
                                  disabled={isRecalculating}
                                  onClick={() => handleCoachAction('I have army training tomorrow')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                >
                                  🎖️ Army Training
                                </button>
                                <button
                                  type="button"
                                  disabled={isRecalculating}
                                  onClick={() => handleCoachAction('I have football practice tomorrow')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                >
                                  ⚽ Football Tomorrow
                                </button>
                                <button
                                  type="button"
                                  disabled={isRecalculating}
                                  onClick={() => handleCoachAction('5K race tomorrow')}
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                >
                                  🏃 5K Race Tomorrow
                                </button>
                              </div>
                            </div>

                            {/* DIET PLAN FOR SELECTED DAY */}
                            <h4 style={{fontSize: '0.95rem', color: '#10b981', marginBottom: '10px'}}>🥗 Natural Whole Food Diet</h4>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto'}}>
                              {(aiPlan.daily_diet_plan || []).map((diet, dIdx) => (
                                <div key={dIdx} style={{background: 'var(--card-bg)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem'}}>
                                  <strong style={{color: 'var(--primary-accent)'}}>{diet.meal}: </strong>
                                  <span style={{color: 'var(--text-secondary)'}}>{diet.food}</span>
                                </div>
                              ))}
                            </div>

                            {/* WORKOUT CONTROLS */}
                            <div style={{marginTop: '20px', borderTop: '1px solid var(--card-border)', paddingTop: '15px'}}>
                              {status === 'COMPLETED' ? (
                                <div style={{textAlign: 'center', padding: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)'}}>
                                  <CheckCircle size={24} style={{marginBottom: '5px'}}/>
                                  <div style={{fontWeight: 'bold'}}>Workout Completed</div>
                                </div>
                              ) : status === 'REST' ? (
                                <div style={{textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', borderRadius: '8px', border: '1px solid var(--card-border)'}}>
                                  <Moon size={22} style={{ marginBottom: '4px' }} />
                                  <div style={{ fontWeight: 'bold' }}>Scheduled Rest & Recovery Day</div>
                                </div>
                              ) : status === 'MISSED' ? (
                                <div style={{textAlign: 'center', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
                                  <AlertTriangle size={22} style={{ marginBottom: '4px' }} />
                                  <div style={{ fontWeight: 'bold' }}>🔴 Workout Missed</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Scheduled for {scheduledDate.toLocaleDateString()}</div>
                                </div>
                              ) : status === 'LOCKED' ? (
                                <div style={{textAlign: 'center', padding: '12px', background: 'rgba(0,0,0,0.4)', color: 'var(--text-secondary)', borderRadius: '8px', border: '1px solid var(--card-border)'}}>
                                  <Lock size={20} style={{ marginBottom: '4px' }} />
                                  <div>Workout Locked</div>
                                  <div style={{ fontSize: '0.78rem' }}>Unlocks on {scheduledDate.toLocaleDateString()}</div>
                                </div>
                              ) : activeWorkoutDay === selectedCalendarDay.dayNumber ? (
                                <button 
                                  className="btn btn-primary" 
                                  style={{width: '100%', background: '#10b981'}}
                                  onClick={completeActiveWorkout}
                                >
                                  <CheckCircle size={18}/> Complete Today's Workout (+50 XP)
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-primary" 
                                  style={{width: '100%'}}
                                  onClick={() => {
                                    setActiveWorkoutDay(selectedCalendarDay.dayNumber);
                                    toast.info(`Started Day ${selectedCalendarDay.dayNumber} workout! Complete exercises in order.`);
                                  }}
                                >
                                  ▶️ Start Today's Workout
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
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
