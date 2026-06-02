type CspPolicy = Record<string, string[]>;

const policies: Record<'development' | 'production', CspPolicy> = {
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'localhost:*', 'https:'],
    'frame-src': ["'self'"],
    'frame-ancestors': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
  production: {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://cdn.example.com'],
    'style-src': ["'self'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://api.example.com', 'https://analytics.example.com'],
    'frame-src': ["'self'"],
    'frame-ancestors': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'report-uri': ['https://csp.example.com/report'],
  },
};

function buildHeader(policy: CspPolicy) {
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

export function getCspHeader(environment: 'development' | 'production' = 'development') {
  return buildHeader(policies[environment]);
}

export function cspMiddleware(environment: 'development' | 'production' = 'development') {
  const header = getCspHeader(environment);

  return (_req: any, res: any, next: any) => {
    res.setHeader('Content-Security-Policy', header);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  };
}
