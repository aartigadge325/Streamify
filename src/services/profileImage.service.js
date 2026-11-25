const fs = require('node:fs/promises');
const { cloudinary, configured } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

async function uploadProfileImage(filePath) {
  if (!configured) {
    throw new ApiError(503, 'Profile image uploads are not configured. Add Cloudinary credentials to .env and restart the server.');
  }

  try {
    const asset = await cloudinary.uploader.upload(filePath, {
      folder: 'streamify/profiles',
      resource_type: 'image'
    });
    return { url: asset.secure_url, publicId: asset.public_id };
  } catch (error) {
    console.error('Cloudinary profile image upload failed:', error.message);
    throw new ApiError(502, 'Profile image upload failed. Check Cloudinary settings and try again.');
  }
}

async function deleteProfileImage(publicId) {
  if (!configured || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
}

async function removeProfileTempFiles(files) {
  const allFiles = Object.values(files || {}).flat();
  await Promise.all(allFiles.map((file) => fs.unlink(file.path).catch(() => {})));
}

async function removeUploadedAssets(assets) {
  await Promise.all(assets.filter(Boolean).map(async (asset) => {
    try {
      await deleteProfileImage(asset.publicId);
    } catch (error) {
      console.error('Cloudinary profile image cleanup failed:', error.message);
    }
  }));
}

module.exports = { uploadProfileImage, deleteProfileImage, removeProfileTempFiles, removeUploadedAssets };
