import mongoose from 'mongoose';

const gymSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  ownerName: { type: String, required: true },
  ownerEmail: { type: String, default: '' },
  name: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, default: '' },
  facilities: [String],
  equipmentImages: [String],
  equipmentStatus: [{
    name: String,
    status: { type: String, enum: ['Available', 'Maintenance', 'Unavailable'], default: 'Available' },
    quantity: { type: Number, default: 1 },
    notes: String
  }],
  trainerIncluded: { type: Boolean, default: false },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
    index: true
  },
  branchName: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: 'Pakistan' },
  address: { type: String, default: '' },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  placeId: { type: String, default: '' },
  googleMapsUrl: { type: String, default: '' },
  gymType: { type: String, default: 'Commercial Gym' },
  contactPhone: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  photos: [String],
  verificationApplication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerificationApplication'
  },
  approvalStatus: { 
    type: String, 
    enum: ['Approved', 'Pending', 'Rejected', 'Draft', 'Pending Review', 'Under Review', 'More Information Required', 'Suspended'], 
    default: 'Approved' 
  },
  approvedBy: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  todayTrainingTip: {
    today: { type: String },
    tomorrow: { type: String }
  },
  monthlyFee: { type: Number, required: true },
  admissionFee: { type: Number, default: 0 },
  bankDetails: { type: String, default: '' },
  equipmentList: [String],
  timings: {
    weekday: { type: String, default: '6:00 AM - 10:00 PM' },
    weekend: { type: String, default: '8:00 AM - 8:00 PM' }
  }
}, { timestamps: true });

gymSchema.index({ owner: 1 });
gymSchema.index({ name: 1 });
gymSchema.index({ approvalStatus: 1 });

export default mongoose.model('Gym', gymSchema);
