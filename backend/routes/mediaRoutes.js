import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { handleSingleUpload } from '../middleware/uploadMiddleware.js';
import {
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  createDirectSignedUploadUrl,
  isSupabaseConfigured,
  SUPABASE_STORAGE_BUCKET
} from '../config/supabase.js';
import { protect } from '../middleware/authMiddleware.js';
import MediaItem from '../models/MediaItem.js';

const router = express.Router();

const ALLOWED_FOLDERS = ['exercises', 'programs', 'articles', 'curriculum', 'drills', 'avatars', 'general', 'media', 'posts', 'http-tests'];

const RESTRICTED_STAFF_FOLDERS = ['exercises', 'programs', 'articles', 'curriculum', 'drills'];

const ALLOWED_MEDIA_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov']
};

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * GET /api/media/status
 * Health-check for media storage configuration (Supabase vs Fallback)
 */
router.get('/status', (req, res) => {
  res.json({
    storageProvider: 'Supabase Storage',
    configured: isSupabaseConfigured(),
    bucket: SUPABASE_STORAGE_BUCKET,
    message: isSupabaseConfigured()
      ? 'Supabase Storage is active for high-volume media (videos, photos, avatars).'
      : 'Operating in MongoDB inline fallback mode.'
  });
});

/**
 * Shared validation logic for upload requests
 */
function validateUploadRequest(fileName, folder, contentType, fileSize, userRole) {
  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    return { valid: false, status: 400, message: 'fileName is required and must be a non-empty string.' };
  }

  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || /[\x00-\x1f]/.test(fileName)) {
    return { valid: false, status: 400, message: 'Invalid fileName: path traversal characters or illegal control characters detected.' };
  }

  const cleanFolder = String(folder || 'media').toLowerCase().trim();
  if (!ALLOWED_FOLDERS.includes(cleanFolder)) {
    return { valid: false, status: 400, message: `Invalid folder '${cleanFolder}'. Permitted folders: ${ALLOWED_FOLDERS.join(', ')}` };
  }

  const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);
  if (RESTRICTED_STAFF_FOLDERS.includes(cleanFolder) && !isStaff) {
    return { valid: false, status: 403, message: `Role '${userRole}' is not authorized to upload to staff folder '${cleanFolder}'.` };
  }

  const normalizedType = String(contentType || 'image/jpeg').toLowerCase().trim();
  const allowedExtensions = ALLOWED_MEDIA_TYPES[normalizedType];
  if (!allowedExtensions) {
    return { valid: false, status: 400, message: `Unsupported content type '${normalizedType}'. Allowed types: ${Object.keys(ALLOWED_MEDIA_TYPES).join(', ')}` };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    return { valid: false, status: 400, message: `Extension '${ext}' does not match declared MIME type '${normalizedType}'. Expected: ${allowedExtensions.join(' or ')}` };
  }

  const isVideo = normalizedType.startsWith('video/');
  const maxAllowedSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (fileSize && Number(fileSize) > maxAllowedSize) {
    return { valid: false, status: 400, message: `File size exceeds limit of ${maxAllowedSize / (1024 * 1024)}MB for ${isVideo ? 'video' : 'image'} uploads.` };
  }

  return { valid: true, cleanFolder, normalizedType, ext };
}

/**
 * POST /api/media/signed-upload-url
 * Generate short-lived direct signed upload URL from Supabase Storage with strict server-side validation.
 */
router.post('/signed-upload-url', protect, async (req, res) => {
  try {
    const { fileName, folder = 'media', contentType = 'image/jpeg', fileSize, entityType, entityId } = req.body;
    const userRole = req.user?.role || 'User';

    const validation = validateUploadRequest(fileName, folder, contentType, fileSize, userRole);
    if (!validation.valid) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        success: false,
        directUploadAvailable: false,
        message: 'Supabase storage is not configured. Use standard /api/media/upload fallback.'
      });
    }

    const sanitizedBase = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const signedPayload = await createDirectSignedUploadUrl({
      folder: validation.cleanFolder,
      fileName: sanitizedBase,
      contentType: validation.normalizedType
    });

    if (!signedPayload) {
      return res.status(500).json({ success: false, message: 'Could not generate signed upload URL from Supabase Storage' });
    }

    // Pre-record MediaItem in MongoDB to establish ownership
    await MediaItem.create({
      storagePath: signedPayload.path,
      publicUrl: signedPayload.publicUrl || `https://${process.env.SUPABASE_URL || 'supabase.co'}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${signedPayload.path}`,
      bucket: SUPABASE_STORAGE_BUCKET,
      folder: validation.cleanFolder,
      ownerId: req.user._id,
      uploadedBy: req.user.name || 'User',
      mimeType: validation.normalizedType,
      sizeBytes: Number(fileSize) || 0,
      isPublic: true,
      entityType: entityType || 'other',
      entityId: entityId || null
    });

    res.status(200).json({
      success: true,
      directUploadAvailable: true,
      ...signedPayload
    });
  } catch (error) {
    console.error('signed-upload-url Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate signed upload URL' });
  }
});

/**
 * POST /api/media/resumable-ticket
 * Issues authorized ticket for TUS resumable upload (>6MB) directly from browser to Supabase Storage CDN.
 */
router.post('/resumable-ticket', protect, async (req, res) => {
  try {
    const { fileName, folder = 'media', contentType = 'video/mp4', fileSize, entityType, entityId } = req.body;
    const userRole = req.user?.role || 'User';

    const validation = validateUploadRequest(fileName, folder, contentType, fileSize, userRole);
    if (!validation.valid) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        success: false,
        resumableAvailable: false,
        message: 'Supabase storage is not configured for TUS resumable uploads. Falling back to local/standard upload.'
      });
    }

    const randomHex = crypto.randomBytes(6).toString('hex');
    const storagePath = `${validation.cleanFolder}/${Date.now()}_${randomHex}${validation.ext}`;
    const supabaseUrl = process.env.SUPABASE_URL;
    const tusEndpoint = `${supabaseUrl}/storage/v1/upload/resumable`;
    const token = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Pre-record ownership in MediaItem
    await MediaItem.create({
      storagePath,
      publicUrl: `${supabaseUrl}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${storagePath}`,
      bucket: SUPABASE_STORAGE_BUCKET,
      folder: validation.cleanFolder,
      ownerId: req.user._id,
      uploadedBy: req.user.name || 'User',
      mimeType: validation.normalizedType,
      sizeBytes: Number(fileSize) || 0,
      isPublic: true,
      entityType: entityType || 'other',
      entityId: entityId || null
    });

    return res.status(200).json({
      success: true,
      resumableAvailable: true,
      tusEndpoint,
      bucket: SUPABASE_STORAGE_BUCKET,
      storagePath,
      token,
      publicUrl: `${supabaseUrl}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${storagePath}`
    });
  } catch (error) {
    console.error('resumable-ticket Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate resumable upload ticket' });
  }
});

/**
 * POST /api/media/upload
 * Small-file multipart upload endpoint (capped strictly at <= 6MB to protect Node RAM).
 */
router.post('/upload', protect, handleSingleUpload('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload' });
    }

    const rawFolder = req.body.folder || req.query.folder || 'media';
    const folder = String(rawFolder).toLowerCase().trim();
    const userRole = req.user?.role || 'User';
    const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);

    if (RESTRICTED_STAFF_FOLDERS.includes(folder) && !isStaff) {
      return res.status(403).json({
        success: false,
        message: `Role '${userRole}' is not authorized to upload to instructor-managed folder '${folder}'.`
      });
    }

    const supaUrl = await uploadToSupabaseStorage({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      folder
    });

    if (supaUrl) {
      // Determine storagePath from supaUrl
      const bucketMarker = `/${SUPABASE_STORAGE_BUCKET}/`;
      const idx = supaUrl.indexOf(bucketMarker);
      const storagePath = idx !== -1 ? supaUrl.substring(idx + bucketMarker.length) : `${folder}/${req.file.originalname}`;

      await MediaItem.create({
        storagePath,
        publicUrl: supaUrl,
        bucket: SUPABASE_STORAGE_BUCKET,
        folder,
        ownerId: req.user._id,
        uploadedBy: req.user.name || 'User',
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        isPublic: true,
        entityType: req.body.entityType || 'other',
        entityId: req.body.entityId || null
      });

      return res.status(201).json({
        success: true,
        url: supaUrl,
        storage: 'supabase',
        bucket: SUPABASE_STORAGE_BUCKET,
        folder,
        fileName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      });
    }

    // Fallback if Supabase is unconfigured (small file inline fallback)
    const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const fallbackPath = `${folder}/fallback_${Date.now()}_${req.file.originalname}`;

    await MediaItem.create({
      storagePath: fallbackPath,
      publicUrl: base64Data,
      bucket: 'local-fallback',
      folder,
      ownerId: req.user._id,
      uploadedBy: req.user.name || 'User',
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      isPublic: true,
      entityType: req.body.entityType || 'other',
      entityId: req.body.entityId || null
    });

    return res.status(200).json({
      success: true,
      url: base64Data,
      storage: 'inline_fallback',
      folder,
      fileName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Media upload failed' });
  }
});

/**
 * DELETE /api/media/delete
 * Strictly authorized media file deletion from Supabase Storage and MongoDB MediaItem.
 * Verifies caller is either the owner of the upload or an authorized staff member.
 */
router.delete('/delete', protect, async (req, res) => {
  try {
    const { fileUrl, filePath } = req.body;
    const target = fileUrl || filePath || req.query.fileUrl || req.query.filePath;

    if (!target || typeof target !== 'string' || !target.trim()) {
      return res.status(400).json({ success: false, message: 'fileUrl or filePath is required and must be a valid non-empty string.' });
    }

    // 1. Path traversal and illegal character check
    if (target.includes('..') || target.includes('\\') || /[\x00-\x1f]/.test(target)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target: path traversal characters or illegal control characters detected.'
      });
    }

    // 2. Reject foreign external URLs
    if (target.startsWith('http://') || target.startsWith('https://')) {
      const allowedHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;
      try {
        const parsedUrl = new URL(target);
        if (allowedHost && !parsedUrl.hostname.includes(allowedHost) && !parsedUrl.hostname.includes('supabase.co')) {
          return res.status(400).json({
            success: false,
            message: 'External URLs cannot be deleted from GymSync storage.'
          });
        }
      } catch {
        return res.status(400).json({ success: false, message: 'Malformed URL provided.' });
      }
    }

    // 3. Extract canonical storage path
    let canonicalPath = target;
    if (target.startsWith('http')) {
      const bucketMarker = `/${SUPABASE_STORAGE_BUCKET}/`;
      const idx = target.indexOf(bucketMarker);
      if (idx !== -1) {
        canonicalPath = target.substring(idx + bucketMarker.length).split('?')[0];
      } else {
        const parts = target.split('?')[0].split('/');
        canonicalPath = parts.slice(-2).join('/');
      }
    }

    // 4. Look up MediaItem in MongoDB to inspect ownership
    const mediaDoc = await MediaItem.findOne({
      $or: [
        { storagePath: canonicalPath },
        { storagePath: target },
        { publicUrl: target }
      ]
    });

    const userRole = req.user.role || 'User';
    const userId = req.user._id ? req.user._id.toString() : '';
    const isSuperOrAdmin = ['Admin', 'SuperAdmin'].includes(userRole);
    const isInstructor = userRole === 'FitnessInstructor';

    // Determine target folder
    const targetFolder = (mediaDoc?.folder || canonicalPath.split('/')[0] || '').toLowerCase();
    const isRestrictedFolder = RESTRICTED_STAFF_FOLDERS.includes(targetFolder);

    // 5. Authorization Evaluation
    if (mediaDoc) {
      // Document is tracked in MongoDB
      const isOwner = mediaDoc.ownerId && mediaDoc.ownerId.toString() === userId;

      if (isRestrictedFolder) {
        // Staff folders require instructor or admin
        if (!isSuperOrAdmin && !isInstructor) {
          return res.status(403).json({
            success: false,
            message: `Role '${userRole}' is not authorized to delete media from instructor folder '${targetFolder}'.`
          });
        }
      } else {
        // Normal user folders (avatars, attachments, general) require ownership or Admin
        if (!isOwner && !isSuperOrAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission to delete media owned by another user.'
          });
        }
      }
    } else {
      // Untracked / legacy object
      if (isRestrictedFolder) {
        if (!isSuperOrAdmin && !isInstructor) {
          return res.status(403).json({
            success: false,
            message: `Role '${userRole}' is not authorized to delete media from instructor folder '${targetFolder}'.`
          });
        }
      } else {
        // Untracked non-staff media cannot be deleted by non-admins because ownership is untrusted
        if (!isSuperOrAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: Cannot verify media ownership for unrecorded object.'
          });
        }
      }
    }

    // 6. Delete from Supabase Storage
    const deletedFromStorage = await deleteFromSupabaseStorage({ fileUrlOrPath: canonicalPath });

    // 7. Remove MongoDB metadata record
    if (mediaDoc) {
      await MediaItem.findByIdAndDelete(mediaDoc._id);
    }

    return res.status(200).json({
      success: true,
      storageDeleted: deletedFromStorage,
      message: 'File successfully deleted from storage and metadata catalog.'
    });
  } catch (error) {
    console.error('Media delete error:', error);
    res.status(500).json({ success: false, message: error.message || 'Media deletion failed' });
  }
});

export default router;
