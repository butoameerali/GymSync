import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // For the demo, tracking by userName or generic ID
  type: { type: String, enum: ['like', 'comment', 'reply', 'system', 'friend_request', 'gmail_verification', 'follow'], required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String }, // Optional link to the post or page
  // Stable key used for activity that can be toggled (such as a post like).
  // It prevents a new notification every time the UI is refreshed or re-clicked.
  eventKey: { type: String, index: true, sparse: true },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
