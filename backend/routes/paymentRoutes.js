import express from 'express';
import {
  createPayment,
  getPaymentConfigs,
  updatePaymentConfig,
  getPendingPayments,
  approvePayment,
  createPaymentIntent,
  trackPaymentByCode
} from '../controllers/paymentController.js';
import { protect, optionalProtect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/config', getPaymentConfigs);
router.get('/track/:code', trackPaymentByCode);
router.post('/', optionalProtect, createPayment);
router.post('/create-intent', optionalProtect, createPaymentIntent);

router.put('/config/:method', protect, authorizeRoles('SuperAdmin', 'Admin'), updatePaymentConfig);
router.get('/pending', protect, authorizeRoles('SuperAdmin', 'Admin'), getPendingPayments);
router.put('/:id/approve', protect, authorizeRoles('SuperAdmin', 'Admin'), approvePayment);

export default router;
