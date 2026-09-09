import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from '../index.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Complaint from '../models/Complaint.js';
import Gym from '../models/Gym.js';

const TEST_PORT = 5108;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase2HardeningTests() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC PHASE 2 LOGIC, INVENTORY & ACCESS CONTROL HARDENING');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  let server;

  try {
    // 1. Start test HTTP server
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`🚀 Test Server running at ${BASE_URL}\n`);
        resolve();
      });
    });

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    console.log(`📡 MongoDB Connected: ${mongoose.connection.name}`);

    const jwtSecret = process.env.JWT_SECRET || 'supersecretgymsyncjwtkey';

    // 2. Setup Test Users
    console.log('\n--- Setting Up Test Users ---');
    await User.deleteMany({ email: { $in: ['user_a_p2@test.com', 'user_b_p2@test.com'] } });

    const userA = await User.create({
      name: 'User A P2',
      email: 'user_a_p2@test.com',
      password: 'Password123!',
      role: 'User'
    });
    const tokenA = jwt.sign({ id: userA._id, role: userA.role, name: userA.name }, jwtSecret, { expiresIn: '1h' });

    const userB = await User.create({
      name: 'User B P2',
      email: 'user_b_p2@test.com',
      password: 'Password123!',
      role: 'User'
    });
    const tokenB = jwt.sign({ id: userB._id, role: userB.role, name: userB.name }, jwtSecret, { expiresIn: '1h' });

    let adminUser = await User.findOne({ role: 'SuperAdmin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin P2',
        email: 'admin_p2@test.com',
        password: 'Password123!',
        role: 'SuperAdmin'
      });
    }
    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role, name: adminUser.name }, jwtSecret, { expiresIn: '1h' });

    // =========================================================================
    // TEST SECTION 1: FORCE-FRIEND PREVENTION & SOCIAL HARDENING
    // =========================================================================
    console.log('\n--- Section 1: Force-Friend Vulnerability Prevention ---');
    {
      // User B attempts to accept a non-existent friend request from User A
      const res = await fetch(`${BASE_URL}/api/users/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ senderName: userA.name })
      });
      const data = await res.json();
      assert(res.status === 400, `Force-friend exploit blocked with HTTP 400 (got ${res.status})`);
      assert(data.message.includes('No pending friend request'), 'Returned expected error message for missing request');

      const checkA = await User.findById(userA._id);
      const checkB = await User.findById(userB._id);
      assert(!checkA.friends.includes(userB.name), 'User A friends list does NOT contain User B');
      assert(!checkB.friends.includes(userA.name), 'User B friends list does NOT contain User A');
    }

    {
      // Legitimate friend request flow
      const reqRes = await fetch(`${BASE_URL}/api/users/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ receiverName: userB.name })
      });
      assert(reqRes.status === 200, 'User A sent friend request successfully');

      const acceptRes = await fetch(`${BASE_URL}/api/users/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ senderName: userA.name })
      });
      assert(acceptRes.status === 200, 'User B accepted legitimate friend request');

      const checkA = await User.findById(userA._id);
      const checkB = await User.findById(userB._id);
      assert(checkA.friends.includes(userB.name), 'User A has User B as friend after legitimate accept');
      assert(checkB.friends.includes(userA.name), 'User B has User A as friend after legitimate accept');
    }

    // =========================================================================
    // TEST SECTION 2: STORE INVENTORY ATOMICITY & REPLENISHMENT
    // =========================================================================
    console.log('\n--- Section 2: Store Inventory Atomicity & Stock Depletion ---');
    let testProduct;
    let orderPayment;
    let createdOrderId;

    {
      // Create test product with stock = 5
      await Product.deleteMany({ name: 'P2 Whey Protein Isolate' });
      testProduct = await Product.create({
        name: 'P2 Whey Protein Isolate',
        category: 'Proteins',
        price: 50.00,
        stock: 5,
        image: 'https://cdn.gymsync.io/protein.png',
        status: 'Approved'
      });

      // Attempt to order 10 units (out of stock)
      const payFail = await Payment.create({
        paymentId: `PAY-FAIL-${Date.now()}`,
        userName: userA.name,
        paymentType: 'StoreOrder',
        paymentMethod: 'Easypaisa',
        amount: 500.00,
        status: 'PendingApproval'
      });

      const failRes = await fetch(`${BASE_URL}/api/store/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          items: [{ id: testProduct._id, name: testProduct.name, price: 50.00, quantity: 10 }],
          totalAmount: 500.00,
          shippingAddress: '123 Test St',
          paymentId: payFail.paymentId
        })
      });
      assert(failRes.status === 400, `Overselling rejected with HTTP 400 (got ${failRes.status})`);
      const failData = await failRes.json();
      assert(failData.message.includes('Insufficient stock'), 'Error message clearly indicates insufficient stock');

      // Place legitimate order for 2 units
      orderPayment = await Payment.create({
        paymentId: `PAY-OK-${Date.now()}`,
        userName: userA.name,
        paymentType: 'StoreOrder',
        paymentMethod: 'Easypaisa',
        amount: 100.00,
        status: 'PendingApproval'
      });

      const orderRes = await fetch(`${BASE_URL}/api/store/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          items: [{ id: testProduct._id, name: testProduct.name, price: 50.00, quantity: 2 }],
          totalAmount: 100.00,
          shippingAddress: '123 Test St',
          paymentId: orderPayment.paymentId
        })
      });
      assert(orderRes.status === 201, `Valid order placed with HTTP 201 (got ${orderRes.status})`);
      const orderData = await orderRes.json();
      createdOrderId = orderData._id;

      // Verify stock was decremented from 5 to 3
      const productAfterOrder = await Product.findById(testProduct._id);
      assert(productAfterOrder.stock === 3, `Product stock decremented from 5 to 3 (actual: ${productAfterOrder.stock})`);
    }

    {
      // Cancel the order and verify stock is replenished back to 5
      const cancelRes = await fetch(`${BASE_URL}/api/store/orders/${createdOrderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenA}`
        }
      });
      assert(cancelRes.status === 200, 'Order cancelled successfully with HTTP 200');

      const productAfterCancel = await Product.findById(testProduct._id);
      assert(productAfterCancel.stock === 5, `Product stock replenished back to 5 (actual: ${productAfterCancel.stock})`);
    }

    // =========================================================================
    // TEST SECTION 3: COMPLAINT CHAT IDOR & SPOOFING PREVENTION
    // =========================================================================
    console.log('\n--- Section 3: Complaint Chat IDOR & Identity Protection ---');
    let testComplaint;
    {
      // User A submits a complaint
      testComplaint = await Complaint.create({
        complaintId: `CMP-${Date.now()}`,
        reporterName: userA.name,
        reportedEntityType: 'Post',
        reportedEntityId: 'post_123',
        reportedEntityTitle: 'Offensive Post',
        reason: 'Harassment',
        description: 'User posted inappropriate content',
        status: 'Pending'
      });

      // User B attempts to post to User A's complaint
      const idorRes = await fetch(`${BASE_URL}/api/complaints/${testComplaint._id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          text: 'Malicious intrusion into ticket'
        })
      });
      assert(idorRes.status === 403, `IDOR Blocked: Third-party user rejected with HTTP 403 (got ${idorRes.status})`);

      // User A posts to their own complaint
      const legitRes = await fetch(`${BASE_URL}/api/complaints/${testComplaint._id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          senderName: 'Fake Admin Name', // Should be ignored and forced to User A
          text: 'Here is additional context about the issue'
        })
      });
      assert(legitRes.status === 200, 'Ticket reporter posted chat message successfully');
      const updatedComplaint = await Complaint.findById(testComplaint._id);
      const lastMsg = updatedComplaint.chatMessages[updatedComplaint.chatMessages.length - 1];
      assert(lastMsg.senderName === userA.name, `Sender identity strictly forced to authenticated user (${lastMsg.senderName})`);
      assert(lastMsg.role === 'User', 'Role assigned correctly as User');
    }

    // =========================================================================
    // TEST SECTION 4: GYM ROUTE AUTHENTICATION & ACCESS CONTROL
    // =========================================================================
    console.log('\n--- Section 4: Gym Facility Route Security & Owner Scoping ---');
    {
      // 1. Unauthenticated request to /api/gyms/my-gym/:userId
      const unauthRes = await fetch(`${BASE_URL}/api/gyms/my-gym/${userA._id}`);
      assert(unauthRes.status === 401, `Unauthenticated request rejected with HTTP 401 (got ${unauthRes.status})`);

      // 2. Cross-user probe: User B attempting to view User A's gym
      const crossRes = await fetch(`${BASE_URL}/api/gyms/my-gym/${userA._id}`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      assert(crossRes.status === 403, `Cross-user probe rejected with HTTP 403 Forbidden (got ${crossRes.status})`);

      // 3. Legitimate user viewing own gym details
      const selfRes = await fetch(`${BASE_URL}/api/gyms/my-gym/${userA._id}`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      // Will return 404 if no gym exists yet, but must NOT return 401 or 403
      assert(selfRes.status === 404 || selfRes.status === 200, `Authorized owner request permitted (HTTP ${selfRes.status})`);

      // 4. Admin viewing user's gym details
      const adminRes = await fetch(`${BASE_URL}/api/gyms/my-gym/${userA._id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert(adminRes.status === 404 || adminRes.status === 200, `Admin permitted to view facility details (HTTP ${adminRes.status})`);
    }

  } catch (err) {
    console.error('Fatal Test Error:', err);
    failed++;
  } finally {
    // Teardown
    console.log('\n--- Cleaning Up Phase 2 Test Data ---');
    await User.deleteMany({ email: { $in: ['user_a_p2@test.com', 'user_b_p2@test.com'] } });
    await Product.deleteMany({ name: 'P2 Whey Protein Isolate' });
    await Payment.deleteMany({ paymentId: { $regex: '^PAY-(FAIL|OK)-' } });
    await Order.deleteMany({ userName: 'User A P2' });
    await Complaint.deleteMany({ reporterName: 'User A P2' });

    if (server) {
      server.close();
      console.log('🛑 Test server stopped.');
    }
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed.');

    console.log('\n===============================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase2HardeningTests();
