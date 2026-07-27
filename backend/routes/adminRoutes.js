import express from 'express';
import { getAdminStats, getAllUsers, updateUserRole, toggleUserBan } from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protection and RBAC authorization to all admin endpoints
router.use(protect);

router.get('/stats', authorizeRoles('Admin', 'ComplaintModerator'), getAdminStats);
router.get('/users', authorizeRoles('Admin'), getAllUsers);
router.put('/users/:id/role', authorizeRoles('Admin'), updateUserRole);
router.put('/users/:id/ban', authorizeRoles('Admin', 'ComplaintModerator'), toggleUserBan);

export default router;
