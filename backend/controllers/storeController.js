import crypto from 'crypto';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { logAuditTrail } from '../middleware/securityMiddleware.js';
import { isValidObjectId } from '../utils/validation.js';

const MOCK_STORE_ITEMS = [
  { name: "Optimum Nutrition Gold Standard 100% Whey", category: "Proteins", price: 64.99, rating: 4.9, image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=1470&auto=format&fit=crop", badge: "Best Seller", status: "Approved" },
  { name: "GymSync Premium Performance T-Shirt", category: "Gym Wear", price: 24.99, rating: 4.7, image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1374&auto=format&fit=crop", badge: "New", status: "Approved" },
  { name: "Pro-Grip Lifting Straps", category: "Accessories", price: 14.99, rating: 4.5, image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1471&auto=format&fit=crop", status: "Approved" },
  { name: "C4 Original Pre-Workout", category: "Supplements", price: 29.99, rating: 4.8, image: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?q=80&w=1470&auto=format&fit=crop", badge: "Sale", status: "Approved" },
  { name: "Adjustable Dumbbell Set (50lbs)", category: "Equipment", price: 199.99, rating: 4.9, image: "https://images.unsplash.com/photo-1638202993928-7267aad84c31?q=80&w=1374&auto=format&fit=crop", status: "Approved" }
];

// @desc    Get all store products
// @route   GET /api/store/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const { category, status } = req.query;
    let filter = {};

    if (category && category !== 'All') filter.category = category;
    if (status) filter.status = status;
    else filter.status = 'Approved';

    let products = await Product.find(filter).sort({ createdAt: -1 });

    // Seed mock items if database currently empty
    if (products.length === 0 && (!category || category === 'All') && !status) {
      try {
        await Product.insertMany(MOCK_STORE_ITEMS);
        products = await Product.find(filter);
      } catch (e) {
        console.warn('Seed store items warning:', e.message);
      }
    }

    res.json(products);
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ message: 'Failed to fetch store products' });
  }
};

// @desc    Create new product
// @route   POST /api/store/products
// @access  Private / StoreManager, Admin
export const createProduct = async (req, res) => {
  try {
    const { name, category, price, stock, image, badge } = req.body;
    const actorName = req.user?.name || 'Store Manager';
    const actorRole = req.user?.role || 'StoreManager';

    if (!name || !category || !price || !image) {
      return res.status(400).json({ message: 'Name, category, price, and image are required' });
    }

    const product = await Product.create({
      name,
      category,
      price: Number(price),
      stock: Number(stock) || 50,
      image,
      badge: badge || '',
      status: 'Approved',
      createdBy: actorName
    });

    logAuditTrail(actorName, actorRole, 'Created Product', name, `Price: $${price}`, req);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve or Reject Product
// @route   PUT /api/store/products/:id/status
// @access  Private / StoreManager, Admin
export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const actorName = req.user?.name || 'Store Manager';
    const actorRole = req.user?.role || 'StoreManager';

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.status = status;
    await product.save();

    logAuditTrail(actorName, actorRole, 'Updated Product Status', product.name, `New Status: ${status}`, req);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product details (price, stock, name, category, etc.)
// @route   PUT /api/store/products/:id
// @access  Private / StoreManager, Admin
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, stock, image, badge, status } = req.body;
    const actorName = req.user?.name || 'Store Manager';
    const actorRole = req.user?.role || 'StoreManager';

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (name) product.name = name;
    if (category) product.category = category;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (image) product.image = image;
    if (badge !== undefined) product.badge = badge;
    if (status) product.status = status;

    await product.save();
    logAuditTrail(actorName, actorRole, 'Updated Product Details', product.name, `Stock: ${product.stock}, Price: $${product.price}`, req);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/store/products/:id
// @access  Private / StoreManager, Admin
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const actorName = req.user?.name || 'Store Manager';
    const actorRole = req.user?.role || 'StoreManager';

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(id);
    logAuditTrail(actorName, actorRole, 'Deleted Product', product.name, `ID: ${id}`, req);
    res.json({ message: 'Product deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Order
// @route   POST /api/store/orders
// @access  Public / User
export const createOrder = async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress, paymentId, guestName, guestEmail, guestPhone } = req.body;
    const userName = req.user?.name || guestName || req.body.userName || 'Guest User';
    const isGuestOrder = !req.user;

    if (!userName || !Array.isArray(items) || items.length === 0 || typeof totalAmount !== 'number' || !shippingAddress || !paymentId) {
      return res.status(400).json({ message: 'Required order details missing' });
    }

    const isObjectId = isValidObjectId(paymentId);
    const payment = await Payment.findOne(
      isObjectId ? { $or: [{ _id: paymentId }, { paymentId }] } : { paymentId }
    );

    if (!payment) {
      return res.status(400).json({ message: 'Valid payment record is required before creating an order' });
    }

    if (req.user && payment.userName !== userName && payment.userName !== 'Guest User') {
      return res.status(403).json({ message: 'Payment record does not belong to the authenticated user' });
    }

    if (payment.paymentType !== 'StoreOrder') {
      return res.status(400).json({ message: 'Payment record is not linked to a store order' });
    }

    // Verify item prices server-side against Product database catalog
    let verifiedTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const itemId = item.id || item._id;

      if (!itemId) {
        return res.status(400).json({ message: 'Invalid item payload' });
      }

      const dbProduct = await Product.findById(itemId);
      const itemPrice = dbProduct ? dbProduct.price : Number(item.price);

      if (!dbProduct && (!item.price || isNaN(item.price))) {
        return res.status(400).json({ message: `Product ${item.name || itemId} not found` });
      }

      if (dbProduct && typeof dbProduct.stock === 'number' && dbProduct.stock < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for '${dbProduct.name}'. Available: ${dbProduct.stock}, requested: ${quantity}`
        });
      }

      const lineTotal = itemPrice * quantity;
      verifiedTotal += lineTotal;
      verifiedItems.push({
        productId: String(itemId),
        id: String(itemId),
        name: dbProduct ? dbProduct.name : item.name,
        price: itemPrice,
        image: dbProduct ? dbProduct.image : item.image,
        quantity
      });
    }

    // Ensure payment amount matches verified total
    const roundedVerifiedTotal = Math.round(verifiedTotal * 100) / 100;
    if (Math.abs(payment.amount - roundedVerifiedTotal) > 0.05) {
      return res.status(400).json({ message: `Payment amount ($${payment.amount}) does not match catalog item total ($${roundedVerifiedTotal})` });
    }

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const trackingCode = `GS-ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const order = await Order.create({
      orderId,
      trackingCode,
      userName,
      guestEmail: guestEmail || payment.customerEmail || '',
      guestPhone: guestPhone || payment.customerPhone || '',
      isGuestOrder,
      paymentId: payment.paymentId,
      items: verifiedItems,
      totalAmount: roundedVerifiedTotal,
      shippingAddress,
      paymentStatus: payment.status === 'Completed' ? 'Paid' : 'Pending',
      orderStatus: payment.status === 'Completed' ? 'Processing' : 'Pending'
    });

    // Atomically decrement stock for products
    for (const item of verifiedItems) {
      await Product.updateOne(
        { _id: item.id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders for Store Manager / Admin
// @route   GET /api/store/orders
// @access  Private / StoreManager, Admin
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get orders belonging to the signed-in customer
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userName: req.user.name }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Customer cancellation before dispatch/delivery
export const cancelMyOrder = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = await Order.findOne({ _id: req.params.id, userName: req.user.name });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['Pending', 'Processing'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'This order can no longer be cancelled.' });
    }
    order.orderStatus = 'Cancelled';
    await order.save();

    // Restock inventory
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const pId = item.productId || item.id;
        if (pId && item.quantity) {
          await Product.findByIdAndUpdate(pId, { $inc: { stock: item.quantity } });
        }
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestOrderRefund = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = await Order.findOne({ _id: req.params.id, userName: req.user.name });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.refundStatus === 'Approved') return res.status(400).json({ message: 'This order has already been refunded.' });
    order.refundStatus = 'Requested';
    order.refundReason = (req.body.reason || '').trim();
    await order.save();
    res.json(order);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Update Order Status
// @route   PUT /api/store/orders/:id/status
// @access  Private / StoreManager, Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, handledBy, courierName, trackingNumber, estimatedDeliveryDate, refundStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.orderStatus = orderStatus;
    if (handledBy) order.handledBy = handledBy;
    if (typeof courierName === 'string') order.courierName = courierName;
    if (typeof trackingNumber === 'string') order.trackingNumber = trackingNumber;
    if (estimatedDeliveryDate !== undefined) order.estimatedDeliveryDate = estimatedDeliveryDate || null;
    if (['Approved', 'Rejected'].includes(refundStatus) && order.refundStatus === 'Requested') {
      order.refundStatus = refundStatus;
      order.refundReviewedBy = req.user?.name || handledBy || 'Admin';
    }
    await order.save();

    logAuditTrail(handledBy || req.user?.name || 'Store Manager', req.user?.role || 'StoreManager', 'Updated Order Status', order.orderId, `Status: ${orderStatus}; Refund: ${order.refundStatus}`, req);
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Track Order status publicly by trackingCode or orderId
// @route   GET /api/store/track/:code
// @access  Public
export const trackOrderByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) return res.status(400).json({ message: 'Tracking code is required' });

    const cleanCode = code.trim();
    const order = await Order.findOne({
      $or: [
        { trackingCode: cleanCode },
        { orderId: cleanCode }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'No order found with this tracking code' });
    }

    res.json({
      type: 'StoreOrder',
      orderId: order.orderId,
      trackingCode: order.trackingCode || order.orderId,
      userName: order.userName,
      guestEmail: order.guestEmail,
      items: order.items,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      createdAt: order.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
