import type { Report, ReportTemplate } from '../types';
import type { ComponentType } from 'react';

export interface ReportsRemote {
  Reports: ComponentType;
  ReportsList: ComponentType<{ showArchived?: boolean }>;
  ReportDetail: ComponentType<{ reportId: string }>;
  ReportGenerationForm: ComponentType<{ onSubmit: (data: any) => void }>;
  useReports: () => {
    reports: Report[];
    loading: boolean;
    error?: Error;
  };
  useReport: (reportId: string) => Report | null;
  useReportTemplates: () => ReportTemplate[];
}

export interface ReportsHostDependencies {
  useShellContext: () => any;
  Button: ComponentType<any>;
  Card: ComponentType<any>;
  Modal: ComponentType<any>;
  Table: ComponentType<any>;
  Form: ComponentType<any>;
  FileDownload: (url: string, filename: string) => void;
}

export const ReportsModuleVersion = '1.0.0';
export const ReportsRequiredHostVersion = '1.0.0';
