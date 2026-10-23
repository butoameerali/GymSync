import express from 'express';
import { 
  createComplaint, 
  getAllComplaints, 
  updateComplaintStatus, 
  reopenComplaint,
  addComplaintChat 
} from '../controllers/complaintController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, upload.single('attachment'), createComplaint)
  .get(protect, getAllComplaints);

router.route('/:id')
  .put(protect, authorizeRoles('Admin', 'SuperAdmin', 'ComplaintModerator'), updateComplaintStatus);

router.route('/:id/reopen')
  .put(protect, reopenComplaint);

router.route('/:id/chat')
  .post(protect, addComplaintChat);

export default router;
