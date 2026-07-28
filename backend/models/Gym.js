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
  approvalStatus: { 
    type: String, 
    enum: ['Approved', 'Pending', 'Rejected'], 
    default: 'Approved' 
  },
  approvedBy: { type: String, default: '' },
  todayTrainingTip: {
    today: { type: String },
    tomorrow: { type: String }
  },
  monthlyFee: { type: Number, required: true }
  ,
  admissionFee: { type: Number, default: 0 },
  bankDetails: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Gym', gymSchema);
