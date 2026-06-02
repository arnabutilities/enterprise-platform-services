/**
 * Analytics Events Type Definitions
 */

export interface DateRange {
  from: string;
  to: string;
}

export interface AnalyticsFilter {
  region?: string[];
  metrics?: string[];
  dimensions?: string[];
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface AnalyticsFiltersChangedEvent {
  type: 'analytics.filters.changed.v1';
  payload: {
    reportId: string;
    filters: AnalyticsFilter;
    dateRange: DateRange;
    granularity: string;
  };
  timestamp: number;
  source: 'analytics-mfe';
}
