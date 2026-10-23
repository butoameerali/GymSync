import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';

import app from '../index.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Product from '../models/Product.js';
import Notification from '../models/Notification.js';

const TEST_PORT = 5129;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase11Tests() {
  console.log('========================================================================');
  console.log('🛡️ GYMSYNC PHASE 11: APPEALS, PROFILE EDITING & STORE OVERSIGHT SUITE');
  console.log('========================================================================\n');

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
    const signToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: '1h' });

    // Clean up test data
    await User.deleteMany({ email: { $in: ['test_p11_admin@gymsync.com', 'test_p11_user@gymsync.com', 'test_p11_manager@gymsync.com', 'test_p11_other@gymsync.com'] } });
    await Post.deleteMany({ content: { $regex: /Phase 11/ } });
    await Product.deleteMany({ name: { $regex: /Phase 11/ } });

    // 1. Setup Users
    const adminUser = await User.create({
      name: 'SuperAdmin Phase 11',
      email: 'test_p11_admin@gymsync.com',
      password: 'AdminPassword123!',
      role: 'SuperAdmin'
    });
    const adminToken = signToken(adminUser._id);

    const normalUser = await User.create({
      name: 'TestAthlete Phase 11',
      email: 'test_p11_user@gymsync.com',
      password: 'UserPassword123!',
      role: 'User'
    });
    const userToken = signToken(normalUser._id);

    const otherUser = await User.create({
      name: 'OtherAthlete Phase 11',
      email: 'test_p11_other@gymsync.com',
      password: 'UserPassword123!',
      role: 'User'
    });
    const otherToken = signToken(otherUser._id);

    const storeManager = await User.create({
      name: 'StoreManager Phase 11',
      email: 'test_p11_manager@gymsync.com',
      password: 'ManagerPassword123!',
      role: 'StoreManager'
    });
    const managerToken = signToken(storeManager._id);

    // =========================================================================
    // TEST 1: Profile Editing via PUT /api/users/profile
    // =========================================================================
    console.log('\n--- Test 1: General Account Settings Profile Editing ---');
    const updateProfileRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        name: 'TestAthlete Updated',
        phone: '+1 555-0199',
        fitnessGoal: 'Muscle Hypertrophy & Strength',
        bio: 'Passionate powerlifter training for provincial meet.'
      })
    });
    const updateProfileData = await updateProfileRes.json();
    assert(updateProfileRes.status === 200, 'Profile settings updated successfully (HTTP 200)');
    assert(updateProfileData.user?.name === 'TestAthlete Updated', 'User name updated in response');
    assert(updateProfileData.user?.phone === '+1 555-0199', 'Phone number persisted');
    assert(updateProfileData.user?.fitnessGoal === 'Muscle Hypertrophy & Strength', 'Fitness goal saved');

    // Duplicate username check
    const dupRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${otherToken}`
      },
      body: JSON.stringify({ name: 'TestAthlete Updated' })
    });
    assert(dupRes.status === 400, 'Duplicate username attempt rejected with HTTP 400');

    // Reset user name for subsequent tests
    await User.findByIdAndUpdate(normalUser._id, { name: 'TestAthlete Phase 11' });

    // =========================================================================
    // TEST 2: Post Creation & Soft-Moderation with 15-Day Hold
    // =========================================================================
    console.log('\n--- Test 2: Post Moderation 15-Day Hold Window ---');
    const testPost = await Post.create({
      author: normalUser._id,
      authorName: 'TestAthlete Phase 11',
      content: 'Phase 11 Workout Routine flagged for review',
      approvalStatus: 'published'
    });

    // Public feed includes post
    const publicPostsRes = await fetch(`${BASE_URL}/api/posts`);
    const publicPosts = await publicPostsRes.json();
    assert(publicPosts.some(p => String(p._id) === String(testPost._id)), 'Active post visible in public feed');

    // Admin soft-removes post with 15-day hold
    const removeRes = await fetch(`${BASE_URL}/api/admin/posts/${testPost._id}/remove-with-reason`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: 'Commercial solicitation without permission' })
    });
    assert(removeRes.status === 200, 'Post soft-removed by admin with reason (HTTP 200)');

    const moderatedDoc = await Post.findById(testPost._id);
    assert(moderatedDoc.isModerated === true, 'Post marked isModerated: true');
    assert(moderatedDoc.moderationStatus === 'RemovedPendingAppeal', 'moderationStatus is RemovedPendingAppeal');
    assert(moderatedDoc.appealDeadline !== undefined, 'appealDeadline timestamp is generated');

    // Public feed must now exclude the moderated post
    const publicPostsAfterRes = await fetch(`${BASE_URL}/api/posts`);
    const publicPostsAfter = await publicPostsAfterRes.json();
    assert(!publicPostsAfter.some(p => p._id === String(testPost._id)), 'Moderated post hidden from public feed');

    // =========================================================================
    // TEST 3: Moderated Posts Discovery & Appeals Queue
    // =========================================================================
    console.log('\n--- Test 3: User My-Moderated & Admin Appeals Queue ---');
    // Author retrieves held posts
    const myModeratedRes = await fetch(`${BASE_URL}/api/posts/my-moderated`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const myModeratedPosts = await myModeratedRes.json();
    assert(myModeratedPosts.some(p => p._id === String(testPost._id)), 'Held post visible in author my-moderated list');

    // Admin retrieves appeals review queue
    const adminAppealsRes = await fetch(`${BASE_URL}/api/admin/posts/moderation-appeals`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminAppeals = await adminAppealsRes.json();
    assert(adminAppeals.some(p => p._id === String(testPost._id)), 'Held post visible in admin moderation appeals queue');

    // =========================================================================
    // TEST 4: Author Appeal Submission
    // =========================================================================
    console.log('\n--- Test 4: Author Appeal Submission ---');
    // Non-owner cannot appeal
    const unauthorizedAppealRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/appeal`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${otherToken}`
      },
      body: JSON.stringify({ appealReason: 'I want to appeal someone else post' })
    });
    assert(unauthorizedAppealRes.status === 403, 'Unauthorized user appeal rejected with HTTP 403');

    // Author appeals post
    const authorAppealRes = await fetch(`${BASE_URL}/api/posts/${testPost._id}/appeal`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ appealReason: 'This was a community gym event summary, not commercial spam.' })
    });
    const authorAppealData = await authorAppealRes.json();
    assert(authorAppealRes.status === 200, 'Author appeal submitted successfully (HTTP 200)');
    assert(authorAppealData.post?.isAppealSubmitted === true, 'isAppealSubmitted flag is true');
    assert(authorAppealData.post?.moderationStatus === 'UnderReview', 'moderationStatus transitioned to UnderReview');

    // =========================================================================
    // TEST 5: Admin Appeal Resolution (Reject with 3-Day Notice & Reinstate)
    // =========================================================================
    console.log('\n--- Test 5: Admin Appeal Resolution Workflow ---');
    // Test Reject Appeal with 3-Day Final Notice
    const rejectAppealRes = await fetch(`${BASE_URL}/api/admin/posts/${testPost._id}/resolve-appeal`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        decision: 'reject',
        replyReason: 'Post included commercial affiliate promo links contrary to Rule 4.'
      })
    });
    const rejectAppealData = await rejectAppealRes.json();
    assert(rejectAppealRes.status === 200, 'Appeal rejected with 3-day notice (HTTP 200)');
    assert(rejectAppealData.post?.moderationStatus === 'AppealRejected', 'Status updated to AppealRejected');
    assert(rejectAppealData.post?.finalPurgeDeadline !== undefined, 'finalPurgeDeadline set for 3-day countdown');

    // Test Reinstate Post
    const reinstateRes = await fetch(`${BASE_URL}/api/admin/posts/${testPost._id}/resolve-appeal`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        decision: 'reinstate',
        replyReason: 'Upon second review, affiliate link removed by author. Reinstated.'
      })
    });
    const reinstateData = await reinstateRes.json();
    assert(reinstateRes.status === 200, 'Post reinstated by admin (HTTP 200)');
    assert(reinstateData.post?.isModerated === false, 'isModerated reset to false');
    assert(reinstateData.post?.moderationStatus === 'Active', 'moderationStatus reset to Active');

    // Reinstated post is back in public feed
    const publicAfterReinstateRes = await fetch(`${BASE_URL}/api/posts`);
    const publicAfterReinstate = await publicAfterReinstateRes.json();
    assert(publicAfterReinstate.some(p => String(p._id) === String(testPost._id)), 'Reinstated post back in public feed');

    // =========================================================================
    // TEST 6: Store Manager Submission & Admin Approval Lifecycle
    // =========================================================================
    console.log('\n--- Test 6: Store Manager Submission & Admin Approval Lifecycle ---');
    // Store Manager creates product -> defaults to Pending
    const createProdRes = await fetch(`${BASE_URL}/api/store/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: 'Phase 11 Whey Isolate Protein',
        description: 'Ultra-pure grass-fed whey isolate',
        price: 54.99,
        category: 'Supplements',
        countInStock: 25
      })
    });
    const createProdData = await createProdRes.json();
    assert(createProdRes.status === 201, 'Store Manager created product (HTTP 201)');
    assert(createProdData.status === 'Pending', 'Manager-created product status defaults to Pending');

    // Pending product must NOT appear in public catalog
    const publicCatalogRes = await fetch(`${BASE_URL}/api/store/products`);
    const publicCatalog = await publicCatalogRes.json();
    assert(!publicCatalog.some(p => p._id === createProdData._id), 'Pending product hidden from public catalog');

    // Admin approves product
    const approveProdRes = await fetch(`${BASE_URL}/api/store/admin/products/${createProdData._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Approved' })
    });
    assert(approveProdRes.status === 200, 'Admin approved product status (HTTP 200)');

    // Now product is in public store
    const publicCatalogAfterRes = await fetch(`${BASE_URL}/api/store/products`);
    const publicCatalogAfter = await publicCatalogAfterRes.json();
    assert(publicCatalogAfter.some(p => p._id === createProdData._id), 'Approved product now visible in public catalog');

    // Admin Store Overview endpoint
    const storeOverviewRes = await fetch(`${BASE_URL}/api/store/admin/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const storeOverview = await storeOverviewRes.json();
    assert(storeOverviewRes.status === 200, 'Admin Store Overview fetched (HTTP 200)');
    assert(storeOverview.metrics !== undefined, 'Overview contains metrics telemetry');
    assert(Array.isArray(storeOverview.managerPerformance), 'Overview contains manager performance breakdown');

  } catch (err) {
    console.error('Fatal test runner error:', err);
    failed++;
  } finally {
    // Cleanup
    await User.deleteMany({ email: { $in: ['test_p11_admin@gymsync.com', 'test_p11_user@gymsync.com', 'test_p11_manager@gymsync.com', 'test_p11_other@gymsync.com'] } });
    await Post.deleteMany({ content: { $regex: /Phase 11/ } });
    await Product.deleteMany({ name: { $regex: /Phase 11/ } });

    if (server) {
      server.close();
      console.log('\n🛑 Test Server closed');
    }
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');

    console.log('\n========================================================================');
    console.log(`📊 PHASE 11 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase11Tests();
