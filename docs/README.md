# Enterprise Platform Documentation

**Status**: Current documentation index
**Last reviewed**: 2026-05-25

This directory contains setup, architecture, migration, security, observability, infrastructure, and BFF documentation for the Enterprise Platform monorepo.

The current platform is a pnpm workspace with:

- Vite React microfrontends
- Vite Module Federation through `@module-federation/vite`
- a NestJS BFF on port `4000`
- Docker-backed local Postgres and Redis infrastructure
- shared workspace packages for contracts, UI, auth, pub/sub, security, runtime, and observability

## Start Here

| Need                                            | Document                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Set up the repo locally                         | [onboarding/setup.md](onboarding/setup.md)                                                   |
| Understand active Module Federation wiring      | [frontend/MODULE_FEDERATION_IMPLEMENTATION.md](frontend/MODULE_FEDERATION_IMPLEMENTATION.md) |
| Understand the completed Vite migration         | [frontend/MIGRATION_TO_VITE_REACT.md](frontend/MIGRATION_TO_VITE_REACT.md)                   |
| Work with the NestJS BFF                        | [backend/NESTJS_BFF_QUICK_REFERENCE.md](backend/NESTJS_BFF_QUICK_REFERENCE.md)               |
| Configure local and deployed environments       | [configuration/ENVIRONMENT_CONFIGURATION.md](configuration/ENVIRONMENT_CONFIGURATION.md)     |
| Review security utilities and BFF security flow | [security/SECURITY_SETUP.md](security/SECURITY_SETUP.md)                                     |
| Review current auth metrics observability       | [observability/OBSERVABILITY_SETUP.md](observability/OBSERVABILITY_SETUP.md)                 |

## Current-State Guides

These documents were reviewed against the current codebase and should be treated as the main references:

- [onboarding/setup.md](onboarding/setup.md) - local prerequisites, install, dev commands, ports, and troubleshooting
- [frontend/MODULE_FEDERATION_IMPLEMENTATION.md](frontend/MODULE_FEDERATION_IMPLEMENTATION.md) - current Vite Module Federation setup, remotes, loader, and validation
- [frontend/MIGRATION_TO_VITE_REACT.md](frontend/MIGRATION_TO_VITE_REACT.md) - current Vite state and remaining cleanup notes
- [backend/NESTJS_BFF_QUICK_REFERENCE.md](backend/NESTJS_BFF_QUICK_REFERENCE.md) - current REST auth, health, metrics, and BFF env reference
- [backend/bff/QUICK_REFERENCE.md](backend/bff/QUICK_REFERENCE.md) - BFF commands, endpoints, and troubleshooting
- [backend/bff/INTEGRATION_GUIDE.md](backend/bff/INTEGRATION_GUIDE.md) - frontend wiring, infra, and deployment checklist
- [security/SECURITY_SETUP.md](security/SECURITY_SETUP.md) - current `@enterprise-platform/security` package and BFF security flow
- [observability/OBSERVABILITY_SETUP.md](observability/OBSERVABILITY_SETUP.md) - current `@enterprise-platform/observability` auth metrics implementation
- [configuration/ENVIRONMENT_CONFIGURATION.md](configuration/ENVIRONMENT_CONFIGURATION.md) - current frontend, BFF, and infra environment variables

## Topic Map

### Frontend And Microfrontends

- [frontend/MODULE_FEDERATION_IMPLEMENTATION.md](frontend/MODULE_FEDERATION_IMPLEMENTATION.md)
- [frontend/MIGRATION_TO_VITE_REACT.md](frontend/MIGRATION_TO_VITE_REACT.md)
- [frontend/VITE_MIGRATION_SUMMARY.md](frontend/VITE_MIGRATION_SUMMARY.md)
- [frontend/NEXTJS_REMOVAL_GUIDE.md](frontend/NEXTJS_REMOVAL_GUIDE.md)
- [frontend/NEXTJS_REMOVAL_QUICK_GUIDE.md](frontend/NEXTJS_REMOVAL_QUICK_GUIDE.md)
- [frontend/STATE_MANAGEMENT.md](frontend/STATE_MANAGEMENT.md)

### Backend And Auth

- [backend/NESTJS_BFF_QUICK_REFERENCE.md](backend/NESTJS_BFF_QUICK_REFERENCE.md)
- [backend/bff/QUICK_REFERENCE.md](backend/bff/QUICK_REFERENCE.md)
- [backend/bff/INTEGRATION_GUIDE.md](backend/bff/INTEGRATION_GUIDE.md)
- [backend/bff/IMPLEMENTATION_SUMMARY.md](backend/bff/IMPLEMENTATION_SUMMARY.md)
- [backend/bff/EXECUTIVE_SUMMARY.md](backend/bff/EXECUTIVE_SUMMARY.md)
- [backend/NESTJS_BFF_PKCE_GRAPHQL.md](backend/NESTJS_BFF_PKCE_GRAPHQL.md)
- [backend/BFF_POSTGRESQL_REDIS_QUICK_SETUP.md](backend/BFF_POSTGRESQL_REDIS_QUICK_SETUP.md)
- [backend/BFF_POSTGRESQL_REDIS_INFRASTRUCTURE.md](backend/BFF_POSTGRESQL_REDIS_INFRASTRUCTURE.md)
- [auth/login-mfe-pkce-implementation.md](auth/login-mfe-pkce-implementation.md)
- [auth/auth-token-sharing-across-mfes.md](auth/auth-token-sharing-across-mfes.md)

### Platform Packages

- [contracts/API_CONTRACTS_LAYER.md](contracts/API_CONTRACTS_LAYER.md)
- [security/SECURITY_SETUP.md](security/SECURITY_SETUP.md)
- [observability/OBSERVABILITY_SETUP.md](observability/OBSERVABILITY_SETUP.md)
- [configuration/ENVIRONMENT_CONFIGURATION.md](configuration/ENVIRONMENT_CONFIGURATION.md)

### Infrastructure And Delivery

- [infrastructure/INFRASTRUCTURE_SETUP_SUMMARY.md](infrastructure/INFRASTRUCTURE_SETUP_SUMMARY.md)
- [../infra/docker/README.md](../infra/docker/README.md)
- [delivery/CICD_PIPELINES.md](delivery/CICD_PIPELINES.md)
- [planning/IMPLEMENTATION_ROADMAP.md](planning/IMPLEMENTATION_ROADMAP.md)
- [planning/MISSING_DIRECTORIES_SETUP.md](planning/MISSING_DIRECTORIES_SETUP.md)

## Current Local Ports

| Component     | URL                   |
| ------------- | --------------------- |
| Host shell    | http://localhost:3002 |
| Analytics MFE | http://localhost:5001 |
| Reports MFE   | http://localhost:5002 |
| Login MFE     | http://localhost:5003 |
| BFF           | http://localhost:4000 |
| Postgres      | `localhost:5432`      |
| Redis         | `localhost:6379`      |

## Common Commands

Run from the repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
```

Focused development:

```bash
pnpm run infra:up
pnpm run health
pnpm run stack:up
pnpm --filter host-shell dev
pnpm --filter analytics-mfe dev
pnpm --filter reports-mfe dev
pnpm --filter login-mfe dev
pnpm --filter bff dev
```

## Notes On Older Docs

Some documents in this directory are historical implementation plans or migration records. They may still be useful for context, but verify them against the current code before treating them as instructions.

In particular, older docs may mention:

- Next.js/Webpack Module Federation
- GraphQL-first BFF examples
- localhost port `3000` for the BFF
- setup steps for directories that now exist
- future observability stacks that are not currently wired into `src`

When in doubt, prefer the current-state guides listed above.
