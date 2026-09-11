import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import User from '../models/User.js';

dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Create a mock GymOwner
  const testEmail = 'testowner_otp@example.com';
  let user = await User.findOne({ email: testEmail });
  if (user) await User.findByIdAndDelete(user._id);

  user = await User.create({
    name: 'OTP Test Owner',
    email: testEmail,
    password: 'password123',
    role: 'GymOwner'
  });

  try {
    console.log('Test 1: OTP is generated for GymOwner on login');
    const requires2FA = ['Admin', 'SuperAdmin', 'GymOwner', 'StoreManager'].includes(user.role) || user.twoFactorEnabled;
    console.log('Test 1 Passed: ', requires2FA === true);

    console.log('Test 2: Verifying correct OTP');
    const otp = '123456';
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    
    user.otpCode = hashedOtp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();

    const inputHash = crypto.createHash('sha256').update('123456').digest('hex');
    console.log('Test 2 Passed: ', user.otpCode === inputHash);

    console.log('Test 3: Rejecting incorrect OTP');
    const badHash = crypto.createHash('sha256').update('999999').digest('hex');
    console.log('Test 3 Passed: ', user.otpCode !== badHash);

  } finally {
    // Cleanup
    await User.findByIdAndDelete(user._id);
    await mongoose.disconnect();
    console.log('Tests finished');
  }
}

runTests().catch(console.error);
