import express from 'express';
import {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  archiveExercise,
  deleteExercise
} from '../controllers/exerciseController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllExercises);
router.get('/:id', getExerciseById);
router.post('/', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), createExercise);
router.put('/:id', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), updateExercise);
router.put('/:id/archive', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), archiveExercise);
router.delete('/:id', protect, authorizeRoles('Admin', 'SuperAdmin'), deleteExercise);

export default router;
