export default () => ({
  app: {
    name: 'Enterprise BFF',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  port: parseInt(process.env.PORT || '4000', 10),
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) || [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:5003',
    ],
    credentials: true,
  },
  database: {
    skip: process.env.SKIP_DATABASE === 'true',
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'bff_user',
    password: process.env.DB_PASSWORD || 'bff_secure_password_change_me',
    database: process.env.DB_NAME || 'bff_db',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    ttl: 3600,
    useMemory: process.env.USE_MEMORY_CACHE === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRY || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  auth: {
    demoAllowedEmails: process.env.DEMO_ALLOWED_EMAILS || 'test@example.com,admin@example.com',
    pkceSessionTtlSeconds: parseInt(process.env.PKCE_SESSION_TTL_SECONDS || '600', 10),
    accessTokenCookieName: process.env.ACCESS_TOKEN_COOKIE_NAME || 'accessToken',
  },
  oauth: {
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    authorizationUrl: process.env.OAUTH_AUTH_URL,
    tokenUrl: process.env.OAUTH_TOKEN_URL,
  },
  microservices: {
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3001',
    reportsService: process.env.REPORTS_SERVICE_URL || 'http://localhost:3003',
    usersService: process.env.USERS_SERVICE_URL || 'http://localhost:3004',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
});
