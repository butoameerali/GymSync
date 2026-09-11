import express from 'express';
import { getSubstitutionOptions, substituteFoodItem } from '../controllers/dietController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

import { getPlanVsReality } from '../controllers/nutritionController.js';

router.get('/substitute-options', protect, getSubstitutionOptions);
router.post('/plans/:planId/meals/:mealId/substitute', protect, substituteFoodItem);
router.get('/plan-vs-reality', protect, getPlanVsReality);

export default router;
