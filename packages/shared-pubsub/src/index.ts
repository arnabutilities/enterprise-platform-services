export * from './auth';
import type { AnalyticsFiltersChangedEvent } from '@enterprise-platform/shared-types';

const eventName = 'analytics.filters.changed';
const storageKey = 'analytics-event';

type AnalyticsHandler = (event: AnalyticsFiltersChangedEvent) => void;

const handlers = new Set<AnalyticsHandler>();

export function publishAnalyticsEvent(event: AnalyticsFiltersChangedEvent): void {
  handlers.forEach((handler) => handler(event));

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail: event }));
  window.parent?.postMessage(event, '*');

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(event));
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

export function subscribeAnalyticsEvent(handler: AnalyticsHandler): {
  unsubscribe: () => void;
} {
  handlers.add(handler);
  return {
    unsubscribe: () => handlers.delete(handler),
  };
}

export function connectAnalyticsStorageBridge(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) {
      return;
    }

    publishAnalyticsEvent(JSON.parse(event.newValue));
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
