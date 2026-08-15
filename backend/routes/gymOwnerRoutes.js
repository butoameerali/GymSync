import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import { 
  getGymOwnerDashboard, 
  updateGymProfile, 
  deleteGymProfile,
  uploadGymPhoto,
  checkInMember, 
  checkOutMember, 
  createMemberPlan,
  createGymTrainer,
  getGymTrainers
} from '../controllers/gymOwnerController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protection to all gym owner endpoints
router.use(protect);

// Trainers may assign plans, but cannot modify a gym or owner-managed accounts.
router.post('/plans', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'GymTrainer'), createMemberPlan);
router.use(authorizeRoles('GymOwner', 'gym_owner', 'Admin'));

router.get('/dashboard/:ownerName', getGymOwnerDashboard);
router.put('/gym/:id', updateGymProfile);
router.delete('/gym/:id', deleteGymProfile);
router.post('/gym/:id/upload-photo', upload.single('photo'), uploadGymPhoto);
router.post('/attendance/check-in', checkInMember);
router.put('/attendance/check-out/:id', checkOutMember);
router.post('/trainers', createGymTrainer);
router.get('/trainers/:gymName', getGymTrainers);

export default router;
