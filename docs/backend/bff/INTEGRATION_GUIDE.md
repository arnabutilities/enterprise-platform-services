# BFF Integration Guide

**Status**: Current integration guide  
**Service**: `services/bff`  
**Last reviewed**: 2026-05-25

## Local Integration Path

From the monorepo root:

```bash
pnpm install
pnpm run infra:up
pnpm run health
pnpm --filter bff dev
```

Start frontend apps when needed:

```bash
pnpm --filter host-shell dev
pnpm --filter login-mfe dev
```

Default URLs:

| Component     | URL                   |
| ------------- | --------------------- |
| BFF           | http://localhost:4000 |
| Host shell    | http://localhost:3002 |
| Login MFE     | http://localhost:5003 |
| Analytics MFE | http://localhost:5001 |
| Reports MFE   | http://localhost:5002 |
| Postgres      | `localhost:5432`      |
| Redis         | `localhost:6379`      |

## Frontend Integration

The host shell passes BFF configuration into the login remote via `LoginContainer`:

- `VITE_BFF_URL` — defaults to `http://localhost:4000`
- `VITE_ALLOWED_MESSAGE_ORIGINS` — defaults to `http://localhost:5003`

Example host-shell env:

```bash
VITE_BFF_URL=http://localhost:4000
VITE_ALLOWED_MESSAGE_ORIGINS=http://localhost:5003
```

The BFF must allow browser origins through CORS:

```bash
CORS_ORIGIN=http://localhost:3002,http://localhost:5003
```

Add analytics and reports origins if those MFEs call the BFF directly from the browser.

## Auth Flow With Login MFE

1. Login MFE calls `POST /api/auth/initiate` with `email`, `provider`, and optional `codeVerifier`.
2. BFF validates the email against `DEMO_ALLOWED_EMAILS` and stores a PKCE session in cache.
3. Login MFE calls `POST /api/auth/exchange` with `sessionId`, `state`, and `codeVerifier`.
4. BFF validates the session, signs JWTs, stores the refresh token in cache, sets an HTTP-only access-token cookie, and returns tokens plus user profile.
5. Host shell receives auth events through `@enterprise-platform/shared-pubsub` and custom DOM events.

Supported providers in DTOs: `local` and `keycloak`. The local demo path does not require an external authorization code.

## Workspace Packages

The BFF depends on shared workspace packages:

| Package                              | Role in BFF                                                     |
| ------------------------------------ | --------------------------------------------------------------- |
| `@enterprise-platform/contracts`     | `AuthUser`, `AuthResponse`, provider types                      |
| `@enterprise-platform/security`      | PKCE helpers and validation schemas                             |
| `@enterprise-platform/observability` | Auth metrics (`recordPkceInitiate`, `recordPkceExchange`, etc.) |

Build these before the BFF when running outside the normal `predev` hook:

```bash
pnpm --filter @enterprise-platform/security run build
pnpm --filter @enterprise-platform/observability run build
```

## Database And Cache

Local infra compose credentials:

```bash
POSTGRES_USER=bff_user
POSTGRES_PASSWORD=bff_secure_password_change_me
POSTGRES_DB=bff_db
```

Match the BFF environment when database is enabled:

```powershell
$env:DB_USER='bff_user'
$env:DB_PASSWORD='bff_secure_password_change_me'
$env:DB_NAME='bff_db'
$env:REDIS_HOST='localhost'
$env:REDIS_PORT='6379'
```

For auth-only local development:

```powershell
$env:SKIP_DATABASE='true'
$env:USE_MEMORY_CACHE='true'
```

TypeORM is wired in `app.module.ts` but skipped when `SKIP_DATABASE=true`. PKCE sessions and refresh tokens use the global cache module (Redis or memory).

## Verification Checklist

```bash
curl http://localhost:4000/health
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
curl http://localhost:4000/api/auth/metrics
pnpm --filter bff test
```

PKCE smoke test:

```bash
curl -X POST http://localhost:4000/api/auth/initiate \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"provider\":\"local\"}"
```

## Docker

Build from the monorepo root:

```bash
docker build -f services/bff/Dockerfile.dev -t enterprise-bff:dev .
docker run -p 4000:4000 enterprise-bff:dev
```

Or use the consolidated compose stacks:

```bash
pnpm run stack:up
pnpm run stack:down
```

Compose files: [infra/docker/](../../../infra/docker/README.md).

## Production Considerations

- Provide strong `JWT_SECRET` and `JWT_REFRESH_SECRET` values.
- Keep `SKIP_DATABASE` unset for durable production state when database features are used.
- Use Redis (not memory cache) for refresh token and PKCE session storage.
- Configure strict `CORS_ORIGIN` values.
- Enable HTTPS and secure cookies at the edge or app layer (`secure: true` in production).
- Run `pnpm --filter bff build` and `pnpm --filter bff test` in CI before deployment.
- Health checks probe configured microservice URLs; expect `degraded` status when downstream services are offline.

## Related Docs

- [BFF quick reference](QUICK_REFERENCE.md)
- [Implementation summary](IMPLEMENTATION_SUMMARY.md)
- [NestJS BFF quick reference](../NESTJS_BFF_QUICK_REFERENCE.md)
- [Environment configuration](../../configuration/ENVIRONMENT_CONFIGURATION.md)
- [Infrastructure summary](../../infrastructure/INFRASTRUCTURE_SETUP_SUMMARY.md)
- [Security setup](../../security/SECURITY_SETUP.md)
- [Login MFE PKCE implementation](../../auth/login-mfe-pkce-implementation.md)
