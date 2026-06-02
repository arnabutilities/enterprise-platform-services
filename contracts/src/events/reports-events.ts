export interface ReportGenerationStartedEvent {
  type: 'reports.generation.started';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    reportId: string;
    templateId: string;
    format: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  metadata: {
    userId: string;
    requestedAt: string;
  };
}

export interface ReportGenerationCompletedEvent {
  type: 'reports.generation.completed';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    reportId: string;
    format: string;
    fileSize: number;
    generationTime: number;
    downloadUrl: string;
  };
  metadata: {
    userId: string;
  };
}

export interface ReportGenerationFailedEvent {
  type: 'reports.generation.failed';
  version: 1;
  correlationId: string;
  timestamp: string;
  data: {
    reportId: string;
    error: {
      code: string;
      message: string;
    };
  };
  metadata: {
    userId: string;
  };
}

export type ReportsEvent =
  | ReportGenerationStartedEvent
  | ReportGenerationCompletedEvent
  | ReportGenerationFailedEvent;

export const ReportsEventTypes = {
  GENERATION_STARTED: 'reports.generation.started',
  GENERATION_COMPLETED: 'reports.generation.completed',
  GENERATION_FAILED: 'reports.generation.failed',
} as const;
