const crypto = require('crypto');

const pkceSessions = new Map();
const refreshTokenStore = new Map();

function createPkceSession({ email, provider, codeChallenge, state }) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  pkceSessions.set(sessionId, {
    email,
    provider,
    codeChallenge,
    state,
    expiresAt,
  });

  return sessionId;
}

function getPkceSession(sessionId) {
  const record = pkceSessions.get(sessionId);
  if (!record) {
    return null;
  }

  if (record.expiresAt < Date.now()) {
    pkceSessions.delete(sessionId);
    return null;
  }

  return record;
}

function consumePkceSession(sessionId) {
  const session = getPkceSession(sessionId);
  if (!session) {
    return null;
  }

  pkceSessions.delete(sessionId);
  return session;
}

function storeRefreshToken(token, payload, expiresAt) {
  refreshTokenStore.set(token, {
    payload,
    expiresAt,
  });
}

function validateStoredRefreshToken(token) {
  const record = refreshTokenStore.get(token);
  if (!record) {
    return null;
  }

  if (record.expiresAt < Date.now()) {
    refreshTokenStore.delete(token);
    return null;
  }

  return record.payload;
}

function revokeRefreshToken(token) {
  refreshTokenStore.delete(token);
  return true;
}

module.exports = {
  createPkceSession,
  getPkceSession,
  consumePkceSession,
  storeRefreshToken,
  validateStoredRefreshToken,
  revokeRefreshToken,
};
