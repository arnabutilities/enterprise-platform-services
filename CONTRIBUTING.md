# Contributing

Thanks for taking the time to look at this project. This guide covers how to get
the monorepo running locally, how it is organized, and the conventions to follow
when reading or changing the code.

## Prerequisites

- Node.js 20.x
- pnpm (`npm install -g pnpm`)
- Docker Desktop (with Docker Compose)
- Git

## Getting Started

```bash
pnpm install        # install all workspace dependencies
pnpm dev            # start infra (Postgres + Redis) and all apps via Turbo
```

`pnpm dev` starts Postgres and Redis in Docker, waits for them to be healthy,
then runs every workspace `dev` task. To run the full Docker stack (infra + BFF
container) plus the frontend apps with a single command, use:

```bash
pnpm run start:all          # infra + BFF in Docker, frontends via Turbo
pnpm run start:all:down     # tear the stack back down
```

Local URLs once everything is up:

| Component     | URL                   |
| ------------- | --------------------- |
| Host shell    | http://localhost:3002 |
| Analytics MFE | http://localhost:5001 |
| Reports MFE   | http://localhost:5002 |
| Login MFE     | http://localhost:5003 |
| BFF           | http://localhost:4000 |
| Postgres      | `localhost:5432`      |
| Redis         | `localhost:6379`      |

See [docs/onboarding/setup.md](docs/onboarding/setup.md) for full setup and
troubleshooting steps.

## Repository Layout

```text
apps/           # Vite React host shell and microfrontends (host, analytics, reports, login)
packages/       # Shared libraries (UI, types, pub/sub, platform-auth)
services/bff/   # NestJS Backend-for-Frontend (REST auth, health, metrics)
contracts/      # Shared types, domain events, federation contracts, OpenAPI
security/       # JWT, PKCE, RBAC, middleware, validation helpers
runtime/        # MFE boundary, retry, circuit breaker, auth bridge
observability/  # Auth metrics
infra/          # Docker Compose, Kubernetes, Helm, Terraform assets
docs/           # Architecture, onboarding, and reference docs
```

## Working in a Single Package

Use pnpm filters to scope commands to one workspace:

```bash
pnpm --filter host-shell dev
pnpm --filter analytics-mfe dev
pnpm --filter reports-mfe dev
pnpm --filter login-mfe dev
pnpm --filter bff dev          # run `pnpm run infra:up` first
```

## Code Style

- TypeScript across the stack; prefer explicit types at module boundaries.
- Formatting is enforced with Prettier and `.editorconfig` (2-space indent,
  single quotes, semicolons, 100-char width, LF line endings).

```bash
pnpm format          # format the repo
pnpm format:check    # verify formatting without writing
```

- Keep comments focused on intent and non-obvious decisions rather than
  restating what the code does.
- Match the existing structure: shared types live in `@enterprise-platform/contracts`,
  microfrontends expose a single federated entry from `src/vite/App.tsx`.

## Validating Changes

```bash
pnpm build           # build all workspaces
pnpm test            # run all configured tests
pnpm lint            # run all configured lint tasks
pnpm --filter @enterprise-platform/contracts validate
```

## Commit and Pull Request Guidelines

- Keep commits focused and write messages that explain the "why".
- Do not commit secrets. `.env*` files are gitignored except `.env.example`.
- Make sure `pnpm build` and `pnpm format:check` pass before opening a PR.
- Describe what changed and how you verified it in the PR description.
