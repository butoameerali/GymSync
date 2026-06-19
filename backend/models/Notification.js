import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // For the demo, tracking by userName or generic ID
  type: { type: String, enum: ['like', 'comment', 'reply', 'system', 'friend_request'], required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String }, // Optional link to the post or page
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
