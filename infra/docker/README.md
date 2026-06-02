# Docker Compose Layout

All compose files for this monorepo live in this directory.

| File                                                           | Purpose                              |
| -------------------------------------------------------------- | ------------------------------------ |
| [docker-compose.yml](./docker-compose.yml)                     | Base local infra: Postgres and Redis |
| [docker-compose.bff.yml](./docker-compose.bff.yml)             | BFF dev container overlay            |
| [docker-compose.bff.prod.yml](./docker-compose.bff.prod.yml)   | Production-style BFF overlay         |
| [docker-compose.streaming.yml](./docker-compose.streaming.yml) | Optional Redpanda overlay            |

## Common Commands

From the monorepo root:

```bash
# Postgres + Redis only (default local path)
pnpm run infra:up
pnpm run infra:health
pnpm run infra:down

# Infra + BFF in Docker
pnpm run stack:up
pnpm run stack:down

# Infra + BFF + Redpanda
pnpm run stack:streaming:up
pnpm run stack:streaming:down

# Infra + production-style BFF
pnpm run stack:prod:up
pnpm run stack:prod:down
```

Equivalent manual commands:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.bff.yml up --build -d
docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.bff.yml -f infra/docker/docker-compose.streaming.yml up --build -d
```

## Notes

- The main local development path is `pnpm dev`, which starts infra in Docker and runs frontend apps on the host.
- Frontend MFE containers are not defined here; use `pnpm --filter <app> dev` for Vite dev servers.
- Postgres credentials are `bff_user` / `bff_secure_password_change_me` / `bff_db`.
