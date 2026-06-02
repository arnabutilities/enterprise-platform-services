# Infrastructure Setup Summary

**Status**: Current implementation reference
**Last reviewed**: 2026-05-25

## Overview

The active local infrastructure is intentionally small:

- Postgres for BFF persistence
- Redis for cache/session-like data

It is managed by the `@enterprise-platform/infra` workspace package under [infra](../../infra).

## Current Files

```text
infra/
|-- package.json
|-- README.md
|-- docker/
|   |-- README.md
|   |-- docker-compose.yml
|   |-- docker-compose.bff.yml
|   |-- docker-compose.bff.prod.yml
|   |-- docker-compose.streaming.yml
|   |-- postgres/
|   |   |-- Dockerfile
|   |   |-- postgresql.conf
|   |   `-- pg_hba.conf
|   `-- redis/
|       |-- Dockerfile
|       `-- redis.conf
|-- scripts/
|   |-- start-infra.js
|   `-- check-infra-health.js
|-- k8s/
|   `-- base/deployment.yaml
|-- helm/
`-- terraform/
```

Helm and Terraform directories are placeholders for future deployment work.

## Commands

Run from the repository root:

```bash
pnpm run infra:up
pnpm run infra:health
pnpm run infra:down
pnpm run stack:up
pnpm run stack:down
pnpm run stack:streaming:up
pnpm run stack:streaming:down
pnpm run start:all
pnpm run start:all:streaming
pnpm run start:all:down
```

Aliases:

```bash
pnpm run health
pnpm run dev:down
```

The root `pnpm dev` command starts infra, checks health, then runs workspace dev tasks through Turbo. The root `pnpm run start:all` command starts infra plus the BFF container, checks health, then runs the frontend app dev servers through Turbo.

Compose file reference: [infra/docker/README.md](../../infra/docker/README.md).

## Local Docker Compose

The active infra compose file is [infra/docker/docker-compose.yml](../../infra/docker/docker-compose.yml).

Services:

| Service    | Port   | Notes                                         |
| ---------- | ------ | --------------------------------------------- |
| `postgres` | `5432` | built from `infra/docker/postgres/Dockerfile` |
| `redis`    | `6379` | built from `infra/docker/redis/Dockerfile`    |

Postgres defaults:

```bash
POSTGRES_USER=bff_user
POSTGRES_PASSWORD=bff_secure_password_change_me
POSTGRES_DB=bff_db
```

Redis has no password configured for local development.

## Health Checks

The infra health script checks:

- Postgres with `pg_isready -U bff_user -d bff_db`
- Redis with `redis-cli ping`

Run:

```bash
pnpm run infra:health
```

## BFF Configuration Alignment

The BFF defaults do not exactly match the local Postgres compose credentials. When using the provided infra with database enabled, configure:

```powershell
$env:DB_HOST='localhost'
$env:DB_PORT='5432'
$env:DB_USER='bff_user'
$env:DB_PASSWORD='bff_secure_password_change_me'
$env:DB_NAME='bff_db'
$env:REDIS_HOST='localhost'
$env:REDIS_PORT='6379'
```

For auth-only local work, skip external persistence:

```powershell
$env:SKIP_DATABASE='true'
$env:USE_MEMORY_CACHE='true'
pnpm --filter bff dev
```

## Optional Docker Stacks

Additional compose overlays under [infra/docker/](../../infra/docker/) start the BFF and optional Redpanda on top of the base infra:

| Command                        | Starts                                              |
| ------------------------------ | --------------------------------------------------- |
| `pnpm run stack:up`            | Postgres + Redis + BFF (dev)                        |
| `pnpm run stack:streaming:up`  | Postgres + Redis + BFF + Redpanda                   |
| `pnpm run start:all`           | `stack:up` plus frontend Vite dev servers           |
| `pnpm run start:all:streaming` | `stack:streaming:up` plus frontend Vite dev servers |

Frontend MFE containers are not defined in compose. Use `pnpm dev`, `pnpm run start:all`, or individual `pnpm --filter <app> dev` commands for Vite dev servers on ports `3002`, `5001`, `5002`, and `5003`.

## Kubernetes, Helm, Terraform

Current state:

- `infra/k8s/base/deployment.yaml` exists as a base manifest.
- Helm chart directories exist but are placeholders.
- Terraform environment/module directories exist but are placeholders.

Do not assume production deployment is fully defined until these areas are completed and reviewed.

## Troubleshooting

### Docker is not running

Start Docker Desktop, then run:

```bash
pnpm run infra:up
pnpm run infra:health
```

### Postgres credentials fail

Confirm the BFF `DB_*` variables match the compose values above.

### Redis connection fails

Check the container and ping manually:

```bash
docker compose -f infra/docker/docker-compose.yml ps
docker compose -f infra/docker/docker-compose.yml exec redis redis-cli ping
```

### Reset local data

Stop containers and remove volumes when you intentionally want a clean database/cache:

```bash
docker compose -f infra/docker/docker-compose.yml down -v
pnpm run infra:up
```
