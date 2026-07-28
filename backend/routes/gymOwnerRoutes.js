import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import { 
  getGymOwnerDashboard, 
  updateGymProfile, 
  deleteGymProfile,
  uploadGymPhoto,
  checkInMember, 
  checkOutMember, 
  createMemberPlan 
} from '../controllers/gymOwnerController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protection to all gym owner endpoints
router.use(protect);
router.use(authorizeRoles('GymOwner', 'gym_owner', 'Admin'));

router.get('/dashboard/:ownerName', getGymOwnerDashboard);
router.put('/gym/:id', updateGymProfile);
router.delete('/gym/:id', deleteGymProfile);
router.post('/gym/:id/upload-photo', upload.single('photo'), uploadGymPhoto);
router.post('/attendance/check-in', checkInMember);
router.put('/attendance/check-out/:id', checkOutMember);
router.post('/plans', createMemberPlan);

export default router;
