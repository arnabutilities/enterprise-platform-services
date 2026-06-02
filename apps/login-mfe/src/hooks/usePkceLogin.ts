import { useCallback, useMemo, useState } from 'react';
import type {
  AuthSessionCreatedEvent,
  AuthSessionFailedEvent,
} from '@enterprise-platform/contracts';
import { AuthEventTypes } from '@enterprise-platform/contracts';
import { persistAuthSession } from '@enterprise-platform/platform-auth';
import { publishAuthEvent } from '@enterprise-platform/shared-pubsub';
import { AuthApiError, createAuthClient } from '@/api/authClient';

const PKCE_STORAGE_KEY = 'pkce_session';

interface PkceSessionState {
  sessionId: string;
  state: string;
  codeVerifier: string;
  provider: string;
}

export interface UsePkceLoginOptions {
  bffBaseUrl: string;
  provider?: 'local' | 'keycloak';
  allowedOrigins?: string[];
  onAuthSuccess?: (event: AuthSessionCreatedEvent) => void;
  onAuthFailure?: (event: AuthSessionFailedEvent) => void;
}

function loadPkceSession(): PkceSessionState | null {
  try {
    const raw = sessionStorage.getItem(PKCE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PkceSessionState) : null;
  } catch {
    return null;
  }
}

function savePkceSession(session: PkceSessionState): void {
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(session));
}

function clearPkceSession(): void {
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
}

export function usePkceLogin({
  bffBaseUrl,
  provider = 'local',
  allowedOrigins,
  onAuthSuccess,
  onAuthFailure,
}: UsePkceLoginOptions) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authClient = useMemo(() => createAuthClient(bffBaseUrl), [bffBaseUrl]);

  const publishFailure = useCallback(
    (code: string, message: string) => {
      const event: AuthSessionFailedEvent = {
        type: AuthEventTypes.SESSION_FAILED,
        version: 1,
        correlationId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: { code, message, email: email || undefined },
        metadata: { source: 'login-mfe' },
      };

      publishAuthEvent(event, { allowedOrigins });
      onAuthFailure?.(event);
    },
    [allowedOrigins, email, onAuthFailure],
  );

  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const initiate = await authClient.initiate({ email, provider });
      savePkceSession({
        sessionId: initiate.sessionId,
        state: initiate.state,
        codeVerifier: initiate.codeVerifier,
        provider: initiate.provider,
      });

      if (provider !== 'local') {
        setError('External OAuth provider flow is not configured in this environment.');
        publishFailure('INVALID_INPUT', 'External OAuth provider is not available.');
        return;
      }

      const result = await authClient.exchange({
        sessionId: initiate.sessionId,
        state: initiate.state,
        codeVerifier: initiate.codeVerifier,
      });

      clearPkceSession();
      persistAuthSession(result);

      const successEvent: AuthSessionCreatedEvent = {
        type: AuthEventTypes.SESSION_CREATED,
        version: 1,
        correlationId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          user: result.user,
          provider,
        },
        metadata: { source: 'login-mfe' },
      };

      publishAuthEvent(successEvent, { allowedOrigins });
      onAuthSuccess?.(successEvent);
    } catch (err) {
      const apiError =
        err instanceof AuthApiError
          ? err
          : new AuthApiError('SERVER_ERROR', 'Sign-in failed. Please try again.', 500);

      setError(apiError.message);
      publishFailure(apiError.code, apiError.message);
    } finally {
      setLoading(false);
    }
  }, [authClient, email, onAuthSuccess, provider, publishFailure, allowedOrigins]);

  return {
    email,
    setEmail,
    loading,
    error,
    signIn,
    resumeSession: loadPkceSession,
  };
}
