import type { AuthErrorCode, AuthUser } from '../types/auth';

export interface AuthSessionCreatedEvent {
  type: 'auth.session.created';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    user: AuthUser;
    provider: string;
  };
  metadata: {
    source: 'login-mfe' | 'host-shell' | 'api';
  };
}

export interface AuthSessionFailedEvent {
  type: 'auth.session.failed';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    code: AuthErrorCode | string;
    message: string;
    email?: string;
  };
  metadata: {
    source: 'login-mfe' | 'host-shell' | 'api';
  };
}

export interface AuthSessionExpiredEvent {
  type: 'auth.session.expired';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    sessionId?: string;
    reason: string;
  };
  metadata: {
    source: 'login-mfe' | 'host-shell' | 'api';
  };
}

export interface AuthLogoutEvent {
  type: 'auth.logout';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    userId?: string;
  };
  metadata: {
    source: 'login-mfe' | 'host-shell' | 'api';
  };
}

export type AuthEvent =
  | AuthSessionCreatedEvent
  | AuthSessionFailedEvent
  | AuthSessionExpiredEvent
  | AuthLogoutEvent;

export const AuthEventTypes = {
  SESSION_CREATED: 'auth.session.created',
  SESSION_FAILED: 'auth.session.failed',
  SESSION_EXPIRED: 'auth.session.expired',
  LOGOUT: 'auth.logout',
} as const;
