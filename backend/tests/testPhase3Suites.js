import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from '../index.js';

import User from '../models/User.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import SavedAIPlan from '../models/SavedAIPlan.js';

const TEST_PORT = 5110;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase3Suites() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC PHASE 3 COMPREHENSIVE INTEGRATION & SECURITY SUITE');
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

    // 1. Setup Test Users
    console.log('\n--- 1. Setting Up Test Users ---');
    await User.deleteMany({ email: { $in: ['phase3_alice@test.com', 'phase3_bob@test.com', 'phase3_dupe@test.com'] } });
    await User.deleteMany({ name: { $in: ['Alice Phase3', 'Bob Phase3', 'Dupe User'] } });

    const alice = await User.create({
      name: 'Alice Phase3',
      email: 'phase3_alice@test.com',
      password: 'Password123!',
      role: 'User'
    });
    const tokenAlice = jwt.sign({ id: alice._id, role: alice.role, name: alice.name }, jwtSecret, { expiresIn: '1h' });

    const bob = await User.create({
      name: 'Bob Phase3',
      email: 'phase3_bob@test.com',
      password: 'Password123!',
      role: 'User'
    });
    const tokenBob = jwt.sign({ id: bob._id, role: bob.role, name: bob.name }, jwtSecret, { expiresIn: '1h' });

    assert(alice && bob, 'Test users Alice and Bob created successfully');

    // 2. Chat Immediate Assistant Reply & senderId Persistence
    console.log('\n--- 2. Chat Immediate Reply & senderId Persistence ---');
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAlice}`
      },
      body: JSON.stringify({
        sender: 'Alice Phase3',
        receiver: 'AI Trainer',
        text: 'Hello coach, what workout should I do today?'
      })
    });

    const chatData = await chatRes.json();
    assert(chatRes.status === 200 || chatRes.status === 201, `POST /api/chat succeeded (HTTP ${chatRes.status})`);
    assert(chatData.aiReply && typeof chatData.aiReply.text === 'string', 'POST /api/chat returns immediate aiReply synchronously');
    
    // Verify senderId persisted in database
    const savedMsg = await Message.findById(chatData.message?._id || chatData._id);
    assert(savedMsg && String(savedMsg.senderId) === String(alice._id), 'Message in database correctly stores senderId as ObjectId');

    // 3. Social Like Parity (PUT & POST)
    console.log('\n--- 3. Social Like Contract Parity (PUT & POST) ---');
    const testPost = await Post.create({
      author: alice._id,
      authorName: alice.name,
      content: 'Testing PUT and POST like contract',
      likes: []
    });

    // Test PUT /api/posts/:id/like
    const putLikeRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/like`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenBob}` }
    });
    const putLikeData = await putLikeRes.json();
    assert(putLikeRes.status === 200, `PUT /api/posts/:id/like returns 200 (HTTP ${putLikeRes.status})`);
    assert(putLikeData.likes && (putLikeData.likes.includes('Bob Phase3') || putLikeData.likes.includes(String(bob._id))), 'PUT like added Bob to post likes');

    // Test POST /api/posts/:id/like (symmetric toggle)
    const postLikeRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenBob}` }
    });
    const postLikeData = await postLikeRes.json();
    assert(postLikeRes.status === 200, `POST /api/posts/:id/like returns 200 (HTTP ${postLikeRes.status})`);
    assert(postLikeData.likes && !postLikeData.likes.includes('Bob Phase3') && !postLikeData.likes.includes(String(bob._id)), 'POST like unliked Bob symmetrically');

    // 4. Comment Replies CRUD & Post Reporting Parity
    console.log('\n--- 4. Supabase / Mongo Comment Replies CRUD & Reporting ---');
    const commentObjectId = new mongoose.Types.ObjectId();
    await Post.findByIdAndUpdate(testPost._id, {
      $push: {
        comments: {
          _id: commentObjectId,
          author: String(alice._id),
          authorName: 'Alice Phase3',
          text: 'Original Comment',
          date: new Date(),
          replies: []
        }
      }
    });
    const commentId = String(commentObjectId);

    // 4a. Add Reply
    const replyRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/comment/${commentId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBob}`
      },
      body: JSON.stringify({ text: 'Great advice!' })
    });
    const updatedComments = await replyRes.json();
    assert(replyRes.status === 200, `POST comment reply returns 200 (HTTP ${replyRes.status})`);
    const targetComment = updatedComments.find(c => String(c._id) === String(commentId));
    const createdReply = targetComment?.replies?.[targetComment.replies.length - 1];
    const createdReplyId = createdReply?._id;
    assert(createdReplyId, 'Reply ID generated and returned in updated comments');

    // 4b. Edit Reply
    const editReplyRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/comment/${commentId}/reply/${createdReplyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBob}`
      },
      body: JSON.stringify({ text: 'Great advice! (Edited)' })
    });
    assert(editReplyRes.status === 200, `PUT comment reply returns 200 (HTTP ${editReplyRes.status})`);

    // 4c. Delete Reply
    const deleteReplyRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/comment/${commentId}/reply/${createdReplyId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenBob}` }
    });
    assert(deleteReplyRes.status === 200, `DELETE comment reply returns 200 (HTTP ${deleteReplyRes.status})`);

    // 4d. Report Post
    const reportRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBob}`
      },
      body: JSON.stringify({ reason: 'Spam test' })
    });
    assert(reportRes.status === 200, `POST report post returns 200 (HTTP ${reportRes.status})`);

    // 5. Saved AI Plan CRUD & Ownership Authorization
    console.log('\n--- 5. Saved AI Plan CRUD & Ownership Authorization ---');
    const savePlanRes = await fetch(`${BASE_URL}/api/ai/saved-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAlice}`
      },
      body: JSON.stringify({
        title: 'Alice 4-Week Hypertrophy Plan',
        goal: 'Muscle Hypertrophy',
        fitnessLevel: 'Intermediate',
        workout: { sessionTitle: 'Upper Body A', exercises: [] },
        diet: { calories: 2500, protein: 160 }
      })
    });
    const savedPlan = await savePlanRes.json();
    assert(savePlanRes.status === 201, `Alice saves AI plan successfully (HTTP ${savePlanRes.status})`);
    assert(savedPlan._id, 'Saved plan has valid ID');

    // Alice lists her saved plans
    const listPlansRes = await fetch(`${BASE_URL}/api/ai/saved-plans`, {
      headers: { 'Authorization': `Bearer ${tokenAlice}` }
    });
    const plansList = await listPlansRes.json();
    assert(listPlansRes.status === 200, `Alice lists saved plans (HTTP ${listPlansRes.status})`);
    assert(Array.isArray(plansList) && plansList.some(p => p._id === savedPlan._id), 'Alice saved plan present in list');

    // Bob tries to delete Alice's plan -> Must be forbidden (403)
    const bobDeleteRes = await fetch(`${BASE_URL}/api/ai/saved-plans/${savedPlan._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenBob}` }
    });
    assert(bobDeleteRes.status === 403, `Non-owner Bob is forbidden from deleting Alice's plan (HTTP ${bobDeleteRes.status})`);

    // Alice deletes her own plan -> Must succeed (200)
    const aliceDeleteRes = await fetch(`${BASE_URL}/api/ai/saved-plans/${savedPlan._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenAlice}` }
    });
    assert(aliceDeleteRes.status === 200, `Owner Alice deletes her own plan successfully (HTTP ${aliceDeleteRes.status})`);

    // 6. OTP 5-Attempt Lockout & Constant-Time Validation
    console.log('\n--- 6. OTP 5-Attempt Lockout & Timing-Safe Security ---');
    alice.otpCode = '123456';
    alice.otpExpiresAt = new Date(Date.now() + 600000);
    alice.otpAttempts = 0;
    await alice.save();

    for (let i = 1; i <= 4; i++) {
      const failedRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: alice.email, otp: '999999' })
      });
      const failedData = await failedRes.json();
      assert(failedRes.status === 400 && failedData.message && failedData.message.includes(`${5 - i} attempts remaining`), `Attempt ${i} rejected with ${5 - i} attempts remaining`);
    }

    const lockoutRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: alice.email, otp: '999999' })
    });
    const lockoutData = await lockoutRes.json();
    assert(lockoutRes.status === 429 && lockoutData.message && lockoutData.message.includes('Too many incorrect attempts'), '5th failed attempt locks out user with 429 and invalidates OTP');

    const refreshedAlice = await User.findById(alice._id);
    assert(refreshedAlice.otpCode === null || refreshedAlice.otpCode === undefined, 'OTP is cleared from database upon 5 failed attempts');

    // 7. CORS Security & Subdomain Wildcard Rejection
    console.log('\n--- 7. Strict CORS Origin Validation ---');
    const attackerRes = await fetch(`${BASE_URL}/api/posts`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-phishing.vercel.app',
        'Access-Control-Request-Method': 'GET'
      }
    });
    const corsHeader = attackerRes.headers.get('access-control-allow-origin');
    assert(!corsHeader || corsHeader !== 'https://malicious-phishing.vercel.app', 'Arbitrary vercel.app subdomain is NOT allowed by CORS');

    // 8. Duplicate Username Registration Rejection & Identity Resolution
    console.log('\n--- 8. Social Graph Identity Hardening ---');
    const dupeRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'alice phase3',
        email: 'phase3_dupe@test.com',
        password: 'Password123!'
      })
    });
    const dupeData = await dupeRes.json();
    assert(dupeRes.status === 400 && dupeData.message && dupeData.message.includes('Username is already taken'), 'Registration rejects duplicate username');

    // Find user by _id and by name
    const findByIdRes = await fetch(`${BASE_URL}/api/users/${alice._id}`);
    const foundById = await findByIdRes.json();
    assert(findByIdRes.status === 200 && foundById.name === 'Alice Phase3', 'getUserByName successfully finds user by ObjectId');

    const findByNameRes = await fetch(`${BASE_URL}/api/users/${encodeURIComponent('Alice Phase3')}`);
    const foundByName = await findByNameRes.json();
    assert(findByNameRes.status === 200 && String(foundByName._id) === String(alice._id), 'getUserByName successfully finds user by display name');

  } catch (err) {
    console.error('Fatal Test Error in Phase 3 Suite:', err);
    failed++;
  } finally {
    console.log('\n--- Cleaning Up Phase 3 Test Data ---');
    await User.deleteMany({ email: { $in: ['phase3_alice@test.com', 'phase3_bob@test.com', 'phase3_dupe@test.com'] } });
    await User.deleteMany({ name: { $in: ['Alice Phase3', 'Bob Phase3', 'Dupe User'] } });
    await Post.deleteMany({ authorName: 'Alice Phase3' });
    await Message.deleteMany({ sender: 'Alice Phase3' });
    await SavedAIPlan.deleteMany({ userName: 'Alice Phase3' });

    if (server) {
      server.close();
      console.log('🛑 Test server stopped.');
    }
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed.');

    console.log('\n===============================================================');
    console.log(`PHASE 3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase3Suites();
