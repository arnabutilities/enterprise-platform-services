import { register, Counter, Histogram } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const mfeLoadTime = new Histogram({
  name: 'mfe_load_time_seconds',
  help: 'Time taken to load MFE in seconds',
  labelNames: ['mfe_name'],
});

export const mfeErrors = new Counter({
  name: 'mfe_errors_total',
  help: 'Total MFE errors',
  labelNames: ['mfe_name', 'error_type'],
});

export function metricsEndpoint(req: any, res: any) {
  res.set('Content-Type', register.contentType);
  res.send(register.metrics());
}
