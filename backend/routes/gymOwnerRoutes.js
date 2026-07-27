import express from 'express';
import { 
  getGymOwnerDashboard, 
  updateGymProfile, 
  checkInMember, 
  checkOutMember, 
  createMemberPlan 
} from '../controllers/gymOwnerController.js';

const router = express.Router();

router.get('/dashboard/:ownerName', getGymOwnerDashboard);
router.put('/gym/:id', updateGymProfile);
router.post('/attendance/check-in', checkInMember);
router.put('/attendance/check-out/:id', checkOutMember);
router.post('/plans', createMemberPlan);

export default router;
