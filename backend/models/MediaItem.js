import mongoose from 'mongoose';

const mediaItemSchema = new mongoose.Schema({
  storagePath: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  publicUrl: {
    type: String,
    required: true,
    trim: true
  },
  bucket: {
    type: String,
    default: 'gymsync-media',
    trim: true
  },
  folder: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  uploadedBy: {
    type: String,
    default: 'Unknown User'
  },
  mimeType: {
    type: String,
    required: true
  },
  sizeBytes: {
    type: Number,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  entityType: {
    type: String,
    enum: ['exercise', 'article', 'program', 'user', 'post', 'temp', 'other'],
    default: 'other',
    index: true
  },
  entityId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

mediaItemSchema.index({ folder: 1, ownerId: 1 });
mediaItemSchema.index({ createdAt: -1 });

const MediaItem = mongoose.model('MediaItem', mediaItemSchema);

export default MediaItem;
