import express from 'express';
import { 
  getProducts, 
  createProduct, 
  updateProductStatus, 
  createOrder, 
  getOrders, 
  updateOrderStatus 
} from '../controllers/storeController.js';

const router = express.Router();

router.route('/products')
  .get(getProducts)
  .post(createProduct);

router.route('/products/:id/status')
  .put(updateProductStatus);

router.route('/orders')
  .get(getOrders)
  .post(createOrder);

router.route('/orders/:id/status')
  .put(updateOrderStatus);

export default router;
