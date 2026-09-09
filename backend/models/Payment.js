import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  gymName: { type: String, default: 'GymSync Platform' },
  paymentType: { 
    type: String, 
    enum: ['GymMembership', 'GymRegistration', 'PlatformSubscription', 'StoreOrder'], 
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
  transactionRef: { type: String, default: undefined },
  methodDetails: { type: String, default: '' },
  startNextMonth: { type: Boolean, default: false },
  membershipType: { type: String, enum: ['Monthly', 'Yearly'], default: 'Monthly' },
  approvedBy: { type: String, default: '' },
  trackingCode: { type: String, default: undefined },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  cardholderName: { type: String, default: '' }
}, { timestamps: true });

paymentSchema.pre('validate', function() {
  if (this.transactionRef === '') this.transactionRef = undefined;
  if (this.trackingCode === '') this.trackingCode = undefined;
});

paymentSchema.index({ transactionRef: 1 }, { unique: true, sparse: true });
paymentSchema.index({ trackingCode: 1 }, { unique: true, sparse: true });

export default mongoose.model('Payment', paymentSchema);
