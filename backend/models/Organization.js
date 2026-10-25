import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  legalName: { type: String, default: '', trim: true },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ownerName: { type: String, required: true },
  businessEmail: { type: String, default: '', trim: true, lowercase: true },
  businessPhone: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['Active', 'PendingVerification', 'Suspended'],
    default: 'Active'
  },
  verifiedAt: { type: Date, default: null }
}, {
  timestamps: true
});

organizationSchema.index({ owner: 1, name: 1 });

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
