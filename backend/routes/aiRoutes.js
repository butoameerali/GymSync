import express from 'express';
import { handleChat } from '../controllers/aiController.js';
import { generatePlan } from '../controllers/recommendationEngine.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/ai/chat (Accessible to authenticated users and guests)
router.post('/chat', optionalProtect, handleChat);

// POST /api/ai/generate-plan (Accessible to authenticated users and guests)
router.post('/generate-plan', optionalProtect, generatePlan);

export default router;
