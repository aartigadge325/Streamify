const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { randomUUID } = require('node:crypto');
const { corsOrigins, nodeEnv } = require('./config/env');
const routes = require('./routes');
const ApiError = require('./utils/ApiError');

const app = express();
app.disable('x-powered-by');
morgan.token('request-id', (req) => req.id);

app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, 'Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
if (nodeEnv !== 'test') {
  app.use(morgan(':method :url :status :response-time ms [request-id=:request-id]'));
}
app.use('/api/v1', routes);
app.use((_req, _res, next) => next(new ApiError(404, 'Route not found')));
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && nodeEnv === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
    requestId: req.id,
    ...(err.details ? { details: err.details } : {}),
    ...(nodeEnv === 'development' ? { stack: err.stack } : {})
  });
});

module.exports = app;

