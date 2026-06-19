import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // User name
  receiver: { type: String, required: true }, // User name
  text: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
