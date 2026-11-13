import mongoose from 'mongoose';

const aiCoachMemorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true,
    index: true 
  },
  askedFields: [{ 
    type: String 
  }],
  learnedContext: { 
    type: Map, 
    of: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

export default mongoose.models.AICoachMemory || mongoose.model('AICoachMemory', aiCoachMemorySchema);
