import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: 'Unknown User' },
  authorRole: { type: String, default: 'user' },
  content: { type: String, required: true },
  mediaUrl: { type: String },
  likes: [{ type: String }],
  comments: [{
    text: { type: String },
    author: { type: String },
    date: { type: Date, default: Date.now },
    replies: [{
      text: { type: String },
      author: { type: String },
      date: { type: Date, default: Date.now }
    }]
  }]
}, { timestamps: true });

export default mongoose.model('Post', postSchema);
