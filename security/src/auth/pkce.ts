import crypto from 'crypto';

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(64));
}

export function generateCodeChallenge(codeVerifier: string): string {
  return base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());
}

export function validateCodeChallenge(codeVerifier: string, expectedChallenge: string): boolean {
  return generateCodeChallenge(codeVerifier) === expectedChallenge;
}

export function generateRandomState(): string {
  return crypto.randomUUID();
}
