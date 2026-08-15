import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  paymentId: { type: String, required: true, index: true },
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: { type: Number, required: true },
  shippingAddress: { type: String, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Paid' },
  orderStatus: { 
    type: String, 
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], 
    default: 'Processing' 
  },
  handledBy: { type: String, default: 'Store Manager' }
  ,courierName: { type: String, default: '' }
  ,trackingNumber: { type: String, default: '' }
  ,estimatedDeliveryDate: { type: Date, default: null }
  ,refundStatus: { type: String, enum: ['None', 'Requested', 'Approved', 'Rejected'], default: 'None' }
  ,refundReason: { type: String, default: '' }
  ,refundReviewedBy: { type: String, default: '' }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
