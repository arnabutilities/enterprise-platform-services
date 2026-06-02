# API Contracts Layer

**Status**: Current implementation reference
**Package**: `@enterprise-platform/contracts`
**Last reviewed**: 2026-05-25

## Overview

The contracts package is the shared type and schema boundary for the platform. It currently contains:

- TypeScript types for auth, analytics, reports, and common API shapes
- domain event contracts for auth, analytics, and reports
- Module Federation contracts for analytics, reports, and login remotes
- OpenAPI YAML files for the BFF and analytics API surface

The package lives at [contracts](../../contracts) and is consumed as `@enterprise-platform/contracts`.

## Package Layout

```text
contracts/
|-- package.json
|-- tsconfig.json
`-- src/
    |-- index.ts
    |-- types/
    |   |-- auth.ts
    |   |-- common.ts
    |   |-- analytics.ts
    |   |-- reports.ts
    |   `-- index.ts
    |-- events/
    |   |-- auth-events.ts
    |   |-- analytics-events.ts
    |   |-- reports-events.ts
    |   `-- index.ts
    |-- federation/
    |   |-- analytics-mfe.ts
    |   |-- reports-mfe.ts
    |   |-- login-mfe.ts
    |   `-- index.ts
    `-- openapi/
        |-- schemas/
        |   |-- common.yaml
        |   `-- errors.yaml
        `-- v1/
            |-- index.yaml
            |-- auth.yaml
            `-- analytics.yaml
```

There is a `graphql` placeholder directory, but the current implemented BFF auth surface is REST.

## Scripts

Run from the repository root:

```bash
pnpm --filter @enterprise-platform/contracts build
pnpm --filter @enterprise-platform/contracts validate
pnpm --filter @enterprise-platform/contracts generate:types
```

Current script behavior:

| Script           | Behavior                                          |
| ---------------- | ------------------------------------------------- |
| `build`          | Runs `tsc -p tsconfig.json`                       |
| `validate`       | Runs Spectral against `src/openapi/v1/index.yaml` |
| `generate:types` | Placeholder command                               |

## OpenAPI

The main spec is [contracts/src/openapi/v1/index.yaml](../../contracts/src/openapi/v1/index.yaml).

Current server entries:

- `http://localhost:4000` for the current BFF local development port
- `http://localhost:3000` as a legacy local entry
- `https://api.example.com` as a production placeholder

Current paths include:

- `GET /health`
- `POST /api/auth/initiate`
- `POST /api/auth/exchange`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- analytics v1 dashboard/query paths

## Auth Contracts

Auth types live in [contracts/src/types/auth.ts](../../contracts/src/types/auth.ts). Important exported types include:

- `AuthProvider`
- `AuthErrorCode`
- `ApiErrorBody`
- `AuthUser`
- `AuthTokens`
- `AuthResponse`
- `PkceInitiateRequest`
- `PkceInitiateResponse`
- `PkceExchangeRequest`
- `RefreshTokenRequest`
- `LogoutRequest`

These match the current REST auth flow used by the BFF and login MFE.

## Event Contracts

Event contracts live under [contracts/src/events](../../contracts/src/events).

Current event groups:

- auth: session created, failed, expired, logout
- analytics: analytics/domain events
- reports: report generation/domain events

The shared event envelope shape is:

```ts
export interface DomainEvent {
  type: string;
  version: number;
  correlationId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
```

## Federation Contracts

Federation contracts live under [contracts/src/federation](../../contracts/src/federation).

Current remotes:

| Remote    | Contract file      | Exposed module |
| --------- | ------------------ | -------------- |
| Analytics | `analytics-mfe.ts` | `./Analytics`  |
| Reports   | `reports-mfe.ts`   | `./Reports`    |
| Login     | `login-mfe.ts`     | `./Login`      |

The login contract defines `LoginRemoteProps`, including:

- `bffBaseUrl`
- `allowedOrigins`
- `onAuthSuccess`
- `onAuthFailure`

## Usage

Frontend and BFF packages import types directly:

```ts
import type { AuthResponse, AuthUser, PkceInitiateRequest } from '@enterprise-platform/contracts';
```

Auth events are used by `@enterprise-platform/shared-pubsub` and the login/host integration:

```ts
import type { AuthEvent } from '@enterprise-platform/contracts';
```

## Validation Checklist

Before changing API or event shapes:

```bash
pnpm --filter @enterprise-platform/contracts build
pnpm --filter @enterprise-platform/contracts validate
pnpm --filter bff test
```

Then verify any consuming app still builds:

```bash
pnpm --filter host-shell build
pnpm --filter login-mfe build
```

## Known Gaps

- `generate:types` is a placeholder and does not generate clients yet.
- There is no CI workflow currently enforcing contract validation.
- GraphQL schema files are placeholders and should not be treated as active BFF contracts.
- OpenAPI analytics v1 paths are contract definitions; confirm BFF route implementation before publishing them externally.
