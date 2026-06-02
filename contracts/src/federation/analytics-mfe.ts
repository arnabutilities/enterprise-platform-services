import type { AnalyticsDashboard, AnalyticsQuery, AnalyticsResponse } from '../types';
import type { ComponentType } from 'react';

export interface AnalyticsRemote {
  Analytics: ComponentType;
  DashboardView: React.ComponentType<{ dashboardId: string }>;
  MetricsPanel: React.ComponentType<{ dateRange: { start: string; end: string } }>;
  ChartsGallery: React.ComponentType<{ dashboards: AnalyticsDashboard[] }>;
  useAnalytics: () => {
    dashboards: AnalyticsDashboard[];
    loading: boolean;
    error?: Error;
  };
  useDashboard: (dashboardId: string) => AnalyticsDashboard | null;
  useMetrics: (query: AnalyticsQuery) => AnalyticsResponse | null;
}

export interface AnalyticsHostDependencies {
  useShellContext: () => {
    apiBaseUrl: string;
    onNavigate: (path: string) => void;
  };
  Button: ComponentType<any>;
  Card: ComponentType<any>;
  Modal: ComponentType<any>;
  LoadingSpinner: ComponentType;
  logger: {
    info: (msg: string) => void;
    error: (msg: string, err?: Error) => void;
    warn: (msg: string) => void;
  };
  eventBus: {
    emit: (event: string, data: any) => void;
    subscribe: (event: string, handler: Function) => void;
  };
}

export const AnalyticsModuleVersion = '1.0.0';
export const AnalyticsRequiredHostVersion = '1.0.0';
