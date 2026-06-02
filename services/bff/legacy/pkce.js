const crypto = require('crypto');

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(64));
}

function generateCodeChallenge(codeVerifier) {
  return base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());
}

function validateCodeChallenge(codeVerifier, expectedChallenge) {
  return generateCodeChallenge(codeVerifier) === expectedChallenge;
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  validateCodeChallenge,
};
