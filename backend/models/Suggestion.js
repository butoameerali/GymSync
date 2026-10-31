import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  type: {
    type: String,
    enum: ['Ad', 'Gym', 'Exercise', 'Product', 'Tip', 'TopUser'],
    default: 'Ad',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  badge: {
    type: String,
    default: ''
  },
  meta: {
    type: String,
    default: ''
  },
  linkUrl: {
    type: String,
    default: ''
  },
  linkId: {
    type: String,
    default: ''
  },
  ctaText: {
    type: String,
    default: 'Learn More'
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Suggestion', suggestionSchema);
