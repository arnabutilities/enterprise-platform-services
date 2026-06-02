import jwt from 'jsonwebtoken';
import { JWT_CONFIG, AuthContext, JWTPayload, TokenPair } from './jwt.config';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-me';

export function generateAccessToken(
  context: AuthContext,
  expiresIn: string = JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN,
): string {
  const payload: Omit<JWTPayload, 'exp'> = {
    sub: context.userId,
    email: context.email,
    role: context.role,
    permissions: context.permissions,
    type: JWT_CONFIG.TOKEN_TYPES.ACCESS,
    aud: context.mfeName,
    iss: 'enterprise-platform',
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(
  userId: string,
  expiresIn: string = JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
): string {
  const payload = {
    sub: userId,
    type: JWT_CONFIG.TOKEN_TYPES.REFRESH,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function generateTokenPair(context: AuthContext): TokenPair {
  return {
    accessToken: generateAccessToken(context),
    refreshToken: generateRefreshToken(context.userId),
    expiresIn: 15 * 60,
    tokenType: 'Bearer',
  };
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM as jwt.Algorithm],
    });
    return decoded as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM as jwt.Algorithm],
    });
    return { sub: (decoded as any).sub };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  return parts[1];
}
