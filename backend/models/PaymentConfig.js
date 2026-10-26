import mongoose from 'mongoose';

const paymentConfigSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['Easypaisa', 'JazzCash', 'PlatformFee'],
    required: true,
    unique: true
  },
  accountNumber: { type: String, default: '' },
  bankDetails: { type: String, default: '' },
  notes: { type: String, default: '' },
  amount: { type: Number, default: 20 }
}, { timestamps: true });

export default mongoose.model('PaymentConfig', paymentConfigSchema);
