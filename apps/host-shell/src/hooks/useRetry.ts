import { useEffect, useRef } from 'react';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  onRetry?: (attempt: number, delay: number) => void;
}

export function useRetry(config: RetryConfig) {
  const attemptsRef = useRef(0);

  const execute = async <T>(fn: () => Promise<T>, onError?: (error: Error) => void): Promise<T> => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        attemptsRef.current = attempt;
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelayMs,
          );

          config.onRetry?.(attempt + 1, delay);

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      onError?.(lastError);
      throw lastError;
    }

    throw new Error('Unknown error');
  };

  return { execute, attempts: attemptsRef.current };
}
