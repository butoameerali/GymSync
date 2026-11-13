import express from 'express';
import {
  checkEligibilityController,
  calculateProjectionsController,
  enrollController,
  getActiveEnrollmentController,
  recordWeighInController,
  cancelEnrollmentController
} from '../controllers/weightLossController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/eligibility', protect, checkEligibilityController);
router.post('/calculate', protect, calculateProjectionsController);
router.post('/enroll', protect, enrollController);
router.get('/active', protect, getActiveEnrollmentController);
router.post('/weigh-in', protect, recordWeighInController);
router.post('/cancel', protect, cancelEnrollmentController);

export default router;
