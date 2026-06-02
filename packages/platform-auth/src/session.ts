import type { AuthResponse, AuthUser } from '@enterprise-platform/contracts';

export const AUTH_STORAGE_KEYS = {
  user: 'platform.auth.user',
  accessToken: 'platform.auth.accessToken',
  refreshToken: 'platform.auth.refreshToken',
} as const;

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export function persistAuthSession(session: AuthResponse): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(session.user));
  sessionStorage.setItem(AUTH_STORAGE_KEYS.accessToken, session.accessToken);
  sessionStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, session.refreshToken);
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const userRaw = sessionStorage.getItem(AUTH_STORAGE_KEYS.user);
  const accessToken = sessionStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  const refreshToken = sessionStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);

  if (!userRaw || !accessToken || !refreshToken) {
    return null;
  }

  return {
    user: JSON.parse(userRaw) as AuthUser,
    accessToken,
    refreshToken,
  };
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return sessionStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
}

export function getAuthUser(): AuthUser | null {
  return getAuthSession()?.user ?? null;
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  Object.values(AUTH_STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
