import express from 'express';
import { handleChat, getSavedPlans, saveAIPlan, deleteSavedPlan, handleMissedSessionResolution } from '../controllers/aiController.js';
import { generatePlan } from '../controllers/recommendationEngine.js';
import { optionalProtect, protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  getPendingReviewsController,
  approveReviewController,
  rejectReviewController
} from '../controllers/trainerReviewController.js';

const router = express.Router();

// POST /api/ai/chat & /api/ai/coach-chat (Accessible to authenticated users and guests)
router.post('/chat', optionalProtect, handleChat);
router.post('/coach-chat', optionalProtect, handleChat);

// POST /api/ai/generate-plan (Accessible to authenticated users and guests)
router.post('/generate-plan', optionalProtect, generatePlan);

// Saved AI Plans (Goal-titled plans: Fat Loss, Muscle Gain, Cricket Taper, etc.)
router.get('/saved-plans', protect, getSavedPlans);
router.post('/saved-plans', protect, saveAIPlan);
router.delete('/saved-plans/:id', protect, deleteSavedPlan);
router.put('/saved-plans/:planId/missed-sessions/:dayNumber', protect, handleMissedSessionResolution);

// Trainer Review Queue (Human Escalation Gate)
router.get('/trainer-reviews', protect, authorizeRoles('GymTrainer', 'Admin', 'SuperAdmin'), getPendingReviewsController);
router.post('/trainer-reviews/:id/approve', protect, authorizeRoles('GymTrainer', 'Admin', 'SuperAdmin'), approveReviewController);
router.post('/trainer-reviews/:id/reject', protect, authorizeRoles('GymTrainer', 'Admin', 'SuperAdmin'), rejectReviewController);

export default router;
