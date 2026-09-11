import express from 'express';
import {
  evaluateGoalController,
  createGoalController,
  getActiveGoalController,
  abandonGoalController,
  completeGoalController
} from '../controllers/goalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All goal operations require authentication
router.post('/evaluate', protect, evaluateGoalController);
router.post('/', protect, createGoalController);
router.get('/active', protect, getActiveGoalController);
router.put('/:id/abandon', protect, abandonGoalController);
router.post('/:id/complete', protect, completeGoalController);

export default router;
