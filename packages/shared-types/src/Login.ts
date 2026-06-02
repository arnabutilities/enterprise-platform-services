export type AppScreen = 'login' | 'signup' | 'forgot' | 'dashboard';

export interface UserSession {
  email: string;
  fullName: string;
  companyName: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  event: string;
  status: 'success' | 'warning' | 'info' | 'error';
  ipAddress: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  color: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info';
}

export interface AnalyticsData {
  name: string;
  queries: number;
  latency: number; // in ms
  errors: number;
}
