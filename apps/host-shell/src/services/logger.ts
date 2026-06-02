import { getConfig } from '@/config';

class Logger {
  private debug: boolean;

  constructor() {
    this.debug = getConfig().debug;
  }

  log(...args: any[]): void {
    if (this.debug) {
      console.log('[HOST-SHELL]', ...args);
    }
  }

  error(...args: any[]): void {
    console.error('[HOST-SHELL-ERROR]', ...args);
  }

  warn(...args: any[]): void {
    console.warn('[HOST-SHELL-WARN]', ...args);
  }

  info(...args: any[]): void {
    console.info('[HOST-SHELL-INFO]', ...args);
  }
}

export const logger = new Logger();
