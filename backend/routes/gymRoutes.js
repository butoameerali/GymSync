import express from 'express';
import { getMyGym, getGymById, getGymsList, getMyGymData, completeGymPlanDay } from '../controllers/gymController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/my-gym/:userId').get(getMyGym);
// Membership data must come from the logged-in account, not a display name
// stored in the browser (names may contain spaces or be changed later).
router.route('/my-gym-data/:userName').get(protect, getMyGymData);
router.put('/plans/:planId/schedule/:scheduleId/complete', protect, completeGymPlanDay);
router.route('/:id').get(getGymById);
// Public list of approved gyms
router.route('/').get(getGymsList);

export default router;
