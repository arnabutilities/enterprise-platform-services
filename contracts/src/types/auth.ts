export type AuthProvider = 'local' | 'keycloak';

export type AuthErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_EMAIL'
  | 'USER_NOT_FOUND'
  | 'USER_DISABLED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_PKCE_SESSION'
  | 'STATE_MISMATCH'
  | 'INVALID_TOKEN'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR';

export interface ApiErrorBody {
  code: AuthErrorCode | string;
  message: string;
  timestamp: string;
  requestId?: string;
  field?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface PkceInitiateRequest {
  email: string;
  provider: AuthProvider;
  codeVerifier?: string;
}

export interface PkceInitiateResponse {
  sessionId: string;
  provider: AuthProvider;
  state: string;
  codeChallenge: string;
  codeVerifier: string;
}

export interface PkceExchangeRequest {
  sessionId: string;
  state: string;
  codeVerifier: string;
  code?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}
