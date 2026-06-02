export interface AnalyticsDashboardCreatedEvent {
  type: 'analytics.dashboard.created';
  version: 1;
  correlationId: string;
  timestamp: string;
  aggregateId: string;
  aggregateType: 'dashboard';
  data: {
    dashboardId: string;
    name: string;
    owner: string;
    createdAt: string;
  };
  metadata: {
    userId: string;
    source: 'analytics-mfe' | 'api';
    ipAddress?: string;
  };
}

export interface AnalyticsDashboardUpdatedEvent {
  type: 'analytics.dashboard.updated';
  version: 1;
  correlationId: string;
  timestamp: string;
  aggregateId: string;
  aggregateType: 'dashboard';
  data: {
    dashboardId: string;
    changes: Record<string, unknown>;
    updatedAt: string;
  };
  metadata: {
    userId: string;
  };
}

export interface AnalyticsQueryExecutedEvent {
  type: 'analytics.query.executed';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    queryId: string;
    metrics: string[];
    dateRange: {
      startDate: string;
      endDate: string;
    };
    executionTime: number;
    rowsReturned: number;
  };
  metadata: {
    userId: string;
    cached: boolean;
  };
}

export type AnalyticsEvent =
  | AnalyticsDashboardCreatedEvent
  | AnalyticsDashboardUpdatedEvent
  | AnalyticsQueryExecutedEvent;

export const AnalyticsEventTypes = {
  DASHBOARD_CREATED: 'analytics.dashboard.created',
  DASHBOARD_UPDATED: 'analytics.dashboard.updated',
  QUERY_EXECUTED: 'analytics.query.executed',
} as const;
