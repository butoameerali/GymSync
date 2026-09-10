import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Dumbbell, Sparkles, Utensils, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import aiPlanService from '../../services/aiPlanService';
import ExerciseDetailView from './ExerciseDetailView';
import AITrainerAIMode from './AITrainerAIMode';
import AITrainerAssignedMode from './AITrainerAssignedMode';
import './AITrainer.css';

// Code-split catalogue & library tabs for optimal initial bundle size and zero static exercise bloat
const ExerciseLibrary = lazy(() => import('../../components/trainee/ExerciseLibrary'));
const ProgramCatalogue = lazy(() => import('../../components/trainee/ProgramCatalogue'));
const DietCatalogue = lazy(() => import('../../components/trainee/DietCatalogue'));
const LearnArticles = lazy(() => import('../../components/trainee/LearnArticles'));

const AITrainer = () => {
  const [activeMode, setActiveMode] = useState('library'); // 'library', 'ai', 'assigned'
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
    loadSavedPlans();

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

  // Saved AI Plans state
  const [savedPlans, setSavedPlans] = useState([]);
  const [showSavedPlansModal, setShowSavedPlansModal] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isLoadingSavedPlans, setIsLoadingSavedPlans] = useState(false);

  const loadSavedPlans = async () => {
    if (isGuest) return;
    setIsLoadingSavedPlans(true);
    try {
      const plans = await aiPlanService.getSavedPlans();
      if (Array.isArray(plans)) {
        setSavedPlans(plans);
      }
    } catch (err) {
      console.warn('Failed to load saved plans:', err.message);
    } finally {
      setIsLoadingSavedPlans(false);
    }
  };

  const handleSaveCurrentPlan = async () => {
    if (isGuest) {
      toast.info('Please create an account or log in to save custom AI workout plans.');
      return;
    }
    if (!aiPlan) {
      toast.error('No AI plan generated to save yet.');
      return;
    }
    setIsSavingPlan(true);
    try {
      const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
      const bioData = JSON.parse(localStorage.getItem(`gymsync_${userKey}_bio_data`) || '{}');
      const planTitle = `${aiPlan.primary_goal || bioData.mainGoalArea || 'Custom'} AI Plan (${new Date().toLocaleDateString()})`;

      const saved = await aiPlanService.savePlan({
        title: planTitle,
        goal: aiPlan.primary_goal || bioData.mainGoalArea || 'General Fitness',
        fitnessLevel: aiPlan.experience_level || bioData.fitnessLevel || 'Beginner',
        workout: aiPlan,
        calendar: aiPlan.interactive_calendar || [],
        notes: `Target: ${aiPlan.target_muscles?.join(', ') || 'Full Body'}`
      });

      toast.success(`Plan "${saved.title || planTitle}" saved to your cloud profile!`);
      loadSavedPlans();
    } catch (err) {
      toast.error(`Failed to save plan: ${err.message}`);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleActivateSavedPlan = (savedPlan) => {
    if (!savedPlan || !savedPlan.workout) return;
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const activated = {
      ...savedPlan.workout,
      interactive_calendar: savedPlan.calendar && savedPlan.calendar.length > 0 ? savedPlan.calendar : (savedPlan.workout.interactive_calendar || []),
      planId: savedPlan._id,
      planStartDate: savedPlan.createdAt || new Date().toISOString()
    };
    setAiPlan(activated);
    localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(activated));
    setShowSavedPlansModal(false);
    toast.success(`Loaded saved plan: ${savedPlan.title}`);
  };

  const handleDeleteSavedPlan = async (planId, e) => {
    if (e) e.stopPropagation();
    try {
      await aiPlanService.deletePlan(planId);
      setSavedPlans(prev => prev.filter(p => p._id !== planId));
      toast.success('Saved plan removed.');
    } catch (err) {
      toast.error(`Failed to delete plan: ${err.message}`);
    }
  };

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

  const startExercise = async (exercise) => {
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

    // Detail fetch only when exercise is opened (if full execution steps or instructions omitted in card DTO)
    const exId = exercise._id || exercise.id;
    if (exId && (!exercise.instructions || !exercise.executionSteps)) {
      try {
        const res = await fetch(`/api/exercises/${exId}`);
        if (res.ok) {
          const fullExercise = await res.json();
          setCurrentExercise(prev => ({ ...prev, ...fullExercise }));
        }
      } catch (err) {
        console.warn('Exercise detail fetch notice:', err.message);
      }
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

  return (
    <div className="ai-trainer-page">
      <div className="container">
        <div className="trainer-header glass-panel">
          <h1><Dumbbell size={36} color="var(--primary-accent)"/> Workout Hub</h1>
          <p>Explore 100+ exercises, view detailed execution guides, video demonstrations &amp; track your progress.</p>
        </div>

        {/* ── TAB BAR ───────────────────────────────────────────────────── */}
        <div className="trainer-tabs">
          <button
            className={`tab-btn ${activeMode === 'library' ? 'active' : ''}`}
            onClick={() => { setActiveMode('library'); setCurrentExercise(null); }}
          >
            Exercise Library
          </button>
          <button
            className={`tab-btn ${activeMode === 'programs' ? 'active' : ''}`}
            onClick={() => { setActiveMode('programs'); setCurrentExercise(null); }}
          >
            <Dumbbell size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }}/> Workout Programs
          </button>
          <button
            className={`tab-btn ${activeMode === 'diets' ? 'active' : ''}`}
            onClick={() => { setActiveMode('diets'); setCurrentExercise(null); }}
          >
            <Utensils size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }}/> Diet Plans
          </button>
          <button
            className={`tab-btn ${activeMode === 'learn' ? 'active' : ''}`}
            onClick={() => { setActiveMode('learn'); setCurrentExercise(null); }}
          >
            <BookOpen size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }}/> Guides &amp; Knowledge
          </button>
          <button
            className={`tab-btn ${activeMode === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveMode('ai')}
          >
            <Sparkles size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }}/> My AI Plan
          </button>
          <button
            className={`tab-btn ${activeMode === 'assigned' ? 'active' : ''}`}
            onClick={() => { setActiveMode('assigned'); setCurrentExercise(null); }}
          >
            Trainer Assigned
          </button>
        </div>

        {/* ── EXERCISE DETAIL OVERLAY ────────────────────────────────────── */}
        {currentExercise && (
          <ExerciseDetailView
            currentExercise={currentExercise}
            aiModeChoice={aiModeChoice}
            setAiModeChoice={setAiModeChoice}
            setCurrentExercise={setCurrentExercise}
            reps={reps}
            setReps={setReps}
            currentSet={currentSet}
            setLogs={setLogs}
            handleLogSet={handleLogSet}
          />
        )}

        {/* ── LIBRARY MODE ──────────────────────────────────────────────── */}
        {activeMode === 'library' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading exercise library...</div>}>
            <ExerciseLibrary
              onSelectExercise={startExercise}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          </Suspense>
        )}

        {/* ── ASSIGNED MODE ─────────────────────────────────────────────── */}
        {activeMode === 'assigned' && !currentExercise && (
          <AITrainerAssignedMode
            dbExercises={dbExercises}
            startExercise={startExercise}
          />
        )}

        {/* ── PROGRAMS MODE ─────────────────────────────────────────────── */}
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

        {/* ── DIETS MODE ────────────────────────────────────────────────── */}
        {activeMode === 'diets' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading nutrition protocols...</div>}>
            <DietCatalogue />
          </Suspense>
        )}

        {/* ── LEARN MODE ────────────────────────────────────────────────── */}
        {activeMode === 'learn' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading educational guides...</div>}>
            <LearnArticles
              onSelectExercise={(exercise) => startExercise(exercise)}
            />
          </Suspense>
        )}

        {/* ── AI PLAN MODE ──────────────────────────────────────────────── */}
        {activeMode === 'ai' && !currentExercise && (
          <AITrainerAIMode
            isBioFilled={isBioFilled}
            isGuest={isGuest}
            aiPlan={aiPlan}
            isGeneratingPlan={isGeneratingPlan}
            selectedCalendarDay={selectedCalendarDay}
            setSelectedCalendarDay={setSelectedCalendarDay}
            workoutProgress={workoutProgress}
            activeWorkoutDay={activeWorkoutDay}
            setActiveWorkoutDay={setActiveWorkoutDay}
            savedPlans={savedPlans}
            showSavedPlansModal={showSavedPlansModal}
            setShowSavedPlansModal={setShowSavedPlansModal}
            isSavingPlan={isSavingPlan}
            isLoadingSavedPlans={isLoadingSavedPlans}
            activeUserProgram={activeUserProgram}
            isRecalculating={isRecalculating}
            getDayScheduleInfo={getDayScheduleInfo}
            isExerciseCompletedInState={isExerciseCompletedInState}
            isExerciseUnlockedInState={isExerciseUnlockedInState}
            startExercise={startExercise}
            completeActiveWorkout={completeActiveWorkout}
            handleCoachAction={handleCoachAction}
            handleSaveCurrentPlan={handleSaveCurrentPlan}
            loadSavedPlans={loadSavedPlans}
            handleActivateSavedPlan={handleActivateSavedPlan}
            handleDeleteSavedPlan={handleDeleteSavedPlan}
            handleLogProgramSession={handleLogProgramSession}
          />
        )}
      </div>
    </div>
  );
};

export default AITrainer;
