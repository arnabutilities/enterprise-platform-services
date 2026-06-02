import { DateRange } from './common';

export type ReportFormat = 'pdf' | 'csv' | 'xlsx' | 'html';
export type ReportStatus = 'draft' | 'generating' | 'ready' | 'failed';
export type ReportFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface Report {
  id: string;
  title: string;
  description?: string;
  format: ReportFormat;
  status: ReportStatus;
  dateRange: DateRange;
  owner: string;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  defaultFormat: ReportFormat;
  createdBy: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'details' | 'charts' | 'tables';
  config: Record<string, unknown>;
}

export interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  frequency: ReportFrequency;
  recipients: string[];
  format: ReportFormat;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface ReportGenerationRequest {
  templateId: string;
  dateRange: DateRange;
  format: ReportFormat;
  parameters?: Record<string, unknown>;
}
