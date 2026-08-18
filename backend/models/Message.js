import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true, index: true },
  receiver: { type: String, required: true, index: true },
  text: { type: String, required: true },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null }
}, {
  timestamps: true
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
