import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import User from '../models/User.js';
import { loginUser, verifyLoginOtp, resendLoginOtp } from '../controllers/authController.js';

dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function mockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.data = obj;
      return this;
    }
  };
  return res;
}

async function runTests() {
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('--- Connected to MongoDB for Brute-Force & OTP Hardening Tests ---');

  const testEmail = 'sec_test_admin@example.com';
  let user = await User.findOne({ email: testEmail });
  if (user) await User.findByIdAndDelete(user._id);

  user = await User.create({
    name: 'Security Test Admin',
    email: testEmail,
    password: 'ValidPassword123!',
    role: 'SuperAdmin'
  });

  try {
    console.log('\n[TEST 1] First 4 failed password attempts should track attempts');
    for (let i = 1; i <= 4; i++) {
      const res = mockResponse();
      await loginUser({ body: { email: testEmail, password: 'WrongPassword' } }, res);
      console.log(`  Attempt ${i}: Status = ${res.statusCode}, Message = "${res.data?.message}"`);
      if (res.statusCode !== 401 || !res.data?.message.includes(`${5 - i} attempt`)) {
        throw new Error(`Test 1 Failed on attempt ${i}`);
      }
    }
    console.log('✅ TEST 1 PASSED: 4 failed attempts correctly reported with remaining attempts.');

    console.log('\n[TEST 2] 5th failed password attempt triggers account lockout (HTTP 423)');
    {
      const res = mockResponse();
      await loginUser({ body: { email: testEmail, password: 'WrongPassword' } }, res);
      console.log(`  5th Attempt: Status = ${res.statusCode}, Message = "${res.data?.message}"`);
      if (res.statusCode !== 423 || !res.data?.message.includes('temporarily locked for 15 minutes')) {
        throw new Error('Test 2 Failed: Did not lock account on 5th failure');
      }
      const reloadedUser = await User.findOne({ email: testEmail });
      if (!reloadedUser.lockUntil || new Date(reloadedUser.lockUntil).getTime() <= Date.now()) {
        throw new Error('Test 2 Failed: lockUntil was not set in DB');
      }
    }
    console.log('✅ TEST 2 PASSED: 5th failed attempt sets 15-minute lockout.');

    console.log('\n[TEST 3] Login with CORRECT password while locked must be blocked (HTTP 423)');
    {
      const res = mockResponse();
      await loginUser({ body: { email: testEmail, password: 'ValidPassword123!' } }, res);
      console.log(`  Locked Login Attempt: Status = ${res.statusCode}, Message = "${res.data?.message}"`);
      if (res.statusCode !== 423 || !res.data?.message.includes('Account is temporarily locked')) {
        throw new Error('Test 3 Failed: Correct password was accepted while locked');
      }
    }
    console.log('✅ TEST 3 PASSED: Account lockout effectively blocks brute force attempts.');

    console.log('\n[TEST 4] Successful login after lock expires resets failed attempts & requires 2FA');
    {
      // Simulate lock expiry
      await User.updateOne({ email: testEmail }, { lockUntil: new Date(Date.now() - 1000) });
      const res = mockResponse();
      await loginUser({ body: { email: testEmail, password: 'ValidPassword123!' } }, res);
      console.log(`  Post-Lock Login: Status = ${res.statusCode}, requiresOtp = ${res.data?.requiresOtp}`);
      if (res.statusCode !== 200 || !res.data?.requiresOtp) {
        throw new Error('Test 4 Failed: Could not login with valid credentials after lock expired');
      }
      const reloadedUser = await User.findOne({ email: testEmail });
      if (reloadedUser.failedLoginAttempts !== 0) {
        throw new Error('Test 4 Failed: failedLoginAttempts was not cleared');
      }
    }
    console.log('✅ TEST 4 PASSED: Successful authentication clears lockout counter and initiates 2FA.');

    console.log('\n[TEST 5] 2FA OTP verification: 3 incorrect attempts invalidate the OTP');
    {
      const activeUser = await User.findOne({ email: testEmail });
      const tempToken = 'mockToken'; // tempToken optional or checked

      // Attempt 1: wrong OTP
      let res1 = mockResponse();
      await verifyLoginOtp({ body: { email: testEmail, otp: '000000', tempToken } }, res1);
      console.log(`  OTP Attempt 1: Status = ${res1.statusCode}, Message = "${res1.data?.message}"`);
      if (res1.statusCode !== 400 || !res1.data?.message.includes('2 attempts remaining')) {
        throw new Error('Test 5 Failed on OTP Attempt 1');
      }

      // Attempt 2: wrong OTP
      let res2 = mockResponse();
      await verifyLoginOtp({ body: { email: testEmail, otp: '000000', tempToken } }, res2);
      console.log(`  OTP Attempt 2: Status = ${res2.statusCode}, Message = "${res2.data?.message}"`);
      if (res2.statusCode !== 400 || !res2.data?.message.includes('1 attempt remaining')) {
        throw new Error('Test 5 Failed on OTP Attempt 2');
      }

      // Attempt 3: wrong OTP -> Invalidation (HTTP 429)
      let res3 = mockResponse();
      await verifyLoginOtp({ body: { email: testEmail, otp: '000000', tempToken } }, res3);
      console.log(`  OTP Attempt 3: Status = ${res3.statusCode}, Message = "${res3.data?.message}"`);
      if (res3.statusCode !== 429 || !res3.data?.message.includes('invalidated')) {
        throw new Error('Test 5 Failed on OTP Attempt 3: Did not invalidate on 3rd attempt');
      }

      const wipedUser = await User.findOne({ email: testEmail });
      if (wipedUser.otpCode !== null) {
        throw new Error('Test 5 Failed: otpCode was not wiped from DB');
      }
    }
    console.log('✅ TEST 5 PASSED: OTP strictly invalidated after 3 failed attempts.');

    console.log('\n[TEST 6] Resend OTP cooldown enforcement (60 seconds)');
    {
      // Setup a user with lastOtpSentAt = now
      await User.updateOne({ email: testEmail }, { lastOtpSentAt: new Date() });
      const resCooldown = mockResponse();
      await resendLoginOtp({ body: { email: testEmail } }, resCooldown);
      console.log(`  Immediate Resend: Status = ${resCooldown.statusCode}, Message = "${resCooldown.data?.message}"`);
      if (resCooldown.statusCode !== 429 || !resCooldown.data?.message.includes('Please wait')) {
        throw new Error('Test 6 Failed: Resend cooldown was not enforced');
      }

      // Simulate 61 seconds passed
      await User.updateOne({ email: testEmail }, { lastOtpSentAt: new Date(Date.now() - 65000) });
      const resAllowed = mockResponse();
      await resendLoginOtp({ body: { email: testEmail } }, resAllowed);
      console.log(`  After 65s Resend: Status = ${resAllowed.statusCode}, Message = "${resAllowed.data?.message}"`);
      if (resAllowed.statusCode !== 200) {
        throw new Error('Test 6 Failed: Resend after cooldown was rejected');
      }
    }
    console.log('✅ TEST 6 PASSED: OTP resend cooldown strictly enforces 60-second limit.');

  } finally {
    await User.findByIdAndDelete(user._id);
    await mongoose.disconnect();
    console.log('\n--- Cleaned up test user and disconnected ---');
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
