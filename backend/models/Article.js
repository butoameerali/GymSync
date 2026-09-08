import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  authorRole: {
    type: String,
    default: 'FitnessInstructor'
  },
  category: {
    type: String,
    default: 'Training',
    index: true
  },
  readTime: {
    type: String,
    default: '4 min'
  },
  tags: [{
    type: String
  }],
  topics: [{
    type: String
  }],
  relatedExerciseIds: [{
    type: String
  }],
  relatedProgramIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PreMadePlan'
  }],
  relatedGoals: [{
    type: String
  }],
  relatedSports: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  coverImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

articleSchema.index({ status: 1, category: 1, createdAt: -1 });
articleSchema.index({ status: 1, createdAt: -1 });
articleSchema.index({ status: 1, tags: 1 });
articleSchema.index({ status: 1, topics: 1 });

const Article = mongoose.model('Article', articleSchema);
export default Article;

