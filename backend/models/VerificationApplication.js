import mongoose from 'mongoose';

const verificationApplicationSchema = new mongoose.Schema({
  referenceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
    index: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  applicantDetails: {
    legalName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    cnicOrPassport: { type: String, default: '' },
    relationship: {
      type: String,
      enum: ['Owner', 'Co-owner', 'AuthorizedManager'],
      default: 'Owner'
    },
    preferredContactMethod: {
      type: String,
      enum: ['Email', 'Phone', 'WhatsApp'],
      default: 'Email'
    }
  },
  statementOfPurpose: { type: String, default: '' },
  documents: [{
    documentType: {
      type: String,
      enum: [
        'CNIC',
        'BusinessRegistration',
        'EntranceSignboard',
        'PremisesProof',
        'ManagerAuthorization',
        'InteriorPhoto',
        'Other'
      ],
      required: true
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationDocument'
    },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', 'Replaced'],
      default: 'Pending'
    },
    rejectionReason: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: [
      'Draft',
      'Pending Review',
      'Under Review',
      'More Information Required',
      'Approved',
      'Rejected',
      'Suspended'
    ],
    default: 'Draft',
    index: true
  },
  missingRequirements: [{ type: String }],
  reviewerNotes: { type: String, default: '' }, // Strictly private, never returned in public DTOs
  submittedAt: { type: Date, default: null },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedByName: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  reviewHistory: [{
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewerName: { type: String },
    action: {
      type: String,
      enum: [
        'SUBMIT',
        'UNDER_REVIEW',
        'REQUEST_INFO',
        'APPROVE',
        'REJECT',
        'SUSPEND',
        'RESUBMIT',
        'UPDATE_DRAFT'
      ]
    },
    notes: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const VerificationApplication = mongoose.model('VerificationApplication', verificationApplicationSchema);
export default VerificationApplication;
