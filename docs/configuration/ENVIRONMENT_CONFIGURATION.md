# Environment Configuration

**Status**: Current implementation reference
**Last reviewed**: 2026-05-25

## Overview

The monorepo uses environment variables in three main places:

- Vite frontend apps, read through `import.meta.env`
- the NestJS BFF, read through `@nestjs/config`
- Docker-backed local infrastructure for Postgres and Redis

Use `VITE_*` variables for browser-exposed frontend settings. Use unprefixed variables for server-side BFF and infrastructure settings.

## Local Defaults

| Component     | Default               |
| ------------- | --------------------- |
| Host shell    | http://localhost:3002 |
| Analytics MFE | http://localhost:5001 |
| Reports MFE   | http://localhost:5002 |
| Login MFE     | http://localhost:5003 |
| BFF           | http://localhost:4000 |
| Postgres      | `localhost:5432`      |
| Redis         | `localhost:6379`      |

## Frontend Variables

The host registry reads:

| Variable             | Default                 | Purpose                   |
| -------------------- | ----------------------- | ------------------------- |
| `VITE_ANALYTICS_URL` | `http://localhost:5001` | Analytics remote root URL |
| `VITE_REPORTS_URL`   | `http://localhost:5002` | Reports remote root URL   |
| `VITE_LOGIN_URL`     | `http://localhost:5003` | Login remote root URL     |

The login container reads:

| Variable                       | Default                 | Purpose                             |
| ------------------------------ | ----------------------- | ----------------------------------- |
| `VITE_BFF_URL`                 | `http://localhost:4000` | BFF base URL passed to login remote |
| `VITE_ALLOWED_MESSAGE_ORIGINS` | `http://localhost:5003` | Allowed postMessage origins         |

The host environment loader in [apps/host-shell/src/config/env.ts](../../apps/host-shell/src/config/env.ts) also supports:

| Variable   | Purpose                                   |
| ---------- | ----------------------------------------- |
| `NODE_ENV` | `development`, `staging`, or `production` |

Do not add new `NEXT_PUBLIC_*` variables. Those names belong to the retired Next.js stack and are intentionally absent from the committed host `.env.example`.

## BFF Variables

The BFF config lives in [services/bff/src/config/configuration.ts](../../services/bff/src/config/configuration.ts).

| Variable                   | Default                                                             | Purpose                            |
| -------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| `NODE_ENV`                 | `development`                                                       | Runtime environment                |
| `PORT`                     | `4000`                                                              | BFF HTTP port                      |
| `CORS_ORIGIN`              | `http://localhost:3000,http://localhost:3002,http://localhost:5003` | Comma-separated allowed origins    |
| `SKIP_DATABASE`            | unset                                                               | Skip TypeORM setup when `true`     |
| `DB_HOST`                  | `localhost`                                                         | Postgres host                      |
| `DB_PORT`                  | `5432`                                                              | Postgres port                      |
| `DB_USER`                  | `postgres`                                                          | Postgres username                  |
| `DB_PASSWORD`              | `password`                                                          | Postgres password                  |
| `DB_NAME`                  | `bff_db`                                                            | Postgres database                  |
| `DB_LOGGING`               | unset                                                               | Enable TypeORM logging when `true` |
| `REDIS_HOST`               | `localhost`                                                         | Redis host                         |
| `REDIS_PORT`               | `6379`                                                              | Redis port                         |
| `REDIS_PASSWORD`           | unset                                                               | Redis password                     |
| `USE_MEMORY_CACHE`         | unset                                                               | Use memory cache when `true`       |
| `JWT_SECRET`               | development fallback                                                | Access-token secret                |
| `JWT_REFRESH_SECRET`       | development fallback                                                | Refresh-token secret               |
| `JWT_EXPIRY`               | `1h`                                                                | Access-token expiry                |
| `JWT_REFRESH_EXPIRY`       | `7d`                                                                | Refresh-token expiry               |
| `DEMO_ALLOWED_EMAILS`      | `test@example.com,admin@example.com`                                | Local/demo sign-in allowlist       |
| `PKCE_SESSION_TTL_SECONDS` | `600`                                                               | PKCE session TTL                   |
| `ACCESS_TOKEN_COOKIE_NAME` | `accessToken`                                                       | Auth cookie name                   |
| `OAUTH_CLIENT_ID`          | unset                                                               | OAuth client ID                    |
| `OAUTH_CLIENT_SECRET`      | unset                                                               | OAuth client secret                |
| `OAUTH_REDIRECT_URI`       | `http://localhost:3000/auth/callback`                               | OAuth redirect URI                 |
| `OAUTH_AUTH_URL`           | unset                                                               | OAuth authorization URL            |
| `OAUTH_TOKEN_URL`          | unset                                                               | OAuth token URL                    |
| `ANALYTICS_SERVICE_URL`    | `http://localhost:3001`                                             | Analytics service route target     |
| `REPORTS_SERVICE_URL`      | `http://localhost:3003`                                             | Reports service route target       |
| `USERS_SERVICE_URL`        | `http://localhost:3004`                                             | Users service route target         |
| `LOG_LEVEL`                | `info`                                                              | Logging level                      |
| `LOG_FORMAT`               | `json`                                                              | Logging format                     |

## Infra Variables

Local infrastructure is defined in [infra/docker/docker-compose.yml](../../infra/docker/docker-compose.yml). Optional overlays for BFF and Redpanda are documented in [infra/docker/README.md](../../infra/docker/README.md).

Current local infra defaults:

```bash
POSTGRES_USER=bff_user
POSTGRES_PASSWORD=bff_secure_password_change_me
POSTGRES_DB=bff_db
```

Because the BFF defaults to `DB_USER=postgres` and `DB_PASSWORD=password`, set BFF database variables when using the provided infra without `SKIP_DATABASE=true`:

```powershell
$env:DB_USER='bff_user'
$env:DB_PASSWORD='bff_secure_password_change_me'
$env:DB_NAME='bff_db'
```

## Recommended Local `.env.development`

The BFF loads `.env.<NODE_ENV>` from the BFF process working directory. If running `pnpm --filter bff dev`, create `services/bff/.env.development`:

```bash
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3002,http://localhost:5001,http://localhost:5002,http://localhost:5003

DB_HOST=localhost
DB_PORT=5432
DB_USER=bff_user
DB_PASSWORD=bff_secure_password_change_me
DB_NAME=bff_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=local-dev-access-secret-change-me
JWT_REFRESH_SECRET=local-dev-refresh-secret-change-me
DEMO_ALLOWED_EMAILS=test@example.com,admin@example.com
```

For auth-only local work:

```bash
SKIP_DATABASE=true
USE_MEMORY_CACHE=true
DEMO_ALLOWED_EMAILS=test@example.com,admin@example.com
```

## Recommended Host `.env.local`

Create `apps/host-shell/.env.local` when you need to override defaults:

```bash
VITE_ANALYTICS_URL=http://localhost:5001
VITE_REPORTS_URL=http://localhost:5002
VITE_LOGIN_URL=http://localhost:5003
VITE_BFF_URL=http://localhost:4000
VITE_ALLOWED_MESSAGE_ORIGINS=http://localhost:5003
```

The committed template is [apps/host-shell/.env.example](../../apps/host-shell/.env.example). It is safe to commit because it contains only local placeholder values.

## Secrets Rules

- Do not commit `.env`, `.env.local`, `.env.*.local`, private keys, or certificates.
- Keep `.env.example` files free of real credentials and aligned with current `VITE_*` or BFF variables.
- Keep production JWT and OAuth secrets in the deployment secret manager.
- Use separate secrets for access and refresh tokens.
- Keep local demo secrets obviously non-production.

## Validation Checklist

```bash
pnpm run infra:up
pnpm run health
pnpm --filter bff dev
pnpm --filter host-shell dev
```

Then verify:

- `http://localhost:4000/health`
- `http://localhost:4000/api/auth/metrics`
- `http://localhost:3002`
- `http://localhost:5001/remoteEntry.js`
- `http://localhost:5002/remoteEntry.js`
- `http://localhost:5003/remoteEntry.js`
