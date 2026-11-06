const cloudinary = require('cloudinary').v2;
const ApiError = require('../utils/ApiError');

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
const configured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (configured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
}

function requireCloudinary(_req, _res, next) {
  if (!configured) {
    return next(new ApiError(503, 'Video uploads are not configured. Add Cloudinary credentials to .env and restart the server.'));
  }
  return next();
}

module.exports = { cloudinary, configured, requireCloudinary };
