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
    default: 'Approved' 
  },
  createdBy: { type: String, default: 'Admin' }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;
