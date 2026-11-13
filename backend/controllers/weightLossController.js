import User from '../models/User.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import SavedAIPlan from '../models/SavedAIPlan.js';
import PreMadePlan from '../models/PreMadePlan.js';
import ActivityLog from '../models/ActivityLog.js';
import WeightLossEnrollment from '../models/WeightLossEnrollment.js';
import { checkWeightLossEligibility, calculateAge, MEDICAL_WARNING_TEXT, MEDICAL_WARNING_VERSION } from '../services/weightLoss/weightLossEligibility.js';
import { evaluateWeightLossPlan } from '../services/weightLoss/weightLossCalculator.js';
import { generateWeightLossProjection, calculateConfidenceLabel } from '../services/weightLoss/weightLossProjection.js';
import { getMatchingWeightLossTemplate, seedWeightLossTemplatesIfMissing, expandTemplateWeeks } from '../services/weightLoss/weightLossTemplates.js';

// @desc    Pre-flight eligibility check
// @route   GET /api/weight-loss/eligibility
// @access  Private
export const checkEligibilityController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bioData name');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { targetWeightKg, targetDurationWeeks, medicalWarningAcknowledged, seniorAcknowledged } = req.query;

    const result = await checkWeightLossEligibility({
      user,
      targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
      targetDurationWeeks: targetDurationWeeks ? Number(targetDurationWeeks) : null,
      medicalWarningAcknowledged: medicalWarningAcknowledged === 'true' || medicalWarningAcknowledged === true,
      seniorAcknowledged: seniorAcknowledged === 'true' || seniorAcknowledged === true
    });

    res.status(200).json(result);
  } catch (err) {
    console.error('checkEligibilityController Error:', err);
    res.status(500).json({ error: 'Failed to verify weight loss eligibility' });
  }
};

// @desc    Calculate metabolic velocity and projection ranges
// @route   POST /api/weight-loss/calculate
// @access  Private
export const calculateProjectionsController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bioData');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bio = user.bioData || {};
    const { targetWeightKg, targetDurationWeeks, targetDurationDays } = req.body;

    const currentWeightKg = Number(bio.weight);
    const heightCm = Number(bio.height);
    const age = calculateAge(bio.dob, bio.age);
    const gender = bio.gender;
    const trainingDaysPerWeek = Number(bio.trainingDaysPerWeek) || 3;

    if (!currentWeightKg || !heightCm || !age) {
      return res.status(400).json({
        error: 'Complete your profile with height, weight, and age/dob to view projections.'
      });
    }

    // 1. Math evaluation (BMR, realistic timeline, caps)
    const planEval = evaluateWeightLossPlan({
      currentWeightKg,
      targetWeightKg: Number(targetWeightKg),
      targetDurationWeeks,
      targetDurationDays,
      heightCm,
      age,
      gender,
      trainingDaysPerWeek
    });

    // 2. Count logged user data for confidence label
    const [workoutsCount, weighInsCount, foodLogsCount] = await Promise.all([
      ActivityLog.countDocuments({ userId: req.user._id }),
      WeightLossEnrollment.countDocuments({ userId: req.user._id, 'weighIns.0': { $exists: true } }),
      ActivityLog.countDocuments({ userId: req.user._id, totalCaloriesBurned: { $gt: 0 } })
    ]);

    // 3. Generate non-linear projections
    const projections = generateWeightLossProjection({
      currentWeightKg,
      targetWeightKg: Number(targetWeightKg),
      targetDurationWeeks: planEval.requestedWeeks,
      age,
      gender,
      trainingDaysPerWeek,
      userLogStats: { workoutsCount, weighInsCount, foodLogsCount }
    });

    res.status(200).json({
      planEvaluation: planEval,
      projections
    });
  } catch (err) {
    console.error('calculateProjectionsController Error:', err);
    res.status(500).json({ error: 'Failed to compute metabolic projections' });
  }
};

// @desc    Enroll in weight loss program
// @route   POST /api/weight-loss/enroll
// @access  Private
export const enrollController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      targetWeightKg,
      targetDurationWeeks,
      medicalWarningAcknowledged,
      seniorAcknowledged,
      preferredTemplateKey,
      selectedProgramId,
      programId
    } = req.body;

    // 1. Strict Eligibility Gate (Rule R3: Exactly one active program at a time)
    const eligibility = await checkWeightLossEligibility({
      user,
      targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
      targetDurationWeeks: Number(targetDurationWeeks) || 12,
      medicalWarningAcknowledged: Boolean(medicalWarningAcknowledged),
      seniorAcknowledged: Boolean(seniorAcknowledged),
      allowProgramSwitch: false
    });

    if (!eligibility.eligible) {
      const statusCode = eligibility.code === 'ACTIVE_PROGRAM_EXISTS' ? 409 : 400;
      return res.status(statusCode).json({
        error: eligibility.message,
        message: eligibility.message,
        code: eligibility.code,
        details: eligibility
      });
    }

    // 2. Ensure human-authored templates exist in DB
    await seedWeightLossTemplatesIfMissing();

    const bio = user.bioData || {};
    let templateDoc = null;
    const progId = selectedProgramId || programId;

    if (progId) {
      templateDoc = await PreMadePlan.findById(progId);
    }

    if (!templateDoc && preferredTemplateKey) {
      templateDoc = await PreMadePlan.findOne({ key: preferredTemplateKey });
    }

    if (!templateDoc) {
      const selectedTemplate = getMatchingWeightLossTemplate({ equipmentAccess: bio.equipmentAccess, trainingDaysPerWeek: bio.trainingDaysPerWeek });
      templateDoc = await PreMadePlan.findOne({ title: selectedTemplate.title });
      if (!templateDoc) {
        templateDoc = await PreMadePlan.create({ ...selectedTemplate, version: 1 });
      }
    }

    // Check if user is already actively enrolled in this program
    const existingActive = await UserWorkoutProgram.findOne({
      userId: user._id,
      sourceProgramId: templateDoc._id,
      isActive: true
    });
    if (existingActive) {
      const existingEnrollment = await WeightLossEnrollment.findOne({
        userId: user._id,
        isActive: true
      });
      return res.status(200).json({
        message: 'You are already enrolled in this program.',
        enrollment: existingEnrollment,
        program: existingActive
      });
    }

    // Enforce Rule R3: Exactly ONE active program per user - deactivate previous programs
    await UserWorkoutProgram.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false }
    );
    await WeightLossEnrollment.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, status: 'Replaced' }
    );

    const weeks = Math.max(1, Number(targetDurationWeeks) || templateDoc.durationWeeks || 4);
    const targetDate = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);

    const finalWeeks = (templateDoc.weeks && templateDoc.weeks.length < weeks)
      ? expandTemplateWeeks(templateDoc.weeks, weeks)
      : (templateDoc.weeks || []);

    const startWeight = (Number(bio.weight) > 0) ? Number(bio.weight) : 75;
    const targetWeight = (Number(targetWeightKg) > 0) ? Number(targetWeightKg) : Math.max(30, startWeight - 4);

    let userProgram = null;

    // 3. Create active UserWorkoutProgram instance from human-authored template
    userProgram = await UserWorkoutProgram.create({
      userId: user._id,
      userName: user.name,
      sourceProgramId: templateDoc._id,
      programVersion: templateDoc.version || 1,
      title: templateDoc.title,
      goal: 'Weight Loss',
      difficulty: templateDoc.difficulty || 'Beginner',
      durationWeeks: weeks,
      daysPerWeek: templateDoc.daysPerWeek || 3,
      instructorName: templateDoc.createdBy || 'Certified Instructor',
      equipmentTrack: templateDoc.equipmentTrack || 'Home (No Equipment)',
      programLevel: templateDoc.programLevel || 'Starter',
      isExtremeProgram: templateDoc.isExtremeProgram || false,
      missedDayPolicy: templateDoc.missedDayPolicy || undefined,
      cardioPrescription: templateDoc.cardioPrescription || undefined,
      weeks: finalWeeks,
      startDate: new Date(),
      isActive: true,
      progress: {
        currentWeek: 1,
        currentDay: 1,
        completedSessions: []
      }
    });

    // 4. Create WeightLossEnrollment (storing ONLY acknowledgment metadata, zero medical conditions)
    const enrollment = await WeightLossEnrollment.create({
      userId: user._id,
      userWorkoutProgramId: userProgram._id,
      programTemplateId: templateDoc._id,
      status: 'Active',
      isActive: true,
      startWeightKg: startWeight,
      targetWeightKg: targetWeight,
      targetDurationWeeks: weeks,
      startDate: new Date(),
      targetDate,
      templateType: templateDoc.key || 'home_starter',
      medicalWarning: {
        acknowledgedAt: new Date(),
        version: MEDICAL_WARNING_VERSION,
        seniorAcknowledgedAt: eligibility.isSenior ? new Date() : null
      },
      confidenceLabel: 'Low',
      weighIns: [
        {
          date: new Date().toISOString().split('T')[0],
          weightKg: startWeight,
          isVerified: false,
          notes: 'Starting baseline weight recorded at enrollment'
        }
      ]
    });

    res.status(201).json({
      message: 'Successfully enrolled in the Weight Loss program.',
      enrollment,
      program: userProgram
    });
  } catch (err) {
    console.error('enrollController Error:', err);
    res.status(500).json({ error: 'Failed to complete weight loss enrollment' });
  }
};

// @desc    Get active enrollment
// @route   GET /api/weight-loss/active
// @access  Private
export const getActiveEnrollmentController = async (req, res) => {
  try {
    const enrollment = await WeightLossEnrollment.findOne({
      userId: req.user._id,
      isActive: true
    }).populate('programTemplateId', 'title createdBy description equipmentRequired weeks');

    if (!enrollment) {
      return res.status(200).json({ active: false, enrollment: null });
    }

    const userProgram = enrollment.userWorkoutProgramId
      ? await UserWorkoutProgram.findById(enrollment.userWorkoutProgramId)
      : null;

    res.status(200).json({
      active: true,
      enrollment,
      program: userProgram
    });
  } catch (err) {
    console.error('getActiveEnrollmentController Error:', err);
    res.status(500).json({ error: 'Failed to fetch active weight loss enrollment' });
  }
};

// @desc    Record optional check-in (weight, waist, or notes)
// @route   POST /api/weight-loss/weigh-in
// @access  Private
export const recordWeighInController = async (req, res) => {
  try {
    const enrollment = await WeightLossEnrollment.findOne({
      userId: req.user._id,
      isActive: true
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'No active weight loss enrollment found.' });
    }

    const { weightKg, waistCm, notes, date } = req.body;
    const checkInDate = date || new Date().toISOString().split('T')[0];

    const newRecord = {
      date: checkInDate,
      weightKg: weightKg != null && weightKg !== '' ? Number(weightKg) : null,
      isVerified: false, // Marked unverified when absent or user-reported without scale
      waistCm: waistCm != null && waistCm !== '' ? Number(waistCm) : null,
      notes: notes ? String(notes).trim() : '',
      loggedAt: new Date()
    };

    enrollment.weighIns.push(newRecord);

    // Dynamic confidence recalculation
    const totalLogs = enrollment.weighIns.length;
    enrollment.confidenceLabel = totalLogs >= 10 ? 'High' : (totalLogs >= 3 ? 'Medium' : 'Low');

    await enrollment.save();

    res.status(200).json({
      message: 'Check-in recorded successfully.',
      weighIns: enrollment.weighIns,
      confidenceLabel: enrollment.confidenceLabel
    });
  } catch (err) {
    console.error('recordWeighInController Error:', err);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
};

// @desc    Cancel / leave weight loss program
// @route   POST /api/weight-loss/cancel
// @access  Private
export const cancelEnrollmentController = async (req, res) => {
  try {
    const enrollment = await WeightLossEnrollment.findOne({
      userId: req.user._id,
      isActive: true
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'No active weight loss enrollment found to cancel.' });
    }

    enrollment.isActive = false;
    enrollment.status = 'Abandoned';
    await enrollment.save();

    if (enrollment.userWorkoutProgramId) {
      await UserWorkoutProgram.findByIdAndUpdate(enrollment.userWorkoutProgramId, {
        isActive: false
      });
    }

    res.status(200).json({ message: 'Weight loss program ended successfully.' });
  } catch (err) {
    console.error('cancelEnrollmentController Error:', err);
    res.status(500).json({ error: 'Failed to cancel weight loss enrollment' });
  }
};

export default {
  checkEligibilityController,
  calculateProjectionsController,
  enrollController,
  getActiveEnrollmentController,
  recordWeighInController,
  cancelEnrollmentController
};
