import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  eventType: { 
    type: String, 
    enum: ['Announcement', 'SystemNotice', 'FeatureUpdate', 'Promotion', 'UrgentAlert', 'ExclusiveEvent', 'FreeGift', 'SubscriberSpecial'], 
    default: 'Announcement' 
  },
  sentBy: { type: String, required: true },
  targetAudience: { type: String, default: 'All Users' },
  recipientCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Broadcast', broadcastSchema);
