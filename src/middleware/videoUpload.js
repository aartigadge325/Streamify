const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const uploadDirectory = path.join(os.tmpdir(), 'streamify-uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).slice(0, 10)}`)
  }),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('video/')) {
      return callback(new ApiError(400, 'Upload a video file using the video form field'));
    }
    return callback(null, true);
  }
});

function receiveVideo(req, res, next) {
  upload.single('video')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'Video is larger than the 500 MB upload limit'));
    }
    if (error instanceof multer.MulterError) return next(new ApiError(400, error.message));
    return next(error);
  });
}

module.exports = { receiveVideo };


