import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  getOwnerBranches,
  saveBranchDraft,
  uploadVerificationDocument,
  submitBranchForVerification,
  downloadVerificationDocument,
  getAdminVerificationQueue,
  getAdminVerificationDetail,
  reviewVerificationApplication
} from '../controllers/gymVerificationController.js';
import { protect, authorizeRoles, authorizeVerificationReviewer } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Owner Multi-Branch & Application endpoints
router.get('/branches', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'SuperAdmin'), getOwnerBranches);
router.post('/draft', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'SuperAdmin'), saveBranchDraft);
router.post('/branch/draft', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'SuperAdmin'), saveBranchDraft);

router.post('/upload-document', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'SuperAdmin'), upload.single('file'), uploadVerificationDocument);
router.post('/branch/:id/upload', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'SuperAdmin'), upload.single('file'), (req, res, next) => {
  req.body = req.body || {};
  if (req.params.id && !req.body.branchId) {
    req.body.branchId = req.params.id;
  }
  next();
}, uploadVerificationDocument);

router.post('/submit/:branchId', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'SuperAdmin'), submitBranchForVerification);
router.post('/branch/:id/submit', authorizeRoles('GymOwner', 'gym_owner', 'Admin', 'SuperAdmin'), (req, res, next) => {
  req.params.branchId = req.params.id;
  next();
}, submitBranchForVerification);

// Decrypted Document Download / Preview (Authorized owner or admin reviewer)
router.get('/document/:id', downloadVerificationDocument);

// Admin Verification Operations (Privileged Gym Verification review)
router.get('/admin/queue', authorizeVerificationReviewer, getAdminVerificationQueue);
router.get('/admin/application/:id', authorizeVerificationReviewer, getAdminVerificationDetail);
router.put('/admin/application/:id/action', authorizeVerificationReviewer, reviewVerificationApplication);
router.post('/admin/review/:id', authorizeVerificationReviewer, reviewVerificationApplication);

export default router;
