import express from 'express';
import { handleChat } from '../controllers/aiController.js';
import { generatePlan } from '../controllers/recommendationEngine.js';

const router = express.Router();

// POST /api/ai/chat
router.post('/chat', handleChat);

// POST /api/ai/generate-plan
router.post('/generate-plan', generatePlan);

export default router;
