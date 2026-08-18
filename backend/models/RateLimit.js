import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 1 },
  resetAt: { type: Date, required: true, expires: 0 }
});

const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);
export default RateLimit;
