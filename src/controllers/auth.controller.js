const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nodeEnv } = require('../config/env');
const {
  createTokenPair, verifyRefreshToken, hashToken, tokenHashMatches
} = require('../services/token.service');

const REFRESH_COOKIE_NAME = 'streamifyRefresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: nodeEnv === 'production',
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH
  });
}

function rejectRefresh(res, message) {
  clearRefreshCookie(res);
  throw new ApiError(401, message);
}

const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration({ username, email, fullName, password }) {
  if (![username, email, fullName, password].every((value) => typeof value === 'string' && value.trim())) {
    throw new ApiError(400, 'username, email, fullName, and password are required');
  }
  if (!usernamePattern.test(username.trim())) {
    throw new ApiError(400, 'username must be 3–30 characters using letters, numbers, or underscores');
  }
  if (!emailPattern.test(email.trim()) || email.trim().length > 254) {
    throw new ApiError(400, 'A valid email address is required');
  }
  if (fullName.trim().length > 80) throw new ApiError(400, 'fullName must be 80 characters or fewer');
  if (password.length < 8 || password.length > 128) {
    throw new ApiError(400, 'password must be between 8 and 128 characters');
  }
}

async function saveTokenPair(user) {
  const tokens = createTokenPair(user);
  user.refreshTokenHash = hashToken(tokens.refreshToken);
  await user.save();
  return tokens;
}

const register = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body || {};
  validateRegistration({ username, email, fullName, password });

  const user = new User({ username, email, fullName, password });
  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'That username or email is already registered');
    if (error.name === 'ValidationError') throw new ApiError(400, 'Please check the registration details');
    throw error;
  }

  const tokens = await saveTokenPair(user);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(201).json({ success: true, data: { user: user.toJSON(), accessToken: tokens.accessToken } });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body || {};
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string') {
    throw new ApiError(400, 'identifier and password are required');
  }

  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: normalized }, { username: normalized }] }).select('+password');
  if (!user || !(await user.verifyPassword(password))) {
    throw new ApiError(401, 'Invalid username/email or password');
  }

  const tokens = await saveTokenPair(user);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(200).json({ success: true, data: { user: user.toJSON(), accessToken: tokens.accessToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return rejectRefresh(res, 'Refresh token required');
  }

  let claims;
  try {
    claims = verifyRefreshToken(refreshToken);
  } catch {
    return rejectRefresh(res, 'Refresh token is invalid or expired');
  }
  if (claims.type !== 'refresh' || !claims.sub) {
    return rejectRefresh(res, 'Refresh token is invalid');
  }

  const user = await User.findById(claims.sub).select('+refreshTokenHash');
  if (!user || !tokenHashMatches(refreshToken, user.refreshTokenHash)) {
    return rejectRefresh(res, 'Refresh token has expired or was already used');
  }

  const tokens = createTokenPair(user);
  const update = await User.updateOne(
    { _id: user._id, refreshTokenHash: user.refreshTokenHash },
    { $set: { refreshTokenHash: hashToken(tokens.refreshToken) } }
  );
  if (update.modifiedCount !== 1) return rejectRefresh(res, 'Refresh token has already been used');

  setRefreshCookie(res, tokens.refreshToken);
  res.status(200).json({ success: true, data: { accessToken: tokens.accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  clearRefreshCookie(res);
  if (typeof refreshToken === 'string' && refreshToken) {
    let claims;
    try {
      claims = verifyRefreshToken(refreshToken);
    } catch {
      claims = null;
    }
    if (claims?.type === 'refresh' && claims.sub) {
      const user = await User.findById(claims.sub).select('+refreshTokenHash');
      if (user && tokenHashMatches(refreshToken, user.refreshTokenHash)) {
        user.refreshTokenHash = null;
        await user.save();
      }
    }
  }
  res.status(204).end();
});
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) throw new ApiError(404, 'User not found');
  res.status(200).json({ success: true, data: { user } });
});

module.exports = { register, login, refresh, logout, getCurrentUser };

