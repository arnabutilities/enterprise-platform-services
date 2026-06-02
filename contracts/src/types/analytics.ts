import { DateRange } from './common';

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  unit?: string;
  trend?: number;
  timestamp: string;
}

export interface DashboardItem {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table';
  metrics: AnalyticsMetric[];
  dateRange: DateRange;
  refreshInterval?: number;
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description?: string;
  items: DashboardItem[];
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsQuery {
  dateRange: DateRange;
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, unknown>;
}

export interface AnalyticsResponse {
  query: AnalyticsQuery;
  data: AnalyticsMetric[];
  generatedAt: string;
  cacheHit: boolean;
}
