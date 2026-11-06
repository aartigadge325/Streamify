require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error('Missing required environment variable: MONGODB_URI');

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
for (const [name, value] of Object.entries({ ACCESS_TOKEN_SECRET: accessTokenSecret, REFRESH_TOKEN_SECRET: refreshTokenSecret })) {
  if (!value || value.length < 32 || value.startsWith('replace-with')) {
    throw new Error(`${name} must be set to a random secret of at least 32 characters in .env`);
  }
}
if (accessTokenSecret === refreshTokenSecret) {
  throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different');
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri,
  corsOrigins,
  accessTokenSecret,
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  refreshTokenSecret,
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
};
