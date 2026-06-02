# Implementation Roadmap

**Status**: Current-state roadmap
**Last reviewed**: 2026-05-25

## Current Platform Snapshot

The repository has moved beyond the original implementation-plan phase. The current platform already includes:

- pnpm workspace and Turbo task orchestration
- Vite React host shell and MFEs
- Vite Module Federation with analytics, reports, and login remotes
- NestJS BFF with REST auth, PKCE, JWT, health endpoints, and auth metrics
- contracts package with types, events, federation contracts, and OpenAPI YAML
- security package with JWT, PKCE, RBAC, middleware, and validation helpers
- observability package with auth metrics
- runtime package with MFE boundary, retry, circuit breaker, and auth postMessage helpers
- local Docker infra for Postgres and Redis
- public-repo hygiene files (`LICENSE`, `CONTRIBUTING.md`, `.editorconfig`, Prettier config, hardened `.gitignore`)

## What Is Done

| Area                | Current state                                             |
| ------------------- | --------------------------------------------------------- |
| Workspace structure | Present                                                   |
| Vite migration      | Completed for active apps                                 |
| Module Federation   | Active through `@module-federation/vite`                  |
| Login MFE           | Present and federated                                     |
| BFF                 | NestJS service on port `4000`                             |
| Auth flow           | PKCE/JWT REST flow implemented                            |
| Contracts package   | Present with OpenAPI, types, events, federation contracts |
| Security package    | Present and buildable                                     |
| Runtime package     | Present and buildable                                     |
| Local infra         | Postgres and Redis compose managed by `pnpm run infra:*`  |
| Migration cleanup   | Old `src/pages` and `src/deleted-app` files removed       |
| Public repo hygiene | License, contributing guide, formatting config present    |
| Observability       | Auth metrics only                                         |

## Near-Term Priorities

### 1. Make CI Real

There are no workflow files in the workspace. Add a minimal CI workflow that runs:

```bash
pnpm install --frozen-lockfile
pnpm --filter @enterprise-platform/contracts validate
pnpm build
pnpm test
pnpm lint
pnpm format:check
```

Then split BFF integration tests and image builds into dedicated jobs as needed.

### 2. Keep Migration Artifacts Out

The old Next.js `src/pages` and `src/deleted-app` leftovers have been removed from active apps. Keep future changes on the Vite path (`index.html`, `src/main.tsx`, `src/vite/App.tsx`, and app-level `vite.config.ts`) and avoid reintroducing Next.js/Webpack examples into active app code.

### 3. Align Docker Compose With Vite Ports

The main local path is `pnpm dev`. `pnpm run start:all` starts Postgres, Redis, and the BFF in Docker, then runs the frontend apps on the host. Optional Docker stacks under `infra/docker/` start infra and the BFF (and optionally Redpanda). Frontend MFE containers are not defined in compose; run Vite dev servers on the host for ports `3002`, `5001`, `5002`, and `5003`.

### 4. Harden Environment Configuration

Use the current environment reference in [ENVIRONMENT_CONFIGURATION.md](../configuration/ENVIRONMENT_CONFIGURATION.md). In particular:

- use `VITE_*` for frontend browser config
- use BFF `PORT=4000`
- align BFF DB credentials with `infra/docker/docker-compose.yml`
- avoid production fallback JWT secrets

### 5. Expand Observability Deliberately

Current observability is auth metrics only. If production monitoring is needed, add:

- Prometheus-compatible metrics
- BFF `/metrics`
- structured request logging
- OpenTelemetry initialization
- dashboards based on actual metric names

### 6. Strengthen Contract Enforcement

The contracts package exists, but generated clients and CI enforcement are not active. Next steps:

- keep OpenAPI specs aligned with implemented BFF routes
- wire `pnpm --filter @enterprise-platform/contracts validate` into CI
- replace the placeholder `generate:types` script if generated clients are required

## Suggested Work Plan

| Phase | Focus                   | Outcome                                                               |
| ----- | ----------------------- | --------------------------------------------------------------------- |
| 1     | CI baseline             | Pull requests run install, build, test, lint, contract validation     |
| 2     | Local dev reliability   | `pnpm dev` and focused package dev commands documented and repeatable |
| 3     | Migration hygiene       | stale Next.js artifacts stay removed or clearly marked historical     |
| 4     | Docker alignment        | compose files match Vite/BFF ports or are clearly scoped              |
| 5     | Contract enforcement    | contracts validate in CI, docs match implemented endpoints            |
| 6     | Observability expansion | production metrics/logging added only where needed                    |
| 7     | Deployment definition   | registry, Kubernetes, Helm/Terraform choices finalized                |

## Current Validation Commands

```bash
pnpm install
pnpm run infra:up
pnpm run health
pnpm build
pnpm test
pnpm lint
pnpm format:check
pnpm --filter @enterprise-platform/contracts validate
```

Focused builds:

```bash
pnpm --filter host-shell build
pnpm --filter analytics-mfe build
pnpm --filter reports-mfe build
pnpm --filter login-mfe build
pnpm --filter bff build
pnpm --filter @enterprise-platform/security build
pnpm --filter @enterprise-platform/runtime build
pnpm --filter @enterprise-platform/observability build
```

## Risks To Track

| Risk                                             | Why it matters                       | Mitigation                                              |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------------------- |
| Placeholder docs or scripts treated as complete  | Causes false confidence              | Mark historical docs and verify scripts before CI gates |
| Compose port drift                               | Confusing onboarding and smoke tests | Align compose with Vite ports or document scope         |
| Contracts drift from implementation              | Runtime API mismatches               | Validate contracts and add endpoint tests               |
| Observability expectations exceed implementation | Missing production signals           | Add metrics/logging incrementally                       |
| Hardcoded development secrets                    | Security risk                        | Require env-provided production secrets                 |

## Recommended Reading Order

1. [onboarding/setup.md](../onboarding/setup.md)
2. [MODULE_FEDERATION_IMPLEMENTATION.md](../frontend/MODULE_FEDERATION_IMPLEMENTATION.md)
3. [MIGRATION_TO_VITE_REACT.md](../frontend/MIGRATION_TO_VITE_REACT.md)
4. [NESTJS_BFF_QUICK_REFERENCE.md](../backend/NESTJS_BFF_QUICK_REFERENCE.md)
5. [ENVIRONMENT_CONFIGURATION.md](../configuration/ENVIRONMENT_CONFIGURATION.md)
6. [API_CONTRACTS_LAYER.md](../contracts/API_CONTRACTS_LAYER.md)
7. [SECURITY_SETUP.md](../security/SECURITY_SETUP.md)
8. [OBSERVABILITY_SETUP.md](../observability/OBSERVABILITY_SETUP.md)
9. [CICD_PIPELINES.md](../delivery/CICD_PIPELINES.md)
