import mongoose from 'mongoose';

const weighInRecordSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  weightKg: { type: Number, default: null },
  isVerified: { type: Boolean, default: false },
  waistCm: { type: Number, default: null },
  notes: { type: String, default: '' },
  loggedAt: { type: Date, default: Date.now }
}, { _id: true });

const weightLossEnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userWorkoutProgramId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserWorkoutProgram', default: null },
  programTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'PreMadePlan', default: null },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Abandoned', 'Paused'],
    default: 'Active',
    index: true
  },
  isActive: { type: Boolean, default: true, index: true },
  startWeightKg: { type: Number, required: true },
  targetWeightKg: { type: Number, required: true },
  targetDurationWeeks: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  targetDate: { type: Date, required: true },
  templateType: {
    type: String,
    default: 'home_bodyweight'
  },
  
  // Rule R5: STORE ONLY ACKNOWLEDGMENT METADATA. NEVER STORE MEDICAL HISTORY.
  medicalWarning: {
    acknowledgedAt: { type: Date, required: true },
    version: { type: String, required: true },
    seniorAcknowledgedAt: { type: Date, default: null }
  },

  // 2.5: Optional weigh-ins (weight, waist, or notes)
  weighIns: [weighInRecordSchema],

  confidenceLabel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  }
}, {
  timestamps: true
});

weightLossEnrollmentSchema.index({ userId: 1, isActive: 1 });

const WeightLossEnrollment = mongoose.model('WeightLossEnrollment', weightLossEnrollmentSchema);
export default WeightLossEnrollment;
