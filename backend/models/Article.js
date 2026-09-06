import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  authorRole: {
    type: String,
    default: 'FitnessInstructor'
  },
  category: {
    type: String,
    default: 'Training'
  },
  readTime: {
    type: String,
    default: '4 min'
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

const Article = mongoose.model('Article', articleSchema);
export default Article;
