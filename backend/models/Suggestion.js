import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Product', 'Gym', 'TopUser'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  linkId: { type: String } // e.g., Gym ID or Product ID to route to
}, { timestamps: true });

export default mongoose.model('Suggestion', suggestionSchema);
