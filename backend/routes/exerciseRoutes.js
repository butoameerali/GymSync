import express from 'express';
import {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
} from '../controllers/exerciseController.js';

const router = express.Router();

router.get('/', getAllExercises);
router.get('/:id', getExerciseById);
router.post('/', createExercise);
router.put('/:id', updateExercise);
router.delete('/:id', deleteExercise);

export default router;
