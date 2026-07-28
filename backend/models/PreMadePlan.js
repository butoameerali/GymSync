import mongoose from 'mongoose';

const preMadePlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Exercise', 'Diet'],
    required: true
  },
  category: {
    type: String,
    default: 'General Fitness'
  },
  description: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdBy: {
    type: String,
    default: 'GymSync Admin'
  }
}, { timestamps: true });

export default mongoose.model('PreMadePlan', preMadePlanSchema);
