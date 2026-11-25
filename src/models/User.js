const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, trim: true, lowercase: true,
    minlength: 3, maxlength: 30, match: /^[a-z0-9_]+$/, unique: true
  },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  fullName: { type: String, required: true, trim: true, maxlength: 80 },
  bio: { type: String, trim: true, maxlength: 500, default: '' },
  location: { type: String, trim: true, maxlength: 100, default: '' },
  avatarUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  coverImageUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  avatarPublicId: { type: String, select: false, default: null },
  coverImagePublicId: { type: String, select: false, default: null },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  refreshTokenHash: { type: String, select: false, default: null }
}, {
  timestamps: true,
  toJSON: { transform: (_doc, value) => {
    delete value.password;
    delete value.refreshTokenHash;
    delete value.avatarPublicId;
    delete value.coverImagePublicId;
    delete value.__v;
    return value;
  } }
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.verifyPassword = function verifyPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);


