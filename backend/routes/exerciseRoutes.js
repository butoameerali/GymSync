import express from 'express';
import {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
} from '../controllers/exerciseController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllExercises);
router.get('/:id', getExerciseById);
router.post('/', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), createExercise);
router.put('/:id', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), updateExercise);
router.delete('/:id', protect, authorizeRoles('Admin', 'SuperAdmin'), deleteExercise);

export default router;
