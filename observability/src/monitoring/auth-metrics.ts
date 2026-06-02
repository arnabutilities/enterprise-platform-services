export type AuthMetricStatus = 'success' | 'failure';

export interface AuthMetricsSnapshot {
  pkceInitiateTotal: number;
  pkceExchangeSuccess: number;
  pkceExchangeFailure: number;
  loginFailuresByReason: Record<string, number>;
}

const metrics: AuthMetricsSnapshot = {
  pkceInitiateTotal: 0,
  pkceExchangeSuccess: 0,
  pkceExchangeFailure: 0,
  loginFailuresByReason: {},
};

export function recordPkceInitiate(): void {
  metrics.pkceInitiateTotal += 1;
}

export function recordPkceExchange(status: AuthMetricStatus): void {
  if (status === 'success') {
    metrics.pkceExchangeSuccess += 1;
  } else {
    metrics.pkceExchangeFailure += 1;
  }
}

export function recordLoginFailure(reason: string): void {
  metrics.loginFailuresByReason[reason] = (metrics.loginFailuresByReason[reason] ?? 0) + 1;
}

export function getAuthMetricsSnapshot(): AuthMetricsSnapshot {
  return {
    ...metrics,
    loginFailuresByReason: { ...metrics.loginFailuresByReason },
  };
}

export function resetAuthMetricsForTests(): void {
  metrics.pkceInitiateTotal = 0;
  metrics.pkceExchangeSuccess = 0;
  metrics.pkceExchangeFailure = 0;
  metrics.loginFailuresByReason = {};
}
