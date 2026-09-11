import Coupon from '../models/Coupon.js';
import Gym from '../models/Gym.js';
import mongoose from 'mongoose';

// @desc    Create a new coupon
// @route   POST /api/gym-owner/coupons
// @access  Private / GymOwner
export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, audience, usageLimit, validUntil, targetUserId } = req.body;
    
    const gym = await Gym.findOne({ owner: req.user._id });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code,
      gymId: gym._id,
      discountType,
      discountValue,
      audience,
      usageLimit,
      validUntil,
      targetUserId: targetUserId || null
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('createCoupon error:', error);
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

// @desc    Get all coupons for a gym
// @route   GET /api/gym-owner/coupons
// @access  Private / GymOwner
export const getCoupons = async (req, res) => {
  try {
    const gym = await Gym.findOne({ owner: req.user._id });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    const coupons = await Coupon.find({ gymId: gym._id }).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    console.error('getCoupons error:', error);
    res.status(500).json({ message: 'Failed to fetch coupons' });
  }
};

// @desc    Deactivate a coupon
// @route   PUT /api/gym-owner/coupons/:id/deactivate
// @access  Private / GymOwner
export const deactivateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const gym = await Gym.findOne({ owner: req.user._id });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    const coupon = await Coupon.findOne({ _id: id, gymId: gym._id });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.isActive = false;
    await coupon.save();
    res.json({ message: 'Coupon deactivated successfully', coupon });
  } catch (error) {
    console.error('deactivateCoupon error:', error);
    res.status(500).json({ message: 'Failed to deactivate coupon' });
  }
};

// Internal utility for use during checkout/payment confirmation
export const validateAndApplyCoupon = async (code, gymId, userId, isNewMember) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), gymId, isActive: true });
  if (!coupon) throw new Error('Invalid or expired coupon');

  if (new Date() > coupon.validUntil) {
    throw new Error('Coupon has expired');
  }

  if (coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) {
    throw new Error('Coupon usage limit reached');
  }

  if (coupon.audience === 'NewMembersOnly' && !isNewMember) {
    throw new Error('Coupon is for new members only');
  }

  if (coupon.audience === 'SingleUser' && coupon.targetUserId && coupon.targetUserId.toString() !== userId.toString()) {
    throw new Error('Coupon is not valid for this user');
  }

  if (coupon.approvalStatus === 'Rejected') {
    throw new Error('Coupon is rejected');
  }
  
  if (coupon.approvalStatus === 'Pending') {
      throw new Error('Coupon is pending approval');
  }

  // Safe increment
  const updatedCoupon = await Coupon.findOneAndUpdate(
    { _id: coupon._id, timesUsed: { $lt: coupon.usageLimit > 0 ? coupon.usageLimit : Number.MAX_SAFE_INTEGER } },
    { $inc: { timesUsed: 1 } },
    { new: true }
  );

  if (!updatedCoupon && coupon.usageLimit > 0) {
    throw new Error('Coupon usage limit reached during redemption');
  }

  return updatedCoupon;
};
