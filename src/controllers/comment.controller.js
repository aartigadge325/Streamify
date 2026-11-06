const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Video = require('../models/Video');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const valid = value => mongoose.isValidObjectId(value);
exports.list = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!valid(videoId) || !(await Video.exists({ _id: videoId }))) throw new ApiError(404, 'Video not found');
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const [items, total] = await Promise.all([
    Comment.find({ video: videoId, parentComment: null }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('owner', 'username fullName avatarUrl').lean(),
    Comment.countDocuments({ video: videoId, parentComment: null })
  ]);
  const counts = await Comment.aggregate([{ $match: { video: new mongoose.Types.ObjectId(videoId), parentComment: { $in: items.map(x => x._id) } } }, { $group: { _id: '$parentComment', count: { $sum: 1 } } }]);
  const map = new Map(counts.map(x => [String(x._id), x.count]));
  res.json({ success: true, data: items.map(x => ({ ...x, replyCount: map.get(String(x._id)) || 0 })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
exports.replies = asyncHandler(async (req, res) => {
  const parent = valid(req.params.commentId) ? await Comment.findById(req.params.commentId) : null;
  if (!parent || parent.parentComment) throw new ApiError(404, 'Comment not found');
  const data = await Comment.find({ parentComment: parent._id }).sort({ createdAt: 1 }).populate('owner', 'username fullName avatarUrl');
  res.json({ success: true, data });
});
exports.create = asyncHandler(async (req, res) => {
  const { videoId } = req.params; const { content, parentCommentId } = req.body || {};
  if (!valid(videoId) || !(await Video.exists({ _id: videoId }))) throw new ApiError(404, 'Video not found');
  if (typeof content !== 'string' || !content.trim() || content.length > 2000) throw new ApiError(400, 'Comment must contain 1 to 2000 characters');
  let parentComment = null;
  if (parentCommentId) {
    const parent = valid(parentCommentId) ? await Comment.findById(parentCommentId) : null;
    if (!parent || parent.parentComment || String(parent.video) !== videoId) throw new ApiError(400, 'Replies must target a top-level comment on this video');
    parentComment = parent._id;
  }
  const comment = await Comment.create({ video: videoId, owner: req.auth.userId, parentComment, content: content.trim() });
  await comment.populate('owner', 'username fullName avatarUrl');
  res.status(201).json({ success: true, data: comment });
});
exports.update = asyncHandler(async (req, res) => {
  const c = valid(req.params.commentId) ? await Comment.findById(req.params.commentId) : null;
  if (!c) throw new ApiError(404, 'Comment not found');
  if (String(c.owner) !== req.auth.userId && req.auth.role !== 'admin') throw new ApiError(403, 'You can edit only your comments');
  const { content } = req.body || {};
  if (typeof content !== 'string' || !content.trim() || content.length > 2000) throw new ApiError(400, 'Comment must contain 1 to 2000 characters');
  c.content = content.trim(); await c.save(); res.json({ success: true, data: c });
});
exports.remove = asyncHandler(async (req, res) => {
  const c = valid(req.params.commentId) ? await Comment.findById(req.params.commentId) : null;
  if (!c) throw new ApiError(404, 'Comment not found');
  if (String(c.owner) !== req.auth.userId && req.auth.role !== 'admin') throw new ApiError(403, 'You can delete only your comments');
  if (!c.parentComment) await Comment.deleteMany({ parentComment: c._id });
  await c.deleteOne(); res.json({ success: true, message: 'Comment deleted' });
});
