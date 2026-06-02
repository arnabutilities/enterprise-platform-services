export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
    API_KEY: 'api_key',
  },
  ALGORITHM: 'HS256',
};

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  type: string;
  aud: string;
  iss: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  mfeName: string;
}
