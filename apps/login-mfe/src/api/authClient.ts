import type {
  ApiErrorBody,
  AuthResponse,
  PkceInitiateRequest,
  PkceInitiateResponse,
  PkceExchangeRequest,
} from '@enterprise-platform/contracts';
import { withRetry } from '@enterprise-platform/runtime';

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

async function parseError(response: Response): Promise<AuthApiError> {
  let body: ApiErrorBody | undefined;

  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = undefined;
  }

  return new AuthApiError(
    body?.code ?? 'SERVER_ERROR',
    body?.message ?? 'Authentication request failed',
    response.status,
  );
}

export function createAuthClient(bffBaseUrl: string) {
  const baseUrl = bffBaseUrl.replace(/\/$/, '');

  return {
    async initiate(payload: PkceInitiateRequest): Promise<PkceInitiateResponse> {
      const response = await withRetry(() =>
        fetch(`${baseUrl}/api/auth/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }),
      );

      if (!response.ok) {
        throw await parseError(response);
      }

      return response.json() as Promise<PkceInitiateResponse>;
    },

    async exchange(payload: PkceExchangeRequest): Promise<AuthResponse> {
      const response = await withRetry(() =>
        fetch(`${baseUrl}/api/auth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }),
      );

      if (!response.ok) {
        throw await parseError(response);
      }

      return response.json() as Promise<AuthResponse>;
    },
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
