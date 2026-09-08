import mongoose from 'mongoose';

const instructorRequestSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    default: 'SuperAdmin'
  },
  fromId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
    index: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Dismissed'],
    default: 'Pending',
    index: true
  },
  assignedTo: {
    type: String,
    default: 'All',
    index: true
  },
  assignedToId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedBy: {
    type: String,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  responseNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

instructorRequestSchema.index({ status: 1, assignedTo: 1 });

instructorRequestSchema.pre('validate', function() {
  if (!this.topic && this.title) {
    this.topic = this.title;
  }
  if (!this.title && this.topic) {
    this.title = this.topic;
  }
});

const InstructorRequest = mongoose.model('InstructorRequest', instructorRequestSchema);
export default InstructorRequest;
