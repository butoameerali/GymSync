import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Proteins', 'Supplements', 'Gym Wear', 'Accessories', 'Equipment'], 
    required: true 
  },
  price: { type: Number, required: true },
  rating: { type: Number, default: 4.8 },
  stock: { type: Number, default: 50 },
  image: { type: String, required: true },
  badge: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Approved', 'Pending', 'Rejected'], 
    default: 'Pending' 
  },
  createdBy: { type: String, default: 'Store Manager' },
  unitsSold: { type: Number, default: 0 },
  revenueGenerated: { type: Number, default: 0 },
  rejectionReason: { type: String, default: '' },
  approvedBy: { type: String, default: '' },
  approvedAt: { type: Date, default: null }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;
