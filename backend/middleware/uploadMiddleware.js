import multer from 'multer';
import path from 'path';

// Memory storage for small file buffers (strictly capped at <= 6MB to prevent Node RAM bloat)
const storage = multer.memoryStorage();

export const MULTIPART_MEMORY_LIMIT = 6 * 1024 * 1024; // 6 MB hard cap

// Check File Type & extensions
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|webp|heic|mp4|mov|webm/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /image\/(jpeg|jpg|png|gif|webp|heic)|video\/(mp4|quicktime|webm)/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only Images (JPG, PNG, GIF, WEBP) and Videos (MP4, MOV, WEBM) are allowed!'));
  }
}

export const upload = multer({
  storage: storage,
  limits: { fileSize: MULTIPART_MEMORY_LIMIT },
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

/**
 * Middleware wrapper handling Multer limits gracefully with HTTP 413
 */
export const handleSingleUpload = (fieldName = 'file') => {
  const singleUpload = upload.single(fieldName);
  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            message: `File exceeds the 6MB memory upload threshold. Large files must use direct resumable upload.`
          });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  };
};
