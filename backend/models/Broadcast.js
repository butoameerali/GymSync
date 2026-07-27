import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  eventType: { 
    type: String, 
    enum: ['ExclusiveEvent', 'FreeGift', 'SubscriberSpecial'], 
    default: 'ExclusiveEvent' 
  },
  sentBy: { type: String, required: true },
  targetAudience: { type: String, default: 'All Subscribers' }
}, { timestamps: true });

export default mongoose.model('Broadcast', broadcastSchema);
