# CI/CD Pipelines

**Status**: Current-state reference and recommended baseline
**Last reviewed**: 2026-05-25

## Current State

There are no GitHub Actions workflow files in this workspace at the time of review. The repository does have enough package scripts to support a basic CI pipeline:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm lint
pnpm format:check
pnpm --filter @enterprise-platform/contracts validate
```

The root scripts are defined in [package.json](../../package.json) and orchestrated by Turbo.

## Current Build/Test Surface

Root scripts:

| Script                | Command                                          |
| --------------------- | ------------------------------------------------ |
| `dev`                 | start infra, health check, then `turbo run dev`  |
| `build`               | `turbo run build`                                |
| `lint`                | `turbo run lint`                                 |
| `test`                | `turbo run test`                                 |
| `format`              | format Markdown, TypeScript, JSON, CSS, YAML     |
| `format:check`        | verify Prettier formatting without writing       |
| `infra:up`            | start Postgres and Redis through infra package   |
| `infra:health`        | health-check Postgres and Redis                  |
| `stack:up`            | start infra plus BFF dev container               |
| `stack:down`          | stop infra plus BFF dev container                |
| `stack:streaming:up`  | start infra, BFF, and Redpanda                   |
| `stack:prod:up`       | start infra plus production-style BFF            |
| `start:all`           | start infra + BFF in Docker, then frontend apps  |
| `start:all:streaming` | start infra + BFF + Redpanda, then frontend apps |
| `start:all:down`      | stop the Docker stack used by `start:all`        |
| `dev:down`            | stop local infra                                 |

Useful package checks:

```bash
pnpm --filter host-shell build
pnpm --filter analytics-mfe build
pnpm --filter reports-mfe build
pnpm --filter login-mfe build
pnpm --filter bff build
pnpm --filter @enterprise-platform/contracts validate
```

## Recommended PR Workflow

Create `.github/workflows/ci.yml` when CI is added:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @enterprise-platform/contracts validate
      - run: pnpm build
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm format:check
```

Notes:

- Add `continue-on-error` only for known placeholder scripts if the team intentionally allows them.
- The current repo has some packages where `lint` or `test` are placeholders.
- Run `format:check` after `pnpm install` so style issues fail fast without rewriting files in CI.
- If BFF integration tests require Redis/Postgres, add service containers or run tests with `SKIP_DATABASE=true` and `USE_MEMORY_CACHE=true` where appropriate.

## Recommended BFF Test Job

The BFF can be tested separately with local service containers:

```yaml
bff:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_USER: bff_user
        POSTGRES_PASSWORD: bff_secure_password_change_me
        POSTGRES_DB: bff_db
      ports:
        - 5432:5432
      options: >-
        --health-cmd "pg_isready -U bff_user -d bff_db"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
    redis:
      image: redis:7
      ports:
        - 6379:6379
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 9
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm --filter bff test
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_USER: bff_user
        DB_PASSWORD: bff_secure_password_change_me
        DB_NAME: bff_db
        REDIS_HOST: localhost
        REDIS_PORT: 6379
        JWT_SECRET: ci-access-secret
        JWT_REFRESH_SECRET: ci-refresh-secret
```

## Docker Builds

Current Docker-related files:

- app Dockerfiles under `apps/*/Dockerfile` and `Dockerfile.dev`
- BFF Dockerfiles under `services/bff`
- local infra compose at `infra/docker/docker-compose.yml`
- optional stack overlays at `infra/docker/docker-compose.bff.yml`, `docker-compose.bff.prod.yml`, and `docker-compose.streaming.yml`

Before adding image publishing workflows, verify each Dockerfile against the current pnpm workspace layout. Some older Docker examples assume standalone app installs and may need workspace-aware build contexts.

## Deployment

Kubernetes, Helm, and Terraform directories exist under [infra](../../infra), but most deployment assets are placeholders or base examples. Treat deployment workflows as future work until target environments, registry names, secrets, and cluster layout are confirmed.

Recommended deployment gates:

- contracts validate
- all affected packages build
- BFF tests pass
- remote entries are reachable in the target environment
- `/health` passes on the BFF
- smoke test host shell routes after deployment

## Security Checks

Recommended additions:

- `pnpm audit --audit-level=moderate`
- secret scanning
- CodeQL JavaScript/TypeScript analysis
- container scanning for published images

Do not add failing security gates until the team has triaged current dependency and image findings.

## Immediate Next Steps

1. Add a minimal `ci.yml` with install, contracts validate, build, test, and lint.
2. Add `pnpm format:check` to CI so public contributors get consistent formatting feedback.
3. Split BFF integration tests into a separate job if service containers are required.
4. Add image build workflows only after Dockerfiles are verified.
5. Add deployment workflows only after the target registry and cluster conventions are known.
6. Document any intentionally placeholder package scripts so CI behavior is predictable.
