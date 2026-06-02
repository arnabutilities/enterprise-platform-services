# Observability Setup

**Status**: Current implementation reference
**Package**: `@enterprise-platform/observability`
**Last reviewed**: 2026-05-25

## Overview

The current observability package is intentionally small. It exposes in-memory auth metrics that the BFF records during PKCE and login flows. Older references to Winston, OpenTelemetry, Prometheus, ELK, and Jaeger describe possible future expansion, not the current implementation.

Current source:

```text
observability/
|-- package.json
|-- src/
|   |-- index.ts
|   `-- monitoring/
|       |-- index.ts
|       `-- auth-metrics.ts
|-- dashboards/
|   `-- grafana.json
|-- logging/
|-- monitoring/
`-- tracing/
```

Only `src/monitoring/auth-metrics.ts` is exported by the package today.

## Build

```bash
pnpm --filter @enterprise-platform/observability build
```

The package compiles TypeScript to `dist`.

## Auth Metrics

The package exports:

- `recordPkceInitiate()`
- `recordPkceExchange(status)`
- `recordLoginFailure(reason)`
- `getAuthMetricsSnapshot()`
- `resetAuthMetricsForTests()`

Snapshot shape:

```ts
type AuthMetricsSnapshot = {
  pkceInitiateTotal: number;
  pkceExchangeSuccess: number;
  pkceExchangeFailure: number;
  loginFailuresByReason: Record<string, number>;
};
```

## BFF Integration

The BFF records metrics in [services/bff/src/auth/auth.service.ts](../../services/bff/src/auth/auth.service.ts):

- successful PKCE initiation increments `pkceInitiateTotal`
- successful exchange increments `pkceExchangeSuccess`
- failed exchange increments `pkceExchangeFailure`
- auth exceptions increment `loginFailuresByReason`

The BFF exposes the current snapshot at:

```text
GET http://localhost:4000/api/auth/metrics
```

Example:

```bash
curl http://localhost:4000/api/auth/metrics
```

## Current Limitations

- Metrics are in-memory and reset when the BFF process restarts.
- There is no Prometheus `/metrics` endpoint yet.
- There is no OpenTelemetry initialization in the active BFF bootstrap.
- There is no shared request logger exported from the observability package yet.
- Files under `observability/logging`, `observability/monitoring`, and `observability/tracing` are placeholders or standalone config areas unless wired into `src`.

## Recommended Next Steps

If production-grade observability is needed, add it incrementally:

1. Add a Prometheus metrics exporter to `@enterprise-platform/observability`.
2. Expose a BFF `/metrics` endpoint.
3. Convert auth counters from in-memory objects to Prometheus counters.
4. Add structured request logging in the BFF using Nest interceptors or middleware.
5. Initialize OpenTelemetry before Nest app creation if distributed tracing is required.
6. Update `observability/dashboards/grafana.json` once live metric names are stable.

## Useful Commands

```bash
pnpm --filter @enterprise-platform/observability build
pnpm --filter bff dev
curl http://localhost:4000/api/auth/metrics
```
