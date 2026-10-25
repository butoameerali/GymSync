import mongoose from 'mongoose';

const verificationDocumentSchema = new mongoose.Schema({
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym'
  },
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
  originalFilename: { type: String, required: true },
  storedFilename: { type: String, required: true, unique: true },
  filePath: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSizeBytes: { type: Number, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true
});

const VerificationDocument = mongoose.model('VerificationDocument', verificationDocumentSchema);
export default VerificationDocument;
