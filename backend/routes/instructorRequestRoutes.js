import express from 'express';
import { 
  getInstructorRequests, 
  createInstructorRequest, 
  updateInstructorRequest 
} from '../controllers/instructorRequestController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('FitnessInstructor', 'Admin', 'SuperAdmin'), getInstructorRequests);
router.post('/', protect, authorizeRoles('Admin', 'SuperAdmin'), createInstructorRequest);
router.put('/:id', protect, authorizeRoles('FitnessInstructor', 'Admin', 'SuperAdmin'), updateInstructorRequest);

export default router;
