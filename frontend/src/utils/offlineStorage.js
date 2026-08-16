/**
 * Offline Storage Utility for GymSync
 * Caches up to 100 exercises in LocalStorage for offline access.
 */

const EXERCISE_KEY = 'gymsync_offline_exercises';
const MAX_EXERCISES = 100;

export const saveExerciseProgress = (exerciseName, reps, calories) => {
  try {
    let history = JSON.parse(localStorage.getItem(EXERCISE_KEY)) || [];
    
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      exercise: exerciseName,
      reps,
      calories,
      synced: false // Flag to check if we need to send to backend later
    };

    history.unshift(newEntry); // Add to beginning

    // Keep only the latest 100
    if (history.length > MAX_EXERCISES) {
      history = history.slice(0, MAX_EXERCISES);
    }

    localStorage.setItem(EXERCISE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error("Failed to save offline data", error);
    return false;
  }
};

export const getOfflineExercises = () => {
  try {
    return JSON.parse(localStorage.getItem(EXERCISE_KEY)) || [];
  } catch (error) {
    console.error("Failed to retrieve offline data", error);
    return [];
  }
};

export const syncWithBackend = async () => {
  const rawHistory = getOfflineExercises();
  const history = Array.isArray(rawHistory) ? rawHistory : [];
  const unsynced = history.filter(item => item && !item.synced);
  
  if (unsynced.length === 0) return;

  // In a real app, send unsynced array to backend via axios here
  // For now, we just mark them as synced to simulate success
  const updatedHistory = history.map(item => ({ ...item, synced: true }));
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(updatedHistory));
};
