const fs = require('node:fs/promises');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const Reaction = require('../models/Reaction');
const Comment = require('../models/Comment');
const PlaylistItem = require('../models/PlaylistItem');
const WatchHistory = require('../models/WatchHistory');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { cloudinary, configured } = require('../config/cloudinary');

function uploadToCloudinary(filePath) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_large(filePath, {
      folder: 'streamify/videos',
      resource_type: 'video',
      chunk_size: 20 * 1024 * 1024
    }, (error, result) => {
      if (error) return reject(error);
      if (result?.done === false) return;
      return resolve(result);
    });
    stream.on('error', reject);
  });
}
async function deleteCloudinaryAsset(publicId) {
  if (!configured || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true });
}

function parsePagination(query) {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);
  return {
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    limit: Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 20
  };
}

function searchFilter(search) {
  if (typeof search !== 'string' || !search.trim()) return {};
  return { $text: { $search: search.trim().slice(0, 100) } };
}
function requireValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(404, 'Video not found');
}

function requireOwner(video, userId) {
  if (String(video.owner) !== String(userId)) throw new ApiError(403, 'You do not own this video');
}

const createVideo = asyncHandler(async (req, res) => {
  let asset;
  try {
    const { title, description = '', visibility = 'public' } = req.body || {};
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
      throw new ApiError(400, 'title is required and must be 120 characters or fewer');
    }
    if (typeof description !== 'string' || description.length > 5000) {
      throw new ApiError(400, 'description must be 5000 characters or fewer');
    }
    if (!['public', 'unlisted'].includes(visibility)) {
      throw new ApiError(400, 'visibility must be public or unlisted');
    }
    if (!req.file) throw new ApiError(400, 'Choose a video file in the video field');

    asset = await uploadToCloudinary(req.file.path);
    const video = await Video.create({
      owner: req.auth.userId,
      title: title.trim(),
      description: description.trim(),
      videoUrl: asset.secure_url,
      thumbnailUrl: cloudinary.url(asset.public_id, {
        resource_type: 'video', format: 'jpg',
        transformation: [{ start_offset: '1' }], secure: true
      }),
      cloudinaryPublicId: asset.public_id,
      duration: Number(asset.duration) || 0,
      fileSize: Number(asset.bytes) || req.file.size,
      visibility
    });
    return res.status(201).json({ success: true, data: { video } });
  } catch (error) {
    if (asset?.public_id) {
      try { await deleteCloudinaryAsset(asset.public_id); }
      catch (cleanupError) { console.error('Cloudinary cleanup failed:', cleanupError.message); }
    }
    if (error instanceof ApiError) throw error;
    console.error('Video upload failed:', error.message);
    throw new ApiError(502, 'Video upload failed. Check Cloudinary settings and try again.');
  } finally {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
  }
});
const listPublicVideos = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const filter = { visibility: 'public', ...searchFilter(req.query.search) };
  const [result] = await Video.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1, _id: -1 } },
    { $facet: {
      metadata: [{ $count: 'total' }],
      videos: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'owner' } },
        { $unwind: '$owner' },
        { $project: { 'owner.username': 1, 'owner.fullName': 1, title: 1, description: 1, videoUrl: 1, thumbnailUrl: 1, duration: 1, fileSize: 1, visibility: 1, views: 1, createdAt: 1, updatedAt: 1 } }
      ]
    } }
  ]);
  const videos = result?.videos || [];
  const total = result?.metadata?.[0]?.total || 0;
  res.status(200).json({ success: true, data: { videos, page, limit, total, pages: Math.ceil(total / limit) } });
});
const listMyVideos = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const filter = { owner: req.auth.userId, ...searchFilter(req.query.search) };
  const [videos, total] = await Promise.all([
    Video.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Video.countDocuments(filter)
  ]);
  res.status(200).json({ success: true, data: { videos, page, limit, total, pages: Math.ceil(total / limit) } });
});

const getVideo = asyncHandler(async (req, res) => {
  requireValidId(req.params.videoId);
  const video = await Video.findByIdAndUpdate(req.params.videoId, { $inc: { views: 1 } }, { new: true }).populate('owner', 'username fullName');
  if (!video) throw new ApiError(404, 'Video not found');
  res.status(200).json({ success: true, data: { video } });
});

const updateVideo = asyncHandler(async (req, res) => {
  requireValidId(req.params.videoId);
  const video = await Video.findById(req.params.videoId);
  if (!video) throw new ApiError(404, 'Video not found');
  requireOwner(video, req.auth.userId);

  const { title, description, visibility } = req.body || {};
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
      throw new ApiError(400, 'title must be between 1 and 120 characters');
    }
    video.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== 'string' || description.length > 5000) {
      throw new ApiError(400, 'description must be 5000 characters or fewer');
    }
    video.description = description.trim();
  }
  if (visibility !== undefined) {
    if (!['public', 'unlisted'].includes(visibility)) {
      throw new ApiError(400, 'visibility must be public or unlisted');
    }
    video.visibility = visibility;
  }
  if (title === undefined && description === undefined && visibility === undefined) {
    throw new ApiError(400, 'Provide title, description, or visibility to update');
  }

  await video.save();
  res.status(200).json({ success: true, data: { video } });
});

const deleteVideo = asyncHandler(async (req, res) => {
  requireValidId(req.params.videoId);
  const video = await Video.findById(req.params.videoId);
  if (!video) throw new ApiError(404, 'Video not found');
  requireOwner(video, req.auth.userId);

  try {
    await deleteCloudinaryAsset(video.cloudinaryPublicId);
  } catch (error) {
    console.error('Cloudinary delete failed:', error.message);
    throw new ApiError(502, 'Could not remove the video from Cloudinary');
  }
  await Promise.all([
    Reaction.deleteMany({ video: video._id }),
    Comment.deleteMany({ video: video._id }),
    PlaylistItem.deleteMany({ video: video._id }),
    WatchHistory.deleteMany({ video: video._id })
  ]);
  await video.deleteOne();
  res.status(204).end();
});

module.exports = { createVideo, listPublicVideos, listMyVideos, getVideo, updateVideo, deleteVideo };









