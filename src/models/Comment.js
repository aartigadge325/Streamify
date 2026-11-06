const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  content: { type: String, required: true, trim: true, minlength: 1, maxlength: 3000 }
}, { timestamps: true });
commentSchema.index({ video: 1, parentComment: 1, createdAt: -1 });
commentSchema.index({ owner: 1, createdAt: -1 });
module.exports = mongoose.model('Comment', commentSchema);
