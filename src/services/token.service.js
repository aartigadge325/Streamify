const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const {
  accessTokenSecret, accessTokenExpiry,
  refreshTokenSecret, refreshTokenExpiry
} = require('../config/env');

function createTokenPair(user) {
  const claims = { sub: String(user._id), role: user.role };
  return {
    accessToken: jwt.sign({ ...claims, type: 'access', jti: crypto.randomUUID() }, accessTokenSecret, {
      expiresIn: accessTokenExpiry, algorithm: 'HS256'
    }),
    refreshToken: jwt.sign({ sub: String(user._id), type: 'refresh', jti: crypto.randomUUID() }, refreshTokenSecret, {
      expiresIn: refreshTokenExpiry, algorithm: 'HS256'
    })
  };
}

function verifyAccessToken(token) {
  return jwt.verify(token, accessTokenSecret, { algorithms: ['HS256'] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, refreshTokenSecret, { algorithms: ['HS256'] });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokenHashMatches(token, storedHash) {
  if (!storedHash) return false;
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { createTokenPair, verifyAccessToken, verifyRefreshToken, hashToken, tokenHashMatches };
