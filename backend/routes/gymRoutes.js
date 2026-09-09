import express from 'express';
import { 
  getMyGym, 
  getGymById, 
  getGymsList, 
  getMyGymData, 
  completeGymPlanDay,
  createTourRequest,
  getUserTourRequests
} from '../controllers/gymController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/my-tour-requests').get(protect, getUserTourRequests);
router.route('/my-gym/:userId').get(protect, getMyGym);
router.route('/my-gym-data/:userName').get(protect, getMyGymData);
router.put('/plans/:planId/schedule/:scheduleId/complete', protect, completeGymPlanDay);
router.route('/:id/tour-request').post(protect, createTourRequest);
router.route('/:id').get(getGymById);
router.route('/').get(getGymsList);

export default router;
