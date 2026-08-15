import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Safely obtain a writable uploads directory (handles serverless/Vercel environments)
const getUploadsDir = () => {
  let dir = process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : 'uploads/';
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    dir = path.join(os.tmpdir(), 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  return dir;
};

// Set storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, getUploadsDir());
  },
  filename: function(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

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
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});
