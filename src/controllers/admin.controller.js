const mongoose = require('mongoose');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function pagination(query) {
  const pageValue = Number.parseInt(query.page, 10);
  const limitValue = Number.parseInt(query.limit, 10);
  return {
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    limit: Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 20
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const filter = search
    ? { $or: ['username', 'email', 'fullName'].map((field) => ({ [field]: new RegExp(escapeRegex(search), 'i') })) }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('username email fullName role createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

exports.setUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body || {};
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(404, 'User not found');
  if (!['user', 'admin'].includes(role)) throw new ApiError(400, 'role must be user or admin');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === role) return res.json({ success: true, data: user });

  if (role === 'user' && user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) throw new ApiError(409, 'The last administrator cannot be demoted');
  }

  user.role = role;
  await user.save();
  res.json({ success: true, data: user });
});
