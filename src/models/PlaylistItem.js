const mongoose = require('mongoose');
const playlistItemSchema = new mongoose.Schema({
  playlist: { type: mongoose.Schema.Types.ObjectId, ref: 'Playlist', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  position: { type: Number, min: 0, required: true },
  addedAt: { type: Date, default: Date.now }
}, { timestamps: false });
playlistItemSchema.index({ playlist: 1, video: 1 }, { unique: true });
playlistItemSchema.index({ playlist: 1, position: 1 });
module.exports = mongoose.model('PlaylistItem', playlistItemSchema);
