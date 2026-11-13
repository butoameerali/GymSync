import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Target, Zap, Activity, CheckCircle, CameraOff, Play, 
  RotateCcw, Plus, SkipForward, ArrowRight, Video, Sparkles, 
  ChevronRight, Dumbbell, Clock, ThumbsUp, Flame, Award, X, RefreshCw
} from 'lucide-react';
import './MissionRunner.css';
import AIDetectorContainer from '../../ai-detectors/AIDetectorContainer';

const exerciseMediaCache = new Map();

const parseSafeReps = (val, fallback = 10) => {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return Math.round(val);
  if (typeof val === 'string') {
    const match = val.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return fallback;
};

const parseSafeSets = (val, fallback = 3) => {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return Math.round(val);
  if (typeof val === 'string') {
    const match = val.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return fallback;
};

const COMMON_ALTERNATIVES = {
  calves: [
    { name: 'Standing Bodyweight Calf Raise', equipmentRequired: 'Bodyweight', targetMuscle: 'Calves', instructions: 'Rise onto the balls of both feet, hold for 1s, and lower slowly.' },
    { name: 'One Leg Floor Calf Raise', equipmentRequired: 'Bodyweight', targetMuscle: 'Calves', instructions: 'Balance on one leg and lift onto your toes to target the calf.' },
    { name: 'Standing Calves Calf Stretch', equipmentRequired: 'Bodyweight', targetMuscle: 'Calves', instructions: 'Extend one leg back with heel down to stretch and mobilize calves.' }
  ],
  chest: [
    { name: 'Push-ups', equipmentRequired: 'Bodyweight', targetMuscle: 'Chest', instructions: 'Keep body in straight plank, lower chest to floor, and press up.' },
    { name: 'Incline Push-ups (Hands Elevated)', equipmentRequired: 'Bodyweight', targetMuscle: 'Chest', instructions: 'Place hands on bench or sturdy table to adjust chest resistance.' },
    { name: 'Dumbbell Floor Press', equipmentRequired: 'Dumbbells', targetMuscle: 'Chest', instructions: 'Lie flat on floor and press dumbbells upward with elbows controlled.' }
  ],
  quads: [
    { name: 'Bodyweight Squats', equipmentRequired: 'Bodyweight', targetMuscle: 'Quads', instructions: 'Feet shoulder-width apart, sit hips down and back to 90 degrees.' },
    { name: 'Walking Lunges', equipmentRequired: 'Bodyweight', targetMuscle: 'Quads', instructions: 'Step forward and bend knees to 90 degrees, alternating legs.' },
    { name: 'Wall Sit Hold', equipmentRequired: 'Bodyweight', targetMuscle: 'Quads', instructions: 'Back flat against wall with knees at 90 degrees, holding position.' }
  ],
  back: [
    { name: 'Doorframe Bodyweight Row', equipmentRequired: 'Bodyweight', targetMuscle: 'Back', instructions: 'Hold sturdy doorframe, lean back, and pull chest toward the frame.' },
    { name: 'Superman Hold', equipmentRequired: 'Bodyweight', targetMuscle: 'Back', instructions: 'Lie prone and lift arms and legs simultaneously to engage posterior chain.' },
    { name: 'Dumbbell Bent Over Row', equipmentRequired: 'Dumbbells', targetMuscle: 'Back', instructions: 'Hinge at hips with flat back, pull dumbbells toward hip crease.' }
  ],
  shoulders: [
    { name: 'Pike Push-ups', equipmentRequired: 'Bodyweight', targetMuscle: 'Shoulders', instructions: 'Hips high in pike position, lower head toward hands to press.' },
    { name: 'Lateral Arm Raises (Water Bottles / DBs)', equipmentRequired: 'Dumbbells', targetMuscle: 'Shoulders', instructions: 'Raise arms out to sides until parallel with floor.' },
    { name: 'Arm Circles & Overhead Reach', equipmentRequired: 'Bodyweight', targetMuscle: 'Shoulders', instructions: 'Controlled rotations to mobilize rotator cuffs and deltoids.' }
  ],
  core: [
    { name: 'Plank Hold', equipmentRequired: 'Bodyweight', targetMuscle: 'Core', instructions: 'Forearms and toes on ground, glutes squeezed and spine neutral.' },
    { name: 'Bicycle Crunches', equipmentRequired: 'Bodyweight', targetMuscle: 'Core', instructions: 'Alternate bringing opposite elbow to knee with shoulder blades off floor.' },
    { name: 'Mountain Climbers', equipmentRequired: 'Bodyweight', targetMuscle: 'Core', instructions: 'In push-up plank position, drive knees rhythmically toward chest.' }
  ],
  arms: [
    { name: 'Chair / Bench Tricep Dips', equipmentRequired: 'Bodyweight', targetMuscle: 'Triceps', instructions: 'Hands on sturdy chair edge, lower hips down and press through palms.' },
    { name: 'Diamond Push-ups', equipmentRequired: 'Bodyweight', targetMuscle: 'Triceps', instructions: 'Hands together in diamond shape under chest, press up.' },
    { name: 'Towel / Resistance Bicep Curls', equipmentRequired: 'Bodyweight', targetMuscle: 'Biceps', instructions: 'Use towel loop under foot for isometric tension curl.' }
  ]
};

export const GUARANTEED_MUSCLE_MEDIA = {
  walk: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif',
  cardio: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif',
  run: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0685-oLrKqDH.gif',
  calf: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1398-qOKcgVP.gif',
  calves: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1398-qOKcgVP.gif',
  chest: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0975-ufaxB52.gif',
  push: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0975-ufaxB52.gif',
  quad: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
  leg: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
  squat: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
  glute: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3561-GibBPPg.gif',
  back: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0200-dU605di.gif',
  pull: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0200-dU605di.gif',
  lat: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2330-LEprlgG.gif',
  shoulder: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0405-z3qT6n6.gif',
  arm: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0285-L39XkXv.gif',
  bicep: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0285-L39XkXv.gif',
  tricep: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0129-RrLske5.gif',
  core: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0464-CosupLu.gif',
  ab: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0276-iny3m5y.gif',
  default: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif'
};

export const DEFAULT_FALLBACK_EXERCISES = [
  {
    name: 'Brisk Walking',
    sets: 1,
    reps: '20 mins',
    targetMuscle: 'Cardiovascular System',
    instructions: 'Walk with an upright, purposeful posture, swinging arms gently at a steady brisk pace.',
    gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif',
    mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3666-rjiM4L3.gif'
  },
  {
    name: 'Bodyweight Squats',
    sets: 3,
    reps: 12,
    targetMuscle: 'Quads & Glutes',
    instructions: 'Hinge hips back and bend knees down to parallel, keeping chest upright.',
    gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif',
    mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3119-75Bgtjy.gif'
  },
  {
    name: 'Push-ups',
    sets: 3,
    reps: 10,
    targetMuscle: 'Chest & Arms',
    instructions: 'Lower chest towards floor keeping elbows at 45 degrees, press firmly back up.',
    gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0975-ufaxB52.gif',
    mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0975-ufaxB52.gif'
  }
];

export const getGuaranteedMedia = (ex) => {
  if (!ex) return GUARANTEED_MUSCLE_MEDIA.default;
  const direct = ex.gifUrl || ex.mediaUrl || ex.videoUrl;
  if (direct && typeof direct === 'string' && direct.trim() !== '') {
    return direct.includes('0043-s6bYM8w') ? direct.replace('0043-s6bYM8w', '0043-qXTaZnJ') : direct;
  }
  const text = `${ex.name || ''} ${ex.exerciseName || ''} ${ex.title || ''} ${ex.targetMuscle || ''} ${ex.category || ''} ${ex.instructions || ''}`.toLowerCase();
  
  // High-precision movement matches
  if (text.includes('walk') || text.includes('stroll') || text.includes('treadmill')) {
    return GUARANTEED_MUSCLE_MEDIA.walk;
  }
  if (text.includes('run') || text.includes('jog')) {
    return GUARANTEED_MUSCLE_MEDIA.run;
  }
  if (text.includes('calf') || text.includes('calves')) {
    return GUARANTEED_MUSCLE_MEDIA.calf;
  }
  if (text.includes('knee hug') || text.includes('hug keen') || text.includes('knee to chest')) {
    return 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1418-znP9SIh.gif';
  }
  if (text.includes('step-up') || text.includes('step up')) {
    return 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0431-aXtJhlg.gif';
  }
  if (text.includes('squat')) {
    return GUARANTEED_MUSCLE_MEDIA.squat;
  }
  if (text.includes('push-up') || text.includes('pushup') || text.includes('chest') || text.includes('press')) {
    return GUARANTEED_MUSCLE_MEDIA.chest;
  }
  if (text.includes('deadlift') || text.includes('hamstring')) {
    return 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1459-rR0LJzx.gif';
  }
  if (text.includes('bridge') || text.includes('glute')) {
    return GUARANTEED_MUSCLE_MEDIA.glute;
  }
  if (text.includes('row') || text.includes('back') || text.includes('pull') || text.includes('lat')) {
    return GUARANTEED_MUSCLE_MEDIA.back;
  }
  if (text.includes('shoulder') || text.includes('overhead') || text.includes('delt')) {
    return GUARANTEED_MUSCLE_MEDIA.shoulder;
  }
  if (text.includes('arm') || text.includes('bicep') || text.includes('tricep') || text.includes('curl')) {
    return GUARANTEED_MUSCLE_MEDIA.arm;
  }
  if (text.includes('plank') || text.includes('core') || text.includes('ab') || text.includes('crunch')) {
    return GUARANTEED_MUSCLE_MEDIA.core;
  }

  for (const [key, url] of Object.entries(GUARANTEED_MUSCLE_MEDIA)) {
    if (key !== 'default' && text.includes(key)) {
      return url;
    }
  }
  return GUARANTEED_MUSCLE_MEDIA.default;
};

export const MissionRunner = ({ 
  dayTitle, 
  exercises = [], 
  initialExerciseIndex = 0,
  completedExerciseIndices = [],
  onExerciseComplete,
  onComplete, 
  onCancel 
}) => {
  // Overall Workout Phases:
  // 'brief' -> 'active' -> 'rest' -> 'celebration'
  const [phase, setPhase] = useState('brief');

  // Prevent background scrolling while MissionRunner overlay is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const renderOverlay = (node) => {
    if (typeof document !== 'undefined') {
      return createPortal(node, document.body);
    }
    return node;
  };
  
  // Exercise & Set Tracking State
  const [currentExIndex, setCurrentExIndex] = useState(initialExerciseIndex || 0);
  const [currentSet, setCurrentSet] = useState(1);
  const [repsDone, setRepsDone] = useState(10);
  const [aiModeChoice, setAiModeChoice] = useState(null); // null | 'with_ai' | 'without_ai'
  const [mediaLoadError, setMediaLoadError] = useState(false);

  useEffect(() => {
    if (typeof initialExerciseIndex === 'number' && initialExerciseIndex >= 0) {
      setCurrentExIndex(initialExerciseIndex);
    }
  }, [initialExerciseIndex]);

  useEffect(() => {
    setMediaLoadError(false);
  }, [currentExIndex]);
  
  // Rest Timer State
  const [restCountdown, setRestCountdown] = useState(45);
  const restTimerRef = useRef(null);

  // Time & Gamification State
  const [startTime, setStartTime] = useState(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [burnedKcal, setBurnedKcal] = useState(0);
  const [completedSetsCount, setCompletedSetsCount] = useState(0);

  // Feedback State
  const [workoutFeeling, setWorkoutFeeling] = useState('good'); // 'easy' | 'good' | 'hard'
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Issue report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportMsg, setReportMsg] = useState('');

  // Mutable workout exercises state (supports real-time equipment swap)
  const [workoutExercises, setWorkoutExercises] = useState(() => (
    Array.isArray(exercises) && exercises.length > 0 
      ? exercises 
      : DEFAULT_FALLBACK_EXERCISES
  ));

  useEffect(() => {
    if (Array.isArray(exercises) && exercises.length > 0) {
      setWorkoutExercises(exercises);
    }
  }, [exercises]);

  const currentEx = workoutExercises[currentExIndex] || workoutExercises[0];
  const totalExercises = workoutExercises.length;
  const totalSetsForCurrent = parseSafeSets(currentEx.sets || currentEx.defaultSets, 3);
  const targetRepsForCurrent = parseSafeReps(currentEx.reps || currentEx.defaultReps, 10);

  // Alternative equipment swap state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [availableAlternatives, setAvailableAlternatives] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  const handleOpenSwapModal = async () => {
    setShowSwapModal(true);
    setLoadingAlternatives(true);

    const targetMuscle = String(currentEx.targetMuscle || currentEx.category || currentEx.name || 'Full Body').toLowerCase();
    
    // 1. Pick instant high-quality fallback alternatives
    let defaultList = COMMON_ALTERNATIVES.calves;
    if (targetMuscle.includes('chest') || targetMuscle.includes('push')) defaultList = COMMON_ALTERNATIVES.chest;
    else if (targetMuscle.includes('quad') || targetMuscle.includes('leg') || targetMuscle.includes('squat')) defaultList = COMMON_ALTERNATIVES.quads;
    else if (targetMuscle.includes('back') || targetMuscle.includes('pull') || targetMuscle.includes('lat')) defaultList = COMMON_ALTERNATIVES.back;
    else if (targetMuscle.includes('shoulder') || targetMuscle.includes('delt')) defaultList = COMMON_ALTERNATIVES.shoulders;
    else if (targetMuscle.includes('core') || targetMuscle.includes('ab')) defaultList = COMMON_ALTERNATIVES.core;
    else if (targetMuscle.includes('arm') || targetMuscle.includes('bicep') || targetMuscle.includes('tricep')) defaultList = COMMON_ALTERNATIVES.arms;

    setAvailableAlternatives(defaultList);

    // 2. Query exercise database for additional equipment-free options
    try {
      const searchKey = targetMuscle.replace(/[^a-z]/g, ' ').trim().split(/\s+/)[0] || '';
      const res = await fetch(`/api/exercises?search=${encodeURIComponent(searchKey)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.items || []);
        if (list.length > 0) {
          const apiFiltered = list
            .filter(e => e.name.toLowerCase() !== (currentEx.name || '').toLowerCase())
            .map(e => ({
              name: e.name,
              equipmentRequired: e.equipmentRequired || 'Bodyweight / Free',
              targetMuscle: e.targetMuscles?.[0] || e.category || 'Target Muscle',
              instructions: e.instructions || 'Perform with controlled form and full range of motion.',
              gifUrl: e.gifUrl || e.mediaUrl || '',
              mediaUrl: e.mediaUrl || e.gifUrl || ''
            }));
          if (apiFiltered.length > 0) {
            setAvailableAlternatives([...defaultList.slice(0, 2), ...apiFiltered.slice(0, 4)]);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to query dynamic alternatives:', e);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleSelectSwap = (alt) => {
    const updated = [...workoutExercises];
    updated[currentExIndex] = {
      ...currentEx,
      name: alt.name,
      equipmentRequired: alt.equipmentRequired,
      targetMuscle: alt.targetMuscle || currentEx.targetMuscle,
      instructions: alt.instructions || currentEx.instructions,
      gifUrl: alt.gifUrl || '',
      mediaUrl: alt.mediaUrl || '',
      isSwapped: true
    };
    setWorkoutExercises(updated);
    setCurrentSet(1);
    setResolvedMedia(alt.gifUrl || alt.mediaUrl || '');
    setShowSwapModal(false);
  };

  // Helper: check if the current exercise has AI computer vision support
  const checkExerciseSupportsAI = (ex) => {
    if (!ex) return false;
    const id = String(ex.exerciseId || ex.id || '').toLowerCase();
    const name = String(ex.name || ex.exerciseName || ex.title || '').toLowerCase();
    return Boolean(
      ex.aiDetection?.enabled ||
      ex.isAiTrackable ||
      id.includes('pushup') ||
      name.includes('pushup') ||
      name.includes('push-up') ||
      id.includes('push_up') ||
      id.includes('running') ||
      name.includes('run')
    );
  };

  const isCurrentExAiSupported = checkExerciseSupportsAI(currentEx);

  // Calculate Initial Estimates
  useEffect(() => {
    const totalSetsAll = workoutExercises.reduce((acc, ex) => acc + parseSafeSets(ex.sets || ex.defaultSets, 3), 0);
    setEarnedXP(totalSetsAll * 25 + 50); // Base 50 XP + 25 per set
    setBurnedKcal(Math.round(totalSetsAll * 12.5)); // ~12.5 kcal per completed set
  }, [workoutExercises]);

  // Sync target reps when exercise changes
  useEffect(() => {
    setRepsDone(parseSafeReps(targetRepsForCurrent, 10));
    // If exercise doesn't have AI support, default directly to manual game mode
    if (!isCurrentExAiSupported) {
      setAiModeChoice('without_ai');
    } else {
      setAiModeChoice(null); // Prompt choice for AI-enabled exercise
    }
  }, [currentExIndex, targetRepsForCurrent, isCurrentExAiSupported]);

  // Dynamic media resolution for exercises where gifUrl/mediaUrl is not embedded directly in the routine
  const [resolvedMedia, setResolvedMedia] = useState(
    () => currentEx.gifUrl || currentEx.mediaUrl || currentEx.videoUrl || getGuaranteedMedia(currentEx)
  );

  useEffect(() => {
    const directMedia = currentEx.gifUrl || currentEx.mediaUrl || currentEx.videoUrl;
    if (directMedia) {
      setResolvedMedia(directMedia);
      return;
    }

    const exName = (currentEx.name || currentEx.exerciseName || currentEx.title || '').trim();
    if (!exName) {
      setResolvedMedia(getGuaranteedMedia(currentEx));
      return;
    }

    const cacheKey = exName.toLowerCase();
    if (exerciseMediaCache.has(cacheKey)) {
      setResolvedMedia(exerciseMediaCache.get(cacheKey));
      return;
    }

    let isMounted = true;
    fetch(`/api/exercises?search=${encodeURIComponent(exName)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data.items || []);
        const target = exName.trim().toLowerCase();

        // Smart ranking: prioritize direct barbell/dumbbell and non-band variants
        const withMedia = list.filter(e => Boolean(e.mediaUrl || e.gifUrl));
        let matched = null;

        if (withMedia.length > 0) {
          // 1. Exact name match
          matched = withMedia.find(e => e.name.trim().toLowerCase() === target);

          // 2. Exact match with barbell prefix (e.g. "bench press" -> "barbell bench press")
          if (!matched) {
            matched = withMedia.find(e => e.name.toLowerCase() === `barbell ${target}`);
          }

          // 3. Exact match with dumbbell prefix
          if (!matched) {
            matched = withMedia.find(e => e.name.toLowerCase() === `dumbbell ${target}`);
          }

          // 4. Non-band, non-smith match that contains target word
          if (!matched) {
            matched = withMedia.find(e => {
              const n = e.name.toLowerCase();
              if (!target.includes('band') && (n.includes('band') || n.includes('resistance'))) return false;
              if (!target.includes('smith') && n.includes('smith')) return false;
              return n.includes(target);
            });
          }

          // 5. Any non-band match
          if (!matched) {
            matched = withMedia.find(e => !e.name.toLowerCase().includes('band'));
          }

          // 6. Fallback
          if (!matched) {
            matched = withMedia[0];
          }
        }

        if (matched) {
          const media = matched.mediaUrl || matched.gifUrl;
          exerciseMediaCache.set(cacheKey, media);
          setResolvedMedia(media);
        } else {
          setResolvedMedia(getGuaranteedMedia(currentEx));
        }
      })
      .catch(() => {
        if (isMounted) setResolvedMedia(getGuaranteedMedia(currentEx));
      });

    return () => { isMounted = false; };
  }, [currentEx.name, currentEx.exerciseName, currentEx.title, currentEx.gifUrl, currentEx.mediaUrl, currentEx.videoUrl]);

  // Workout Duration Timer
  useEffect(() => {
    let interval = null;
    if (phase === 'active' || phase === 'rest') {
      interval = setInterval(() => {
        setElapsedSecs(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Rest Countdown Interval
  useEffect(() => {
    if (phase === 'rest') {
      restTimerRef.current = setInterval(() => {
        setRestCountdown(prev => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current);
            advanceToNextSetOrExercise();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(restTimerRef.current);
  }, [phase, currentSet, currentExIndex]);

  // Start the Workout Session
  const handleStartWorkout = () => {
    setStartTime(Date.now());
    setPhase('active');
  };

  // Complete a Set (Manual or AI)
  const handleCompleteSet = (mode = 'manual', detectedReps = null) => {
    const loggedReps = typeof detectedReps === 'number' ? detectedReps : repsDone;
    setCompletedSetsCount(prev => prev + 1);

    const hasMoreSets = currentSet < totalSetsForCurrent;
    const hasMoreExercises = currentExIndex < totalExercises - 1;

    if (hasMoreSets) {
      // Trigger Game-Style Rest Countdown for next set of current movement
      const restDuration = Number(currentEx.restTime) || (currentEx.isWarmup ? 15 : 45);
      setRestCountdown(restDuration);
      setPhase('rest');
    } else {
      // All sets of THIS exercise are finished! Save progress immediately!
      if (onExerciseComplete) {
        onExerciseComplete(currentExIndex, currentEx.name);
      }

      if (hasMoreExercises) {
        const restDuration = Number(currentEx.restTime) || (currentEx.isWarmup ? 15 : 60);
        setRestCountdown(restDuration);
        setPhase('rest');
      } else {
        // All sets of all exercises completed!
        setPhase('celebration');
      }
    }
  };

  // Advance logic after Rest finishes or is skipped
  const advanceToNextSetOrExercise = () => {
    if (currentSet < totalSetsForCurrent) {
      // Next set of same exercise
      setCurrentSet(prev => prev + 1);
      if (isCurrentExAiSupported) {
        setAiModeChoice(null); // Re-prompt or keep choice
      } else {
        setAiModeChoice('without_ai');
      }
      setPhase('active');
    } else if (currentExIndex < totalExercises - 1) {
      // Next exercise in mission
      setCurrentExIndex(prev => prev + 1);
      setCurrentSet(1);
      setPhase('active');
    } else {
      // Finished
      setPhase('celebration');
    }
  };

  // Rest controls
  const handleAddRestTime = (seconds = 15) => {
    setRestCountdown(prev => prev + seconds);
  };

  const handleSkipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    advanceToNextSetOrExercise();
  };

  // Skip current exercise entirely
  const handleSkipCurrentExercise = () => {
    if (currentExIndex < totalExercises - 1) {
      setCurrentExIndex(prev => prev + 1);
      setCurrentSet(1);
      setPhase('active');
    } else {
      setPhase('celebration');
    }
  };

  // Format MM:SS helper
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Final completion handler
  const handleFinishMission = () => {
    if (onComplete) {
      onComplete({
        xp: earnedXP,
        calories: burnedKcal,
        durationMinutes: Math.max(1, Math.round(elapsedSecs / 60)),
        feeling: workoutFeeling,
        completedExercisesCount: totalExercises
      });
    }
  };

  // ── 1. BRIEF PHASE (Mission Overview) ──────────────────────────────────
  if (phase === 'brief') {
    return renderOverlay(
      <div className="mission-runner-overlay">
        <div className="mission-runner-content">
          <button 
            className="mission-close-btn"
            onClick={onCancel}
            title="Exit Workout"
          >
            <X size={20} />
          </button>
          
          <div className="mission-badge">
            <Target size={16} /> READY TO TRAIN
          </div>
          
          <h2 className="mission-title">{dayTitle || "Today's Active Mission"}</h2>
          
          <div className="mission-details">
            <div className="mission-detail-item">
              <span className="mission-detail-label">Exercises to Complete</span>
              <span className="mission-detail-value">{totalExercises} Movements</span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">Target Volume</span>
              <span className="mission-detail-value">
                {workoutExercises.reduce((acc, ex) => acc + parseSafeSets(ex.sets || ex.defaultSets, 3), 0)} Total Sets
              </span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">Estimated Energy Burn</span>
              <span className="mission-detail-value mission-burn-val">
                <Flame size={16} /> ~{burnedKcal} kcal
              </span>
            </div>
            <div className="mission-detail-item">
              <span className="mission-detail-label">Reward Points</span>
              <span className="mission-detail-value mission-reward-val">
                <Award size={16} /> +{earnedXP} XP
              </span>
            </div>
          </div>

          {/* Exercise Preview List */}
          <div className="mission-exercise-preview-list">
            <p className="mission-preview-heading">SESSION MOVEMENTS ({totalExercises})</p>
            {workoutExercises.map((ex, idx) => {
              const hasAi = checkExerciseSupportsAI(ex);
              const isAlreadyDone = completedExerciseIndices.includes(idx);
              const isCurrent = idx === currentExIndex;
              return (
                <div 
                  key={idx} 
                  className={`mission-preview-card ${isCurrent && !isAlreadyDone ? 'is-current' : ''} ${isAlreadyDone ? 'is-done' : ''}`}
                >
                  <div 
                    className={`mission-preview-number ${isAlreadyDone ? 'is-done' : ''} ${ex.isWarmup && !isAlreadyDone ? 'is-warmup' : ''}`}
                  >
                    {isAlreadyDone ? '✓' : idx + 1}
                  </div>
                  <div className="mission-preview-info">
                    <span 
                      className="mission-preview-name"
                      style={{ textDecoration: isAlreadyDone ? 'line-through' : 'none' }}
                    >
                      {ex.name || ex.exerciseName || ex.title || 'Exercise'}
                    </span>
                    <span className="mission-preview-sub">
                      {ex.isWarmup ? '🔥 Warm-Up • ' : ''}
                      {ex.sets || ex.defaultSets || 1} set{Number(ex.sets || 1) > 1 ? 's' : ''} × {ex.reps || ex.defaultReps || '60s'} • {ex.targetMuscle || ex.target || ex.muscle || 'Full Body'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isAlreadyDone && (
                      <span className="mission-status-pill done">
                        ✓ Done
                      </span>
                    )}
                    {isCurrent && !isAlreadyDone && (
                      <span className="mission-status-pill start-here">
                        👉 Start Here
                      </span>
                    )}
                    {ex.isWarmup && (
                      <span className="mission-status-pill warmup">
                        Warm-Up
                      </span>
                    )}
                    {hasAi && (
                      <span className="mission-ai-tag">
                        <Sparkles size={12} /> AI Available
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="mission-btn mission-btn-start" onClick={handleStartWorkout}>
            <Play size={20} /> {completedExerciseIndices.length > 0 ? `RESUME WORKOUT (Movement ${currentExIndex + 1})` : 'START WORKOUT NOW'}
          </button>
        </div>
      </div>
    );
  }

  // ── 2. ACTIVE EXERCISE PHASE ──────────────────────────────────────────
  if (phase === 'active') {
    const progressPercent = Math.round(((currentExIndex) / totalExercises) * 100);

    return renderOverlay(
      <div className="mission-runner-overlay">
        <div className="mission-runner-content active-exercise-card">
          
          {/* Top Header Bar */}
          <div className="mission-active-header">
            <div className="mission-header-info">
              <span className="mission-step-counter" style={{ color: currentEx.isWarmup ? '#f59e0b' : '#3b82f6' }}>
                {currentEx.isWarmup ? '🔥 WARM-UP' : 'MOVEMENT'} {currentExIndex + 1} OF {totalExercises}
              </span>
              <div className="mission-time-badge">
                <Clock size={14} /> {formatTime(elapsedSecs)}
              </div>
            </div>
            
            <button 
              className="mission-exit-btn"
              onClick={() => setShowExitConfirm(true)}
              title="Exit Workout"
              aria-label="Exit Workout"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mission-progress-bar-bg">
            <div 
              className="mission-progress-bar-fill" 
              style={{ width: `${Math.max(5, progressPercent)}%` }} 
            />
          </div>

          {/* Exit Confirmation Modal */}
          {showExitConfirm && (
            <div className="mission-exit-confirm-overlay">
              <div className="mission-exit-confirm-card">
                <h3>Leave Workout?</h3>
                <p>Your session is in progress. Are you sure you want to stop now?</p>
                <div className="mission-confirm-actions">
                  <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>
                    Keep Training
                  </button>
                  <button className="btn btn-danger" onClick={onCancel}>
                    Exit Workout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Exercise Heading */}
          <div className="mission-active-title-block">
            <h2 className="mission-exercise-name">
              {currentEx.name || currentEx.exerciseName || currentEx.title || 'Exercise'}
            </h2>
            <div className="mission-active-tags">
              {currentEx.isWarmup ? (
                <span className="mission-tag-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                  <Flame size={14} /> Dynamic Warm-Up (#1)
                </span>
              ) : currentEx.isCardio ? (
                <span className="mission-tag-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                  <Activity size={14} /> Cardio & Endurance
                </span>
              ) : currentEx.isCooldown ? (
                <span className="mission-tag-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                  <Award size={14} /> Cool-Down & Stretch
                </span>
              ) : (
                <span className="mission-tag-badge">
                  <Dumbbell size={14} /> {currentEx.targetMuscle || currentEx.target || currentEx.muscle || 'Target Muscle'}
                </span>
              )}
              <span className="mission-tag-badge highlight">
                Set {currentSet} of {totalSetsForCurrent}
              </span>
              {isCurrentExAiSupported && (
                <span className="mission-tag-badge ai-badge">
                  <Sparkles size={14} /> AI Trackable
                </span>
              )}
            </div>

            {/* Form Cue & Movement Alternatives from Section 6 & 8 */}
            {(currentEx.keyCue || currentEx.easierOption || currentEx.harderOption) && (
              <div style={{
                marginTop: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.82rem'
              }}>
                {currentEx.keyCue && (
                  <div style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong>💡 Form Cue:</strong> {currentEx.keyCue}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
                  {currentEx.easierOption && (
                    <div>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Easier:</span> {currentEx.easierOption}
                    </div>
                  )}
                  {currentEx.harderOption && (
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>Harder:</span> {currentEx.harderOption}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── SCENARIO A: AI Choice Mode for AI-Supported Exercises ── */}
          {isCurrentExAiSupported && aiModeChoice === null && (
            <div className="mission-ai-choice-panel">
              <div className="mission-ai-choice-header">
                <Sparkles size={28} color="#10b981" />
                <h3>Choose How to Track Set {currentSet}</h3>
                <p>This exercise supports automatic real-time camera pose tracking.</p>
              </div>

              <div className="mission-ai-choice-cards">
                <button 
                  className="mission-choice-card ai-choice"
                  onClick={() => setAiModeChoice('with_ai')}
                >
                  <div className="choice-icon-wrap">
                    <Video size={28} color="#10b981" />
                  </div>
                  <div className="choice-text">
                    <h4>Track with AI Camera</h4>
                    <p>Automatic rep counting, posture form accuracy & audio cues.</p>
                  </div>
                  <ChevronRight size={20} color="#10b981" />
                </button>

                <button 
                  className="mission-choice-card manual-choice"
                  onClick={() => setAiModeChoice('without_ai')}
                >
                  <div className="choice-icon-wrap">
                    <Play size={28} color="#3b82f6" />
                  </div>
                  <div className="choice-text">
                    <h4>Track Manually (Without AI)</h4>
                    <p>Standard workout tracker with rep logger & rest timer.</p>
                  </div>
                  <ChevronRight size={20} color="#3b82f6" />
                </button>
              </div>
            </div>
          )}

          {/* ── SCENARIO B: AI Camera Mode Active ── */}
          {isCurrentExAiSupported && aiModeChoice === 'with_ai' && (
            <div className="mission-camera-container">
              <div className="mission-camera-top-action">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => setAiModeChoice('without_ai')}
                >
                  <CameraOff size={14} /> Switch to Manual Mode
                </button>
              </div>

              <AIDetectorContainer
                detectorId="pushup_v1"
                exerciseName={currentEx.name || 'Pushup'}
                onCompleteSession={(result) => {
                  const detectedCount = typeof result?.count === 'number' 
                    ? result.count 
                    : (result?.repCount || targetRepsForCurrent);
                  handleCompleteSet('ai', detectedCount);
                }}
                onFallbackToManual={() => setAiModeChoice('without_ai')}
              />
            </div>
          )}

          {/* ── SCENARIO C: Manual Game Mode (For all exercises without AI or chosen manual) ── */}
          {aiModeChoice === 'without_ai' && (
            <div className="mission-manual-game-container">
              
              {/* Exercise Demo Animation / Illustration Placeholder */}
              {(() => {
                const guaranteed = getGuaranteedMedia(currentEx);
                const rawMedia = currentEx.gifUrl || currentEx.mediaUrl || currentEx.videoUrl || resolvedMedia || guaranteed;
                // Auto-fix any legacy cached broken hash for Barbell Squat
                let exerciseMedia = (typeof rawMedia === 'string' && rawMedia.includes('0043-s6bYM8w'))
                  ? rawMedia.replace('0043-s6bYM8w', '0043-qXTaZnJ')
                  : rawMedia;

                if (!exerciseMedia || (mediaLoadError && exerciseMedia !== guaranteed)) {
                  exerciseMedia = guaranteed;
                }

                const isVideo = typeof exerciseMedia === 'string' && (exerciseMedia.endsWith('.mp4') || exerciseMedia.endsWith('.webm'));
                const showMedia = Boolean(exerciseMedia);

                return (
                  <div className={`mission-manual-visual-card ${showMedia ? 'has-gif' : 'no-gif'}`}>
                    {showMedia ? (
                      isVideo ? (
                        <video
                          key={exerciseMedia}
                          src={exerciseMedia}
                          autoPlay
                          loop
                          muted
                          playsInline
                          onError={() => {
                            setResolvedMedia(guaranteed);
                            setMediaLoadError(true);
                          }}
                          className="mission-exercise-gif"
                        />
                      ) : (
                        <img 
                          key={exerciseMedia}
                          src={exerciseMedia} 
                          alt={currentEx.name} 
                          onError={(e) => {
                            if (e.currentTarget.src !== guaranteed) {
                              e.currentTarget.src = guaranteed;
                            } else {
                              setMediaLoadError(true);
                            }
                          }}
                          className="mission-exercise-gif"
                        />
                      )
                    ) : (
                      <div className="mission-exercise-icon-placeholder">
                        <Dumbbell size={24} color="#3b82f6" />
                        <p>{currentEx.instructions && currentEx.instructions !== 'Follow AI targets' ? currentEx.instructions : 'Focus on controlled movement & full range of motion'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Set Tracker & Rep Controller */}
              <div className="mission-set-controller-card">
                <span className="mission-set-title">SET {currentSet} OF {totalSetsForCurrent}</span>
                
                <div className="mission-reps-counter-wrap">
                  <button 
                    className="mission-counter-btn"
                    onClick={() => setRepsDone(prev => Math.max(1, (Number.isFinite(prev) ? prev : 10) - 1))}
                    title="Decrease Reps"
                  >
                    -
                  </button>

                  <div className="mission-reps-number-block">
                    <span className="mission-reps-number">{Number.isFinite(repsDone) ? repsDone : 10}</span>
                    <span className="mission-reps-label">REPS COMPLETED</span>
                  </div>

                  <button 
                    className="mission-counter-btn"
                    onClick={() => setRepsDone(prev => (Number.isFinite(prev) ? prev : 10) + 1)}
                    title="Increase Reps"
                  >
                    +
                  </button>
                </div>

                <span className="mission-target-hint">
                  Target for this set: <strong>
                    {currentEx.isWarmup 
                      ? (typeof currentEx.duration === 'string' && currentEx.duration.includes('sec') ? currentEx.duration : `${targetRepsForCurrent} reps`) 
                      : `${targetRepsForCurrent} reps`}
                  </strong>
                </span>
              </div>

              {/* Main Interactive Action Buttons */}
              <div className="mission-action-bar">
                <button 
                  className="mission-btn mission-btn-start mission-btn-log"
                  onClick={() => handleCompleteSet('manual', Number.isFinite(repsDone) ? repsDone : targetRepsForCurrent)}
                >
                  <CheckCircle size={22} /> {currentEx.isWarmup ? `COMPLETE WARM-UP SET ${currentSet}` : `COMPLETE SET ${currentSet}`}
                </button>

                <div className="mission-sub-actions">

                  <button 
                    className="mission-text-action-btn"
                    onClick={handleSkipCurrentExercise}
                  >
                    <SkipForward size={16} /> Skip This Exercise
                  </button>
                  
                  {isCurrentExAiSupported && (
                    <button 
                      className="mission-text-action-btn highlight"
                      onClick={() => setAiModeChoice('with_ai')}
                    >
                      <Video size={16} /> Turn on AI Camera
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ── ALTERNATIVE MOVEMENT / EQUIPMENT SWAP MODAL ── */}
          {showSwapModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(6px)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}>
              <div style={{
                background: 'var(--card-bg, #1e293b)',
                border: '1px solid var(--card-border, #334155)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                color: '#f8fafc'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>
                      Equipment Alternative
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800 }}>
                      Swap {currentEx.name}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowSwapModal(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Don't have this equipment in your gym or training at home? Swap to a bodyweight or dumbbell alternative targeting the same muscle group:
                </p>

                {loadingAlternatives ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Finding alternatives...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {availableAlternatives.map((alt, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                              {alt.name}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              fontWeight: 600
                            }}>
                              {alt.equipmentRequired}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                            {alt.instructions}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectSwap(alt)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Swap
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  style={{
                    marginTop: '8px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Keep Current Movement
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── 3. REST COUNTDOWN PHASE ───────────────────────────────────────────
  if (phase === 'rest') {
    const hasMoreSetsForCurrent = currentSet < totalSetsForCurrent;
    const nextExerciseObj = workoutExercises[currentExIndex + 1];

    return renderOverlay(
      <div className="mission-runner-overlay">
        <div className="mission-runner-content mission-rest-card">
          <button 
            className="mission-close-btn"
            onClick={() => setShowExitConfirm(true)}
            title="Exit Workout"
            aria-label="Exit Workout"
          >
            <X size={20} />
          </button>

          {/* Exit Confirmation Modal */}
          {showExitConfirm && (
            <div className="mission-exit-confirm-overlay">
              <div className="mission-exit-confirm-card">
                <h3>Leave Workout?</h3>
                <p>Your session is in progress. Are you sure you want to stop now?</p>
                <div className="mission-confirm-actions">
                  <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>
                    Keep Training
                  </button>
                  <button className="btn btn-danger" onClick={onCancel}>
                    Exit Workout
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="mission-badge" style={{ color: '#3b82f6' }}>
            <Activity size={16} /> RECOVERY PERIOD
          </div>
          
          <h2 className="mission-rest-title">Take a Breath</h2>
          <p className="mission-rest-subtitle">Rest fuels muscle recovery and maximum power output.</p>

          {/* Large Game-Style Countdown Circle */}
          <div className="mission-rest-timer-circle">
            <span className="mission-rest-countdown-digits">
              {formatTime(restCountdown)}
            </span>
            <span className="mission-rest-countdown-label">REST REMAINING</span>
          </div>

          {/* Up Next Preview */}
          <div className="mission-up-next-banner">
            <span className="up-next-label">UP NEXT:</span>
            <span className="up-next-value">
              {hasMoreSetsForCurrent 
                ? `Set ${currentSet + 1} of ${totalSetsForCurrent} • ${currentEx.name || 'Exercise'}`
                : `Next Movement: ${nextExerciseObj?.name || 'Next Exercise'}`
              }
            </span>
          </div>

          {/* Rest Control Buttons */}
          <div className="mission-rest-actions-row">
            <button 
              className="mission-btn mission-btn-fallback"
              onClick={() => handleAddRestTime(15)}
            >
              <Plus size={18} /> +15 SECONDS
            </button>

            <button 
              className="mission-btn mission-btn-start"
              style={{ background: '#3b82f6' }}
              onClick={handleSkipRest}
            >
              <SkipForward size={18} /> SKIP REST & START
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── 4. CELEBRATION PHASE (Mission Complete) ───────────────────────────
  if (phase === 'celebration') {
    return renderOverlay(
      <div className="mission-runner-overlay">
        <div className="mission-runner-content mission-celebration">
          <button 
            className="mission-close-btn"
            onClick={onCancel}
            title="Close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          
          <div className="mission-celebration-trophy">
            <CheckCircle size={72} color="#10b981" />
          </div>

          <h2 className="mission-celebration-heading">MISSION COMPLETE!</h2>
          <p className="mission-celebration-sub">
            Incredible dedication. Every set brings you closer to your fitness goals.
          </p>

          {/* Gamification Stats Card */}
          <div className="mission-stats-summary-grid">
            <div className="mission-stat-box">
              <Flame size={24} color="#f59e0b" />
              <span className="stat-number">~{burnedKcal}</span>
              <span className="stat-label">KCAL BURNED</span>
            </div>

            <div className="mission-stat-box">
              <Award size={24} color="#10b981" />
              <span className="stat-number">+{earnedXP}</span>
              <span className="stat-label">XP EARNED</span>
            </div>

            <div className="mission-stat-box">
              <Clock size={24} color="#3b82f6" />
              <span className="stat-number">{Math.max(1, Math.round(elapsedSecs / 60))}m</span>
              <span className="stat-label">TOTAL TIME</span>
            </div>
          </div>

          {/* Quick Feeling Feedback (Easy / Good / Hard) */}
          <div className="mission-feedback-section">
            <p className="feedback-question">HOW DID THIS WORKOUT FEEL?</p>
            <div className="feedback-options-row">
              <button 
                className={`feedback-chip ${workoutFeeling === 'easy' ? 'active easy' : ''}`}
                onClick={() => setWorkoutFeeling('easy')}
              >
                🟢 Too Easy
              </button>
              <button 
                className={`feedback-chip ${workoutFeeling === 'good' ? 'active good' : ''}`}
                onClick={() => setWorkoutFeeling('good')}
              >
                🔵 Just Right
              </button>
              <button 
                className={`feedback-chip ${workoutFeeling === 'hard' ? 'active hard' : ''}`}
                onClick={() => setWorkoutFeeling('hard')}
              >
                🔴 Very Hard
              </button>
            </div>
          </div>

          <button 
            className="mission-btn mission-btn-start" 
            style={{ fontSize: '1.2rem', padding: '18px' }}
            onClick={handleFinishMission}
          >
            <CheckCircle size={22} /> LOG & COMPLETE SESSION
          </button>

          {/* Issue Report Option */}
          <div style={{ marginTop: '20px' }}>
            {!showReportForm ? (
              <button
                onClick={() => setShowReportForm(true)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Did something go wrong? Report an issue
              </button>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px', marginTop: '8px', textAlign: 'left' }}>
                <p style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.85rem' }}>Report Completion Discrepancy</p>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  style={{ width: '100%', background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '8px', marginBottom: '8px', fontSize: '0.85rem' }}
                >
                  <option value="">Select reason…</option>
                  <option value="MinorIssue">Minor issue (display glitch or wrong rep count)</option>
                  <option value="FormFraud">Marked done but did not complete exercises</option>
                  <option value="CalorieAdjustment">Adjust calories down</option>
                </select>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Additional details (optional)…"
                  rows={2}
                  style={{ width: '100%', background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', resize: 'none' }}
                />
                <button 
                  className="btn btn-sm btn-secondary" 
                  style={{ marginTop: '8px' }}
                  onClick={() => {
                    setShowReportForm(false);
                    setReportMsg('Thank you for your report.');
                  }}
                >
                  Submit Feedback
                </button>
                {reportMsg && <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '6px' }}>{reportMsg}</p>}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  return null;
};

export default MissionRunner;
