const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const uploadDirectory = path.join(os.tmpdir(), 'streamify-profile-uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionsByMimeType = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${extensionsByMimeType.get(file.mimetype) || ''}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 12 },
  fileFilter: (_req, file, callback) => {
    if (!extensionsByMimeType.has(file.mimetype)) {
      return callback(new ApiError(400, 'Profile images must be JPEG, PNG, WebP, or GIF files'));
    }
    return callback(null, true);
  }
});

function receiveProfileImages(req, res, next) {
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ])(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'Each profile image must be 5 MB or smaller'));
    }
    if (error instanceof multer.MulterError) return next(new ApiError(400, error.message));
    return next(error);
  });
}

module.exports = { receiveProfileImages };
