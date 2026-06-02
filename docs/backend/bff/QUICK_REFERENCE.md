# BFF Quick Reference

**Status**: Current implementation reference  
**Service**: `services/bff`  
**Port**: `4000`  
**Last reviewed**: 2026-05-25

## Quick Start

From the monorepo root:

```bash
pnpm install
pnpm run infra:up
pnpm run health
pnpm --filter bff dev
```

Auth-only local work without Postgres or Redis-backed cache:

```powershell
$env:SKIP_DATABASE='true'
$env:USE_MEMORY_CACHE='true'
$env:DEMO_ALLOWED_EMAILS='test@example.com,admin@example.com'
pnpm --filter bff dev
```

Health check:

```bash
curl http://localhost:4000/health
```

## Endpoints

| Method | Endpoint             | Auth | Purpose                                    |
| ------ | -------------------- | ---- | ------------------------------------------ |
| `GET`  | `/health`            | No   | Full health with downstream service probes |
| `GET`  | `/health/live`       | No   | Liveness probe                             |
| `GET`  | `/health/ready`      | No   | Readiness probe                            |
| `POST` | `/api/auth/initiate` | No   | Start PKCE auth session                    |
| `POST` | `/api/auth/exchange` | No   | Exchange PKCE verifier for tokens          |
| `POST` | `/api/auth/refresh`  | No   | Rotate refresh token                       |
| `POST` | `/api/auth/logout`   | No   | Revoke refresh token                       |
| `GET`  | `/api/auth/me`       | JWT  | Current authenticated user                 |
| `GET`  | `/api/auth/metrics`  | No   | In-memory auth metrics snapshot            |

## PKCE Smoke Test

Initiate:

```bash
curl -X POST http://localhost:4000/api/auth/initiate \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"provider\":\"local\"}"
```

Exchange using the returned `sessionId`, `state`, and `codeVerifier`:

```bash
curl -X POST http://localhost:4000/api/auth/exchange \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"<sessionId>\",\"state\":\"<state>\",\"codeVerifier\":\"<codeVerifier>\"}"
```

Successful exchange sets an HTTP-only `accessToken` cookie and returns `accessToken`, `refreshToken`, and `user` in the JSON body.

## Request ID Tracking

Every request gets an `X-Request-ID` header. Clients may send their own value; otherwise the BFF generates a UUID.

```bash
curl http://localhost:4000/health/live \
  -H "X-Request-ID: custom-id-123"
```

## Common Commands

```bash
pnpm --filter bff dev
pnpm --filter bff build
pnpm --filter bff test
pnpm --filter bff test:watch
pnpm --filter bff test:cov
```

## Environment Variables

| Variable                   | Default                                                             | Purpose                         |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| `PORT`                     | `4000`                                                              | BFF HTTP port                   |
| `NODE_ENV`                 | `development`                                                       | Runtime environment             |
| `CORS_ORIGIN`              | `http://localhost:3000,http://localhost:3002,http://localhost:5003` | Allowed browser origins         |
| `SKIP_DATABASE`            | unset                                                               | Skip TypeORM when `true`        |
| `USE_MEMORY_CACHE`         | unset                                                               | Use in-memory cache when `true` |
| `DB_HOST`                  | `localhost`                                                         | Postgres host                   |
| `DB_PORT`                  | `5432`                                                              | Postgres port                   |
| `DB_USER`                  | `postgres`                                                          | Postgres user                   |
| `DB_PASSWORD`              | `password`                                                          | Postgres password               |
| `DB_NAME`                  | `bff_db`                                                            | Postgres database               |
| `REDIS_HOST`               | `localhost`                                                         | Redis host                      |
| `REDIS_PORT`               | `6379`                                                              | Redis port                      |
| `JWT_SECRET`               | development fallback                                                | Access-token secret             |
| `JWT_REFRESH_SECRET`       | development fallback                                                | Refresh-token secret            |
| `JWT_EXPIRY`               | `1h`                                                                | Access token expiry             |
| `JWT_REFRESH_EXPIRY`       | `7d`                                                                | Refresh token expiry            |
| `DEMO_ALLOWED_EMAILS`      | `test@example.com,admin@example.com`                                | Demo login allowlist            |
| `PKCE_SESSION_TTL_SECONDS` | `600`                                                               | PKCE session TTL                |
| `ACCESS_TOKEN_COOKIE_NAME` | `accessToken`                                                       | Cookie set on exchange          |

See [`.env.example`](../../../services/bff/.env.example) for the full template.

## Source Layout

```text
services/bff/src/
|-- main.ts
|-- app.module.ts
|-- load-env.ts
|-- config/
|   |-- configuration.ts
|   |-- database.config.ts
|   |-- redis.config.ts
|   `-- microservice-routing.config.ts
|-- common/
|   |-- decorators/
|   |-- filters/
|   |-- guards/
|   |-- interceptors/
|   `-- middleware/
`-- modules/
    |-- auth/                 # REST auth (PKCE, JWT, refresh)
    |-- health/               # /health endpoints
    |-- microservice/         # Downstream service client
    |-- websocket/            # Socket.IO gateway scaffolding
    |-- users/                # Placeholder module
    `-- analytics/            # Placeholder module
```

Legacy Express entry points are archived under `services/bff/legacy/`.

## Troubleshooting

- **Database connection errors**: run `pnpm run infra:up` and align `DB_USER`, `DB_PASSWORD`, and `DB_NAME` with the local infra compose file (`bff_user` / `bff_secure_password_change_me` / `bff_db`).
- **Redis issues during auth-only demos**: set `USE_MEMORY_CACHE=true`.
- **CORS errors**: add the browser origin to `CORS_ORIGIN` (host shell `3002`, login MFE `5003`).
- **Demo login failure**: add the email to `DEMO_ALLOWED_EMAILS`.
- **401 `USER_NOT_FOUND` on initiate**: email is not in `DEMO_ALLOWED_EMAILS`.

## Related Docs

- [NestJS BFF quick reference](../NESTJS_BFF_QUICK_REFERENCE.md) — detailed auth flow and source map
- [Integration guide](INTEGRATION_GUIDE.md) — frontend wiring and deployment
- [Environment configuration](../../configuration/ENVIRONMENT_CONFIGURATION.md)
- [Security setup](../../security/SECURITY_SETUP.md)
- [Auth token sharing across MFEs](../../auth/auth-token-sharing-across-mfes.md)
