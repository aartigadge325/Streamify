const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../services/token.service');

function readAccessToken(req) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const claims = verifyAccessToken(token);
  if (claims.type !== 'access' || !claims.sub) throw new Error('Invalid token');
  return claims;
}

function authenticate(req, _res, next) {
  try {
    const claims = readAccessToken(req);
    if (!claims) return next(new ApiError(401, 'Access token required'));
    req.auth = { userId: claims.sub, role: claims.role };
    return next();
  } catch {
    return next(new ApiError(401, 'Access token is invalid or expired'));
  }
}

function optionalAuthenticate(req, _res, next) {
  if (!req.get('authorization')) return next();
  try {
    const claims = readAccessToken(req);
    if (claims) req.auth = { userId: claims.sub, role: claims.role };
    return next();
  } catch {
    return next(new ApiError(401, 'Access token is invalid or expired'));
  }
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize };
