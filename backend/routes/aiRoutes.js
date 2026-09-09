import express from 'express';
import { handleChat, getSavedPlans, saveAIPlan, deleteSavedPlan } from '../controllers/aiController.js';
import { generatePlan } from '../controllers/recommendationEngine.js';
import { optionalProtect, protect } from '../middleware/authMiddleware.js';

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

export default router;
