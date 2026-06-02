import { useEffect, useCallback, useState } from 'react';
import type { AnalyticsFiltersChangedEvent } from '@/types/analyticsEvents';

export function useMfeEventBus() {
  const [lastAnalyticsEvent, setLastAnalyticsEvent] = useState<AnalyticsFiltersChangedEvent | null>(
    null,
  );

  // Listen for analytics filter changes
  useEffect(() => {
    const handleAnalyticsChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.type === 'analytics.filters.changed.v1') {
        setLastAnalyticsEvent(customEvent.detail);
        console.log('[Host Shell] Analytics event received:', customEvent.detail);
      }
    };

    window.addEventListener('analytics.filters.changed.v1', handleAnalyticsChange);

    return () => {
      window.removeEventListener('analytics.filters.changed.v1', handleAnalyticsChange);
    };
  }, []);

  // Publish events to other MFEs
  const publishEvent = useCallback((event: any) => {
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
    console.log('[Host Shell] Event published:', event);
  }, []);

  return { lastAnalyticsEvent, publishEvent };
}
