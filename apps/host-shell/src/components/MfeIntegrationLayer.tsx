'use client';

import React, { useState, useCallback } from 'react';

export interface AnalyticsFiltersChangedEvent {
  type: 'analytics.filters.changed.v1';
  payload: {
    reportId: string;
    filters: any;
    dateRange: any;
    granularity: string;
  };
  timestamp: number;
  source: string;
}

export function MfeIntegrationLayer() {
  const [lastEvent, setLastEvent] = useState<AnalyticsFiltersChangedEvent | null>(null);

  const handleAnalyticsFilterChange = useCallback((event: AnalyticsFiltersChangedEvent) => {
    setLastEvent(event);
    console.log('[MFE Integration] Analytics filters changed:', event);

    // Broadcast to other MFEs via CustomEvent
    window.dispatchEvent(new CustomEvent('analytics.filters.changed.v1', { detail: event }));
  }, []);

  return {
    handleAnalyticsFilterChange,
    lastEvent,
  };
}
