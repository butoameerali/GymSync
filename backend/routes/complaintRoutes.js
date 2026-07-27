import express from 'express';
import { createComplaint, getAllComplaints, updateComplaintStatus } from '../controllers/complaintController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createComplaint)
  .get(protect, authorizeRoles('Admin', 'ComplaintModerator'), getAllComplaints);

router.route('/:id')
  .put(protect, authorizeRoles('Admin', 'ComplaintModerator'), updateComplaintStatus);

export default router;
