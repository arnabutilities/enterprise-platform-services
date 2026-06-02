# BFF Executive Summary

**Status**: Current implementation summary  
**Service**: `services/bff`  
**Last reviewed**: 2026-05-25

## Summary

The Backend for Frontend (BFF) is a NestJS service that provides the backend entry point for authentication, health checks, auth metrics, and future service aggregation. It runs on port `4000` by default.

The active implementation is REST-first. PKCE auth is implemented under `/api/auth`. GraphQL-related dependencies and older GraphQL-oriented documentation exist, but GraphQL is not bootstrapped in the current entry point.

## Current Capabilities

- PKCE session initiation and exchange (`local` and `keycloak` providers in DTOs)
- Demo user allowlist via `DEMO_ALLOWED_EMAILS`
- JWT access and refresh token signing and rotation
- Cache-backed PKCE sessions and refresh token storage/revocation
- HTTP-only access-token cookie on successful exchange
- Current-user endpoint guarded by JWT (`GET /api/auth/me`)
- In-memory auth metrics (`GET /api/auth/metrics`)
- Health, liveness, and readiness endpoints
- Request ID, request validation, and security headers middleware
- Helmet, cookie parsing, and CORS setup
- Optional TypeORM Postgres initialization
- Redis-backed or in-memory cache modes
- WebSocket and microservice routing scaffolding for future features

## Runtime Modes

Full local mode:

```bash
pnpm run infra:up
pnpm run health
pnpm --filter bff dev
```

Auth-only demo mode:

```powershell
$env:SKIP_DATABASE='true'
$env:USE_MEMORY_CACHE='true'
$env:DEMO_ALLOWED_EMAILS='test@example.com,admin@example.com'
pnpm --filter bff dev
```

## Key Endpoints

| Method | Endpoint             |
| ------ | -------------------- |
| `GET`  | `/health`            |
| `GET`  | `/health/live`       |
| `GET`  | `/health/ready`      |
| `POST` | `/api/auth/initiate` |
| `POST` | `/api/auth/exchange` |
| `POST` | `/api/auth/refresh`  |
| `POST` | `/api/auth/logout`   |
| `GET`  | `/api/auth/me`       |
| `GET`  | `/api/auth/metrics`  |

## Architecture Snapshot

```text
Login MFE / Host shell
        |
        |  REST (PKCE auth, health)
        v
   NestJS BFF (:4000)
        |
        +-- Cache (Redis or memory) — PKCE sessions, refresh tokens
        +-- Optional Postgres (TypeORM)
        +-- Health probes -> analytics / reports / users URLs
```

Shared workspace packages: `@enterprise-platform/contracts`, `@enterprise-platform/security`, `@enterprise-platform/observability`.

## Follow-Ups

- Expand route-level authorization beyond JWT user validation.
- Clarify GraphQL roadmap vs. removing unused GraphQL dependencies.
- Add production deployment workflows and observability beyond auth metrics.
- Review Docker and compose files before production use.
- Implement controllers in placeholder modules (users, analytics) when product scope is defined.

## Documentation Map

| Document                                                          | Purpose                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| [services/bff/README.md](../../../services/bff/README.md)         | Service entry README (run locally, scripts, Docker)    |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md)                          | Commands, endpoints, env vars, troubleshooting         |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)                      | Frontend wiring, infra, verification, production notes |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)            | Source inventory and implementation status             |
| [NESTJS_BFF_QUICK_REFERENCE.md](../NESTJS_BFF_QUICK_REFERENCE.md) | Detailed auth flow and source map                      |
