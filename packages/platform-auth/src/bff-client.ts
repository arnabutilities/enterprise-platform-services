import type { AuthResponse } from '@enterprise-platform/contracts';
import { clearAuthSession, getAccessToken, getAuthSession, persistAuthSession } from './session';

export interface BffClientOptions {
  bffBaseUrl: string;
  credentials?: RequestCredentials;
}

export class AuthApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function parseApiError(response: Response): Promise<AuthApiError> {
  let body: { code?: string; message?: string } = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  return new AuthApiError(
    body.code ?? 'SERVER_ERROR',
    body.message ?? 'Request failed',
    response.status,
  );
}

export function createBffClient(options: BffClientOptions) {
  const baseUrl = options.bffBaseUrl.replace(/\/$/, '');
  const credentials = options.credentials ?? 'include';

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getAccessToken();
    const headers = new Headers(init?.headers);

    if (!headers.has('Content-Type') && init?.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials,
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    getSession: getAuthSession,
    getAccessToken,
    persistAuthSession,
    clearAuthSession,

    async getCurrentUser() {
      return request<{ id: string; email: string; name: string; roles: string[] }>('/api/auth/me');
    },

    async refreshTokens(): Promise<AuthResponse> {
      const session = getAuthSession();
      if (!session?.refreshToken) {
        throw new AuthApiError('INVALID_TOKEN', 'No refresh token in session', 401);
      }

      const refreshed = await request<AuthResponse>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      persistAuthSession(refreshed);
      return refreshed;
    },

    async logout(): Promise<void> {
      const session = getAuthSession();
      if (session?.refreshToken) {
        await request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      }
      clearAuthSession();
    },

    fetch: request,
  };
}

export type BffClient = ReturnType<typeof createBffClient>;
