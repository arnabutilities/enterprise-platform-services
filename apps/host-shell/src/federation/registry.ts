import type { MfeRegistry } from '@/types';

const env = import.meta.env as Record<string, string | undefined>;
const analyticsUrl =
  env.VITE_ANALYTICS_MFE_URL ||
  env.NEXT_PUBLIC_ANALYTICS_MFE_URL ||
  'http://localhost:3001/remoteEntry.js';
const reportsUrl =
  env.VITE_REPORTS_MFE_URL ||
  env.NEXT_PUBLIC_REPORTS_MFE_URL ||
  'http://localhost:3002/remoteEntry.js';
const usersUrl =
  env.VITE_USERS_MFE_URL || env.NEXT_PUBLIC_USERS_MFE_URL || 'http://localhost:3003/remoteEntry.js';
const settingsUrl =
  env.VITE_SETTINGS_MFE_URL ||
  env.NEXT_PUBLIC_SETTINGS_MFE_URL ||
  'http://localhost:3004/remoteEntry.js';
const notificationsUrl =
  env.VITE_NOTIFICATIONS_MFE_URL ||
  env.NEXT_PUBLIC_NOTIFICATIONS_MFE_URL ||
  'http://localhost:3005/remoteEntry.js';

export const MFE_REGISTRY: Record<string, MfeRegistry> = {
  analytics: {
    name: 'analyticsMfe',
    url: analyticsUrl,
    version: '1.0.0',
    exposedModules: ['./Dashboard', './Filters', './Charts'],
  },
  reports: {
    name: 'reportsMfe',
    url: reportsUrl,
    version: '1.0.0',
    exposedModules: ['./ReportViewer', './ReportBuilder'],
  },
  users: {
    name: 'usersMfe',
    url: usersUrl,
    version: '1.0.0',
    exposedModules: ['./UserManagement', './ProfilePage'],
  },
  settings: {
    name: 'settingsMfe',
    url: settingsUrl,
    version: '1.0.0',
    exposedModules: ['./SettingsPanel', './Preferences'],
  },
  notifications: {
    name: 'notificationsMfe',
    url: notificationsUrl,
    version: '1.0.0',
    exposedModules: ['./NotificationCenter', './NotificationPreferences'],
  },
};

export function getMfeUrl(mfeName: keyof typeof MFE_REGISTRY): string {
  return MFE_REGISTRY[mfeName]?.url || '';
}

export function getMfeRegistry(mfeName: keyof typeof MFE_REGISTRY): MfeRegistry | undefined {
  return MFE_REGISTRY[mfeName];
}
