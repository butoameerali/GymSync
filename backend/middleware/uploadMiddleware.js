import multer from 'multer';
import path from 'path';

// Memory storage for direct buffer upload to Supabase Storage CDN (or inline fallback)
const storage = multer.memoryStorage();

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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB ceiling to accommodate instructional exercise videos
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});
