import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['SuperAdmin', 'Admin', 'GymOwner', 'User', 'StoreManager', 'ComplaintModerator'], 
    default: 'User' 
  },
  adminTier: { type: String, enum: ['Senior', 'Junior', 'None'], default: 'None' },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  profilePic: { type: String, default: '' },
  
  // Friend & Follow System
  friends: [{ type: String }],
  sentRequests: [{ type: String }],
  receivedRequests: [{ type: String }],
  followers: [{ type: String }],
  following: [{ type: String }]
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
