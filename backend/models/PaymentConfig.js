import mongoose from 'mongoose';

const paymentConfigSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['Easypaisa', 'JazzCash'],
    required: true,
    unique: true
  },
  accountNumber: { type: String, default: '' },
  bankDetails: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('PaymentConfig', paymentConfigSchema);
