const mongoose = require('mongoose');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  uploadProfileImage, deleteProfileImage, removeProfileTempFiles, removeUploadedAssets
} = require('../services/profileImage.service');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUserFields = '_id username fullName bio location avatarUrl coverImageUrl createdAt';

exports.publicProfile = asyncHandler(async (req, res) => {
  const username = String(req.params.username || '').trim().toLowerCase();
  const viewerId = req.auth?.userId ? new mongoose.Types.ObjectId(req.auth.userId) : null;
  const [profile] = await User.aggregate([
    { $match: { username } },
    {
      $lookup: {
        from: 'videos',
        let: { profileId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$owner', '$$profileId'] }, { $eq: ['$visibility', 'public'] }] } } },
          { $count: 'count' }
        ],
        as: 'videoStats'
      }
    },
    {
      $lookup: {
        from: 'videos',
        let: { profileId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$owner', '$$profileId'] }, { $eq: ['$visibility', 'public'] }] } } },
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: 12 },
          { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'owner' } },
          { $unwind: '$owner' },
          { $project: { title: 1, description: 1, thumbnailUrl: 1, videoUrl: 1, duration: 1, views: 1, createdAt: 1, 'owner.username': 1, 'owner.fullName': 1, 'owner.avatarUrl': 1 } }
        ],
        as: 'videos'
      }
    },
    {
      $lookup: {
        from: 'subscriptions',
        let: { profileId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$channel', '$$profileId'] } } },
          { $count: 'count' }
        ],
        as: 'subscriberStats'
      }
    },
    {
      $lookup: {
        from: 'subscriptions',
        let: { profileId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$subscriber', '$$profileId'] } } },
          { $count: 'count' }
        ],
        as: 'followingStats'
      }
    },
    {
      $lookup: {
        from: 'subscriptions',
        let: { profileId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$channel', '$$profileId'] }, { $eq: ['$subscriber', viewerId] }] } } },
          { $limit: 1 },
          { $project: { _id: 1 } }
        ],
        as: 'viewerSubscription'
      }
    },
    {
      $addFields: {
        stats: {
          videoCount: { $ifNull: [{ $arrayElemAt: ['$videoStats.count', 0] }, 0] },
          subscriberCount: { $ifNull: [{ $arrayElemAt: ['$subscriberStats.count', 0] }, 0] },
          subscriptionsCount: { $ifNull: [{ $arrayElemAt: ['$followingStats.count', 0] }, 0] },
          isSubscribed: { $gt: [{ $size: '$viewerSubscription' }, 0] }
        }
      }
    },
    { $project: { username: 1, fullName: 1, bio: 1, location: 1, avatarUrl: 1, coverImageUrl: 1, createdAt: 1, stats: 1, videos: 1 } }
  ]);

  if (!profile) throw new ApiError(404, 'User not found');
  const { videos, stats, ...user } = profile;
  res.json({ success: true, data: { user, stats, videos } });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const files = req.files || {};
  const uploadedAssets = [];
  const previousAssets = [];
  let saved = false;

  try {
    const user = await User.findById(req.auth.userId).select('+password +avatarPublicId +coverImagePublicId');
    if (!user) throw new ApiError(404, 'User not found');
    const body = req.body || {};
    const avatarFile = files.avatar?.[0];
    const coverFile = files.coverImage?.[0];

    for (const [field, maxLength, required] of [['fullName', 80, false], ['bio', 500, false], ['location', 100, false]]) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== 'string' || body[field].trim().length > maxLength || (required && !body[field].trim())) {
        throw new ApiError(400, `${field} must be a string of at most ${maxLength} characters`);
      }
    }

    if (body.email !== undefined) {
      if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim()) || body.email.trim().length > 254) {
        throw new ApiError(400, 'A valid email address is required');
      }
      const nextEmail = body.email.trim().toLowerCase();
      if (nextEmail !== user.email) {
        if (typeof body.currentPassword !== 'string' || !(await user.verifyPassword(body.currentPassword))) {
          throw new ApiError(401, 'Current password is required to change your email');
        }
        user.email = nextEmail;
      }
    }

    if (body.avatarUrl !== undefined && avatarFile) throw new ApiError(400, 'Send avatarUrl or an avatar file, not both');
    if (body.coverImageUrl !== undefined && coverFile) throw new ApiError(400, 'Send coverImageUrl or a coverImage file, not both');
    for (const field of ['avatarUrl', 'coverImageUrl']) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== 'string' || body[field].length > 2048 || (body[field] && !/^https:\/\//i.test(body[field].trim()))) {
        throw new ApiError(400, `${field} must be an https URL`);
      }
    }

    for (const field of ['fullName', 'bio', 'location']) {
      if (body[field] !== undefined) user[field] = body[field].trim();
    }

    if (avatarFile) {
      const asset = await uploadProfileImage(avatarFile.path);
      uploadedAssets.push(asset);
      if (user.avatarPublicId) previousAssets.push({ publicId: user.avatarPublicId });
      user.avatarUrl = asset.url;
      user.avatarPublicId = asset.publicId;
    } else if (body.avatarUrl !== undefined) {
      if (user.avatarPublicId) previousAssets.push({ publicId: user.avatarPublicId });
      user.avatarUrl = body.avatarUrl.trim();
      user.avatarPublicId = null;
    }

    if (coverFile) {
      const asset = await uploadProfileImage(coverFile.path);
      uploadedAssets.push(asset);
      if (user.coverImagePublicId) previousAssets.push({ publicId: user.coverImagePublicId });
      user.coverImageUrl = asset.url;
      user.coverImagePublicId = asset.publicId;
    } else if (body.coverImageUrl !== undefined) {
      if (user.coverImagePublicId) previousAssets.push({ publicId: user.coverImagePublicId });
      user.coverImageUrl = body.coverImageUrl.trim();
      user.coverImagePublicId = null;
    }

    if (body.email === undefined && body.fullName === undefined && body.bio === undefined && body.location === undefined && !avatarFile && !coverFile && body.avatarUrl === undefined && body.coverImageUrl === undefined) {
      throw new ApiError(400, 'Provide at least one profile field or image');
    }

    await user.save();
    saved = true;
    await removeUploadedAssets(previousAssets);
    const data = {
      _id: user._id, username: user.username, email: user.email, fullName: user.fullName,
      bio: user.bio, location: user.location, avatarUrl: user.avatarUrl, coverImageUrl: user.coverImageUrl
    };
    res.json({ success: true, data });
  } catch (error) {
    if (!saved) await removeUploadedAssets(uploadedAssets);
    if (error instanceof ApiError) throw error;
    if (error.code === 11000) throw new ApiError(409, 'That email address is already registered');
    if (error.name === 'ValidationError') throw new ApiError(400, 'Please check the profile details');
    throw error;
  } finally {
    await removeProfileTempFiles(files);
  }
});
