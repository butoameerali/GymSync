import express from 'express';
import {
  logFood,
  getFoodLogs,
  deleteFoodLog,
  getDietReport
} from '../controllers/foodLogController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, logFood);
router.get('/', protect, getFoodLogs);
router.get('/report', protect, getDietReport);
router.delete('/:id', protect, deleteFoodLog);

export default router;
