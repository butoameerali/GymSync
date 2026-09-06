import express from 'express';
import { handleChat } from '../controllers/aiController.js';
import { generatePlan } from '../controllers/recommendationEngine.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/ai/chat (Authenticated)
router.post('/chat', protect, handleChat);

// POST /api/ai/generate-plan (Authenticated)
router.post('/generate-plan', protect, generatePlan);

export default router;
