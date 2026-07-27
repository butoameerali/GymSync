import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { logAuditTrail } from '../middleware/securityMiddleware.js';

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
        return res.json(MOCK_STORE_ITEMS);
      }
    }

    res.json(products);
  } catch (error) {
    res.json(MOCK_STORE_ITEMS);
  }
};

// @desc    Create new product
// @route   POST /api/store/products
// @access  Private / StoreManager, Admin
export const createProduct = async (req, res) => {
  try {
    const { name, category, price, stock, image, badge, createdBy } = req.body;

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
      createdBy: createdBy || 'Store Manager'
    });

    logAuditTrail(createdBy || 'Store Manager', 'StoreManager', 'Created Product', name, `Price: $${price}`, req);
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
    const { status, managerName } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.status = status;
    await product.save();

    logAuditTrail(managerName || 'Store Manager', 'StoreManager', 'Updated Product Status', product.name, `New Status: ${status}`, req);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Order
// @route   POST /api/store/orders
// @access  Public / User
export const createOrder = async (req, res) => {
  try {
    const { userName, items, totalAmount, shippingAddress } = req.body;

    if (!userName || !items || items.length === 0 || !totalAmount || !shippingAddress) {
      return res.status(400).json({ message: 'Required order details missing' });
    }

    const count = await Order.countDocuments();
    const orderId = `ORD-${10000 + count + 1}`;

    const order = await Order.create({
      orderId,
      userName,
      items,
      totalAmount: Number(totalAmount),
      shippingAddress,
      paymentStatus: 'Paid',
      orderStatus: 'Processing'
    });

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

// @desc    Update Order Status
// @route   PUT /api/store/orders/:id/status
// @access  Private / StoreManager, Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, handledBy } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.orderStatus = orderStatus;
    if (handledBy) order.handledBy = handledBy;
    await order.save();

    logAuditTrail(handledBy || 'Store Manager', 'StoreManager', 'Updated Order Status', order.orderId, `Status: ${orderStatus}`, req);
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
