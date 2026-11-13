import React, { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { Dumbbell, Sparkles, Utensils, BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import aiPlanService from '../../services/aiPlanService';
import ExerciseDetailView from './ExerciseDetailView';
import AITrainerAIMode from './AITrainerAIMode';
import AITrainerAssignedMode from './AITrainerAssignedMode';
import { MiniCoachModal } from './MiniCoachModal';
import { BrowseProgramsTab } from './BrowseProgramsTab';
import './AITrainer.css';

// Code-split catalogue & library tabs for optimal initial bundle size and zero static exercise bloat
const ExerciseLibrary = lazy(() => import('../../components/trainee/ExerciseLibrary'));
const FoodLibraryView = lazy(() => import('../../features/foodLogging/FoodLibraryView'));
const ProgramCatalogue = lazy(() => import('../../components/trainee/ProgramCatalogue'));
const DietCatalogue = lazy(() => import('../../components/trainee/DietCatalogue'));
const MyAIDietHub = lazy(() => import('./MyAIDietHub'));
const LearnArticles = lazy(() => import('../../components/trainee/LearnArticles'));

const MAIN_TABS = [
  { key: 'my_plan', label: 'My Plan', emoji: '✨' },
  { key: 'library', label: 'Library', emoji: '📚' },
  { key: 'fit_logs', label: 'Fit logs', emoji: '🏋️' }
];

const SUB_TABS = {
  my_plan: [
    { key: 'ai', label: 'My Workouts', icon: Sparkles },
    { key: 'diets', label: 'My Diet Plan', icon: Utensils }
  ],
  library: [
    { key: 'food_library', label: 'Food Library', icon: Utensils },
    { key: 'library', label: 'Exercise Library', icon: BookOpen }
  ],
  fit_logs: [
    { key: 'programs', label: 'Workout Programs', icon: Dumbbell },
    { key: 'learn', label: 'Guides', icon: BookOpen }
  ]
};

const MOBILE_OPTIONS = [
  { key: 'ai', label: 'My Plan • My Workouts', emoji: '✨' },
  { key: 'diets', label: 'My Plan • My Diet Plan', emoji: '🥗' },
  { key: 'food_library', label: 'Library • Food Library', emoji: '🍲' },
  { key: 'library', label: 'Library • Exercise Library', emoji: '📚' },
  { key: 'programs', label: 'Fit logs • Workout Programs', emoji: '🏋️' },
  { key: 'learn', label: 'Fit logs • Guides', emoji: '📖' }
];

const AITrainer = () => {
  const [activeMode, setActiveMode] = useState('ai'); // Default selected: 'ai' ('My Workouts')
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const modeDropdownRef = useRef(null);

  const mainTab = useMemo(() => {
    if (activeMode === 'ai' || activeMode === 'diets') return 'my_plan';
    if (activeMode === 'library' || activeMode === 'food_library') return 'library';
    if (activeMode === 'programs' || activeMode === 'learn') return 'fit_logs';
    return 'my_plan';
  }, [activeMode]);
  const [favorites, setFavorites] = useState([]);
  const [aiModeChoice, setAiModeChoice] = useState(null); // null | 'with_ai' | 'without_ai'

  // Exercise and set progression states
  const [currentExercise, setCurrentExercise] = useState(null);
  const [reps, setReps] = useState(10);
  const [currentSet, setCurrentSet] = useState(1);
  const [setLogs, setSetLogs] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const [isBioFilled, setIsBioFilled] = useState(false);
  const [isSubscribedState, setIsSubscribedState] = useState(true);
  const [dbExercises, setDbExercises] = useState([]);
  const [activeUserProgram, setActiveUserProgram] = useState(null);
  const [allUserPrograms, setAllUserPrograms] = useState([]);
  const [triggerReviewProgram, setTriggerReviewProgram] = useState(null);

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

  useEffect(() => {
    const handleOutside = (e) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const exerciseParam = params.get('exercise');
    const activeExFromState = location.state?.activeExercise;
    
    let activeExFromStorage = null;
    const storedMission = localStorage.getItem('gymsync_active_mission') || localStorage.getItem('gymsync_tracking_exercise');
    if (storedMission) {
      try {
        activeExFromStorage = JSON.parse(storedMission);
      } catch (e) {}
    }

    const targetEx = activeExFromState || activeExFromStorage || (exerciseParam ? { name: exerciseParam, sets: 3, reps: '10-12', restSec: 60 } : null);

    if (tab && ['library', 'ai', 'assigned', 'diets', 'learn'].includes(tab)) {
      setActiveMode(tab);
    }
    
    if (targetEx && targetEx.name) {
      setActiveMode('library');
      setCurrentExercise({
        name: targetEx.name,
        sets: Number(targetEx.sets) || 3,
        reps: targetEx.reps || 10,
        restSec: Number(targetEx.restSec) || 60,
        isPlaceholder: true,
        ...targetEx
      });
      // Clear mission after consuming to prevent unwanted re-openings on refresh
      localStorage.removeItem('gymsync_active_mission');
    }
  }, [location.search, location.state]);

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
    fetch('/api/plans/user-programs', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(list => {
        const progList = Array.isArray(list) ? list : [];
        setAllUserPrograms(progList);
        const currentActive = progList.find(p => p.isActive && !p.isCompleted) || null;
        setActiveUserProgram(currentActive);
        if (currentActive) {
          setSelectedPlanForView(prev => {
            const mapped = {
              _id: currentActive._id,
              title: currentActive.title,
              goal: currentActive.goal || 'Strength & Conditioning',
              fitnessLevel: currentActive.difficulty || 'All Levels',
              durationWeeks: currentActive.durationWeeks || 4,
              daysPerWeek: currentActive.daysPerWeek || 4,
              planDuration: currentActive.durationWeeks ? `${currentActive.durationWeeks * 7} Days` : '4 Weeks',
              isInstructorProgram: true,
              instructorName: currentActive.instructorName || 'Fitness Instructor',
              programVersion: currentActive.programVersion || 1,
              progress: currentActive.progress || { currentWeek: 1, currentDay: 1, completedSessions: [] },
              weeks: currentActive.weeks || [],
              outcomeReport: currentActive.outcomeReport || null,
              rawProgram: currentActive
            };
            // Do not auto-open program when visiting Workout Hub; keep user on the Hub overview screen
            if (!prev) return null;
            if (prev._id === currentActive._id) {
              return { ...prev, ...mapped };
            }
            return prev;
          });
        } else {
          setActiveUserProgram(null);
        }
      })
      .catch(err => console.error('Fetch user programs error:', err));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reviewId = params.get('reviewProgramId');
    if (reviewId && allUserPrograms.length > 0) {
      const targetProg = allUserPrograms.find(p => String(p._id) === reviewId);
      if (targetProg) {
        setTriggerReviewProgram(targetProg);
      }
    }
  }, [allUserPrograms]);

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
        fetchActiveProgram();
        if (updated.isCompleted) {
          setTriggerReviewProgram(updated);
          toast.success(`🎉 Program Completed! All weeks finished. Share your results with AI Coach!`, { autoClose: 6000 });
        } else {
          toast.success(`Day ${dayNum} of Week ${weekNum} completed! Workout streak updated.`);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Could not log session progress');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const handleDeleteUserProgram = async (programId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to un-enroll from this workout program?")) return;
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/plans/user-programs/${programId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setActiveUserProgram(null);
        setSelectedPlanForView(prev => (prev?.isInstructorProgram || prev?._id === programId) ? null : prev);
        fetchActiveProgram();
        toast.success('Successfully un-enrolled from workout program.');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to un-enroll from program');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error while un-enrolling');
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
  const [selectedPlanForView, setSelectedPlanForView] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  // Ensure user always lands on Workout Hub overview when navigating to /ai-trainer afresh
  useEffect(() => {
    setSelectedPlanForView(null);
  }, [location.pathname]);

  // Saved AI Plans state
  const [savedPlans, setSavedPlans] = useState([]);
  const [showSavedPlansModal, setShowSavedPlansModal] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isLoadingSavedPlans, setIsLoadingSavedPlans] = useState(false);
  
  const [miniCoachSteps, setMiniCoachSteps] = useState(null);

  const loadSavedPlans = async () => {
    if (isGuest) return;
    setIsLoadingSavedPlans(true);
    try {
      const plans = await aiPlanService.getSavedPlans();
      if (Array.isArray(plans)) {
        const seenKeys = new Set();
        const deduplicatedPlans = plans.filter(p => {
          const key = `${(p.title || '').trim().toLowerCase()}___${(p.goal || '').trim().toLowerCase()}`;
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });
        setSavedPlans(deduplicatedPlans);
        const workoutPlans = deduplicatedPlans.filter(p => p.planKind !== 'Diet');
        const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
        const storedPlan = JSON.parse(localStorage.getItem(`gymsync_${userKey}_ai_plan`) || 'null');

        if (storedPlan && workoutPlans.some(p => p._id === storedPlan.planId || p._id === storedPlan._id || p.title === storedPlan.title)) {
          // Keep current stored plan
        } else if (workoutPlans.length > 0) {
          handleActivateSavedPlan(workoutPlans[0]);
        } else {
          // No saved plans in DB: Do not show forced plan, show gateway
          setAiPlan(null);
          localStorage.removeItem(`gymsync_${userKey}_ai_plan`);
        }
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
      title: savedPlan.title,
      planStartDate: savedPlan.createdAt || new Date().toISOString()
    };
    setAiPlan(activated);
    localStorage.setItem(`gymsync_${userKey}_ai_plan`, JSON.stringify(activated));
    setShowSavedPlansModal(false);
    toast.success(`Loaded plan: ${savedPlan.title}`);
  };

  const handleDeleteSavedPlan = async (planId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this workout plan?")) return;
    try {
      await aiPlanService.deletePlan(planId);
      const remaining = savedPlans.filter(p => p._id !== planId);
      setSavedPlans(remaining);
      const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');

      if (aiPlan && (aiPlan.planId === planId || aiPlan._id === planId || aiPlan.title === planId)) {
        setAiPlan(null);
        localStorage.removeItem(`gymsync_${userKey}_ai_plan`);
      }
      setSelectedPlanForView(null);
      toast.success('Workout plan deleted successfully.');
    } catch (err) {
      toast.error(`Failed to delete plan: ${err.message}`);
    }
  };

  const handleCreateNewPlan = () => {
    setActiveMode('programs');
    toast.info('Explore certified workout programs and choose the best plan for you!');
  };

  const handleCreateStarterPlan = async (goalType) => {
    setIsGeneratingPlan(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      if (!token) {
        toast.info('Please log in to apply a workout plan.');
        return;
      }

      const goalKeyword = goalType === 'weight_loss' ? 'Weight Loss' : goalType === 'body_dev' ? 'Muscle' : 'Strength';

      // Rule R1: Find matching human-authored certified program from existing catalogue
      const res = await fetch(`/api/plans/premade?type=Workout&search=${encodeURIComponent(goalKeyword)}`);
      const data = await res.json();
      const list = data.items || (Array.isArray(data) ? data : []);

      const bestProgram = list.find(p =>
        (p.goal || p.category || p.title || '').toLowerCase().includes(goalKeyword.toLowerCase())
      ) || list[0];

      if (!bestProgram) {
        toast.info('Browse all certified workout programs to select your plan.');
        setActiveMode('programs');
        return;
      }

      if (activeUserProgram && activeUserProgram.isActive && !activeUserProgram.isCompleted) {
        toast.warning(`You already have an active program ("${activeUserProgram.title}"). Please finish or un-enroll from it before starting a new one.`);
        setIsGeneratingPlan(false);
        return;
      }

      // Apply the certified program (Rule R3: Exactly one active program per user)
      const applyRes = await fetch(`/api/plans/premade/${bestProgram._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ source: 'starter_plan' })
      });

      if (applyRes.ok) {
        await fetchActiveProgram();
        const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
        localStorage.removeItem(`gymsync_${userKey}_ai_plan`);
        setAiPlan(null);
        toast.success(`🎉 Activated "${bestProgram.title}" as your certified workout plan!`);
      } else {
        const err = await applyRes.json().catch(() => ({}));
        toast.error(err.error || err.message || 'Could not apply program');
      }
    } catch (err) {
      console.error(err);
      toast.error(`Unable to activate plan: ${err.message}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  useEffect(() => {
    const handlePlanUpdatedEvent = (e) => {
      const updatedPlan = e.detail?.plan;
      if (updatedPlan) {
        handleActivateSavedPlan(updatedPlan);
        setSelectedPlanForView(updatedPlan);
        loadSavedPlans();
      }
    };
    window.addEventListener('gymsync_plan_updated', handlePlanUpdatedEvent);
    return () => window.removeEventListener('gymsync_plan_updated', handlePlanUpdatedEvent);
  }, []);

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

  const fetchPlanWithBenchmarks = (additionalData = null) => {
    setIsGeneratingPlan(true);
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const bioData = JSON.parse(localStorage.getItem(`gymsync_${userKey}_bio_data`) || '{}');

    let mergedBio = { ...bioData };
    if (additionalData) {
      mergedBio = { ...mergedBio, ...additionalData, ...(additionalData.missingBioFields || {}) };
    }

    const payload = {
      ...mergedBio,
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
      if (data.structuredAction && data.structuredAction.type === 'mini_coach_interview') {
        setMiniCoachSteps(data.structuredAction.steps);
        setIsGeneratingPlan(false);
        return;
      }

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
      
      // Save the merged data back to bioData to persist memory across sessions!
      if (additionalData) {
        localStorage.setItem(`gymsync_${userKey}_bio_data`, JSON.stringify(mergedBio));
        localStorage.setItem(`gymsync_${userKey}_bio`, JSON.stringify(mergedBio));
        window.dispatchEvent(new Event('gymsync_bio_updated'));
      }
      
    })
    .catch(err => {
      console.error(err);
      toast.error(err.message || 'Unable to generate your workout plan.');
      setIsGeneratingPlan(false);
    });
  };

  // Schedule & Lock Helper
  const getDayScheduleInfo = (dayItem) => {
    if (!aiPlan || !dayItem) return { status: 'LOCKED', scheduledDate: new Date(), isToday: false, isTomorrow: false, isPast: false, isFuture: false, isCompleted: false };

    const planStart = new Date(aiPlan.planStartDate || Date.now());
    planStart.setHours(0, 0, 0, 0);

    const scheduledDate = new Date(planStart);
    scheduledDate.setDate(planStart.getDate() + (dayItem.dayNumber - 1));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = scheduledDate.getTime() === today.getTime();
    const isTomorrow = scheduledDate.getTime() === (today.getTime() + 86400000);
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

    return { status, scheduledDate, isToday, isTomorrow, isPast, isFuture, isCompleted };
  };

  const isExerciseCompletedInState = (dayNum, exIndex, exName = null) => {
    if (!aiPlan) return false;
    // If the entire day is completed, all exercises are complete
    if ((workoutProgress.completedDays || []).includes(dayNum)) return true;
    return (workoutProgress.completedExercises || []).some(
      e => (e.planId === aiPlan.planId || !e.planId) && 
           e.dayNumber === dayNum && 
           (
             (exName && e.exerciseName && e.exerciseName.trim().toLowerCase() === exName.trim().toLowerCase()) ||
             e.exerciseIndex === exIndex
           )
    );
  };

  const isExerciseUnlockedInState = (dayNum, exIndex) => {
    if (!selectedCalendarDay) return false;
    const { status } = getDayScheduleInfo(selectedCalendarDay);
    if (status === 'COMPLETED' || status === 'AVAILABLE') return true;
    if (activeWorkoutDay === dayNum) return true;
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

  const completeActiveWorkout = async (forceDayNum = null) => {
    const targetDay = forceDayNum
      ? (aiPlan?.interactive_calendar || []).find(d => d.dayNumber === forceDayNum)
      : (selectedCalendarDay || (aiPlan?.interactive_calendar || [])[0]);

    if (!targetDay) return;

    const dayNum = targetDay.dayNumber;
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const newCompletedDays = Array.from(new Set([...(workoutProgress.completedDays || []), dayNum]));
    const timestamp = new Date().toISOString();

    const daySplit = Array.isArray(targetDay.workoutSplit)
      ? targetDay.workoutSplit
      : (targetDay.exercises || targetDay.mainWorkout || []);

    const newCompletedExercises = daySplit.map((ex, idx) => ({
      planId: aiPlan?.planId,
      dayNumber: dayNum,
      exerciseIndex: idx,
      exerciseName: ex.name || ex.title || `Exercise ${idx + 1}`,
      completedAt: timestamp,
      mode: 'session'
    }));

    const otherCompleted = (workoutProgress.completedExercises || []).filter(
      e => !(e.planId === aiPlan?.planId && e.dayNumber === dayNum)
    );
    const updatedExercises = [...otherCompleted, ...newCompletedExercises];

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
      completedExercises: updatedExercises,
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

        await fetch('/api/activity/log-workout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
          },
          body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            exerciseName: targetDay.phaseName || `Day ${dayNum} Full Workout`,
            sets: daySplit.length || 3,
            reps: 10,
            caloriesBurned: Math.max(120, (daySplit.length || 3) * 35),
            mode: 'manual'
          })
        });
      } catch (err) {
        console.warn('Server workout-progress save error:', err);
      }
    }

    setActiveWorkoutDay(null);
    toast.success(`🎉 Workout Day ${dayNum} Completed! You earned +50 XP & extended your streak!`);
  };

  // 1-Click Manual Day Completion
  const completeDayManually = async (dayNum) => {
    await completeActiveWorkout(dayNum);
  };

  // Undo / Reset Day Completion
  const undoDayCompletion = async (dayNum) => {
    if (!aiPlan) return;
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const newCompletedDays = (workoutProgress.completedDays || []).filter(d => d !== dayNum);
    const updatedExercises = (workoutProgress.completedExercises || []).filter(
      e => !(e.planId === aiPlan.planId && e.dayNumber === dayNum)
    );

    const newProgress = {
      ...workoutProgress,
      completedDays: newCompletedDays,
      completedExercises: updatedExercises
    };

    setWorkoutProgress(newProgress);
    localStorage.setItem(`gymsync_${userKey}_workout_progress`, JSON.stringify(newProgress));

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
            completedDays: newCompletedDays,
            lastWorkoutCompletionTime: newProgress.lastWorkoutCompletionTime,
            streak: parseInt(localStorage.getItem(`gymsync_${userKey}_streak`) || '0'),
            totalPoints: parseInt(localStorage.getItem(`gymsync_${userKey}_points`) || '0')
          })
        });
      } catch (err) {
        console.warn('Server undo workout progress error:', err);
      }
    }

    toast.info(`🔄 Day ${dayNum} progress reset. Ready to train again!`);
  };

  // Toggle Single Exercise Completion (Manual Check/Uncheck or programmatic mark)
  const toggleExerciseCompletion = async (dayNum, exIndex, exName, forceComplete = null) => {
    if (!aiPlan) return;
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    const targetDay = (aiPlan.interactive_calendar || []).find(d => d.dayNumber === dayNum);
    const daySplit = targetDay
      ? (Array.isArray(targetDay.workoutSplit) ? targetDay.workoutSplit : (targetDay.exercises || targetDay.mainWorkout || []))
      : [];
    const warmupList = targetDay?.warmup?.warmupExercises || targetDay?.warmup || [];
    const totalMovementsCount = (Array.isArray(warmupList) ? warmupList.length : 0) + daySplit.length;

    const isCurrentlyDone = isExerciseCompletedInState(dayNum, exIndex, exName);
    const shouldMarkDone = forceComplete !== null ? forceComplete : !isCurrentlyDone;

    if (shouldMarkDone && isCurrentlyDone && forceComplete) {
      return; // Already completed, no need to duplicate
    }

    let updatedCompletedExercises;
    let updatedCompletedDays = [...(workoutProgress.completedDays || [])];

    if (!shouldMarkDone) {
      updatedCompletedExercises = (workoutProgress.completedExercises || []).filter(
        e => !(e.planId === aiPlan.planId && e.dayNumber === dayNum && ((exName && e.exerciseName && e.exerciseName.trim().toLowerCase() === exName.trim().toLowerCase()) || e.exerciseIndex === exIndex))
      );
      updatedCompletedDays = updatedCompletedDays.filter(d => d !== dayNum);
      toast.info(`🔄 ${exName || 'Movement'} marked incomplete.`);
    } else {
      const newRecord = {
        planId: aiPlan.planId,
        dayNumber: dayNum,
        exerciseIndex: exIndex,
        exerciseName: exName || `Exercise ${exIndex + 1}`,
        completedAt: new Date().toISOString(),
        mode: 'manual'
      };
      updatedCompletedExercises = [
        ...(workoutProgress.completedExercises || []).filter(
          e => !(e.planId === aiPlan.planId && e.dayNumber === dayNum && ((exName && e.exerciseName && e.exerciseName.trim().toLowerCase() === exName.trim().toLowerCase()) || e.exerciseIndex === exIndex))
        ),
        newRecord
      ];

      const doneForThisDay = updatedCompletedExercises.filter(
        e => e.planId === aiPlan.planId && e.dayNumber === dayNum
      );
      const targetCount = totalMovementsCount > 0 ? totalMovementsCount : (daySplit.length || 1);
      if (doneForThisDay.length >= targetCount) {
        if (!updatedCompletedDays.includes(dayNum)) {
          updatedCompletedDays.push(dayNum);
          toast.success(`🎉 All movements complete! Day ${dayNum} marked as completed! (+50 XP)`);
        }
      } else {
        toast.success(`✓ ${exName || 'Movement'} completed!`);
      }
    }

    const newProgress = {
      ...workoutProgress,
      completedDays: updatedCompletedDays,
      completedExercises: updatedCompletedExercises
    };

    setWorkoutProgress(newProgress);
    localStorage.setItem(`gymsync_${userKey}_workout_progress`, JSON.stringify(newProgress));

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
            completedDays: updatedCompletedDays,
            lastWorkoutCompletionTime: newProgress.lastWorkoutCompletionTime,
            streak: parseInt(localStorage.getItem(`gymsync_${userKey}_streak`) || '0'),
            totalPoints: parseInt(localStorage.getItem(`gymsync_${userKey}_points`) || '0')
          })
        });
      } catch (err) {
        console.warn('Server toggle exercise error:', err);
      }
    }
  };

  const currentModeObj = MOBILE_OPTIONS.find(m => m.key === activeMode) || MOBILE_OPTIONS[0];

  return (
    <div className="ai-trainer-page">
      <div className="container">
        <div className="trainer-header glass-panel">
          <h1><Dumbbell size={36} color="var(--primary-accent)"/> Workout Hub</h1>
        </div>

        {miniCoachSteps && (
          <MiniCoachModal
            steps={miniCoachSteps}
            onClose={() => setMiniCoachSteps(null)}
            onSubmitAll={(answers) => { setMiniCoachSteps(null); fetchPlanWithBenchmarks(answers); }}
          />
        )}

        {/* ── MOBILE WORKOUT MODE CUSTOM DROPDOWN (OPENS DIRECTLY UNDERNEATH) ── */}
        <div className="trainer-select-container" ref={modeDropdownRef}>
          <button
            type="button"
            className="trainer-select-trigger"
            onClick={() => setShowModeDropdown(prev => !prev)}
            aria-expanded={showModeDropdown}
          >
            <span className="trainer-select-current">
              <span className="trainer-select-emoji">{currentModeObj.emoji}</span>
              <span className="trainer-select-text">{currentModeObj.label}</span>
            </span>
            <ChevronDown size={18} className={`trainer-select-arrow ${showModeDropdown ? 'open' : ''}`} />
          </button>

          {showModeDropdown && (
            <div className="trainer-select-dropdown-menu">
              {MOBILE_OPTIONS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`trainer-select-option ${activeMode === item.key ? 'selected' : ''}`}
                  onClick={() => {
                    setActiveMode(item.key);
                    setCurrentExercise(null);
                    if (item.key === 'ai') setSelectedPlanForView(null);
                    setShowModeDropdown(false);
                  }}
                >
                  <span className="trainer-select-emoji">{item.emoji}</span>
                  <span className="trainer-select-label">{item.label}</span>
                  {activeMode === item.key && <span className="trainer-select-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── DESKTOP MAIN TAB BAR (My Plan | Library | Fit logs) ─────────── */}
        <div className="trainer-tabs">
          <button
            className={`tab-btn ${mainTab === 'my_plan' ? 'active' : ''}`}
            onClick={() => {
              if (mainTab !== 'my_plan') {
                setActiveMode('ai');
                setSelectedPlanForView(null);
                setCurrentExercise(null);
              }
            }}
          >
            <Sparkles size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> My Plan
          </button>
          <button
            className={`tab-btn ${mainTab === 'library' ? 'active' : ''}`}
            onClick={() => {
              if (mainTab !== 'library') {
                setActiveMode('food_library');
                setCurrentExercise(null);
              }
            }}
          >
            <BookOpen size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Library
          </button>
          <button
            className={`tab-btn ${mainTab === 'fit_logs' ? 'active' : ''}`}
            onClick={() => {
              if (mainTab !== 'fit_logs') {
                setActiveMode('programs');
                setCurrentExercise(null);
              }
            }}
          >
            <Dumbbell size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Fit logs
          </button>
        </div>

        {/* ── SUB-TABS (2 Links for Each Main Tab) ────────────────────── */}
        <div
          className="trainer-sub-tabs"
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}
        >
          {SUB_TABS[mainTab]?.map(sub => {
            const SubIcon = sub.icon;
            const isSubActive = activeMode === sub.key;
            return (
              <button
                key={sub.key}
                type="button"
                className="trainer-sub-tab-btn"
                onClick={() => {
                  setActiveMode(sub.key);
                  if (sub.key === 'ai') setSelectedPlanForView(null);
                  setCurrentExercise(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 22px',
                  borderRadius: '30px',
                  fontSize: '0.92rem',
                  fontWeight: isSubActive ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isSubActive
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.3))'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isSubActive
                    ? '1.5px solid #3b82f6'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isSubActive ? '#60a5fa' : 'var(--text-secondary)',
                  boxShadow: isSubActive ? '0 2px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
                onMouseEnter={e => {
                  if (!isSubActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSubActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <SubIcon size={16} color={isSubActive ? '#60a5fa' : 'currentColor'} />
                <span>{sub.label}</span>
              </button>
            );
          })}
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

        {/* ── FOOD LIBRARY MODE (Library -> Food Library) ────────────────── */}
        {activeMode === 'food_library' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading food library...</div>}>
            <FoodLibraryView />
          </Suspense>
        )}

        {/* ── LIBRARY MODE (Library -> Exercise Library) ─────────────────── */}
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

        {/* ── PROGRAMS MODE (Part 17 — Browse Instructor Programs) ──────── */}
        {activeMode === 'programs' && !currentExercise && (
          <BrowseProgramsTab
            activeUserProgram={activeUserProgram}
            onProgramApplied={() => {
              fetchActiveProgram();
              setActiveMode('ai');
            }}
          />
        )}

        {/* ── DIETS MODE (MY AI DIET HUB) ─────────────────────────── */}
        {activeMode === 'diets' && !currentExercise && (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading nutrition protocols...</div>}>
            <MyAIDietHub 
              aiPlan={aiPlan} 
              activeProgram={activeUserProgram || selectedPlanForView} 
            />
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
            setActiveUserProgram={setActiveUserProgram}
            allUserPrograms={allUserPrograms}
            triggerReviewProgram={triggerReviewProgram}
            setTriggerReviewProgram={setTriggerReviewProgram}
            onRefreshPrograms={fetchActiveProgram}
            isRecalculating={isRecalculating}
            getDayScheduleInfo={getDayScheduleInfo}
            isExerciseCompletedInState={isExerciseCompletedInState}
            isExerciseUnlockedInState={isExerciseUnlockedInState}
            startExercise={startExercise}
            completeActiveWorkout={completeActiveWorkout}
            completeDayManually={completeDayManually}
            undoDayCompletion={undoDayCompletion}
            toggleExerciseCompletion={toggleExerciseCompletion}
            handleCoachAction={handleCoachAction}
            handleSaveCurrentPlan={handleSaveCurrentPlan}
            loadSavedPlans={loadSavedPlans}
            handleActivateSavedPlan={handleActivateSavedPlan}
            handleDeleteSavedPlan={handleDeleteSavedPlan}
            handleDeleteUserProgram={handleDeleteUserProgram}
            handleCreateNewPlan={handleCreateNewPlan}
            handleCreateStarterPlan={handleCreateStarterPlan}
            handleLogProgramSession={handleLogProgramSession}
            selectedPlanForView={selectedPlanForView}
            setSelectedPlanForView={setSelectedPlanForView}
            onBuildAIPlan={() => fetchPlanWithBenchmarks()}
            onBrowsePrograms={() => setActiveMode('programs')}
          />
        )}
      </div>
    </div>
  );
};

export default AITrainer;
