import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
  discountType: { type: String, enum: ['Percentage', 'Fixed'], required: true },
  discountValue: { type: Number, required: true },
  audience: { type: String, enum: ['AllUsers', 'NewMembersOnly', 'SingleUser'], default: 'AllUsers' },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usageLimit: { type: Number, default: 0 }, // 0 means unlimited
  timesUsed: { type: Number, default: 0 },
  validUntil: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  approvalStatus: { type: String, enum: ['Approved', 'Pending', 'Rejected'], default: 'Approved' },
  scope: { type: String, enum: ['GymLevel', 'PlatformLevel'], default: 'GymLevel' },
  platformCampaignId: { type: String, default: null }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
