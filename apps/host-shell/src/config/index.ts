import type { RuntimeConfig } from '@/types';
import { buildRuntimeConfig, loadEnvironment } from './env';

const defaultConfig: RuntimeConfig = buildRuntimeConfig(loadEnvironment());

export function getConfig(): RuntimeConfig {
  return defaultConfig;
}

export function isProduction(): boolean {
  return getConfig().environment === 'production';
}

export function isDebug(): boolean {
  return getConfig().debug;
}
