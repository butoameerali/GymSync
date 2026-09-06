import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // A display name is not an account identifier. MongoDB's _id and email
  // provide identity; multiple people may use the same display name.
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['SuperAdmin', 'Admin', 'GymOwner', 'User', 'StoreManager', 'ComplaintModerator', 'FitnessInstructor', 'GymTrainer'], 
    default: 'User' 
  },
  adminTier: { type: String, enum: ['Senior', 'Junior', 'None'], default: 'None' },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  isSubscribed: { type: Boolean, default: false },
  subscriptionPlan: { type: String, default: 'Free' },
  subscribedGymName: { type: String, default: null },
  gymMembershipType: { type: String, enum: ['Monthly', 'Yearly'], default: null },
  gymJoiningDate: { type: Date, default: null },
  gymMembershipExpiresAt: { type: Date, default: null },
  gymAutoRenew: { type: Boolean, default: false },
  assignedGymName: { type: String, default: null },
  futureSubscribedGymName: { type: String, default: null },
  futureSubscriptionDate: { type: Date, default: null },
  profilePic: { type: String, default: '' },
  recoveryEmail: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  isGoogleApproved: { type: Boolean, default: false },
  otpCode: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpVerified: { type: Boolean, default: false },
  
  // Friend & Follow System
  friends: [{ type: String }],
  sentRequests: [{ type: String }],
  receivedRequests: [{ type: String }],
  followers: [{ type: String }],
  following: [{ type: String }],

  // Bio & Onboarding System
  bioData: {
    mainGoalArea: { type: String, default: '' },
    goals: [{ type: String }],
    planDuration: { type: String, default: '1 Month' },
    trainingDaysPerWeek: { type: Number, default: 3 },
    equipmentAccess: { type: String, default: 'Full Gym' },
    pushupBaseline: { type: Number, default: 10 },
    gender: { type: String, default: '' },
    dob: { type: String, default: '' },
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    height: { type: Number, default: 170 },
    weight: { type: Number, default: 70 },
    targetMuscles: [{ type: String }]
  },
  isOnboardingCompleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
export default User;
