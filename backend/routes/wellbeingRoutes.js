import express from 'express';
import { submitCheckIn, getCheckIns } from '../controllers/wellbeingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/check-in', protect, submitCheckIn);
router.get('/check-in', protect, getCheckIns);

export default router;
