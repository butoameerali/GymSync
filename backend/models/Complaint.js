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
  assignedModerator: { type: String, default: 'Unassigned' },
  adminReply: { type: String, default: '' },
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
