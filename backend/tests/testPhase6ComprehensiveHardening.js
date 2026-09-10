import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from '../index.js';

import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import WorkoutProgress from '../models/WorkoutProgress.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import RateLimit from '../models/RateLimit.js';
import { rateLimiter } from '../middleware/securityMiddleware.js';
import { 
  validateAndSanitizeStructuredAction, 
  executeCoachPipeline 
} from '../controllers/aiController.js';
import { 
  calculateConsecutiveCalendarStreak, 
  getActiveStreak 
} from '../controllers/userController.js';

const TEST_PORT = 5122;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase6ComprehensiveHardeningTests() {
  console.log('===============================================================');
  console.log('🛡️ GYMSYNC PHASE 6 COMPREHENSIVE HARDENING & ADVERSARIAL SUITE');
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

    // -------------------------------------------------------------
    // 1. Rate Limiter High-Concurrency Stress Test (100 Simultaneous Requests)
    // -------------------------------------------------------------
    console.log('\n--- 1. Rate Limiter Monotonic Concurrency (100 Simultaneous Requests) ---');
    const testScope = `concurrency-test-${Date.now()}`;
    const testLimiter = rateLimiter({ windowMs: 60000, max: 10, scope: testScope });

    // Clean any prior state
    await RateLimit.deleteMany({ key: new RegExp(`^${testScope}:`) });

    const mockReq = {
      ip: '10.0.0.99',
      headers: {},
      socket: { remoteAddress: '10.0.0.99' }
    };

    let allowedCount = 0;
    let rejectedCount = 0;

    // Fire 100 simultaneous middleware calls
    await Promise.all(
      Array.from({ length: 100 }).map(() => {
        return new Promise((resolve) => {
          const mockRes = {
            status: (statusCode) => ({
              json: () => {
                if (statusCode === 429) rejectedCount++;
                resolve();
              }
            })
          };
          testLimiter(mockReq, mockRes, () => {
            allowedCount++;
            resolve();
          });
        });
      })
    );

    assert(allowedCount === 10, `Exactly 10 requests allowed under max: 10 limit (actual: ${allowedCount})`);
    assert(rejectedCount === 90, `Exactly 90 requests rejected with HTTP 429 (actual: ${rejectedCount})`);

    // Clean up rate limit records
    await RateLimit.deleteMany({ key: new RegExp(`^${testScope}:`) });

    // -------------------------------------------------------------
    // 2. Rate Limiter Fail-Closed Under Database Disruption
    // -------------------------------------------------------------
    console.log('\n--- 2. Rate Limiter Fail-Closed Under DB Outage (Auth Scope) ---');
    const authFailClosedLimiter = rateLimiter({ windowMs: 60000, max: 5, scope: 'auth-failclosed-test', failClosed: true });
    
    // Simulate DB disruption by temporarily mocking findOneAndUpdate
    const originalFindOneAndUpdate = RateLimit.findOneAndUpdate;
    RateLimit.findOneAndUpdate = async () => {
      throw new Error('MongoNetworkError: connection timed out');
    };

    let failClosedStatusCode = null;
    const mockResFailClosed = {
      status: (code) => {
        failClosedStatusCode = code;
        return { json: () => {} };
      }
    };

    await authFailClosedLimiter(mockReq, mockResFailClosed, () => {
      failClosedStatusCode = 200;
    });

    // Restore original method
    RateLimit.findOneAndUpdate = originalFindOneAndUpdate;

    assert(failClosedStatusCode === 503, `Auth scope rate limiter fails closed with HTTP 503 during DB outage (got ${failClosedStatusCode})`);

    // -------------------------------------------------------------
    // 3. Password Reset Race Condition (10 Simultaneous Requests)
    // -------------------------------------------------------------
    console.log('\n--- 3. Password Reset Race Condition (10 Parallel Requests) ---');
    const resetUserEmail = `concurrency_reset_${Date.now()}@test.com`;
    const resetUser = await User.create({
      name: `Concurrent Reset User ${Date.now()}`,
      email: resetUserEmail,
      password: 'OldPassword123!',
      role: 'User'
    });

    const testResetToken = crypto.randomBytes(32).toString('hex');
    const testResetTokenHash = crypto.createHash('sha256').update(testResetToken).digest('hex');
    await User.findByIdAndUpdate(resetUser._id, {
      resetPasswordToken: testResetTokenHash,
      resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000)
    });

    const resetResponses = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        fetch(`${BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resetUser.email,
            resetToken: testResetToken,
            newPassword: 'BrandNewSecurePassword123!'
          })
        })
      )
    );

    const resetStatuses = resetResponses.map(r => r.status);
    const resetSuccessCount = resetStatuses.filter(s => s === 200).length;
    const resetBlockedCount = resetStatuses.filter(s => s === 400).length;

    assert(resetSuccessCount === 1, `Exactly ONE of 10 racing reset requests succeeded (HTTP 200 count = ${resetSuccessCount})`);
    assert(resetBlockedCount === 9, `All 9 other racing reset requests were blocked with HTTP 400 (count = ${resetBlockedCount})`);

    // -------------------------------------------------------------
    // 4. OTP Verification Race Condition (10 Simultaneous Requests)
    // -------------------------------------------------------------
    console.log('\n--- 4. OTP Verification Race Condition (10 Parallel Requests) ---');
    const testOtpCode = '882244';
    const testOtpHash = crypto.createHash('sha256').update(testOtpCode).digest('hex');
    await User.findByIdAndUpdate(resetUser._id, {
      otpCode: testOtpHash,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 0,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    const otpResponses = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        fetch(`${BASE_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resetUser.email,
            otp: testOtpCode
          })
        })
      )
    );

    const otpStatuses = otpResponses.map(r => r.status);
    const otpSuccessCount = otpStatuses.filter(s => s === 200).length;
    assert(otpSuccessCount === 1, `Exactly ONE of 10 racing OTP verifications succeeded (HTTP 200 count = ${otpSuccessCount})`);

    // -------------------------------------------------------------
    // 5. Multi-Tenant Separation & IDOR Boundary (User A vs User B)
    // -------------------------------------------------------------
    console.log('\n--- 5. Multi-Tenant Separation & IDOR Boundary ---');
    const userA = await User.create({
      name: `Tenant User Alpha ${Date.now()}`,
      email: `johna_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'User'
    });
    const userB = await User.create({
      name: `Tenant User Beta ${Date.now()}`,
      email: `johnb_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'User'
    });

    const tokenA = jwt.sign({ id: userA._id, role: userA.role, name: userA.name }, jwtSecret, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: userB._id, role: userB.role, name: userB.name }, jwtSecret, { expiresIn: '1h' });

    // User A saves an AI plan
    const userAPlan = await SavedAIPlan.create({
      userId: userA._id,
      userName: userA.name,
      title: 'User A Secret Training Plan',
      goal: 'Hypertrophy',
      fitnessLevel: 'Intermediate'
    });

    // User B attempts to list saved plans (should receive 0 plans)
    const userBListRes = await fetch(`${BASE_URL}/api/ai/saved-plans`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const userBPlans = await userBListRes.json();
    assert(
      Array.isArray(userBPlans) && userBPlans.length === 0,
      `User B cannot see User A's plan despite identical user name (received ${userBPlans.length} plans)`
    );

    // User B attempts to delete User A's plan (must be rejected HTTP 403)
    const userBDeleteRes = await fetch(`${BASE_URL}/api/ai/saved-plans/${userAPlan._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert(userBDeleteRes.status === 403, `User B rejected with HTTP 403 when trying to delete User A's plan (got ${userBDeleteRes.status})`);

    // User A creates a complaint
    const complaintRes = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        reportedEntityType: 'User',
        reportedEntityId: 'target-123',
        reason: 'Harassment',
        description: 'User A confidential report'
      })
    });
    const complaintData = await complaintRes.json();
    assert(complaintRes.status === 201, `User A created complaint successfully`);

    // User B attempts to list complaints (should see 0 complaints)
    const userBComplaintsRes = await fetch(`${BASE_URL}/api/complaints`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const userBComplaints = await userBComplaintsRes.json();
    assert(
      Array.isArray(userBComplaints) && userBComplaints.length === 0,
      `User B cannot view User A's complaint despite identical name (received ${userBComplaints.length} complaints)`
    );

    // User B attempts to post to User A's complaint chat (must be rejected HTTP 403)
    const userBPostChatRes = await fetch(`${BASE_URL}/api/complaints/${complaintData._id}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ text: 'Injected message from User B' })
    });
    assert(userBPostChatRes.status === 403, `User B rejected with HTTP 403 when attempting to post to User A's complaint ticket`);

    // -------------------------------------------------------------
    // 6. Authoritative Server-Side AI Context & Spoofing Immunity
    // -------------------------------------------------------------
    console.log('\n--- 6. Authoritative AI Context & Spoofing Immunity ---');
    await User.findByIdAndUpdate(userA._id, {
      bioData: {
        mainGoalArea: 'Elite Powerlifting',
        fitnessLevel: 'Advanced',
        weight: 92,
        height: 185,
        equipmentAccess: 'Olympic Barbell Gym'
      }
    });

    const aiChatResponse = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        message: 'Give me a workout for today',
        userContext: {
          primaryGoal: 'Spoofed Beginner Yoga',
          fitnessLevel: 'Absolute Beginner',
          weight: 35
        }
      })
    });
    assert(aiChatResponse.status === 200, `AI Chat endpoint returns HTTP 200`);
    const aiChatBody = await aiChatResponse.json();
    assert(aiChatBody.content && typeof aiChatBody.content === 'string', `AI generated coach response`);
    assert(aiChatBody.structuredAction && typeof aiChatBody.structuredAction === 'object', `AI generated valid structuredAction`);

    // -------------------------------------------------------------
    // 7. AI StructuredAction Range Clamping & Allowlist Validation
    // -------------------------------------------------------------
    console.log('\n--- 7. AI StructuredAction Range Clamping & Allowlist Validation ---');
    const maliciousAction = {
      intent: 'workout',
      workout: {
        sessionObjective: 'Malicious Overloaded Workout',
        timeBudget: 99999, // Out of bounds
        mainWorkout: [
          {
            name: 'Dangerous Hyper Sets',
            sets: -10, // Negative sets
            reps: 99999, // Extreme reps
            restSeconds: -60, // Negative rest
            rpe: 50, // Out of 1-10 range
            estimatedCalories: 500000 // Absurd calories
          },
          {
            name: 'Excessive Sets Exercise',
            sets: 100, // Clamped to 10
            reps: '20',
            restSeconds: 1000, // Clamped to 600
            rpe: 0 // Clamped to 1
          }
        ],
        estimatedTotalCalories: 1000000 // Clamped to 5000
      },
      diet: {
        title: 'Extreme Diet',
        calories: 999999, // Clamped to 10000
        protein: -50 // Clamped to 10
      },
      injectedCode: 'evil()',
      __proto__: { polluted: true }
    };

    const sanitizedAction = validateAndSanitizeStructuredAction(maliciousAction);

    assert(sanitizedAction.workout.timeBudget <= 180, `timeBudget clamped to max 180 (actual: ${sanitizedAction.workout.timeBudget})`);
    assert(sanitizedAction.workout.mainWorkout[0].sets === 1, `Negative sets clamped to min 1 (actual: ${sanitizedAction.workout.mainWorkout[0].sets})`);
    assert(sanitizedAction.workout.mainWorkout[0].rpe === 10, `RPE 50 clamped to max 10 (actual: ${sanitizedAction.workout.mainWorkout[0].rpe})`);
    assert(sanitizedAction.workout.mainWorkout[0].restSeconds === 0, `Negative rest clamped to 0 (actual: ${sanitizedAction.workout.mainWorkout[0].restSeconds})`);
    assert(sanitizedAction.workout.mainWorkout[1].sets === 10, `Sets 100 clamped to max 10 (actual: ${sanitizedAction.workout.mainWorkout[1].sets})`);
    assert(sanitizedAction.workout.mainWorkout[1].restSeconds === 600, `Rest 1000 clamped to max 600 (actual: ${sanitizedAction.workout.mainWorkout[1].restSeconds})`);
    assert(sanitizedAction.workout.mainWorkout[1].rpe === 1, `RPE 0 clamped to min 1 (actual: ${sanitizedAction.workout.mainWorkout[1].rpe})`);
    assert(sanitizedAction.diet.calories === 10000, `Calories 999999 clamped to max 10000 (actual: ${sanitizedAction.diet.calories})`);
    assert(sanitizedAction.diet.protein === 10, `Negative protein clamped to min 10 (actual: ${sanitizedAction.diet.protein})`);
    assert(sanitizedAction.injectedCode === undefined, `Injected arbitrary properties safely stripped from structuredAction`);

    // -------------------------------------------------------------
    // 8. Deterministic Calendar Streak Algorithm & Client-Spoofing Immunity
    // -------------------------------------------------------------
    console.log('\n--- 8. Deterministic Calendar Streak Computation ---');
    const day0 = new Date('2026-09-01T10:00:00Z');
    const day0Same = new Date('2026-09-01T18:00:00Z');
    const day1Consecutive = new Date('2026-09-02T10:00:00Z');
    const day4Gap = new Date('2026-09-05T10:00:00Z');

    const streakSame = calculateConsecutiveCalendarStreak(day0, day0Same, 3);
    assert(streakSame === 3, `Same-day workout maintains existing streak of 3 (got ${streakSame})`);

    const streakConsecutive = calculateConsecutiveCalendarStreak(day0, day1Consecutive, 3);
    assert(streakConsecutive === 4, `Consecutive calendar day increments streak from 3 to 4 (got ${streakConsecutive})`);

    const streakGap = calculateConsecutiveCalendarStreak(day0, day4Gap, 4);
    assert(streakGap === 1, `Multi-day gap breaks streak and resets to 1 (got ${streakGap})`);

    // Active streak inspection: expired workout should yield 0 active streak
    const expiredProgress = {
      streak: 7,
      lastWorkoutCompletionTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    };
    const activeStreakExpired = getActiveStreak(expiredProgress);
    assert(activeStreakExpired === 0, `3-day-old workout yields 0 active streak (got ${activeStreakExpired})`);

    // Active streak inspection: today's workout yields active streak
    const freshProgress = {
      streak: 5,
      lastWorkoutCompletionTime: new Date()
    };
    const activeStreakFresh = getActiveStreak(freshProgress);
    assert(activeStreakFresh === 5, `Today's workout yields active streak of 5 (got ${activeStreakFresh})`);

    // Server-enforced streak test on POST /api/users/workout-progress (Spoofing test)
    const spoofPostRes = await fetch(`${BASE_URL}/api/users/workout-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        streak: 9999, // Attempt to spoof streak
        totalPoints: 50,
        completedDays: [1]
      })
    });
    const spoofData = await spoofPostRes.json();
    assert(spoofData.success === true, `Workout progress saved`);
    assert(spoofData.progress.streak === 1, `Client spoofed streak of 9999 was rejected by server and computed as 1 (got ${spoofData.progress.streak})`);

    // -------------------------------------------------------------
    // 9. Automated Codebase Raw Error Leak Scanner
    // -------------------------------------------------------------
    console.log('\n--- 9. Automated Codebase Raw Error Disclosure Scan ---');
    const controllerDir = path.resolve(__dirname, '../controllers');
    const routeDir = path.resolve(__dirname, '../routes');

    const filesToScan = [
      ...fs.readdirSync(controllerDir).map(f => path.join(controllerDir, f)),
      ...fs.readdirSync(routeDir).map(f => path.join(routeDir, f))
    ].filter(f => f.endsWith('.js'));

    const rawErrorRegexes = [
      /res\.status\(\d+\)\.json\([^)]*error\.message/i,
      /res\.status\(\d+\)\.json\([^)]*err\.message/i
    ];

    let leakViolations = [];
    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('//') && line.indexOf('//') < line.indexOf('res.status')) return;
        for (const regex of rawErrorRegexes) {
          if (regex.test(line)) {
            leakViolations.push(`${path.basename(filePath)}:L${index + 1} -> ${line.trim()}`);
          }
        }
      });
    }

    assert(
      leakViolations.length === 0,
      `Zero raw error message leaks in controllers and routes (found: ${leakViolations.length}${leakViolations.length > 0 ? ': ' + leakViolations.join('; ') : ''})`
    );

    // Clean up created test data
    await User.deleteMany({ _id: { $in: [resetUser._id, userA._id, userB._id] } });
    await SavedAIPlan.deleteMany({ _id: userAPlan._id });
    await Complaint.deleteMany({ _id: complaintData._id });
    await WorkoutProgress.deleteMany({ userId: { $in: [String(userA._id), String(userB._id)] } });

  } catch (err) {
    console.error('Fatal error during test execution:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise(res => server.close(res));
      console.log('🛑 Test server stopped.');
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📡 MongoDB connection closed.');
    }
  }

  console.log('\n===============================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6ComprehensiveHardeningTests();
