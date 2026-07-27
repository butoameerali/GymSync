import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  reporterName: { type: String, required: true },
  reportedEntityType: { 
    type: String, 
    enum: ['User', 'Post', 'Comment', 'Gym', 'Product'], 
    required: true 
  },
  reportedEntityId: { type: String, required: true },
  reportedEntityTitle: { type: String, default: '' },
  reason: { type: String, required: true },
  description: { type: String, required: true },
  evidenceUrls: [{ type: String }],
  status: { 
    type: String, 
    enum: ['Pending', 'InReview', 'Resolved', 'Dismissed'], 
    default: 'Pending' 
  },
  assignedAdminName: { type: String, default: 'Unassigned' },
  adminReply: { type: String, default: '' },
  chatMessages: [{
    senderName: { type: String, required: true },
    role: { type: String, default: 'User' },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  history: [{
    action: String,
    performedBy: String,
    timestamp: { type: Date, default: Date.now },
    notes: String
  }]
}, {
  timestamps: true
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
