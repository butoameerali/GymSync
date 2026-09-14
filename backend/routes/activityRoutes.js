import express from 'express';
import { syncActivity, getTodayEnergy, getDailyHistory, logWorkoutExercise, deleteDailyHistory } from '../controllers/activityController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sync', protect, syncActivity);
router.get('/today-energy', protect, getTodayEnergy);
router.get('/history', protect, getDailyHistory);
router.post('/log-workout', protect, logWorkoutExercise);
router.delete('/history/:id', protect, deleteDailyHistory);

export default router;
