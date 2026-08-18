import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['like', 'comment', 'reply', 'system', 'friend_request', 'gmail_verification', 'follow'], required: true },
  title: { type: String, default: '' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  link: { type: String, default: '' },
  relatedId: { type: String, default: '' },
  sender: { type: String, default: '' },
  eventKey: { type: String, index: true, sparse: true },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
