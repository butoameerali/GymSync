import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    index: true
  },
  deviceInfo: {
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    ip: { type: String, default: '127.0.0.1' },
    userAgent: { type: String, default: '' },
    deviceType: { type: String, default: 'Desktop' }
  },
  isCurrent: { type: Boolean, default: false },
  isRevoked: { type: Boolean, default: false, index: true },
  revokedAt: { type: Date, default: null },
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true }
}, {
  timestamps: true
});

sessionSchema.index({ user: 1, isRevoked: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
