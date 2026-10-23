import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: 'Unknown User' },
  authorRole: { type: String, default: 'User' },
  content: { type: String, required: true },
  mediaUrl: { type: String },
  isCashback: { type: Boolean, default: false },
  cashbackAmount: { type: Number, default: 0 },
  approvalStatus: { 
    type: String, 
    enum: ['published', 'pending_approval', 'approved', 'rejected'], 
    default: 'published' 
  },
  approvedBy: { type: String, default: '' },
  reportCount: { type: Number, default: 0 },
  reportedBy: [{ 
    userName: { type: String },
    reason: { type: String },
    explanation: { type: String },
    date: { type: Date, default: Date.now }
  }],
  commentRestriction: {
    type: String,
    enum: ['AllUsers', 'SubscribersOnly'],
    default: 'SubscribersOnly'
  },
  likeRestriction: {
    type: String,
    enum: ['AllUsers'],
    default: 'AllUsers'
  },
  viewRestriction: {
    type: String,
    enum: ['AllUsers'],
    default: 'AllUsers'
  },
  likes: [{ type: String }],
  comments: [{
    text: { type: String },
    author: { type: String },
    authorName: { type: String },
    authorPic: { type: String },
    date: { type: Date, default: Date.now },
    replies: [{
      text: { type: String },
      author: { type: String },
      authorName: { type: String },
      authorPic: { type: String },
      date: { type: Date, default: Date.now }
    }]
  }],
  // Post Moderation & Appeal Lifecycle (15-day hold & 3-day reject grace period)
  isModerated: { type: Boolean, default: false },
  moderationStatus: {
    type: String,
    enum: ['Active', 'RemovedPendingAppeal', 'UnderReview', 'AppealRejected'],
    default: 'Active'
  },
  moderationReason: { type: String, default: '' },
  moderatedAt: { type: Date },
  appealDeadline: { type: Date },
  isAppealSubmitted: { type: Boolean, default: false },
  appealReason: { type: String, default: '' },
  appealedAt: { type: Date },
  adminAppealReply: { type: String, default: '' },
  finalPurgeDeadline: { type: Date }
}, { timestamps: true });

postSchema.index({ author: 1 });
postSchema.index({ authorName: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);

