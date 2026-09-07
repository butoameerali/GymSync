import express from 'express';
import {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  archiveExercise,
  deleteExercise,
  aiAssistExercise,
  uploadExerciseMedia
} from '../controllers/exerciseController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getAllExercises);
router.get('/:id', getExerciseById);

// AI-Assisted Exercise Authoring Draft
router.post('/ai-assist', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), aiAssistExercise);

// Real Media Upload (Image/Video/GIF)
router.post('/upload-media', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), upload.single('media'), uploadExerciseMedia);

router.post('/', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), createExercise);
router.put('/:id', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), updateExercise);
router.put('/:id/archive', protect, authorizeRoles('Admin', 'SuperAdmin', 'FitnessInstructor'), archiveExercise);
router.delete('/:id', protect, authorizeRoles('Admin', 'SuperAdmin'), deleteExercise);

export default router;

