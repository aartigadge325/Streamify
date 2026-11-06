const mongoose = require('mongoose');
const playlistSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  visibility: { type: String, enum: ['public', 'private'], default: 'private' }
}, { timestamps: true });
playlistSchema.index({ owner: 1, createdAt: -1 });
playlistSchema.index({ visibility: 1, createdAt: -1 });
module.exports = mongoose.model('Playlist', playlistSchema);
