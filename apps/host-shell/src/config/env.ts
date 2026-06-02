import type { RuntimeConfig } from '@/types';

function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function getEnv(key: string, fallback?: string): string {
  const env: Record<string, string | undefined> =
    typeof import.meta !== 'undefined' && 'env' in import.meta
      ? (import.meta as any).env
      : process.env;

  const value = env[key] || fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'staging' | 'production';
  NEXT_PUBLIC_HOST_URL: string;
  NEXT_PUBLIC_API_BASE_URL: string;
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_WS_URL: string;
  NEXT_PUBLIC_DEBUG: boolean;
  NEXT_PUBLIC_FEATURE_ANALYTICS_V2: boolean;
  NEXT_PUBLIC_FEATURE_REPORTS_ADVANCED: boolean;
  NEXT_PUBLIC_FEATURE_EXPORT_PDF: boolean;
}

export function loadEnvironment(): EnvironmentVariables {
  const nodeEnv = getEnv('NODE_ENV', 'development') as 'development' | 'staging' | 'production';

  const env =
    typeof import.meta !== 'undefined' && 'env' in import.meta
      ? (import.meta as any).env
      : process.env;

  return {
    NODE_ENV: nodeEnv,
    NEXT_PUBLIC_HOST_URL: getEnv('NEXT_PUBLIC_HOST_URL'),
    NEXT_PUBLIC_API_BASE_URL: getEnv('NEXT_PUBLIC_API_BASE_URL', env.NEXT_PUBLIC_API_URL),
    NEXT_PUBLIC_API_URL: getEnv('NEXT_PUBLIC_API_URL', env.NEXT_PUBLIC_API_BASE_URL),
    NEXT_PUBLIC_WS_URL: getEnv('NEXT_PUBLIC_WS_URL', 'ws://localhost:8080'),
    NEXT_PUBLIC_DEBUG: parseBoolean(env.NEXT_PUBLIC_DEBUG ?? env.DEBUG, false),
    NEXT_PUBLIC_FEATURE_ANALYTICS_V2: parseBoolean(env.NEXT_PUBLIC_FEATURE_ANALYTICS_V2, false),
    NEXT_PUBLIC_FEATURE_REPORTS_ADVANCED: parseBoolean(
      env.NEXT_PUBLIC_FEATURE_REPORTS_ADVANCED,
      false,
    ),
    NEXT_PUBLIC_FEATURE_EXPORT_PDF: parseBoolean(env.NEXT_PUBLIC_FEATURE_EXPORT_PDF, true),
  };
}

export function buildRuntimeConfig(env: EnvironmentVariables): RuntimeConfig {
  return {
    apiUrl: env.NEXT_PUBLIC_API_BASE_URL || env.NEXT_PUBLIC_API_URL,
    wsUrl: env.NEXT_PUBLIC_WS_URL,
    environment: env.NODE_ENV,
    debug: env.NEXT_PUBLIC_DEBUG,
  };
}
