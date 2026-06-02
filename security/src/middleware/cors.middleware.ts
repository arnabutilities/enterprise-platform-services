import type { CorsOptions } from 'cors';

const origins = {
  development: [
    'http://localhost:3002',
    'http://localhost:5001',
    'http://localhost:5002',
    'http://localhost:5003',
    'http://localhost:3000',
    'http://localhost:4000',
  ],
  staging: [
    'https://staging.example.com',
    'https://staging-analytics.example.com',
    'https://staging-reports.example.com',
  ],
  production: [
    'https://app.example.com',
    'https://analytics.example.com',
    'https://reports.example.com',
  ],
};

export function getCorsOrigins(): string[] {
  const env = (process.env.NODE_ENV || 'development') as keyof typeof origins;
  const envOrigins = origins[env] || origins.development;

  const extra =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) || [];
  return Array.from(new Set([...envOrigins, ...extra]));
}

export function getCorsOptions(): CorsOptions {
  const allowedOrigins = getCorsOrigins();

  return {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Number', 'X-Page-Size', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };
}
