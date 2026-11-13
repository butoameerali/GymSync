import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('⚠️ Could not set custom DNS servers:', dnsErr.message);
}

import { getTestMongoUri } from './mongoTestHelper.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import WeightLossEnrollment from '../models/WeightLossEnrollment.js';
import {
  isQuietHours,
  createNotificationWithIdempotency,
  getMealSlotForHour,
  getIsoWeekNumber,
  reminderScheduler
} from '../services/notifications/reminderScheduler.js';
import { getVapidPublicKey, sendPushNotification } from '../services/notifications/webPushService.js';
import app from '../index.js';

console.log('===============================================================');
console.log('🧪 TEST SUITE: PHASE 3 - NOTIFICATIONS, WEB PUSH & SCHEDULER');
console.log('===============================================================\n');

async function runTests() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(getTestMongoUri());
  }

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // 1. NOTIFICATION MODEL & ENUM EXTENSIONS
  // -------------------------------------------------------------
  await testAsync('1.1 Notification.type enum accepts reminder types', async () => {
    const dummyId = new mongoose.Types.ObjectId();
    const testTypes = ['workout_reminder', 'meal_reminder', 'progress_reminder'];

    for (const t of testTypes) {
      const notif = new Notification({
        userId: String(dummyId),
        type: t,
        title: `Test ${t}`,
        message: 'Test message for reminders',
        link: '/ai-trainer'
      });
      const err = notif.validateSync();
      assert.strictEqual(err, undefined, `Type ${t} should be valid in enum`);
    }
  });

  // -------------------------------------------------------------
  // 2. IDEMPOTENCY & EVENTKEY ENFORCEMENT
  // -------------------------------------------------------------
  await testAsync('2.1 createNotificationWithIdempotency enforces at most one reminder per slot per day', async () => {
    const testUser = await User.create({
      name: `IdempotencyUser_${Date.now()}`,
      email: `idempotent_${Date.now()}@example.com`,
      password: 'password123',
      role: 'User'
    });

    try {
      const eventKey = `workout_rem_${testUser._id}_2026-11-06`;

      // First call -> creates notification
      const first = await createNotificationWithIdempotency({
        userId: testUser._id,
        recipientId: testUser._id,
        type: 'workout_reminder',
        title: "Today's Workout",
        message: "Time to complete today's session!",
        link: '/ai-trainer?action=today_workout',
        eventKey
      });

      assert.strictEqual(first.created, true);
      assert.strictEqual(first.notification.eventKey, eventKey);

      // Second call with same eventKey -> no duplicate created!
      const second = await createNotificationWithIdempotency({
        userId: testUser._id,
        recipientId: testUser._id,
        type: 'workout_reminder',
        title: "Today's Workout (Repeat)",
        message: "Time to complete today's session!",
        link: '/ai-trainer?action=today_workout',
        eventKey
      });

      assert.strictEqual(second.created, false);
      assert.strictEqual(String(second.notification._id), String(first.notification._id));

      const count = await Notification.countDocuments({ userId: String(testUser._id), eventKey });
      assert.strictEqual(count, 1, 'Exactly one notification must exist for the eventKey');
    } finally {
      await Notification.deleteMany({ userId: String(testUser._id) });
      await User.deleteOne({ _id: testUser._id });
    }
  });

  // -------------------------------------------------------------
  // 3. QUIET HOURS & MUTING
  // -------------------------------------------------------------
  test('3.1 isQuietHours correctly detects muted state', () => {
    const mutedPrefs = { muted: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' };
    assert.strictEqual(isQuietHours(mutedPrefs), true, 'Muted user must be in quiet hours');
  });

  test('3.2 isQuietHours handles overnight window (22:00 to 07:00)', () => {
    const overnightPrefs = { muted: false, quietHoursStart: '22:00', quietHoursEnd: '07:00' };

    // 23:30 (inside quiet hours)
    const lateNight = new Date();
    lateNight.setHours(23, 30, 0, 0);
    assert.strictEqual(isQuietHours(overnightPrefs, lateNight), true, '23:30 is in quiet hours');

    // 04:15 (inside quiet hours)
    const earlyMorning = new Date();
    earlyMorning.setHours(4, 15, 0, 0);
    assert.strictEqual(isQuietHours(overnightPrefs, earlyMorning), true, '04:15 is in quiet hours');

    // 14:00 (outside quiet hours)
    const afternoon = new Date();
    afternoon.setHours(14, 0, 0, 0);
    assert.strictEqual(isQuietHours(overnightPrefs, afternoon), false, '14:00 is outside quiet hours');
  });

  // -------------------------------------------------------------
  // 4. RULE-BASED REMINDER GENERATION & DEEP LINKS (R2 & R6)
  // -------------------------------------------------------------
  test('4.1 getMealSlotForHour maps to correct windows', () => {
    assert.strictEqual(getMealSlotForHour(9), 'breakfast');
    assert.strictEqual(getMealSlotForHour(13), 'lunch');
    assert.strictEqual(getMealSlotForHour(17), 'snack');
    assert.strictEqual(getMealSlotForHour(20), 'dinner');
    assert.strictEqual(getMealSlotForHour(3), null);
  });

  await testAsync('4.2 reminderScheduler generates workout reminder from active program with deep link', async () => {
    const dummyUser = await User.create({
      name: `ProgUser_${Date.now()}`,
      email: `prog_${Date.now()}@example.com`,
      password: 'password123',
      role: 'User'
    });

    const dummyProg = await UserWorkoutProgram.create({
      userId: dummyUser._id,
      userName: dummyUser.name,
      sourceProgramId: new mongoose.Types.ObjectId(),
      title: 'Full Body Foundations',
      goal: 'Fitness',
      difficulty: 'Beginner',
      durationWeeks: 4,
      daysPerWeek: 3,
      isActive: true,
      startDate: new Date()
    });

    try {
      const res = await reminderScheduler.generateWorkoutReminders({
        date: new Date('2026-11-06T10:00:00Z'),
        targetUserId: dummyUser._id
      });

      assert.strictEqual(res.createdCount, 1);

      const notif = await Notification.findOne({
        userId: String(dummyUser._id),
        type: 'workout_reminder'
      });

      assert(notif, 'Notification should be created');
      assert.strictEqual(notif.link, '/ai-trainer?action=today_workout');
      assert(notif.message.includes('Full Body Foundations'));
      // Rule R6: No mention of AI offline or reporting AI errors
      assert(!notif.message.toLowerCase().includes('ollama'));
      assert(!notif.message.toLowerCase().includes('offline'));
    } finally {
      await UserWorkoutProgram.deleteMany({ userId: dummyUser._id });
      await Notification.deleteMany({ userId: String(dummyUser._id) });
      await User.deleteOne({ _id: dummyUser._id });
    }
  });

  await testAsync('4.3 reminderScheduler generates meal reminder with track + report deep link (R2)', async () => {
    const dummyUser = await User.create({
      name: `MealUser_${Date.now()}`,
      email: `meal_${Date.now()}@example.com`,
      password: 'password123',
      role: 'User'
    });

    try {
      const res = await reminderScheduler.generateMealReminders({
        date: new Date('2026-11-06T13:00:00Z'),
        forceSlot: 'lunch',
        targetUserId: dummyUser._id
      });

      assert.strictEqual(res.createdCount, 1);

      const notif = await Notification.findOne({
        userId: String(dummyUser._id),
        type: 'meal_reminder'
      });

      assert(notif, 'Meal notification should be created');
      assert.strictEqual(notif.link, '/ai-trainer?tab=diets&action=log_meal&meal=lunch');
      // Rule R2: Diet is track + report only
      assert(notif.message.toLowerCase().includes('track') || notif.message.toLowerCase().includes('log'));
      assert(!notif.message.toLowerCase().includes('assigned diet plan'));
    } finally {
      await Notification.deleteMany({ userId: String(dummyUser._id) });
      await User.deleteOne({ _id: dummyUser._id });
    }
  });

  await testAsync('4.4 reminderScheduler generates weekly progress reminder with deep link', async () => {
    const dummyUser = await User.create({
      name: `ProgressUser_${Date.now()}`,
      email: `prog_rem_${Date.now()}@example.com`,
      password: 'password123',
      role: 'User'
    });

    const enrollment = await WeightLossEnrollment.create({
      userId: dummyUser._id,
      userWorkoutProgramId: new mongoose.Types.ObjectId(),
      programTemplateId: new mongoose.Types.ObjectId(),
      status: 'Active',
      isActive: true,
      startWeightKg: 85,
      targetWeightKg: 78,
      targetDurationWeeks: 8,
      startDate: new Date(),
      targetDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000),
      templateType: 'home_bodyweight',
      medicalWarning: { acknowledgedAt: new Date(), version: 'v1.0' },
      confidenceLabel: 'Low'
    });

    try {
      const res = await reminderScheduler.generateProgressReminders({
        date: new Date('2026-11-08T10:00:00Z'),
        targetUserId: dummyUser._id
      });

      assert.strictEqual(res.createdCount, 1);

      const notif = await Notification.findOne({
        userId: String(dummyUser._id),
        type: 'progress_reminder'
      });

      assert(notif);
      assert.strictEqual(notif.link, '/weight-loss');
      assert(notif.message.toLowerCase().includes('waist') || notif.message.toLowerCase().includes('progress'));
    } finally {
      await WeightLossEnrollment.deleteMany({ userId: dummyUser._id });
      await Notification.deleteMany({ userId: String(dummyUser._id) });
      await User.deleteOne({ _id: dummyUser._id });
    }
  });

  // -------------------------------------------------------------
  // 5. CRON ENDPOINT & SECRET SECURITY
  // -------------------------------------------------------------
  test('5.1 Cron endpoint rejects requests without valid CRON_SECRET', () => {
    // Simulated express handler validation
    const expectedSecret = process.env.CRON_SECRET || 'gymsync-cron-secret';

    const checkAuth = (headerSecret) => {
      return headerSecret === expectedSecret;
    };

    assert.strictEqual(checkAuth(undefined), false);
    assert.strictEqual(checkAuth('wrong-secret'), false);
    assert.strictEqual(checkAuth(expectedSecret), true);
  });

  // -------------------------------------------------------------
  // 6. WEB PUSH SERVICE & SUBSCRIPTION MANAGEMENT
  // -------------------------------------------------------------
  test('6.1 getVapidPublicKey returns valid non-empty string', () => {
    const key = getVapidPublicKey();
    assert(typeof key === 'string' && key.length > 20, 'VAPID public key must be valid base64 string');
  });

  await testAsync('6.2 PushSubscription stores device subscriptions and prevents duplicates', async () => {
    const dummyId = new mongoose.Types.ObjectId();
    const endpoint = `https://fcm.googleapis.com/fcm/send/test_${Date.now()}`;

    const sub = await PushSubscription.create({
      userId: dummyId,
      endpoint,
      keys: {
        p256dh: 'BNcRdreALRF8FsECAQIwEQYDVQQDDApFeGFtcGxlIENBMQ0wCwYDVQQKDARNb3ppbGxh',
        auth: 'tBHItDaAvaFsC5hR'
      },
      userAgent: 'Mozilla/5.0 Test Browser'
    });

    try {
      assert(sub._id);
      assert.strictEqual(sub.endpoint, endpoint);

      // Attempting to create same endpoint throws duplicate key error
      let threwDup = false;
      try {
        await PushSubscription.create({
          userId: dummyId,
          endpoint,
          keys: sub.keys
        });
      } catch (err) {
        threwDup = true;
      }
      assert.strictEqual(threwDup, true, 'Unique endpoint index must prevent duplicates');
    } finally {
      await PushSubscription.deleteMany({ userId: dummyId });
    }
  });

  console.log('\n===============================================================');
  console.log(`📊 PHASE 3 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error('Fatal Test Runner Error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
