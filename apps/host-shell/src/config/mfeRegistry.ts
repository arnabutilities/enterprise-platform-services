export interface MFEDefinition {
  name: string;
  scope: string;
  module: string;
  remoteUrl: string;
}

const env = import.meta.env as Record<string, string | undefined>;
const analyticsUrl =
  env.VITE_ANALYTICS_URL || env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:5001';
const reportsUrl = env.VITE_REPORTS_URL || env.NEXT_PUBLIC_REPORTS_URL || 'http://localhost:5002';
const loginUrl = env.VITE_LOGIN_URL || env.NEXT_PUBLIC_LOGIN_URL || 'http://localhost:5003';

export const mfeRegistry: Record<'analytics' | 'reports' | 'login', MFEDefinition> = {
  analytics: {
    name: 'Analytics',
    scope: 'analytics',
    module: './Analytics',
    remoteUrl: analyticsUrl,
  },
  reports: {
    name: 'Reports',
    scope: 'reports',
    module: './Reports',
    remoteUrl: reportsUrl,
  },
  login: {
    name: 'Login',
    scope: 'login',
    module: './Login',
    remoteUrl: loginUrl,
  },
};
