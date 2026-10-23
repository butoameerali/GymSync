import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  reporterName: { type: String, required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportedEntityType: { 
    type: String, 
    enum: ['User', 'Post', 'Comment', 'Gym', 'Product', 'SubscriptionRefund', 'General', 'Billing', 'GymFacility', 'Trainer', 'TechnicalBug'], 
    default: 'General'
  },
  reportedEntityId: { type: String, default: 'platform' },
  reportedEntityTitle: { type: String, default: '' },
  title: { type: String, default: '' },
  category: { type: String, default: 'General' },
  reason: { type: String, required: true },
  description: { type: String, required: true },
  evidenceUrls: [{ type: String }],
  isRefundRequested: { type: Boolean, default: false },
  refundAmount: { type: Number, default: 0 },
  cashbackApprovalStatus: { 
    type: String, 
    enum: ['none', 'pending_higher_admin', 'approved', 'rejected'], 
    default: 'none' 
  },
  approvedBy: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Pending', 'InReview', 'In Progress', 'Resolved', 'Dismissed', 'Closed', 'Reopened'], 
    default: 'Pending' 
  },
  assignedAdminName: { type: String, default: 'Unassigned' },
  adminReply: { type: String, default: '' },
  resolutionNotes: { type: String, default: '' },
  reopenReason: { type: String, default: '' },
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
