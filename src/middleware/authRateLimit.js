const { rateLimit } = require('express-rate-limit');

const commonOptions = {
  standardHeaders: 'draft-8',
  legacyHeaders: false
};

const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many unsuccessful sign-in attempts. Wait 15 minutes before trying again.'
  }
});

const registrationLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: 'Too many registration attempts. Try again later.'
  }
});

const refreshLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many token refresh attempts. Try again later.'
  }
});

module.exports = { loginLimiter, registrationLimiter, refreshLimiter };
