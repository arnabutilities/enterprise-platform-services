# Security Setup

**Status**: Current implementation reference
**Package**: `@enterprise-platform/security`
**Last reviewed**: 2026-05-25

## Overview

The security layer lives in [security](../../security) and exposes reusable helpers for services such as the BFF. The current implementation focuses on JWT utilities, PKCE helpers, RBAC definitions, Express-compatible middleware, and validation helpers.

The BFF also has Nest-specific security wiring in [services/bff/src](../../services/bff/src), including Helmet, cookie parsing, CORS, request validation, auth filters, and JWT guards.

## Package Layout

```text
security/
|-- package.json
|-- src/
|   |-- index.ts
|   |-- auth/
|   |   |-- auth-errors.ts
|   |   |-- jwt.config.ts
|   |   |-- jwt.ts
|   |   `-- pkce.ts
|   |-- middleware/
|   |   |-- audit.middleware.ts
|   |   |-- auth.middleware.ts
|   |   |-- cors.middleware.ts
|   |   |-- csp.middleware.ts
|   |   |-- https.middleware.ts
|   |   `-- rateLimiter.ts
|   |-- rbac/
|   |   |-- permissions.ts
|   |   `-- roles.ts
|   `-- validation/
|       |-- auth.ts
|       |-- request.ts
|       `-- sanitize.ts
`-- tsconfig.json
```

## Build And Test

```bash
pnpm --filter @enterprise-platform/security build
pnpm --filter @enterprise-platform/security test
pnpm --filter @enterprise-platform/security lint
```

The current `test` and `lint` scripts are placeholders. `build` compiles the package with `tsc`.

## BFF Security Flow

The BFF bootstraps security in [services/bff/src/main.ts](../../services/bff/src/main.ts):

- `helmet()` for standard HTTP security headers
- `cookieParser()` for reading auth cookies
- `RequestIdMiddleware` for request correlation
- `RequestValidationMiddleware` for request checks
- `SecurityHeadersMiddleware` for additional headers
- global `ValidationPipe` with whitelist and `forbidNonWhitelisted`
- CORS with credentials enabled and origins from `CORS_ORIGIN`
- `AuthExceptionFilter` for auth error shaping

Authentication endpoints live under `/api/auth`. Protected user lookup uses `JwtAuthGuard`.

## JWT And PKCE

JWT and PKCE utilities are split between:

- shared utilities in `security/src/auth`
- BFF-specific auth orchestration in `services/bff/src/auth`

The BFF signs:

- access tokens with `JWT_SECRET`
- refresh tokens with `JWT_REFRESH_SECRET`

Refresh tokens are stored in cache with a `refresh:<token>` key and revoked on refresh/logout.

## RBAC

Roles and permissions live in:

- [security/src/rbac/roles.ts](../../security/src/rbac/roles.ts)
- [security/src/rbac/permissions.ts](../../security/src/rbac/permissions.ts)

Use the exported role and permission helpers for service-level authorization logic. The current BFF auth response includes user roles; route-level RBAC can be layered on top of `JwtAuthGuard` where needed.

## CORS

The BFF reads `CORS_ORIGIN` as a comma-separated list:

```bash
CORS_ORIGIN=http://localhost:3002,http://localhost:5001,http://localhost:5002,http://localhost:5003
```

Current local defaults include:

- `http://localhost:3000`
- `http://localhost:3002`
- `http://localhost:5003`

Add analytics and reports origins when those MFEs call the BFF directly from the browser.

## Important Environment Variables

| Variable                   | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `JWT_SECRET`               | Access-token signing secret                     |
| `JWT_REFRESH_SECRET`       | Refresh-token signing secret                    |
| `JWT_EXPIRY`               | Access-token lifetime, default `1h`             |
| `JWT_REFRESH_EXPIRY`       | Refresh-token lifetime, default `7d`            |
| `ACCESS_TOKEN_COOKIE_NAME` | Access-token cookie name, default `accessToken` |
| `CORS_ORIGIN`              | Comma-separated allowed browser origins         |
| `DEMO_ALLOWED_EMAILS`      | Local/demo login allowlist                      |
| `SKIP_DATABASE`            | Skip TypeORM initialization when `true`         |
| `USE_MEMORY_CACHE`         | Use in-memory cache when `true`                 |
| `RATE_LIMIT_WINDOW_MS`     | Rate limiter window for shared middleware       |
| `RATE_LIMIT_MAX_REQUESTS`  | Rate limiter max requests for shared middleware |

## Local Auth Demo

```powershell
$env:SKIP_DATABASE='true'
$env:USE_MEMORY_CACHE='true'
$env:DEMO_ALLOWED_EMAILS='test@example.com,admin@example.com'
pnpm --filter bff dev
```

Then initiate login:

```bash
curl -X POST http://localhost:4000/api/auth/initiate \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"provider\":\"local\"}"
```

## Production Checklist

- Replace development JWT fallback secrets.
- Configure strict `CORS_ORIGIN` values.
- Use HTTPS and secure cookies in production.
- Keep `SKIP_DATABASE` and `USE_MEMORY_CACHE` unset for durable auth state.
- Store secrets in the deployment secret manager, not source control.
- Add route-level RBAC checks for admin or privileged APIs.
- Review CSP needs for deployed remote MFE origins.
- Add automated tests around auth, RBAC, and validation changes.
