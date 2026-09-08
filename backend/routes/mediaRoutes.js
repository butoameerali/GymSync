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

const router = express.Router();

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
 * Generate short-lived direct signed upload URL from Supabase Storage.
 * Bypasses Node server RAM by allowing browser to upload large videos directly to Supabase CDN.
 */
router.post('/signed-upload-url', protect, async (req, res) => {
  try {
    const { fileName, folder = 'media', contentType = 'image/jpeg', fileSize } = req.body;
    const cleanFolder = String(folder).toLowerCase().trim();
    const userRole = req.user?.role || 'User';
    const isStaff = ['FitnessInstructor', 'Admin', 'SuperAdmin'].includes(userRole);

    const restrictedFolders = ['exercises', 'programs', 'articles', 'curriculum', 'drills'];
    if (restrictedFolders.includes(cleanFolder) && !isStaff) {
      return res.status(403).json({
        success: false,
        message: `Role '${userRole}' is not authorized to upload to folder '${cleanFolder}'.`
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        success: false,
        directUploadAvailable: false,
        message: 'Supabase storage is not configured. Use standard /api/media/upload fallback.'
      });
    }

    const signedPayload = await createDirectSignedUploadUrl({
      folder: cleanFolder,
      fileName,
      contentType
    });

    if (!signedPayload) {
      return res.status(500).json({ success: false, message: 'Could not generate signed upload URL' });
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

