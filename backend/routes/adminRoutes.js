import express from 'express';
import { 
  getAdminStats, 
  getAllUsers, 
  updateUserRole, 
  toggleUserBan,
  getPendingGymApprovals,
  updateGymApprovalStatus,
  getReportedPosts,
  moderateReportedPost,
  createCashbackPost,
  getPendingCashbackPosts,
  reviewCashbackPost,
  addComplaintChatMessage,
  getComplaintChatsInspection,
  getAuditLogs
} from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protection to all admin endpoints
router.use(protect);

router.get('/stats', authorizeRoles('SuperAdmin', 'Admin', 'ComplaintModerator'), getAdminStats);
router.get('/users', authorizeRoles('SuperAdmin', 'Admin'), getAllUsers);
router.put('/users/:id/role', authorizeRoles('SuperAdmin', 'Admin'), updateUserRole);
router.put('/users/:id/ban', authorizeRoles('SuperAdmin', 'Admin', 'ComplaintModerator'), toggleUserBan);

// Gym Approvals
router.get('/gyms/pending', authorizeRoles('SuperAdmin', 'Admin'), getPendingGymApprovals);
router.put('/gyms/:id/approval', authorizeRoles('SuperAdmin', 'Admin'), updateGymApprovalStatus);

// Reported Posts Moderation
router.get('/posts/reported', authorizeRoles('SuperAdmin', 'Admin', 'ComplaintModerator'), getReportedPosts);
router.put('/posts/:id/moderate', authorizeRoles('SuperAdmin', 'Admin', 'ComplaintModerator'), moderateReportedPost);

// Cashback Post Approval Workflow
router.post('/posts/cashback', authorizeRoles('SuperAdmin', 'Admin'), createCashbackPost);
router.get('/posts/pending-cashback', authorizeRoles('SuperAdmin'), getPendingCashbackPosts);
router.put('/posts/:id/review-cashback', authorizeRoles('SuperAdmin'), reviewCashbackPost);

// Complaint Chat Thread & Senior Audit Inspection
router.post('/complaints/:id/chat', addComplaintChatMessage);
router.get('/complaints/chats-inspection', authorizeRoles('SuperAdmin'), getComplaintChatsInspection);

// Senior Admin Audit Logs
router.get('/audit-logs', authorizeRoles('SuperAdmin'), getAuditLogs);

export default router;
