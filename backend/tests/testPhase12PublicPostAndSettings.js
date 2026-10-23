import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';

import app from '../index.js';
import User from '../models/User.js';
import Post from '../models/Post.js';

const TEST_PORT = 5130;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase12Tests() {
  console.log('========================================================================');
  console.log('🛡️ GYMSYNC PHASE 12: PUBLIC POST ACCESS, SETTINGS & LOCATION SUITE');
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
    server = app.listen(TEST_PORT);
    console.log(`🚀 Test Server running at ${BASE_URL}\n`);

    if (mongoose.connection.readyState !== 1) {
      const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gymsync';
      await mongoose.connect(MONGO_URI);
      console.log('📡 Connected to MongoDB');
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'gymsync_super_secret_jwt_key_2026';
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // 1. Create Test User
    const testUser = await User.findOneAndUpdate(
      { email: 'testphase12@gymsync.com' },
      {
        name: 'Phase12Tester',
        email: 'testphase12@gymsync.com',
        password: hashedPassword,
        role: 'User',
        city: 'Manchester',
        country: 'United Kingdom',
        location: 'Manchester, United Kingdom'
      },
      { upsert: true, new: true }
    );

    const userToken = jwt.sign({ id: testUser._id, role: testUser.role, name: testUser.name }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Create Active Public Post & Moderated Post
    const activePost = await Post.create({
      author: testUser._id,
      authorName: testUser.name,
      content: 'Public fitness update for everyone to see without login!',
      mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
      likes: [testUser.name],
      comments: [
        {
          _id: new mongoose.Types.ObjectId(),
          author: testUser.name,
          text: 'Great session!'
        }
      ],
      isModerated: false,
      moderationStatus: 'Active'
    });

    const moderatedPost = await Post.create({
      author: testUser._id,
      authorName: testUser.name,
      content: 'Violating post held in appeal queue',
      isModerated: true,
      moderationStatus: 'RemovedPendingAppeal'
    });

    // ─── Test 1: Public Post Access Without Login ──────────────────────────────
    console.log('--- Test 1: Public Post Access (Unauthenticated) ---');
    const pubRes = await fetch(`${BASE_URL}/api/posts/${activePost._id}`);
    assert(pubRes.status === 200, `Public GET /api/posts/:id returns 200 without auth (got ${pubRes.status})`);
    const pubData = await pubRes.json();
    assert(pubData.content === activePost.content, 'Post content correctly returned to guest visitor');
    assert(Array.isArray(pubData.likes) && pubData.likes.length === 1, 'Likes count returned to guest');
    assert(Array.isArray(pubData.comments) && pubData.comments.length === 1, 'Comments list returned to guest');

    // ─── Test 2: Moderated / Non-existent Post Protection ───────────────────────
    console.log('\n--- Test 2: Moderated / Non-existent Post Protection ---');
    const modRes = await fetch(`${BASE_URL}/api/posts/${moderatedPost._id}`);
    assert(modRes.status === 404, `Moderated post returns 404 to public (got ${modRes.status})`);

    const fakeId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${BASE_URL}/api/posts/${fakeId}`);
    assert(notFoundRes.status === 404, `Non-existent post returns 404 (got ${notFoundRes.status})`);

    // ─── Test 3: Profile Location & Auto-Detect Persistence ─────────────────────
    console.log('\n--- Test 3: Location Updating via PUT /api/users/profile ---');
    const locRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        city: 'Barcelona',
        country: 'Spain'
      })
    });
    assert(locRes.status === 200, `Profile update returns 200 (got ${locRes.status})`);
    const locData = await locRes.json();
    assert(locData.user.city === 'Barcelona', 'City updated to Barcelona');
    assert(locData.user.country === 'Spain', 'Country updated to Spain');
    assert(locData.user.location === 'Barcelona, Spain', 'Location combined string saved');

    // ─── Test 4: 2MFA Sudo-Password on Sensitive Name Change ───────────────────
    console.log('\n--- Test 4: 2MFA Sudo-Password on Name Change ---');
    const wrongSudoRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        name: 'NewHackerName',
        sudoPassword: 'WrongPassword123'
      })
    });
    assert(wrongSudoRes.status === 401, `Invalid password on name change returns 401 (got ${wrongSudoRes.status})`);

    const validSudoRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        name: 'UpdatedAthleteName',
        sudoPassword: 'Password123!'
      })
    });
    assert(validSudoRes.status === 200, `Valid password on name change returns 200 (got ${validSudoRes.status})`);
    const validData = await validSudoRes.json();
    assert(validData.user.name === 'UpdatedAthleteName', 'User name updated to UpdatedAthleteName');

    // ─── Clean up ─────────────────────────────────────────────────────────────
    await Post.deleteMany({ author: testUser._id });
    await User.deleteOne({ _id: testUser._id });

  } catch (err) {
    console.error('Test run failed with error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
      console.log('\n🛑 Test Server closed');
    }
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed\n');

    console.log('========================================================================');
    console.log(`📊 PHASE 12 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase12Tests();
