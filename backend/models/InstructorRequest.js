import mongoose from 'mongoose';

const instructorRequestSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    default: 'SuperAdmin'
  },
  topic: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  },
  assignedTo: {
    type: String,
    default: 'All'
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

const InstructorRequest = mongoose.model('InstructorRequest', instructorRequestSchema);
export default InstructorRequest;
