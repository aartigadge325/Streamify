const mongoose = require('mongoose');
const Reaction = require('../models/Reaction');
const Video = require('../models/Video');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function ensureVideo(videoId) {
  if (!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(404, 'Video not found');
  const exists = await Video.exists({ _id: videoId });
  if (!exists) throw new ApiError(404, 'Video not found');
}

const setReaction = asyncHandler(async (req, res) => {
  await ensureVideo(req.params.videoId);
  const { type } = req.body || {};
  if (!['like', 'dislike'].includes(type)) throw new ApiError(400, 'type must be like or dislike');
  await Reaction.findOneAndUpdate(
    { user: req.auth.userId, video: req.params.videoId },
    { $set: { type } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  res.status(200).json({ success: true, message: `Video ${type}d` });
});

const removeReaction = asyncHandler(async (req, res) => {
  await ensureVideo(req.params.videoId);
  await Reaction.deleteOne({ user: req.auth.userId, video: req.params.videoId });
  res.status(204).end();
});

const reactionSummary = asyncHandler(async (req, res) => {
  await ensureVideo(req.params.videoId);
  const counts = await Reaction.aggregate([
    { $match: { video: new mongoose.Types.ObjectId(req.params.videoId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  const summary = { likes: 0, dislikes: 0 };
  for (const row of counts) summary[`${row._id}s`] = row.count;
  res.status(200).json({ success: true, data: summary });
});

module.exports = { setReaction, removeReaction, reactionSummary };
