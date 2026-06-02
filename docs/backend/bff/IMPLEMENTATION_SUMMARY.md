# BFF Implementation Summary

**Status**: Current implementation summary  
**Service**: `services/bff`  
**Last reviewed**: 2026-05-25

## Overview

The BFF is a NestJS 10 service on port `4000`. The active API surface is REST-first auth under `/api/auth`, plus health and auth metrics. GraphQL dependencies remain in `package.json` but are not the current runtime entry point.

## Implemented Areas

### Application Bootstrap (`src/main.ts`)

- Creates the Nest app from `AppModule`.
- Registers global `AuthExceptionFilter`.
- Enables Helmet and `cookie-parser`.
- Registers `RequestIdMiddleware`, `RequestValidationMiddleware`, and `SecurityHeadersMiddleware`.
- Configures global `ValidationPipe` with whitelist and forbidden unknown fields.
- Enables CORS from `CORS_ORIGIN`.
- Listens on `PORT` (default `4000`).

### Root Module (`src/app.module.ts`)

- `ConfigModule` loads `config/configuration.ts` from `.env.${NODE_ENV}`.
- Global cache from `config/redis.config.ts` (Redis or memory via `USE_MEMORY_CACHE`).
- Optional TypeORM from `config/database.config.ts` unless `SKIP_DATABASE=true`.
- JWT and Passport modules registered globally.
- Feature modules: auth, users, analytics, health, microservice, websocket.

### Auth (`modules/auth/`)

| File                               | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `auth.controller.ts`               | REST endpoints under `/api/auth`                                 |
| `auth.service.ts`                  | PKCE exchange, JWT signing, refresh rotation, logout             |
| `pkce-session.service.ts`          | Cache-backed PKCE session create/consume/validate                |
| `user-validation.service.ts`       | Demo allowlist and user shaping                                  |
| `guards/jwt-auth.guard.ts`         | JWT guard for `/api/auth/me`                                     |
| `filters/auth-exception.filter.ts` | Maps `AuthException` to HTTP responses                           |
| `auth.exception.ts`                | Typed auth error codes                                           |
| `dto/*.ts`                         | Validated request bodies for initiate, exchange, refresh, logout |

Endpoints:

- `POST /api/auth/initiate`
- `POST /api/auth/exchange`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/metrics`

Auth integrates `@enterprise-platform/security` for PKCE and `@enterprise-platform/observability` for metrics.

### Health (`modules/health/`)

- `GET /health` — probes analytics, reports, and users microservices via `MicroserviceService`.
- `GET /health/live` — returns `{ status: 'alive' }`.
- `GET /health/ready` — returns `{ status: 'ready' }`.

### Cross-Cutting Infrastructure

| Area                | Files                                                            | Notes                                                                           |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Middleware          | `common/middleware/*.middleware.ts`                              | Request ID propagation, validation, security headers                            |
| Decorators          | `common/decorators/*.decorator.ts`                               | Request metadata and microservice routing metadata                              |
| Guards              | `common/guards/auth.guard.ts`                                    | Legacy JWT/RBAC guard; active auth uses `modules/auth/guards/jwt-auth.guard.ts` |
| Interceptors        | `common/interceptors/logging.interceptor.ts`                     | Structured request logging                                                      |
| Filters             | `common/filters/exception.filter.ts`                             | Global exception handling                                                       |
| Microservices       | `modules/microservice/`, `config/microservice-routing.config.ts` | Health probes and routing scaffolding                                           |
| WebSocket           | `modules/websocket/`                                             | Socket.IO gateway scaffolding                                                   |
| Placeholder modules | `modules/users/`, `modules/analytics/`                           | Wired but no controllers yet                                                    |

### Configuration

- `config/configuration.ts` — central env-backed config factory.
- `config/database.config.ts` — TypeORM Postgres setup.
- `config/redis.config.ts` — Redis or in-memory cache.
- `config/microservice-routing.config.ts` — downstream service URLs.

Template: `services/bff/.env.example`.

### Tests (`services/bff/tests/`)

- `api.nest.test.ts` — health, PKCE initiate/exchange, and `/api/auth/me` integration tests.
- `pkce.test.js` — PKCE helper tests.
- `nest-test-app.ts` — test app bootstrap with memory cache and skipped database.

Run with `pnpm --filter bff test`.

### Legacy

Express + Apollo stack archived under `services/bff/legacy/`. Not used by npm scripts, Docker, or tests.

## Build And Test

```bash
pnpm --filter bff build
pnpm --filter bff test
```

Root orchestration:

```bash
pnpm build
pnpm test
```

## Current Gaps

- `UsersModule` and `AnalyticsModule` have no active controllers.
- GraphQL packages are present but not bootstrapped in `main.ts`.
- Observability is limited to in-memory auth metrics.
- Health checks report `degraded`/`unhealthy` when downstream microservices are not running locally.
- Database defaults in config differ from local infra compose credentials unless overridden.

## Recommended Next Work

1. Add CI coverage for BFF build and tests.
2. Align local env defaults with infra compose credentials.
3. Expand auth failure-case test coverage.
4. Decide whether GraphQL remains a goal or should be removed from dependencies and docs.
5. Wire production-grade structured logging and metrics beyond auth counters.

## Related Docs

- [BFF quick reference](QUICK_REFERENCE.md)
- [Integration guide](INTEGRATION_GUIDE.md)
- [Executive summary](EXECUTIVE_SUMMARY.md)
- [NestJS BFF quick reference](../NESTJS_BFF_QUICK_REFERENCE.md)
