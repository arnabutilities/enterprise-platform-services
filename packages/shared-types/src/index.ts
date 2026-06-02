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
  type: 'analytics.filters.changed';
  source: 'analytics-mfe';
  timestamp: number;
  payload: {
    reportId: string;
    filters: AnalyticsFilter;
    dateRange: DateRange;
    metrics: string[];
    granularity: string;
  };
}

export interface ReportDataPoint {
  timestamp: string;
  value: number;
  metric: string;
  dimensions?: Record<string, string>;
}

export interface ReportStreamUpdate {
  requestId: string;
  reportId: string;
  data: ReportDataPoint[];
  totalCount: number;
  isComplete: boolean;
  error?: string;
}
export * from './Alalytics';
export * from './Login';
