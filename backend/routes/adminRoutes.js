import express from 'express';
import { getAdminStats, getAllUsers, updateUserRole, toggleUserBan } from '../controllers/adminController.js';

const router = express.Router();

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/ban', toggleUserBan);

export default router;
