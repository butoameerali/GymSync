import express from 'express';
import {
  getPreMadePlans,
  createPreMadePlan,
  deletePreMadePlan
} from '../controllers/preMadePlanController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/premade', getPreMadePlans);
router.post('/premade', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), createPreMadePlan);
router.delete('/premade/:id', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), deletePreMadePlan);

export default router;
