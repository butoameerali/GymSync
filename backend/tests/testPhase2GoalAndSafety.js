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
import GoalGroup from '../models/GoalGroup.js';
import TrainerReview from '../models/TrainerReview.js';
import Notification from '../models/Notification.js';
import { goalSafetyValidator } from '../services/safety/goalSafetyValidator.js';

const TEST_PORT = 5127;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runPhase2Tests() {
  console.log('===============================================================');
  console.log('🧪 GYMSYNC PHASE 2: GOAL ENGINE, SAFETY SCREENING & TRAINER REVIEW');
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

    // -----------------------------------------------------------------
    // SECTION 1: DETERMINISTIC UNIT MATH & BOUNDARY VALIDATION
    // -----------------------------------------------------------------
    console.log('\n--- 1. Deterministic Unit Math & Safety Screening ---');

    const bmiNormal = goalSafetyValidator.calculateBMI(70, 175);
    assert(bmiNormal === 22.9, `BMI calculated correctly: 70kg @ 175cm = ${bmiNormal} (expected 22.9)`);

    const bmiNull = goalSafetyValidator.calculateBMI(null, 175);
    assert(bmiNull === null, 'calculateBMI handles null weight gracefully');

    // Safe weight target evaluation
    const safeEval = goalSafetyValidator.evaluateWeightTarget({
      currentWeightKg: 80,
      targetWeightKg: 75,
      heightCm: 175
    });
    assert(safeEval.flagged === false, 'Safe weight loss target (80kg -> 75kg @ 175cm) is not flagged');

    // Severe underweight target (< 16.5 projected BMI)
    const severeUnderweightEval = goalSafetyValidator.evaluateWeightTarget({
      currentWeightKg: 50,
      targetWeightKg: 40,
      heightCm: 170
    });
    assert(
      severeUnderweightEval.flagged === true && severeUnderweightEval.reason === 'severe_underweight_target',
      `Target leading to BMI ${severeUnderweightEval.projectedBMI} (< 16.5) flagged as severe_underweight_target`
    );

    // Already underweight user asking for further loss (< 18.5 current BMI, projected BMI >= 16.5)
    const alreadyUnderweightEval = goalSafetyValidator.evaluateWeightTarget({
      currentWeightKg: 52,
      targetWeightKg: 50,
      heightCm: 172
    });
    assert(
      alreadyUnderweightEval.flagged === true && alreadyUnderweightEval.reason === 'already_underweight_requesting_further_loss',
      `Already underweight user (BMI ${alreadyUnderweightEval.currentBMI} -> ${alreadyUnderweightEval.projectedBMI}) requesting loss flagged correctly`
    );

    // Velocity / aggressive weekly rate evaluation (> 1% bodyweight/week)
    const aggressiveRateEval = goalSafetyValidator.evaluateWeeklyRate({
      currentWeightKg: 80,
      targetWeightKg: 70,
      deadlineWeeks: 2 // 5 kg/week vs safe ceiling of 0.8 kg/week
    });
    assert(
      aggressiveRateEval.flagged === true && aggressiveRateEval.reason === 'aggressive_weekly_rate',
      `Aggressive timeline (10kg in 2 weeks = 5.0 kg/wk) flagged against ceiling of 0.8 kg/wk`
    );

    const safeRateEval = goalSafetyValidator.evaluateWeeklyRate({
      currentWeightKg: 80,
      targetWeightKg: 76,
      deadlineWeeks: 8 // 0.5 kg/week vs safe ceiling 0.8 kg/week
    });
    assert(safeRateEval.flagged === false, 'Gradual timeline (4kg in 8 weeks = 0.5 kg/wk) passes safely');

    // Milestone generation
    const milestones = goalSafetyValidator.generateMilestones({
      startWeightKg: 90,
      targetWeightKg: 80,
      deadlineDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      count: 4
    });
    assert(milestones.length === 4, 'generateMilestones created exactly 4 intermediate milestones');
    assert(milestones[3].targetValue === 80, 'Final milestone matches target weight (80 kg)');
    assert(milestones[0].targetValue === 87.5, 'First milestone calculated proportionally (87.5 kg)');

    // -----------------------------------------------------------------
    // Clean up test users & collections
    // -----------------------------------------------------------------
    await User.deleteMany({ email: { $in: [
      'phase2_trainee@gymsync.test',
      'phase2_underweight@gymsync.test',
      'phase2_trainer@gymsync.test'
    ] } });
    await GoalGroup.deleteMany({ userName: { $in: ['Phase2_Trainee', 'Phase2_Underweight'] } });
    await TrainerReview.deleteMany({ userName: { $in: ['Phase2_Trainee', 'Phase2_Underweight'] } });
    await Notification.deleteMany({ title: { $in: ['Goal Target Approved', 'Goal Target Advisory'] } });

    // Seed test users: Trainee, Underweight Trainee, and Certified Trainer
    const trainee = await User.create({
      name: 'Phase2_Trainee',
      email: 'phase2_trainee@gymsync.test',
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true,
      bioData: {
        weight: 85,
        height: 178,
        gender: 'Male',
        trainingDaysPerWeek: 4
      }
    });

    const underweightUser = await User.create({
      name: 'Phase2_Underweight',
      email: 'phase2_underweight@gymsync.test',
      password: 'Password123!',
      role: 'User',
      isEmailVerified: true,
      bioData: {
        weight: 48,
        height: 172, // BMI ~16.2 (already underweight)
        gender: 'Female',
        trainingDaysPerWeek: 3
      }
    });

    const trainer = await User.create({
      name: 'Phase2_Coach',
      email: 'phase2_trainer@gymsync.test',
      password: 'Password123!',
      role: 'GymTrainer',
      isEmailVerified: true
    });

    const traineeToken = jwt.sign({ id: trainee._id }, jwtSecret, { expiresIn: '1h' });
    const underweightToken = jwt.sign({ id: underweightUser._id }, jwtSecret, { expiresIn: '1h' });
    const trainerToken = jwt.sign({ id: trainer._id }, jwtSecret, { expiresIn: '1h' });

    // -----------------------------------------------------------------
    // SECTION 2: GOAL EVALUATION & AUTHENTICATION GATE
    // -----------------------------------------------------------------
    console.log('\n--- 2. Goal Evaluation & Auth Verification ---');

    // Unauthenticated request rejected
    const unauthRes = await fetch(`${BASE_URL}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Goal', primaryGoalType: 'WeightLoss' })
    });
    assert(unauthRes.status === 401, 'Unauthenticated POST /api/goals rejected with HTTP 401');

    // Evaluate endpoint pre-flight check
    const evalRes = await fetch(`${BASE_URL}/api/goals/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({ targetWeightKg: 78, deadline: new Date(Date.now() + 60 * 86400000) })
    });
    const evalData = await evalRes.json();
    assert(evalRes.status === 200, 'POST /api/goals/evaluate succeeded with HTTP 200');
    assert(evalData.requiresTrainerReview === false, 'Safe pre-flight goal evaluation does not require review');

    // -----------------------------------------------------------------
    // SECTION 3: SAFE GOAL ACTIVATION
    // -----------------------------------------------------------------
    console.log('\n--- 3. Safe Goal Creation & Activation ---');

    const safeGoalRes = await fetch(`${BASE_URL}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({
        title: 'Gradual Healthy Fat Loss',
        primaryGoalType: 'WeightLoss',
        targetWeightKg: 78,
        deadline: new Date(Date.now() + 60 * 86400000),
        plannedSessionsPerWeek: 4
      })
    });
    const safeGoalData = await safeGoalRes.json();
    assert(safeGoalRes.status === 201, 'POST /api/goals for safe target returned HTTP 201');
    assert(safeGoalData.status === 'active', 'Safe goal status is "active"');
    assert(safeGoalData.goalGroup?.milestones?.length === 4, 'GoalGroup saved with 4 generated milestones');

    // Fetch active goal
    const activeRes = await fetch(`${BASE_URL}/api/goals/active`, {
      headers: { 'Authorization': `Bearer ${traineeToken}` }
    });
    const activeData = await activeRes.json();
    assert(activeRes.status === 200, 'GET /api/goals/active returned HTTP 200');
    assert(activeData.goalGroup?._id === safeGoalData.goalGroup._id, 'Active goal retrieved matches created GoalGroup');

    // -----------------------------------------------------------------
    // SECTION 4: UNSAFE GOAL WARNING & USER INSIST / ESCALATION
    // -----------------------------------------------------------------
    console.log('\n--- 4. Unsafe Goal Warning & Trainer Escalation Flow ---');

    // Underweight user attempts to lose weight without override
    const warnRes = await fetch(`${BASE_URL}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${underweightToken}`
      },
      body: JSON.stringify({
        title: 'Extreme Weight Cut',
        primaryGoalType: 'WeightLoss',
        targetWeightKg: 42, // Extreme loss from 48kg at 172cm
        deadline: new Date(Date.now() + 30 * 86400000)
      })
    });
    const warnData = await warnRes.json();
    assert(warnData.status === 'safety_warning', 'Unsafe goal triggers safety_warning response');
    assert(warnData.flagged === true, 'Goal flagged is true');
    assert(warnData.requiresTrainerReview === true, 'requiresTrainerReview is true');
    assert(Boolean(warnData.warningMessage), 'Empathetic warning message provided in response');

    // Confirm no GoalGroup was activated in MongoDB
    const checkNoActive = await GoalGroup.findOne({ userId: underweightUser._id, status: 'Active' });
    assert(!checkNoActive, 'No active GoalGroup was created after safety warning');

    // User insists with justification (overrideRequested = true)
    const insistRes = await fetch(`${BASE_URL}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${underweightToken}`
      },
      body: JSON.stringify({
        title: 'Extreme Weight Cut',
        primaryGoalType: 'WeightLoss',
        targetWeightKg: 42,
        deadline: new Date(Date.now() + 30 * 86400000),
        overrideRequested: true,
        userJustification: 'I need to make this weight class for an upcoming event'
      })
    });
    const insistData = await insistRes.json();
    assert(insistRes.status === 201, 'Overridden goal returned HTTP 201');
    assert(insistData.status === 'pending_trainer_review', 'Goal status is "pending_trainer_review"');
    assert(Boolean(insistData.trainerReviewId), 'Created TrainerReview document ID returned');

    // Verify GoalGroup is in 'PendingReview' state
    const pendingGoal = await GoalGroup.findById(insistData.goalGroup._id);
    assert(pendingGoal.status === 'PendingReview', 'GoalGroup saved in MongoDB with status "PendingReview"');

    // Verify TrainerReview in MongoDB
    const trainerReviewDoc = await TrainerReview.findById(insistData.trainerReviewId);
    assert(trainerReviewDoc !== null, 'TrainerReview document successfully persisted in MongoDB');
    assert(trainerReviewDoc.status === 'Pending', 'TrainerReview status is "Pending"');
    assert(trainerReviewDoc.userJustification.includes('weight class'), 'User justification captured');
    assert(trainerReviewDoc.flagReason.length > 0, 'Flag reason correctly attached to review');

    // -----------------------------------------------------------------
    // SECTION 5: TRAINER REVIEW QUEUE & RBAC VERIFICATION
    // -----------------------------------------------------------------
    console.log('\n--- 5. Trainer Review Queue & RBAC Access ---');

    // Regular user cannot view trainer review queue (HTTP 403)
    const forbiddenQueueRes = await fetch(`${BASE_URL}/api/ai/trainer-reviews`, {
      headers: { 'Authorization': `Bearer ${traineeToken}` }
    });
    assert(forbiddenQueueRes.status === 403, 'Regular user forbidden (HTTP 403) from accessing trainer reviews queue');

    // Regular user cannot approve reviews (HTTP 403)
    const forbiddenApproveRes = await fetch(`${BASE_URL}/api/ai/trainer-reviews/${trainerReviewDoc._id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      }
    });
    assert(forbiddenApproveRes.status === 403, 'Regular user forbidden (HTTP 403) from approving trainer reviews');

    // Certified Trainer views queue
    const trainerQueueRes = await fetch(`${BASE_URL}/api/ai/trainer-reviews`, {
      headers: { 'Authorization': `Bearer ${trainerToken}` }
    });
    const trainerQueueData = await trainerQueueRes.json();
    assert(trainerQueueRes.status === 200, 'GymTrainer authorized to view trainer reviews queue (HTTP 200)');
    assert(trainerQueueData.reviews.some(r => String(r._id) === String(trainerReviewDoc._id)), 'Pending review appears in trainer queue');

    // -----------------------------------------------------------------
    // SECTION 6: TRAINER REJECTION & NOTIFICATION
    // -----------------------------------------------------------------
    console.log('\n--- 6. Trainer Rejection Flow & Safe Alternative ---');

    const rejectRes = await fetch(`${BASE_URL}/api/ai/trainer-reviews/${trainerReviewDoc._id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trainerToken}`
      },
      body: JSON.stringify({
        trainerNotes: '42 kg at 172cm is medically unsafe and presents severe risks.',
        safeAlternative: 'Maintain 48-50kg and focus on athletic conditioning and hydration'
      })
    });
    const rejectData = await rejectRes.json();
    assert(rejectRes.status === 200, 'Trainer reject returned HTTP 200');
    assert(rejectData.review.status === 'Rejected', 'TrainerReview status updated to "Rejected"');

    // Verify GoalGroup marked Abandoned
    const abandonedGoal = await GoalGroup.findById(pendingGoal._id);
    assert(abandonedGoal.status === 'Abandoned', 'Linked GoalGroup status updated to "Abandoned"');

    // Verify user received constructive notification
    const userNotif = await Notification.findOne({
      recipientId: underweightUser._id,
      type: 'system',
      title: 'Goal Target Advisory'
    });
    assert(userNotif !== null, 'User received system notification regarding trainer rejection');
    assert(userNotif.message.includes('Maintain 48-50kg'), 'Notification includes trainer safe alternative recommendation');

    // Cannot reject or approve an already resolved review
    const duplicateRejectRes = await fetch(`${BASE_URL}/api/ai/trainer-reviews/${trainerReviewDoc._id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trainerToken}`
      }
    });
    assert(duplicateRejectRes.status === 400, 'Resolving an already completed review rejected with HTTP 400');

    // -----------------------------------------------------------------
    // SECTION 7: TRAINER APPROVAL FLOW
    // -----------------------------------------------------------------
    console.log('\n--- 7. Trainer Approval Flow & Goal Activation ---');

    // Create a borderline aggressive goal for Trainee requiring review
    const borderlineInsistRes = await fetch(`${BASE_URL}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traineeToken}`
      },
      body: JSON.stringify({
        title: 'Aggressive Competition Cut',
        primaryGoalType: 'WeightLoss',
        targetWeightKg: 72,
        deadline: new Date(Date.now() + 14 * 86400000), // 2 weeks aggressive timeline
        overrideRequested: true,
        userJustification: 'Experienced competitor doing short-term competition cut'
      })
    });
    const borderlineData = await borderlineInsistRes.json();
    assert(borderlineData.status === 'pending_trainer_review', 'Borderline goal placed in pending_trainer_review');

    // Trainer approves the aggressive timeline
    const approveRes = await fetch(`${BASE_URL}/api/ai/trainer-reviews/${borderlineData.trainerReviewId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trainerToken}`
      },
      body: JSON.stringify({
        trainerNotes: 'Approved under strict supervision. Monitor hydration daily.'
      })
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200, 'Trainer approval returned HTTP 200');
    assert(approveData.review.status === 'Approved', 'Review marked Approved');

    // Linked GoalGroup is now ACTIVE
    const activatedGoal = await GoalGroup.findById(borderlineData.goalGroup._id);
    assert(activatedGoal.status === 'Active', 'Linked GoalGroup successfully transitioned from PendingReview to Active');

    // Trainee received approval notification
    const approvalNotif = await Notification.findOne({
      recipientId: trainee._id,
      type: 'system',
      title: 'Goal Target Approved'
    });
    assert(approvalNotif !== null, 'Trainee received notification that goal is now active');

    // -----------------------------------------------------------------
    // SECTION 8: GOAL ABANDONMENT & IDOR PROTECTION
    // -----------------------------------------------------------------
    console.log('\n--- 8. Goal Abandonment & Ownership Protection ---');

    // Underweight user tries to abandon trainee's goal (IDOR check)
    const idorAbandonRes = await fetch(`${BASE_URL}/api/goals/${activatedGoal._id}/abandon`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${underweightToken}` }
    });
    assert(idorAbandonRes.status === 404, 'IDOR blocked: Cannot abandon another user’s goal (got 404)');

    // Trainee abandons own goal
    const ownAbandonRes = await fetch(`${BASE_URL}/api/goals/${activatedGoal._id}/abandon`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${traineeToken}` }
    });
    assert(ownAbandonRes.status === 200, 'User successfully abandoned their own goal (HTTP 200)');
    const postAbandonGoal = await GoalGroup.findById(activatedGoal._id);
    assert(postAbandonGoal.status === 'Abandoned', 'GoalGroup status correctly updated to Abandoned');

    // Clean up
    await User.deleteMany({ email: { $in: [
      'phase2_trainee@gymsync.test',
      'phase2_underweight@gymsync.test',
      'phase2_trainer@gymsync.test'
    ] } });
    await GoalGroup.deleteMany({ userName: { $in: ['Phase2_Trainee', 'Phase2_Underweight'] } });
    await TrainerReview.deleteMany({ userName: { $in: ['Phase2_Trainee', 'Phase2_Underweight'] } });
    await Notification.deleteMany({ title: { $in: ['Goal Target Approved', 'Goal Target Advisory'] } });

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    if (server) {
      server.close();
      console.log('\n🛑 Test server stopped.');
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 PHASE 2 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
