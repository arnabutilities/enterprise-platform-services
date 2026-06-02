/**
 * @deprecated Legacy Express BFF entry. Use NestJS (`nest start` / `src/main.ts`) — Option A.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { ApolloServer } = require('apollo-server-express');
const { typeDefs, resolvers } = require('./schema');
const { generateCodeVerifier, generateCodeChallenge, validateCodeChallenge } = require('./pkce');
const { createPkceSession, consumePkceSession, revokeRefreshToken } = require('./sessionStore');
const { signAccessToken, signRefreshToken, verifyToken, refreshTokenPayload } = require('./token');

const port = Number(process.env.PORT || 4000);
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  'http://localhost:3002,http://localhost:5001,http://localhost:5002,http://localhost:3000'
)
  .split(',')
  .map((value) => value.trim());
const accessTokenCookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || 'accessToken';

function getBearerToken(req) {
  const authHeader = req.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.[accessTokenCookieName] || null;
}

function requireJwt(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing authorization token' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Unable to validate token' });
  }

  req.auth = decoded;
  next();
}

function createAuthResponse(user) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles: user.roles });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email, roles: user.roles });

  return {
    accessToken,
    refreshToken,
    user,
  };
}

async function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );

  const apiLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);

  app.post('/api/auth/initiate', (req, res) => {
    const { email, provider, codeVerifier } = req.body;
    if (!email || !provider) {
      return res
        .status(400)
        .json({ code: 'INVALID_INPUT', message: 'email and provider are required' });
    }

    const verifier = codeVerifier || generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(verifier);
    const state = generateCodeVerifier();
    const sessionId = createPkceSession({
      email,
      provider,
      codeChallenge,
      state,
    });

    return res.json({ sessionId, provider, state, codeChallenge, codeVerifier: verifier });
  });

  app.post('/api/auth/exchange', (req, res) => {
    const { sessionId, state, codeVerifier } = req.body;
    if (!sessionId || !state || !codeVerifier) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'sessionId, state, and codeVerifier are required',
      });
    }

    const session = consumePkceSession(sessionId);
    if (
      !session ||
      session.state !== state ||
      !validateCodeChallenge(codeVerifier, session.codeChallenge)
    ) {
      return res
        .status(400)
        .json({ code: 'INVALID_PKCE_SESSION', message: 'Invalid PKCE session or verifier' });
    }

    const user = {
      id: Buffer.from(session.email).toString('base64').slice(0, 12),
      email: session.email,
      name: session.email.split('@')[0],
      picture: null,
      roles: ['user'],
    };

    const authResponse = createAuthResponse(user);
    res.cookie(accessTokenCookieName, authResponse.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    return res.json(authResponse);
  });

  app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ code: 'INVALID_INPUT', message: 'refreshToken is required' });
    }

    const payload = refreshTokenPayload(refreshToken);
    if (!payload) {
      return res
        .status(401)
        .json({ code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' });
    }

    const user = {
      id: payload.userId,
      email: payload.email,
      name: payload.email.split('@')[0],
      picture: null,
      roles: payload.roles,
    };

    return res.json(createAuthResponse(user));
  });

  app.post('/api/auth/logout', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ code: 'INVALID_INPUT', message: 'refreshToken is required' });
    }

    revokeRefreshToken(refreshToken);
    return res.json({ success: true });
  });

  app.options('*', (_req, res) => res.sendStatus(204));

  app.get('/api/reports/stream', requireJwt, (req, res) => {
    const reportId = req.query.reportId || 'sales-summary';
    const requestId = req.query.requestId || `request-${Date.now()}`;
    const rawFilters = req.query.filters || '{}';
    let filters = {};

    try {
      filters = typeof rawFilters === 'string' ? JSON.parse(rawFilters) : rawFilters;
    } catch (error) {
      return res
        .status(400)
        .json({ code: 'INVALID_PAYLOAD', message: 'filters must be a valid JSON object' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    let count = 0;
    const send = () => {
      count += 1;
      res.write(
        `data: ${JSON.stringify({
          requestId,
          reportId,
          data: [
            {
              timestamp: new Date().toISOString(),
              metric: 'revenue',
              value: Math.floor(Math.random() * 10000),
              dimensions: { reportId, region: filters.region || 'All' },
            },
          ],
          totalCount: count,
          isComplete: false,
        })}\n\n`,
      );
    };

    send();
    const timer = setInterval(send, 2000);
    req.on('close', () => clearInterval(timer));
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((err, _req, res, _next) => {
    res.status(500).json({ code: 'SERVER_ERROR', message: err.message || 'Internal error' });
  });

  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, res }) => {
      const token = getBearerToken(req);
      const user = token ? verifyToken(token) : null;
      return { req, res, user };
    },
  });

  return apollo.start().then(() => {
    apollo.applyMiddleware({ app, path: '/graphql', cors: false });
    return app;
  });
}

async function startServer() {
  const app = await createApp();

  const httpServer = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`BFF service listening on http://localhost:${port}`);
  });

  return { app, httpServer };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};
