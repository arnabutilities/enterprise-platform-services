# Development Environment Setup Guide

This guide describes the current local setup for the Enterprise Platform monorepo. The repo is a pnpm workspace with Vite React microfrontends, a NestJS BFF, shared packages, and Docker-backed infrastructure.

## Prerequisites

Install these before running the platform locally:

- Node.js 20.x
- pnpm
- Docker Desktop with Docker Compose
- Git

If pnpm is not already installed:

```bash
npm install -g pnpm
```

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd "microfrontend-analytics-dashboard/microfrontend streaming/enterprise-platform"
```

The path contains a space, so keep it quoted in shell commands when needed.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start the local stack

```bash
pnpm dev
```

The root `dev` script does three things:

1. Starts local infrastructure with `pnpm run infra:up`.
2. Waits for infrastructure health with `pnpm run health`.
3. Starts workspace `dev` tasks through Turbo.

The infrastructure script uses `infra/docker/docker-compose.yml`, which starts:

- Postgres on `localhost:5432`
- Redis on `localhost:6379`

When the app processes are running, the default local URLs are:

| Component     | URL                   |
| ------------- | --------------------- |
| Host shell    | http://localhost:3002 |
| Analytics MFE | http://localhost:5001 |
| Reports MFE   | http://localhost:5002 |
| Login MFE     | http://localhost:5003 |
| BFF           | http://localhost:4000 |

The host shell reads remote URLs from Vite environment variables when provided, otherwise it falls back to the localhost ports above.

## Useful Commands

Run commands from the repository root unless noted otherwise.

```bash
# Install all workspace dependencies
pnpm install

# Start infra and all dev-capable workspaces
pnpm dev

# Start only Postgres and Redis
pnpm run infra:up

# Check Postgres and Redis health
pnpm run health

# Stop local infra
pnpm run dev:down

# Optional: infra + BFF in Docker
pnpm run stack:up
pnpm run stack:down

# Build all build-capable workspaces
pnpm build

# Run all configured tests
pnpm test

# Run all configured lint tasks
pnpm lint
```

## Running Individual Workspaces

Use pnpm filters when you only need one app or service:

```bash
# Host shell
pnpm --filter host-shell dev

# Analytics MFE
pnpm --filter analytics-mfe dev

# Reports MFE
pnpm --filter reports-mfe dev

# Login MFE
pnpm --filter login-mfe dev

# NestJS BFF
pnpm --filter bff dev
```

For the BFF, make sure infra is running first:

```bash
pnpm run infra:up
pnpm --filter bff dev
```

## Docker Compose Options

The main local development path is `pnpm dev`, which starts only the backing infra in Docker and runs apps on the host machine.

Optional Docker stacks live under `infra/docker/`:

```bash
# Infra + BFF container
pnpm run stack:up

# Infra + BFF + Redpanda
pnpm run stack:streaming:up

# Stop matching stacks
pnpm run stack:down
pnpm run stack:streaming:down
```

See [infra/docker/README.md](../../infra/docker/README.md) for the compose file layout.

## Project Structure

```text
enterprise-platform/
|-- apps/
|   |-- host-shell/       # Vite React shell application
|   |-- analytics-mfe/    # Analytics remote
|   |-- reports-mfe/      # Reports remote
|   `-- login-mfe/        # Login/auth remote
|-- packages/
|   |-- platform-auth/    # Auth session and BFF client helpers
|   |-- shared-pubsub/    # Event bus and pub/sub helpers
|   |-- shared-types/     # Shared TypeScript types
|   `-- shared-ui/        # Shared React UI components
|-- services/
|   `-- bff/              # NestJS backend for frontend
|-- contracts/            # API, event, and federation contracts
|-- infra/                # Docker Compose, Kubernetes, Helm, and Terraform assets
|-- observability/        # Logging, monitoring, tracing, and dashboards
|-- runtime/              # Runtime isolation, retry, auth bridge utilities
|-- security/             # Auth, RBAC, validation, and middleware utilities
|-- tools/                # Generators, validators, and tooling
`-- docs/                 # Platform documentation
```

## Environment Configuration

Common BFF environment variables:

| Variable              | Default                                                             | Purpose                                                |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `PORT`                | `4000`                                                              | BFF HTTP port                                          |
| `CORS_ORIGIN`         | `http://localhost:3000,http://localhost:3002,http://localhost:5003` | Allowed browser origins                                |
| `DB_HOST`             | `localhost`                                                         | Postgres host                                          |
| `DB_PORT`             | `5432`                                                              | Postgres port                                          |
| `DB_USER`             | `postgres`                                                          | Postgres user                                          |
| `DB_PASSWORD`         | `password`                                                          | Postgres password                                      |
| `DB_NAME`             | `bff_db`                                                            | Postgres database                                      |
| `REDIS_HOST`          | `localhost`                                                         | Redis host                                             |
| `REDIS_PORT`          | `6379`                                                              | Redis port                                             |
| `USE_MEMORY_CACHE`    | unset                                                               | Set to `true` to avoid Redis-backed cache during demos |
| `SKIP_DATABASE`       | unset                                                               | Set to `true` to bypass database initialization        |
| `JWT_SECRET`          | development fallback                                                | Access-token signing secret                            |
| `JWT_REFRESH_SECRET`  | development fallback                                                | Refresh-token signing secret                           |
| `DEMO_ALLOWED_EMAILS` | `test@example.com,admin@example.com`                                | Demo login allowlist                                   |

Common host-shell MFE URL overrides:

| Variable             | Default                 |
| -------------------- | ----------------------- |
| `VITE_ANALYTICS_URL` | `http://localhost:5001` |
| `VITE_REPORTS_URL`   | `http://localhost:5002` |
| `VITE_LOGIN_URL`     | `http://localhost:5003` |

## Troubleshooting

### Docker is not running

`pnpm dev` starts infra through Docker Compose. Start Docker Desktop, then run:

```bash
pnpm run infra:up
pnpm run health
```

### Infra containers are stale

Restart the local infra:

```bash
pnpm run dev:down
pnpm run infra:up
pnpm run health
```

### Port conflicts

Check for processes using these ports:

- `3002` for the host shell
- `4000` for the BFF
- `5001` for analytics
- `5002` for reports
- `5003` for login
- `5432` for Postgres
- `6379` for Redis

### BFF cannot connect to Postgres or Redis

Run the health check first:

```bash
pnpm run health
```

If you are running the BFF for a lightweight demo, you can set `SKIP_DATABASE=true` and `USE_MEMORY_CACHE=true`.

### Remote MFEs do not load in the host shell

Make sure the MFE dev servers are running and that the host-shell URL overrides point at the right ports:

```bash
pnpm --filter analytics-mfe dev
pnpm --filter reports-mfe dev
pnpm --filter login-mfe dev
pnpm --filter host-shell dev
```

## Next Steps

After the local stack is running, these docs are good starting points:

- [Module Federation Implementation](../frontend/MODULE_FEDERATION_IMPLEMENTATION.md)
- [Migration to Vite React](../frontend/MIGRATION_TO_VITE_REACT.md)
- [NestJS BFF Quick Reference](../backend/NESTJS_BFF_QUICK_REFERENCE.md)
- [Security Setup](../security/SECURITY_SETUP.md)
- [Observability Setup](../observability/OBSERVABILITY_SETUP.md)
- [Environment Configuration](../configuration/ENVIRONMENT_CONFIGURATION.md)
