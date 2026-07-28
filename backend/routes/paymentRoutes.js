import express from 'express';
import {
  createPayment,
  getPaymentConfigs,
  updatePaymentConfig,
  getPendingPayments,
  approvePayment
} from '../controllers/paymentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/config', getPaymentConfigs);
router.post('/', createPayment);

router.put('/config/:method', protect, authorizeRoles('SuperAdmin', 'Admin'), updatePaymentConfig);
router.get('/pending', protect, authorizeRoles('SuperAdmin', 'Admin'), getPendingPayments);
router.put('/:id/approve', protect, authorizeRoles('SuperAdmin', 'Admin'), approvePayment);

export default router;
