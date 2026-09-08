import express from 'express';
import {
  getPreMadePlans,
  getPreMadePlanById,
  createPreMadePlan,
  updatePreMadePlan,
  deletePreMadePlan,
  applyProgramToUser,
  getUserActiveProgram,
  logUserProgramProgress,
  applyDietToUser,
  getUserActiveDiet,
  logUserDietMeal
} from '../controllers/preMadePlanController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// User program & diet execution & tracking routes (placed before parameterized /:id routes)
router.get('/user-programs/active', protect, getUserActiveProgram);
router.post('/user-programs/:id/progress', protect, logUserProgramProgress);
router.get('/user-diets/active', protect, getUserActiveDiet);
router.post('/user-diets/:id/meal-log', protect, logUserDietMeal);

// Public / Trainee discovery
router.get('/premade', getPreMadePlans);
router.get('/premade/:id', getPreMadePlanById);

// Apply instructor programs and diet templates to user routine
router.post('/premade/:id/apply', protect, applyProgramToUser);
router.post('/premade/:id/apply-diet', protect, applyDietToUser);


// Instructor / Admin management
router.post('/premade', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), createPreMadePlan);
router.put('/premade/:id', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), updatePreMadePlan);
router.delete('/premade/:id', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), deletePreMadePlan);

export default router;
