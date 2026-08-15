import multer from 'multer';
import path from 'path';

// Use memory storage so file buffers are converted directly into Base64 Data URIs.
// This allows permanent storage in MongoDB without relying on dynamic serverless disk storage.
const storage = multer.memoryStorage();

// Check File Type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|webp|heic|mp4/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Images and Videos Only!'));
  }
}

export const upload = multer({
  storage: storage,
  limits: { fileSize: 8000000 }, // 8MB limit for Base64 in MongoDB
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});
