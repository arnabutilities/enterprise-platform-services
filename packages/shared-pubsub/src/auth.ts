import type { AuthEvent } from '@enterprise-platform/contracts';

const eventName = 'auth.event';
const storageKey = 'auth-event';

type AuthHandler = (event: AuthEvent) => void;

const handlers = new Set<AuthHandler>();

function parseAllowedOrigins(origins?: string[]): string[] {
  if (origins?.length) {
    return origins;
  }

  const fromEnv =
    typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_ALLOWED_MESSAGE_ORIGINS;

  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [window.location.origin];
}

export function publishAuthEvent(event: AuthEvent, options?: { allowedOrigins?: string[] }): void {
  handlers.forEach((handler) => handler(event));

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail: event }));

  const allowedOrigins = parseAllowedOrigins(options?.allowedOrigins);
  if (window.parent && window.parent !== window) {
    allowedOrigins.forEach((origin) => {
      window.parent?.postMessage(event, origin);
    });
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(event));
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

export function subscribeAuthEvent(handler: AuthHandler): { unsubscribe: () => void } {
  handlers.add(handler);

  if (typeof window === 'undefined') {
    return { unsubscribe: () => handlers.delete(handler) };
  }

  const handleMessage = (messageEvent: MessageEvent) => {
    const data = messageEvent.data as AuthEvent;
    if (!data?.type?.startsWith('auth.')) {
      return;
    }
    handler(data);
  };

  const handleCustom = (customEvent: Event) => {
    const detail = (customEvent as CustomEvent<AuthEvent>).detail;
    if (detail?.type?.startsWith('auth.')) {
      handler(detail);
    }
  };

  window.addEventListener('message', handleMessage);
  window.addEventListener(eventName, handleCustom);

  return {
    unsubscribe: () => {
      handlers.delete(handler);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener(eventName, handleCustom);
    },
  };
}

export function connectAuthStorageBridge(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) {
      return;
    }

    publishAuthEvent(JSON.parse(event.newValue));
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
