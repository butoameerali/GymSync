import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  createDirectSignedUploadUrl,
  isSupabaseConfigured,
  SUPABASE_STORAGE_BUCKET
} from '../config/supabase.js';
import { protect } from '../middleware/authMiddleware.js';

import path from 'path';

const router = express.Router();

const ALLOWED_FOLDERS = ['exercises', 'programs', 'articles', 'curriculum', 'drills', 'avatars', 'general', 'media', 'posts'];

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
 * POST /api/media/signed-upload-url
 * Generate short-lived direct signed upload URL from Supabase Storage with strict server-side validation.
 * Enforces authenticated role, folder allowlist, MIME/extension verification, and file size limits.
 */
router.post('/signed-upload-url', protect, async (req, res) => {
  try {
    const { fileName, folder = 'media', contentType = 'image/jpeg', fileSize } = req.body;

    // 1. Required filename and anti-traversal sanitization
    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'fileName is required and must be a valid non-empty string.'
      });
    }

    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || /[\x00-\x1f]/.test(fileName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fileName: path traversal characters or illegal control characters detected.'
      });
    }

    const cleanFolder = String(folder).toLowerCase().trim();
    if (!ALLOWED_FOLDERS.includes(cleanFolder)) {
      return res.status(400).json({
        success: false,
        message: `Invalid folder '${cleanFolder}'. Permitted folders: ${ALLOWED_FOLDERS.join(', ')}`
      });
    }

    // 2. Role-based folder access enforcement
    const userRole = req.user?.role || 'User';
    const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);
    const restrictedFolders = ['exercises', 'programs', 'articles', 'curriculum', 'drills'];
    if (restrictedFolders.includes(cleanFolder) && !isStaff) {
      return res.status(403).json({
        success: false,
        message: `Role '${userRole}' is not authorized to upload to restricted staff folder '${cleanFolder}'.`
      });
    }

    // 3. MIME type whitelist check
    const normalizedType = String(contentType).toLowerCase().trim();
    const allowedExtensions = ALLOWED_MEDIA_TYPES[normalizedType];
    if (!allowedExtensions) {
      return res.status(400).json({
        success: false,
        message: `Unsupported content type '${normalizedType}'. Allowed types: ${Object.keys(ALLOWED_MEDIA_TYPES).join(', ')}`
      });
    }

    // 4. File extension match check
    const ext = path.extname(fileName).toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: `Extension '${ext}' does not match declared MIME type '${normalizedType}'. Expected: ${allowedExtensions.join(' or ')}`
      });
    }

    // 5. File size limits
    const isVideo = normalizedType.startsWith('video/');
    const maxAllowedSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (fileSize && Number(fileSize) > maxAllowedSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit of ${maxAllowedSize / (1024 * 1024)}MB for ${isVideo ? 'video' : 'image'} uploads.`
      });
    }

    // 6. Supabase configuration status check
    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        success: false,
        directUploadAvailable: false,
        message: 'Supabase storage is not configured. Use standard /api/media/upload fallback.'
      });
    }

    const sanitizedBase = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

    const signedPayload = await createDirectSignedUploadUrl({
      folder: cleanFolder,
      fileName: sanitizedBase,
      contentType: normalizedType
    });

    if (!signedPayload) {
      return res.status(500).json({ success: false, message: 'Could not generate signed upload URL from Supabase Storage' });
    }

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
 * POST /api/media/upload
 * Universal secure media upload endpoint storing heavy media in Supabase Storage CDN.
 * Protected by JWT authentication and RBAC for instructor-only folders.
 */
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload' });
    }

    const rawFolder = req.body.folder || req.query.folder || 'media';
    const folder = String(rawFolder).toLowerCase().trim();
    const userRole = req.user?.role || 'User';
    const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);

    // Instructor/Admin restricted directories
    const restrictedFolders = ['exercises', 'programs', 'articles', 'curriculum', 'drills'];
    if (restrictedFolders.includes(folder) && !isStaff) {
      return res.status(403).json({
        success: false,
        message: `Role '${userRole}' is not authorized to upload to instructor-managed folder '${folder}'.`
      });
    }

    // Size check: 15MB for images/GIFs, 50MB for videos
    const isVideo = req.file.mimetype.startsWith('video/');
    const maxAllowedSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (req.file.size > maxAllowedSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit (${isVideo ? '50MB for videos' : '15MB for images'})`
      });
    }

    const supaUrl = await uploadToSupabaseStorage({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      folder
    });

    if (supaUrl) {
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

    // Fallback if Supabase is temporarily unconfigured or unreachable
    const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
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
 * Delete media file from Supabase Storage CDN to preserve 1 GB quota.
 */
router.delete('/delete', protect, async (req, res) => {
  try {
    const { fileUrl, filePath } = req.body;
    const target = fileUrl || filePath;

    if (!target) {
      return res.status(400).json({ success: false, message: 'fileUrl or filePath is required' });
    }

    const deleted = await deleteFromSupabaseStorage({ fileUrlOrPath: target });
    return res.status(200).json({
      success: deleted,
      message: deleted ? 'File successfully deleted from Supabase Storage' : 'File could not be removed or was already deleted'
    });
  } catch (error) {
    console.error('Media delete error:', error);
    res.status(500).json({ success: false, message: error.message || 'Media deletion failed' });
  }
});

export default router;

