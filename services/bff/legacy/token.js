const jwt = require('jsonwebtoken');
const {
  storeRefreshToken,
  validateStoredRefreshToken,
  revokeRefreshToken,
} = require('./sessionStore');

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function parseDuration(value) {
  if (typeof value !== 'string') {
    return Number(value) || 0;
  }

  const amount = Number(value.slice(0, -1));
  if (Number.isNaN(amount)) {
    return 0;
  }

  if (value.endsWith('h')) {
    return amount * 60 * 60 * 1000;
  }

  if (value.endsWith('d')) {
    return amount * 24 * 60 * 60 * 1000;
  }

  return Number(value) || 0;
}

const refreshTokenLifetimeMs = parseDuration(jwtRefreshExpiresIn);

function signAccessToken(payload) {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

function signRefreshToken(payload) {
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, jwtSecret, {
    expiresIn: jwtRefreshExpiresIn,
  });

  // storeRefreshToken may persist in-memory or in Redis depending on configuration
  storeRefreshToken(refreshToken, payload, Date.now() + refreshTokenLifetimeMs);
  return refreshToken;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

function refreshTokenPayload(token) {
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'refresh') {
    return null;
  }

  return validateStoredRefreshToken(token);
}

function revokeToken(token) {
  revokeRefreshToken(token);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  refreshTokenPayload,
  revokeToken,
};
