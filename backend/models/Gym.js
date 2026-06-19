import mongoose from 'mongoose';

const gymSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String },
  facilities: [String],
  equipmentImages: [String], // Array of image URLs
  todayTrainingTip: {
    today: { type: String },
    tomorrow: { type: String }
  },
  monthlyFee: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('Gym', gymSchema);
