import type { ReactNode } from 'react';

export interface FederationConfig {
  remotes: {
    analyticsMfe: string;
    reportsMfe: string;
    usersMfe: string;
    settingsMfe: string;
    notificationsMfe: string;
  };
  shared: Record<string, any>;
}

export interface MfeRegistry {
  name: string;
  url: string;
  version: string;
  exposedModules: string[];
}

export interface RuntimeConfig {
  apiUrl: string;
  wsUrl: string;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
}

export interface ShellLayoutProps {
  children: ReactNode;
}

export interface MfeComponentProps {
  [key: string]: any;
}
