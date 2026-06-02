# Service Mesh Implementation Strategy

**Status**: Proposed backend service-mesh strategy  
**Scope**: BFF-to-service and service-to-service communication  
**Current implementation baseline**: NestJS BFF with configured downstream service registry

> Note: the directory is named `svc-mash` to match the requested path. This document uses the standard term "service mesh" for the architecture pattern.

## Overview

The Enterprise Platform currently routes backend calls through the NestJS BFF. The BFF has a small service registry in `services/bff/src/config/microservice-routing.config.ts` and a `MicroserviceService` wrapper that handles downstream HTTP calls, request IDs, timeouts, retries, and basic health checks.

The service mesh strategy should build on that baseline in phases:

1. **Application-level mesh readiness**: standardize service registration, health checks, request IDs, timeouts, retries, error shapes, and metrics in the BFF and all backend services.
2. **Platform-level mesh adoption**: introduce a runtime mesh such as Istio, Linkerd, Consul service mesh, or a Kubernetes-native gateway setup when services run in a cluster.
3. **Production hardening**: enforce mTLS, traffic policies, rate limits, circuit breakers, progressive delivery, distributed tracing, and service SLOs.

This phased approach keeps local development simple while preparing services for a real mesh in staging and production.

## Goals

- Provide a consistent way to onboard backend services behind the BFF.
- Make service health, readiness, and degradation visible.
- Standardize timeouts, retries, circuit breaking, and fallback behavior.
- Support secure service-to-service communication.
- Prepare the platform for Kubernetes deployment and sidecar or ambient service-mesh adoption.
- Keep frontend MFEs insulated from backend service topology changes.

## Non-Goals

- Replacing the BFF with direct browser-to-service calls.
- Introducing a production service mesh before deployment targets are confirmed.
- Treating Docker Compose as a full service mesh. Compose remains a local development runtime.
- Adding GraphQL as a requirement. The current BFF auth surface is REST.

## Current Baseline

### BFF Service Registry

The current registry shape is:

```ts
export interface MicroserviceRegistry {
  [serviceName: string]: {
    url: string;
    timeout: number;
    retries: number;
    healthCheck?: string;
  };
}
```

Current configured service names:

| Service     | Default URL             | Timeout   | Retries | Health check |
| ----------- | ----------------------- | --------- | ------- | ------------ |
| `analytics` | `http://localhost:3001` | `5000ms`  | `3`     | `/health`    |
| `reports`   | `http://localhost:3002` | `10000ms` | `2`     | `/health`    |
| `users`     | `http://localhost:3003` | `5000ms`  | `3`     | `/health`    |

### BFF Call Wrapper

`MicroserviceService` currently provides:

- service lookup by name
- HTTP method, endpoint, headers, and body forwarding
- per-service timeout
- `X-Request-ID` propagation
- JSON content-type
- retryable status detection for `408`, `429`, `500`, `502`, `503`, and `504`
- service health checks
- BFF-shaped error responses with `serviceName`, `endpoint`, `requestId`, and `statusCode`

### Health Aggregation

The BFF health service checks configured downstream services and returns:

- `healthy` when all checked services pass
- `degraded` when some pass and some fail
- `unhealthy` when all checked services fail

This is a good starting point, but production readiness should separate liveness, readiness, dependency health, and startup checks.

## Target Architecture

```text
Browser / MFE
    |
    v
Host Shell + Login MFE
    |
    v
NestJS BFF
    |
    |  application-level service registry
    |  request ID propagation
    |  auth context propagation
    |  timeout / retry / circuit breaker policies
    v
Backend Services
    |
    |  optional platform mesh layer in Kubernetes
    |  mTLS, traffic policy, tracing, telemetry
    v
Datastores / External APIs
```

In local development, the BFF can route to service URLs from environment variables. In Kubernetes, the same logical service names should resolve through Kubernetes DNS or mesh service entries.

## Implementation Phases

### Phase 1: Standardize Application-Level Mesh Contracts

This phase can be implemented without adding Istio/Linkerd.

Required conventions for every backend service:

- expose `GET /health/live`
- expose `GET /health/ready`
- expose `GET /health`
- accept and propagate `X-Request-ID`
- return consistent JSON error responses
- document timeout and retry expectations
- publish OpenAPI contracts when HTTP APIs are exposed
- log request ID, route, status code, latency, and caller where possible

Recommended BFF changes:

- move downstream service names into typed configuration
- read service URLs from environment variables
- use registry-configured retry counts in `requestWithRetry`
- add exponential backoff with jitter
- add an allowlist of service names and path validation to prevent SSRF-style misuse
- add circuit breaker state per service
- record downstream request metrics

### Phase 2: Add Mesh-Ready Deployment Metadata

When services move into Kubernetes, define:

- Kubernetes `Service` per backend service
- `Deployment` probes for liveness/readiness
- `NetworkPolicy` allowing only expected callers
- resource requests and limits
- service account per service
- namespace strategy, for example `platform-dev`, `platform-staging`, `platform-prod`

If a sidecar mesh is selected, add:

- namespace injection labels where appropriate
- mTLS policy
- traffic policy for retries and outlier detection
- ingress or gateway routing rules
- telemetry export configuration

### Phase 3: Production Mesh Capabilities

Add these only once service count and deployment topology justify the operational overhead:

- automatic mTLS between services
- per-route traffic splitting for canaries
- circuit breaking and outlier detection at the mesh layer
- retry budgets
- distributed tracing with W3C `traceparent`
- service-level dashboards
- alerting tied to SLOs
- zero-trust network policies

## Onboarding a New Backend Service

Use this checklist when adding a new service behind the BFF.

### 1. Define Service Ownership

Document:

- service name
- owning team or maintainer
- purpose
- runtime and framework
- port
- API contract path
- datastore dependencies
- event topics, if any
- production SLO target

Recommended naming:

```text
serviceName: billing
package: services/billing
env var: BILLING_SERVICE_URL
default local URL: http://localhost:3005
health path: /health
```

### 2. Add Service Contract

Add or update:

- OpenAPI YAML under `contracts/src/openapi/v1/`
- shared TypeScript request/response types under `contracts/src/types/`
- domain events under `contracts/src/events/` if the service emits or consumes events

Contract-first onboarding prevents the BFF and service implementation from drifting.

### 3. Add Service Runtime

Create the service workspace under `services/<service-name>` and include:

- `package.json`
- `tsconfig.json`
- source entry point
- `Dockerfile` and `.dockerignore` when containerized
- `README.md` with local setup
- tests for controllers, service logic, and error paths

### 4. Add Health Endpoints

Every service should expose:

| Endpoint        | Purpose                     | Dependency checks                 |
| --------------- | --------------------------- | --------------------------------- |
| `/health/live`  | process is alive            | none or minimal                   |
| `/health/ready` | process can receive traffic | required dependencies only        |
| `/health`       | aggregate diagnostic status | service dependencies and metadata |

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-06-02T00:00:00.000Z",
  "service": "billing",
  "version": "0.1.0",
  "dependencies": {
    "database": {
      "status": "healthy",
      "responseTimeMs": 12
    }
  }
}
```

Use `degraded` when optional dependencies fail and `unhealthy` when required dependencies fail.

### 5. Register the Service in the BFF

Add the service to the BFF registry:

```ts
billing: {
  url: configService.get('microservices.billingService') || 'http://localhost:3005',
  timeout: 5000,
  retries: 2,
  healthCheck: '/health',
}
```

Add corresponding environment configuration:

```bash
BILLING_SERVICE_URL=http://localhost:3005
```

Then expose only the BFF routes that the frontend needs. Avoid exposing internal service topology to browser clients.

### 6. Add BFF Route or Adapter

Add a BFF controller or service adapter that:

- validates request DTOs
- checks user authentication and authorization
- calls `MicroserviceService.requestWithRetry`
- maps downstream errors to stable BFF errors
- avoids leaking internal URLs, stack traces, or service credentials

### 7. Add Tests

Minimum tests:

- service health endpoint tests
- BFF routing tests for successful calls
- BFF error mapping tests
- timeout/retry behavior tests
- authorization tests for protected routes
- contract validation tests

### 8. Add Local and Deployment Configuration

Local:

- `.env.example` placeholder only
- Docker Compose service if the service needs local container orchestration
- README instructions

Deployment:

- Kubernetes `Deployment`
- Kubernetes `Service`
- readiness and liveness probes
- resource requests and limits
- secrets and config map references
- mesh traffic policy if applicable

## Health Check Strategy

### Liveness

Liveness should answer only: "Should the process be restarted?"

Do:

- check event loop/process responsiveness
- return quickly
- avoid database or downstream calls

Do not:

- fail liveness because a downstream service is temporarily unavailable
- run expensive checks

### Readiness

Readiness should answer: "Can this instance receive traffic?"

Check:

- required database connection
- required cache connection
- required config loaded
- migrations completed when relevant

Optional dependencies should not necessarily fail readiness. Instead, include them in aggregate health as `degraded`.

### Aggregate Health

Aggregate health is for diagnostics and dashboards. It may include:

- required dependencies
- optional dependencies
- downstream service health
- current version/build metadata
- uptime
- response time per dependency

### BFF Health Policy

The BFF should remain live even if downstream services fail. Readiness should fail only when the BFF cannot safely serve any traffic, for example missing required auth config. Downstream failures should make aggregate `/health` `degraded`, not necessarily fail `/health/live`.

## Edge Case Strategies

### Downstream Timeout

Strategy:

- use per-service timeouts
- return a stable `504 Gateway Timeout` or BFF-defined timeout error
- include `requestId`
- do not retry non-idempotent operations unless they have idempotency keys

### Downstream 5xx

Strategy:

- retry idempotent calls with exponential backoff and jitter
- respect retry budgets
- trip circuit breaker after repeated failures
- return a stable `502 Bad Gateway` when recovery fails

### Downstream 4xx

Strategy:

- do not retry
- map validation and auth errors carefully
- avoid leaking downstream implementation details

### Rate Limiting and 429

Strategy:

- honor `Retry-After` when present
- apply caller-level rate limits at the BFF
- consider service-level quotas for expensive operations
- return clear retry guidance to clients

### Partial Failure

Strategy:

- degrade optional features instead of failing the whole page/API
- make partial data explicit in the response shape
- log dependency failures with request ID
- expose degraded dependency status in health checks

### Duplicate Requests

Strategy:

- use idempotency keys for create/payment/job-start operations
- store idempotency outcomes in Redis or service-owned durable storage
- never blindly retry non-idempotent writes from the BFF

### Version or Contract Mismatch

Strategy:

- validate OpenAPI contracts in CI
- version breaking API changes
- keep BFF adapters backward-compatible during rollout windows
- add canary traffic before full cutover

### Service Not Registered

Strategy:

- fail fast with a configuration error
- do not allow arbitrary service URLs from request input
- add automated validation that all BFF route adapters reference registered services

## Security Strategy

### North-South Traffic

Browser traffic should enter through:

- host shell and MFEs for frontend assets
- BFF for backend APIs
- an ingress/gateway when deployed

The browser should not call internal backend services directly unless explicitly designed and secured.

### Authentication

Current platform auth uses:

- PKCE initiation and exchange through the BFF
- JWT access and refresh tokens
- HTTP-only access-token cookie
- Redis or memory cache for PKCE sessions and refresh-token state

The BFF should authenticate user-facing requests before calling downstream services.

### Authorization

Use RBAC utilities from `@enterprise-platform/security`:

- roles from `security/src/rbac/roles.ts`
- permissions from `security/src/rbac/permissions.ts`

Recommended pattern:

1. authenticate the user at the BFF boundary
2. authorize route access in the BFF
3. propagate a minimal user/service context downstream
4. re-check sensitive permissions in domain services when the operation is high risk

### Service-to-Service Identity

For local development, service identity can be represented by configured service names and request headers. In production, prefer:

- mTLS service identity from the mesh
- Kubernetes service accounts
- short-lived service tokens when mTLS alone is insufficient
- strict network policies

### Header Propagation

Allowed propagated headers:

- `X-Request-ID`
- `traceparent`
- `tracestate`
- minimal authenticated user context when required
- tenant or organization ID when required and authorized

Do not propagate:

- browser cookies to arbitrary downstream services
- raw refresh tokens
- private authorization headers not intended for the target service
- internal stack or infrastructure headers

### Input Validation

Every BFF route and backend service should:

- validate DTOs
- reject unknown fields where practical
- sanitize strings that may be logged or rendered
- limit payload size
- validate path and query parameters

### Secrets

Rules:

- never commit real `.env*` files
- keep `.env.example` placeholders safe and local-only
- store production secrets in the deployment secret manager
- rotate JWT, OAuth, database, and service credentials regularly
- use separate access-token and refresh-token secrets

## Observability Strategy

### Current Baseline

Current observability is intentionally small:

- in-memory auth metrics in `@enterprise-platform/observability`
- BFF auth metrics endpoint at `GET /api/auth/metrics`
- BFF request logging and request ID middleware

### Required Signals for Service Mesh Readiness

Each service should emit or expose:

- request count by route, method, status
- request duration histogram
- downstream call count and latency
- downstream error count by service and status
- retry count
- circuit breaker state
- health check status and dependency response time
- auth failures and authorization denials

### Logging

Use structured logs with:

- timestamp
- level
- service name
- environment
- request ID
- trace ID when available
- route or operation name
- status code
- latency
- user ID or service identity only when safe and non-sensitive

Avoid logging:

- access tokens
- refresh tokens
- passwords
- full cookies
- raw PII unless explicitly approved

### Tracing

When OpenTelemetry is added:

- initialize tracing before service bootstrap
- propagate W3C `traceparent`
- create spans around BFF downstream calls
- tag spans with logical service names, not raw secret URLs
- export to the selected tracing backend

### Metrics and Dashboards

Recommended dashboards:

- BFF request rate, latency, and errors
- downstream service call rate, latency, and errors
- health status per service
- auth metrics
- retry and circuit breaker activity
- deployment version and canary comparison

### Alerts

Initial alerts:

- BFF readiness failing
- any required service readiness failing
- elevated `5xx` rate
- latency SLO burn
- downstream timeout spike
- auth failure spike
- circuit breaker open for a critical service

## Deployment Strategy

### Local Development

Use:

```bash
pnpm dev
```

This starts Postgres and Redis in Docker, then starts workspace dev tasks through Turbo.

Use:

```bash
pnpm run start:all
```

This starts Postgres, Redis, and the BFF in Docker, then starts frontend apps on the host. Frontend MFE containers are not currently defined in Docker Compose.

### Docker Compose

Current compose layers:

- `docker-compose.yml`: Postgres and Redis
- `docker-compose.bff.yml`: BFF dev container overlay
- `docker-compose.streaming.yml`: optional Redpanda overlay
- `docker-compose.bff.prod.yml`: production-style BFF overlay

Use Compose for local integration, not production service-mesh semantics.

### Kubernetes

For each backend service, define:

- `Deployment`
- `Service`
- `ConfigMap`
- `Secret` references
- readiness probe
- liveness probe
- resource requests and limits
- horizontal scaling rules when needed
- network policy

### Service Mesh Runtime

Choose a runtime only after deployment requirements are known.

Evaluation criteria:

| Option                                  | Strength                                 | Trade-off                                            |
| --------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Linkerd                                 | simpler operations, mTLS, lightweight    | fewer advanced traffic features                      |
| Istio                                   | rich traffic policy, telemetry, gateways | higher operational complexity                        |
| Consul service mesh                     | strong multi-platform service discovery  | additional Consul operational model                  |
| Kubernetes Gateway API without sidecars | simpler ingress/routing baseline         | less service-to-service policy without another layer |

Recommended path:

1. start with Kubernetes services, probes, and network policies
2. add OpenTelemetry and Prometheus-compatible metrics
3. pilot mesh in staging with one or two services
4. enable mTLS and telemetry first
5. add traffic splitting, retries, and circuit breakers after baseline metrics are stable

### Progressive Delivery

Use canary or blue/green deployment for risky services:

- deploy new version with small traffic percentage
- compare error rate, latency, and business metrics
- automatically or manually promote
- roll back quickly if SLOs degrade

### Rollback Strategy

Rollback should include:

- previous container image tag
- previous config map/secret version where applicable
- database migration rollback plan or forward-only compatibility
- BFF route compatibility for both old and new service versions
- clear owner and communication channel

## CI/CD Strategy

Minimum CI checks:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm --filter @enterprise-platform/contracts validate
pnpm build
pnpm test
pnpm lint
```

Service-specific pipeline additions:

- build service image
- run service unit tests
- run API contract tests
- scan image vulnerabilities
- verify Kubernetes manifests
- run smoke tests against `/health/live`, `/health/ready`, and `/health`

Deployment gates:

- contracts validate
- BFF tests pass
- service tests pass
- container scan accepted
- readiness probes pass
- smoke tests pass
- dashboard/alert coverage exists for production services

## Service Onboarding Template

Copy this section into a service-specific README or design note.

```md
## Service Overview

- Service name:
- Owner:
- Purpose:
- Runtime:
- Port:
- BFF route prefix:
- Downstream dependencies:
- Data ownership:
- SLO:

## API Contract

- OpenAPI file:
- Shared types:
- Events:

## Health

- Liveness:
- Readiness:
- Aggregate health:

## Security

- Required user permissions:
- Service identity:
- Secrets:
- Network policy:

## Observability

- Logs:
- Metrics:
- Traces:
- Dashboards:
- Alerts:

## Deployment

- Docker image:
- Kubernetes service:
- Config:
- Rollback:
```

## Open Questions

- Which production runtime will host services: Kubernetes only, Kubernetes with sidecars, or another platform?
- Which service mesh runtime should be standardized: Linkerd, Istio, Consul, or Gateway API first?
- Which metrics backend and tracing backend will be used?
- Should downstream services re-authorize user permissions or trust BFF authorization for low-risk reads?
- What service SLOs are required for analytics, reports, users, and future services?

## Related Documents

- [BFF Integration Guide](../bff/INTEGRATION_GUIDE.md)
- [NestJS BFF Quick Reference](../NESTJS_BFF_QUICK_REFERENCE.md)
- [Environment Configuration](../../configuration/ENVIRONMENT_CONFIGURATION.md)
- [Security Setup](../../security/SECURITY_SETUP.md)
- [Observability Setup](../../observability/OBSERVABILITY_SETUP.md)
- [Infrastructure Setup Summary](../../infrastructure/INFRASTRUCTURE_SETUP_SUMMARY.md)
- [CI/CD Pipelines](../../delivery/CICD_PIPELINES.md)
