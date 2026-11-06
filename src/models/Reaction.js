const mongoose = require('mongoose');
const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  type: { type: String, enum: ['like', 'dislike'], required: true }
}, { timestamps: true });
reactionSchema.index({ user: 1, video: 1 }, { unique: true });
reactionSchema.index({ video: 1, type: 1 });
module.exports = mongoose.model('Reaction', reactionSchema);
