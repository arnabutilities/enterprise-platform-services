import type { AuthEvent } from '@enterprise-platform/contracts';

export function createAuthSafePostMessage(allowedOrigins: string[]) {
  const origins = new Set(allowedOrigins.filter(Boolean));

  return function postAuthEvent(event: AuthEvent, target: Window = window.parent): void {
    if (!target || target === window) {
      return;
    }

    origins.forEach((origin) => {
      try {
        target.postMessage(event, origin);
      } catch {
        // Ignore invalid target/origin combinations.
      }
    });
  };
}

export function isAllowedAuthMessageOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin);
}

export function parseAuthMessageData(data: unknown): AuthEvent | null {
  if (
    data &&
    typeof data === 'object' &&
    'type' in data &&
    typeof (data as AuthEvent).type === 'string' &&
    (data as AuthEvent).type.startsWith('auth.')
  ) {
    return data as AuthEvent;
  }

  return null;
}
