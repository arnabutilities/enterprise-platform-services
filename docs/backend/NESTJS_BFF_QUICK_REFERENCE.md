# NestJS BFF Quick Reference

**Status**: Current implementation reference
**Framework**: NestJS 10.x  
**Port**: `4000` by default
**Last reviewed**: 2026-05-25

## What The BFF Does Today

The BFF in [services/bff](../../services/bff) is a NestJS service that provides:

- REST authentication endpoints under `/api/auth`
- PKCE session initiation and exchange
- JWT access and refresh token handling
- HTTP-only access-token cookie on successful exchange
- Health endpoints under `/health`
- Request ID, request validation, security headers, and logging middleware
- WebSocket module scaffolding
- Microservice routing scaffolding
- Optional TypeORM Postgres integration
- Redis-backed or in-memory cache support
- Auth metrics snapshot endpoint

GraphQL packages are present in dependencies, but the current implemented auth surface is REST, not GraphQL.

## Run Locally

From the repository root:

```bash
pnpm install
pnpm run infra:up
pnpm run health
pnpm --filter bff dev
```

For a lightweight auth demo without Postgres or Redis-backed cache:

```bash
set SKIP_DATABASE=true
set USE_MEMORY_CACHE=true
set DEMO_ALLOWED_EMAILS=test@example.com,admin@example.com
pnpm --filter bff dev
```

PowerShell equivalent:

```powershell
$env:SKIP_DATABASE='true'
$env:USE_MEMORY_CACHE='true'
$env:DEMO_ALLOWED_EMAILS='test@example.com,admin@example.com'
pnpm --filter bff dev
```

## Scripts

| Command                        | Purpose                |
| ------------------------------ | ---------------------- |
| `pnpm --filter bff dev`        | Nest watch mode        |
| `pnpm --filter bff start`      | `nest start`           |
| `pnpm --filter bff build`      | Compile the BFF        |
| `pnpm --filter bff test`       | Run Jest tests         |
| `pnpm --filter bff test:watch` | Run Jest in watch mode |
| `pnpm --filter bff test:cov`   | Run Jest with coverage |

## Endpoints

| Method | Endpoint             | Purpose                                   |
| ------ | -------------------- | ----------------------------------------- |
| `GET`  | `/health`            | Full health response                      |
| `GET`  | `/health/live`       | Liveness check                            |
| `GET`  | `/health/ready`      | Readiness check                           |
| `POST` | `/api/auth/initiate` | Start PKCE session                        |
| `POST` | `/api/auth/exchange` | Exchange PKCE verifier for tokens         |
| `POST` | `/api/auth/refresh`  | Rotate refresh token and issue new tokens |
| `POST` | `/api/auth/logout`   | Revoke refresh token                      |
| `GET`  | `/api/auth/me`       | Return authenticated user                 |
| `GET`  | `/api/auth/metrics`  | Return in-memory auth metrics snapshot    |

## PKCE Auth Flow

1. The frontend calls `POST /api/auth/initiate` with an email, provider, and optional verifier.
2. The BFF validates the email against `DEMO_ALLOWED_EMAILS`.
3. The BFF creates a PKCE session and returns `sessionId`, `state`, `codeChallenge`, and `codeVerifier`.
4. The frontend calls `POST /api/auth/exchange` with `sessionId`, `state`, and `codeVerifier`.
5. The BFF validates the session, signs access and refresh JWTs, stores the refresh token in cache, and sets an HTTP-only access-token cookie.

Example initiate request:

```bash
curl -X POST http://localhost:4000/api/auth/initiate \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"provider\":\"local\"}"
```

Example exchange request:

```bash
curl -X POST http://localhost:4000/api/auth/exchange \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"<sessionId>\",\"state\":\"<state>\",\"codeVerifier\":\"<codeVerifier>\"}"
```

## Important Environment Variables

| Variable                   | Default                                                             | Purpose                                         |
| -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| `PORT`                     | `4000`                                                              | BFF HTTP port                                   |
| `NODE_ENV`                 | `development`                                                       | Runtime environment                             |
| `CORS_ORIGIN`              | `http://localhost:3000,http://localhost:3002,http://localhost:5003` | Allowed origins                                 |
| `SKIP_DATABASE`            | unset                                                               | Set `true` to skip TypeORM setup                |
| `USE_MEMORY_CACHE`         | unset                                                               | Set `true` to use memory cache instead of Redis |
| `DB_HOST`                  | `localhost`                                                         | Postgres host                                   |
| `DB_PORT`                  | `5432`                                                              | Postgres port                                   |
| `DB_USER`                  | `postgres`                                                          | Postgres user                                   |
| `DB_PASSWORD`              | `password`                                                          | Postgres password                               |
| `DB_NAME`                  | `bff_db`                                                            | Postgres database                               |
| `REDIS_HOST`               | `localhost`                                                         | Redis host                                      |
| `REDIS_PORT`               | `6379`                                                              | Redis port                                      |
| `JWT_SECRET`               | development fallback                                                | Access token secret                             |
| `JWT_REFRESH_SECRET`       | development fallback                                                | Refresh token secret                            |
| `JWT_EXPIRY`               | `1h`                                                                | Access token expiry                             |
| `JWT_REFRESH_EXPIRY`       | `7d`                                                                | Refresh token expiry                            |
| `DEMO_ALLOWED_EMAILS`      | `test@example.com,admin@example.com`                                | Demo login allowlist                            |
| `ACCESS_TOKEN_COOKIE_NAME` | `accessToken`                                                       | Cookie name set by exchange                     |

## Source Map

```text
services/bff/src/
|-- main.ts                         # Nest bootstrap and global middleware
|-- app.module.ts                   # Root module wiring
|-- load-env.ts                     # Loads .env before AppModule
|-- config/
|   |-- configuration.ts            # Environment-backed config
|   |-- database.config.ts          # TypeORM config
|   |-- redis.config.ts             # Cache config
|   `-- microservice-routing.config.ts
|-- common/                         # Shared middleware, guards, filters, etc.
`-- modules/
    |-- auth/                       # /api/auth REST endpoints
    |-- health/                     # /health endpoints
    |-- microservice/               # Microservice request helper
    |-- websocket/                  # WebSocket gateway scaffolding
    |-- users/                      # Placeholder module
    `-- analytics/                  # Placeholder module
```

## Testing

```bash
pnpm --filter bff test
```

The repo also has root-level test orchestration:

```bash
pnpm test
```

## Troubleshooting

### BFF starts but database connection fails

Start infra first:

```bash
pnpm run infra:up
pnpm run health
```

For auth-only local work, set `SKIP_DATABASE=true`.

### Redis/cache issues during demos

Set `USE_MEMORY_CACHE=true` to use in-memory cache.

### CORS errors from the host or login MFE

Include the browser origin in `CORS_ORIGIN`. Current local origins usually include `http://localhost:3002` and `http://localhost:5003`.

### Login fails for a demo email

Add the email to `DEMO_ALLOWED_EMAILS`.
