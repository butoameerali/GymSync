import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  gymName: { type: String, default: 'GymSync Platform' },
  paymentType: { 
    type: String, 
    enum: ['GymMembership', 'PlatformSubscription', 'StoreOrder'], 
    default: 'GymMembership' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['Stripe', 'Easypaisa', 'JazzCash'], 
    required: true 
  },
  amount: { type: Number, required: true },
  commission15Percent: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Completed', 'PendingApproval', 'Rejected'], 
    default: 'Completed' 
  },
  screenshotUrl: { type: String, default: '' },
  transactionRef: { type: String, default: '' },
  methodDetails: { type: String, default: '' },
  approvedBy: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
