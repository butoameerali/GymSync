import mongoose from 'mongoose';

const aiCacheSchema = new mongoose.Schema({
  normalizedQuery: { type: String, required: true, index: true },
  originalQuery: { type: String, required: true },
  response: { type: String, required: true },
  category: { type: String, default: 'general_fitness' }, // e.g. workout, diet, injury_prevention, general_fitness
  hitCount: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const AICache = mongoose.model('AICache', aiCacheSchema);
export default AICache;
