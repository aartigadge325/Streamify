const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String, default: null },
  cloudinaryPublicId: { type: String, required: true },
  duration: { type: Number, min: 0, default: 0 },
  fileSize: { type: Number, min: 0, required: true },
  visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
  views: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

videoSchema.index({ visibility: 1, createdAt: -1 });
videoSchema.index({ owner: 1, createdAt: -1 });
videoSchema.index({ owner: 1, visibility: 1, createdAt: -1 });
videoSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Video', videoSchema);

