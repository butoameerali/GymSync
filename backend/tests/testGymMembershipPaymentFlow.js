import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5130';

async function runTests() {
  console.log('======================================================================');
  console.log('💳 GYMSYNC MEMBERSHIP PAYMENTS & OWNER VERIFICATION TEST SUITE');
  console.log('======================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Dynamically start a backend instance if needed
  const { default: app } = await import('../index.js');
  const server = app.listen(5130);
  console.log('🚀 Test server running at ' + BASE_URL);

  const testSuffix = Date.now();
  const ownerEmail = `testowner_${testSuffix}@gymsync.test`;
  const traineeEmail = `trainee_${testSuffix}@gymsync.test`;
  const jwtSecret = process.env.JWT_SECRET || 'jwt_secret_dev_key';

  try {
    // 1. Create Test Owner & Gym
    const owner = await User.create({
      name: `Owner_${testSuffix}`,
      email: ownerEmail,
      password: 'Password123!',
      role: 'GymOwner',
      isEmailVerified: true
    });
    const ownerToken = jwt.sign({ id: owner._id, role: owner.role }, jwtSecret, { expiresIn: '1h' });

    const gym = await Gym.create({
      name: `Powerhouse Fitness ${testSuffix}`,
      owner: owner._id,
      ownerName: owner.name,
      location: 'Main Boulevard, Gulberg III, Lahore',
      approvalStatus: 'Approved',
      isOnline: false,
      subscriptionPaid: false,
      listingStatus: 'Pending Payment',
      monthlyFee: 4000,
      admissionFee: 1500,
      securityDeposit: 2000,
      annualSubscriptionFee: 5000
    });

    // 2. Create Test Trainee
    const trainee = await User.create({
      name: `Trainee_${testSuffix}`,
      email: traineeEmail,
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true
    });
    const traineeToken = jwt.sign({ id: trainee._id, role: trainee.role }, jwtSecret, { expiresIn: '1h' });

    console.log('--- 1. GYM OWNER ANNUAL LISTING FEE & GO ONLINE ---');
    // Gym is currently offline / pending payment -> should NOT be visible on public listing
    const publicList1Res = await fetch(`${BASE_URL}/api/gyms`);
    const publicList1 = await publicList1Res.json();
    const isPublicBefore = publicList1.some(g => String(g._id) === String(gym._id));
    assert(isPublicBefore === false, 'Offline/Unpaid approved gym is strictly hidden from public Explore Gyms');
    console.log('  ✅ PASS: Unpaid gym is not visible on Explore Gyms');

    // Gym owner pays annual fee with Online transfer TID
    const ownerPayRes = await fetch(`${BASE_URL}/api/gym-owner/gym/${gym._id}/pay-annual-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        paymentMethod: 'Easypaisa',
        transactionRef: `TID-ANNUAL-${testSuffix}`
      })
    });
    assert(ownerPayRes.status === 200, 'Owner annual fee payment endpoint responds with 200');
    const ownerPayData = await ownerPayRes.json();
    assert(ownerPayData.gym.isOnline === true, 'Gym is marked isOnline: true upon annual fee payment');
    assert(ownerPayData.gym.subscriptionPaid === true, 'Gym is marked subscriptionPaid: true upon payment');
    console.log('  ✅ PASS: Owner annual listing fee confirms gym to isOnline: true');

    // Now gym must be visible in Explore Gyms
    const publicList2Res = await fetch(`${BASE_URL}/api/gyms`);
    const publicList2 = await publicList2Res.json();
    const isPublicAfter = publicList2.some(g => String(g._id) === String(gym._id));
    assert(isPublicAfter === true, 'Approved & Paid gym is now visible on Explore Gyms');
    console.log('  ✅ PASS: Gym is now live on Explore Gyms');

    console.log('\n--- 2. TRAINEE CARD PAYMENT (INSTANT ACTIVATION) ---');
    const cardPayRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({
        paymentId: `PAY-CARD-${testSuffix}`,
        gymId: gym._id,
        gymName: gym.name,
        paymentType: 'GymMembership',
        paymentMethod: 'Card',
        amount: 7500,
        membershipType: 'Monthly',
        joiningDate: new Date().toISOString()
      })
    });
    assert(cardPayRes.status === 201, 'Card payment returns 201 Created');
    const cardPayData = await cardPayRes.json();
    assert(cardPayData.status === 'Completed', 'Card payment is immediately marked Completed');

    const updatedTrainee = await User.findById(trainee._id);
    assert(updatedTrainee.isSubscribed === true, 'Trainee isSubscribed is true');
    assert(updatedTrainee.subscribedGymName === gym.name, 'Trainee subscribedGymName matches gym');
    assert(updatedTrainee.gymMembershipType === 'Monthly', 'Trainee gymMembershipType matches');
    assert(Boolean(updatedTrainee.gymMembershipExpiresAt), 'Trainee gymMembershipExpiresAt is set');
    console.log('  ✅ PASS: Trainee card payment activates membership instantly');

    console.log('\n--- 3. TRAINEE ONLINE TRANSFER (TID VERIFICATION FLOW) ---');
    const trainee2 = await User.create({
      name: `TraineeOnline_${testSuffix}`,
      email: `online_${testSuffix}@gymsync.test`,
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true
    });
    const trainee2Token = jwt.sign({ id: trainee2._id, role: trainee2.role }, jwtSecret, { expiresIn: '1h' });

    const onlinePayRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trainee2Token}`
      },
      body: JSON.stringify({
        paymentId: `PAY-TID-${testSuffix}`,
        gymId: gym._id,
        gymName: gym.name,
        paymentType: 'GymMembership',
        paymentMethod: 'Easypaisa',
        amount: 7500,
        transactionRef: `TID-RECEIPT-${testSuffix}`,
        membershipType: 'Monthly',
        joiningDate: new Date().toISOString()
      })
    });
    assert(onlinePayRes.status === 201, 'Online transfer payment returns 201');
    const onlinePayData = await onlinePayRes.json();
    assert(onlinePayData.status === 'PendingApproval', 'Online transfer status is PendingApproval');

    // Owner checks pending payments
    const ownerPaymentsRes = await fetch(`${BASE_URL}/api/gym-owner/payments`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert(ownerPaymentsRes.status === 200, 'Owner payments endpoint responds 200');
    const ownerPaymentsData = await ownerPaymentsRes.json();
    const pendingTidItem = ownerPaymentsData.pendingOnline.find(p => p.transactionRef === `TID-RECEIPT-${testSuffix}`);
    assert(Boolean(pendingTidItem), 'Owner receives pending online transfer with TID');
    console.log('  ✅ PASS: Gym owner receives online payment with TID');

    // Owner confirms TID
    const confirmTidRes = await fetch(`${BASE_URL}/api/gym-owner/payments/${pendingTidItem._id}/confirm`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert(confirmTidRes.status === 200, 'Owner confirms TID with 200 OK');

    const confirmedTrainee2 = await User.findById(trainee2._id);
    assert(confirmedTrainee2.isSubscribed === true, 'Trainee 2 isSubscribed is true after owner confirmation');
    assert(confirmedTrainee2.subscribedGymName === gym.name, 'Trainee 2 subscribedGymName matches gym');
    console.log('  ✅ PASS: Gym owner verifies TID and activates trainee membership');

    console.log('\n--- 4. TRAINEE CASH PASS (ON-SITE RECEPTION PAYMENT) ---');
    const trainee3 = await User.create({
      name: `TraineeCash_${testSuffix}`,
      email: `cash_${testSuffix}@gymsync.test`,
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true
    });
    const trainee3Token = jwt.sign({ id: trainee3._id, role: trainee3.role }, jwtSecret, { expiresIn: '1h' });

    // Custom future join date (e.g. 5 days from today)
    const futureStartDate = new Date();
    futureStartDate.setDate(futureStartDate.getDate() + 5);

    const cashPayRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trainee3Token}`
      },
      body: JSON.stringify({
        paymentId: `PAY-CASH-${testSuffix}`,
        gymId: gym._id,
        gymName: gym.name,
        paymentType: 'GymMembership',
        paymentMethod: 'Cash',
        amount: 7500,
        membershipType: 'Monthly',
        joiningDate: futureStartDate.toISOString()
      })
    });
    assert(cashPayRes.status === 201, 'Cash pass booking returns 201');
    const cashPayData = await cashPayRes.json();
    assert(cashPayData.status === 'PendingCash', 'Cash pass status is PendingCash');
    assert(Boolean(cashPayData.trackingCode), 'Cash pass generates tracking code');

    // Owner checks pending cash passes
    const ownerCashCheckRes = await fetch(`${BASE_URL}/api/gym-owner/payments`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const ownerCashData = await ownerCashCheckRes.json();
    const pendingCashItem = ownerCashData.pendingCash.find(p => p.trackingCode === cashPayData.trackingCode);
    assert(Boolean(pendingCashItem), 'Owner finds pending cash pass at reception');
    console.log('  ✅ PASS: Gym owner sees pending cash pass booking');

    // Trainee visits reception -> Owner confirms cash received
    const confirmCashRes = await fetch(`${BASE_URL}/api/gym-owner/payments/${pendingCashItem._id}/confirm`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert(confirmCashRes.status === 200, 'Owner confirms cash payment with 200 OK');

    const confirmedTrainee3 = await User.findById(trainee3._id);
    assert(confirmedTrainee3.isSubscribed === true, 'Trainee 3 membership activated upon cash payment');
    assert(confirmedTrainee3.futureSubscribedGymName === gym.name, 'Trainee 3 has futureSubscribedGymName for future start date');
    console.log('  ✅ PASS: Reception cash payment confirms and sets proper start date');

    console.log('\n--- 5. OWNER ACTIVE MEMBERS DIRECTORY ---');
    const membersRes = await fetch(`${BASE_URL}/api/gym-owner/members`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert(membersRes.status === 200, 'Owner members directory responds with 200');
    const membersData = await membersRes.json();
    assert(membersData.members.length >= 3, 'Owner members list includes all 3 activated trainees');
    console.log('  ✅ PASS: Owner members directory lists all enrolled members accurately');

    // Clean up
    await Gym.deleteMany({ _id: gym._id });
    await User.deleteMany({ _id: { $in: [owner._id, trainee._id, trainee2._id, trainee3._id] } });
    await Payment.deleteMany({ gymName: gym.name });

    console.log('\n======================================================================');
    console.log('🎉 ALL MEMBERSHIP PAYMENT & OWNER VERIFICATION TESTS PASSED!');
    console.log('======================================================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
