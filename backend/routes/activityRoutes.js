import express from 'express';
import { syncActivity, getTodayEnergy } from '../controllers/activityController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sync', protect, syncActivity);
router.get('/today-energy', protect, getTodayEnergy);

export default router;
