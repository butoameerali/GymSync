import express from 'express';
import { 
  getProducts, 
  createProduct, 
  updateProductStatus, 
  updateProduct,
  deleteProduct,
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
  .post(protect, authorizeRoles('StoreManager', 'Admin', 'SuperAdmin'), createProduct);

router.route('/products/:id')
  .put(protect, authorizeRoles('StoreManager', 'Admin', 'SuperAdmin'), updateProduct)
  .delete(protect, authorizeRoles('StoreManager', 'Admin', 'SuperAdmin'), deleteProduct);

router.route('/products/:id/status')
  .put(protect, authorizeRoles('StoreManager', 'Admin', 'SuperAdmin'), updateProductStatus);

router.route('/orders')
  .get(protect, authorizeRoles('StoreManager', 'Admin', 'SuperAdmin'), getOrders)
  .post(protect, createOrder);

router.get('/orders/mine', protect, getMyOrders);
router.put('/orders/:id/cancel', protect, cancelMyOrder);
router.put('/orders/:id/refund', protect, requestOrderRefund);

router.route('/orders/:id/status')
  .put(protect, authorizeRoles('StoreManager', 'Admin', 'SuperAdmin'), updateOrderStatus);

export default router;
