import express from 'express';
import { createComplaint, getAllComplaints, updateComplaintStatus } from '../controllers/complaintController.js';

const router = express.Router();

router.route('/')
  .post(createComplaint)
  .get(getAllComplaints);

router.route('/:id')
  .put(updateComplaintStatus);

export default router;
