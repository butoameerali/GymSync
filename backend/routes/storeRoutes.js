import express from 'express';
import { 
  getProducts, 
  createProduct, 
  updateProductStatus, 
  createOrder, 
  getOrders, 
  updateOrderStatus,
  getMyOrders,
  cancelMyOrder,
  requestOrderRefund
} from '../controllers/storeController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/products')
  .get(getProducts)
  .post(protect, authorizeRoles('StoreManager', 'Admin'), createProduct);

router.route('/products/:id/status')
  .put(protect, authorizeRoles('StoreManager', 'Admin'), updateProductStatus);

router.route('/orders')
  .get(protect, authorizeRoles('StoreManager', 'Admin'), getOrders)
  .post(protect, createOrder);

router.get('/orders/mine', protect, getMyOrders);
router.put('/orders/:id/cancel', protect, cancelMyOrder);
router.put('/orders/:id/refund', protect, requestOrderRefund);

router.route('/orders/:id/status')
  .put(protect, authorizeRoles('StoreManager', 'Admin'), updateOrderStatus);

export default router;
