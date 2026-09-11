import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Coupon from '../models/Coupon.js';
import Gym from '../models/Gym.js';
import User from '../models/User.js';
import { validateAndApplyCoupon } from '../controllers/couponController.js';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Setup test data
  const testUserId = new mongoose.Types.ObjectId();
  const testGymId = new mongoose.Types.ObjectId();

  // Create a mock coupon
  const coupon = await Coupon.create({
    code: 'TEST20',
    gymId: testGymId,
    discountType: 'Percentage',
    discountValue: 20,
    validUntil: new Date(Date.now() + 86400000),
    usageLimit: 1
  });

  try {
    console.log('Test 1: Valid Coupon Redemption');
    const result1 = await validateAndApplyCoupon('TEST20', testGymId, testUserId, true);
    console.log('Test 1 Passed: ', result1.timesUsed === 1);

    console.log('Test 2: Exceeding Usage Limit');
    try {
      await validateAndApplyCoupon('TEST20', testGymId, testUserId, true);
      console.log('Test 2 Failed: Should have thrown limit reached error');
    } catch (e) {
      console.log('Test 2 Passed: ', e.message.includes('limit reached'));
    }

    console.log('Test 3: Wrong Gym Scope');
    const anotherGymId = new mongoose.Types.ObjectId();
    try {
      await validateAndApplyCoupon('TEST20', anotherGymId, testUserId, true);
      console.log('Test 3 Failed: Should have thrown invalid coupon error');
    } catch (e) {
      console.log('Test 3 Passed: ', e.message.includes('Invalid or expired'));
    }

  } finally {
    // Cleanup
    await Coupon.findByIdAndDelete(coupon._id);
    await mongoose.disconnect();
    console.log('Tests finished');
  }
}

runTests().catch(console.error);
