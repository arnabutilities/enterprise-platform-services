# Missing Directories Setup Guide

**Document Status**: Implementation Guide  
**Target**: Enterprise Platform Directory Structure  
**Created**: 2026-05-16

---

## Overview

The following directories are referenced in `pnpm-workspace.yaml` but don't exist:

- `contracts/` - API schemas and types
- `infra/` - Infrastructure & deployment
- `observability/` - Logging, monitoring, tracing
- `security/` - Auth, secrets, policies
- `tools/` - Developer tooling
- `runtime/` - Runtime isolation patterns

This guide creates all missing directories with proper structure and initialization.

---

## Directory Structure Setup

### 1. Contracts Directory

**Purpose**: Centralized API contracts, types, and schemas

```bash
mkdir -p contracts/src/{openapi/schemas,openapi/v1,events,federation,types,graphql}
```

**Files to create**:

- `contracts/package.json` - Package definition
- `contracts/tsconfig.json` - TypeScript config
- `contracts/src/index.ts` - Main export
- `contracts/src/types/*.ts` - Type definitions
- `contracts/src/openapi/v1/*.yaml` - OpenAPI specs
- `contracts/src/events/*.ts` - Event contracts
- `contracts/src/federation/*.ts` - MFE contracts

**Reference**: See `API_CONTRACTS_LAYER.md`

---

### 2. Infra Directory

**Purpose**: Infrastructure, deployment configs, K8s manifests

```bash
mkdir -p infra/{k8s,docker,terraform,helm,scripts}
mkdir -p infra/k8s/{base,overlays/{dev,staging,prod}}
mkdir -p infra/docker/{nginx,postgres,redis}
mkdir -p infra/terraform/{modules,environments}
mkdir -p infra/helm/{charts,values}
```

**Files to create**:

**File**: `infra/k8s/base/deployment.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: enterprise-platform
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-config
  namespace: enterprise-platform
data:
  API_BASE_URL: 'http://bff:3000'
  ANALYTICS_URL: 'http://analytics-mfe:5001'
  REPORTS_URL: 'http://reports-mfe:5002'
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: host-shell
  namespace: enterprise-platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: host-shell
  template:
    metadata:
      labels:
        app: host-shell
    spec:
      containers:
        - name: host-shell
          image: registry.example.com/host-shell:latest
          ports:
            - containerPort: 3002
          env:
            - name: NODE_ENV
              value: 'production'
            - name: NEXT_PUBLIC_ANALYTICS_URL
              valueFrom:
                configMapKeyRef:
                  name: platform-config
                  key: ANALYTICS_URL
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: host-shell-service
  namespace: enterprise-platform
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 3002
  selector:
    app: host-shell
```

**File**: `infra/docker/nginx/Dockerfile`

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

**File**: `infra/docker/nginx/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream analytics {
        server analytics-mfe:5001;
    }

    upstream reports {
        server reports-mfe:5002;
    }

    upstream bff {
        server bff:3000;
    }

    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://host-shell:3002;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /api/ {
            proxy_pass http://bff/;
            proxy_set_header Host $host;
            proxy_set_header Authorization $http_authorization;
        }

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

**File**: `infra/README.md`

```markdown
# Infrastructure Configuration

## Kubernetes

Deploy with Kustomize:

\`\`\`bash
kubectl apply -k infra/k8s/overlays/prod
\`\`\`

## Docker

Build and run locally:

\`\`\`bash
docker-compose -f docker-compose.yml up
\`\`\`

## Terraform (Optional)

For cloud infrastructure:

\`\`\`bash
cd terraform/environments/prod
terraform apply
\`\`\`

## Helm (Optional)

Deploy with Helm:

\`\`\`bash
helm install enterprise-platform infra/helm/charts/platform
\`\`\`
```

---

### 3. Observability Directory

**Purpose**: Logging, tracing, monitoring, dashboards

```bash
mkdir -p observability/{logging,tracing,monitoring,dashboards}
```

**Files to create**:

**File**: `observability/logging/winston.config.ts`

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.simple(),
    }),

    // File - all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),

    // File - errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
  ],
});

export function getLogger(module: string) {
  return logger.child({ module });
}
```

**File**: `observability/tracing/opentelemetry.config.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-trace-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

const jaegerExporter = new JaegerExporter({
  serviceName: process.env.SERVICE_NAME || 'enterprise-platform',
  host: process.env.JAEGER_HOST || 'localhost',
  port: parseInt(process.env.JAEGER_PORT || '6831'),
});

export const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**File**: `observability/monitoring/prometheus.config.ts`

```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const mfeLoadTime = new Histogram({
  name: 'mfe_load_time_seconds',
  help: 'Time taken to load MFE in seconds',
  labelNames: ['mfe_name'],
});

export const mfeErrors = new Counter({
  name: 'mfe_errors_total',
  help: 'Total MFE errors',
  labelNames: ['mfe_name', 'error_type'],
});

export function metricsEndpoint(req: any, res: any) {
  res.set('Content-Type', register.contentType);
  res.send(register.metrics());
}
```

**File**: `observability/dashboards/grafana.json`

```json
{
  "dashboard": {
    "title": "Enterprise Platform",
    "panels": [
      {
        "title": "HTTP Requests",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "MFE Load Times",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, mfe_load_time_seconds)"
          }
        ]
      },
      {
        "title": "MFE Error Rate",
        "targets": [
          {
            "expr": "rate(mfe_errors_total[5m])"
          }
        ]
      }
    ]
  }
}
```

**File**: `observability/README.md`

```markdown
# Observability

## Logging

Using Winston for centralized logging. Logs output to:

- Console (development)
- File system (all environments)

## Tracing

Using OpenTelemetry + Jaeger for distributed tracing.

Start Jaeger:
\`\`\`bash
docker run -d --name jaeger \
 -p 6831:6831/udp \
 -p 16686:16686 \
 jaegertracing/all-in-one:latest
\`\`\`

Access UI: http://localhost:16686

## Monitoring

Using Prometheus for metrics collection.

Metrics exposed at: `/metrics`

## Dashboards

Grafana dashboards in `dashboards/` directory.

Import into Grafana for visualization.
```

---

### 4. Security Directory

**Purpose**: Auth, secrets, policies, scanning

```bash
mkdir -p security/src/{auth,middleware,rbac,encryption,validation}
```

**Reference**: See `SECURITY_SETUP.md`

---

### 5. Tools Directory

**Purpose**: Developer tooling, generators, linting

```bash
mkdir -p tools/{generators,linters,scripts,templates}
```

**Files to create**:

**File**: `tools/generators/mfe-generator.ts`

```typescript
/**
 * MFE Scaffolding Generator
 * Usage: npx ts-node tools/generators/mfe-generator.ts my-mfe
 */

import fs from 'fs';
import path from 'path';

const mfeName = process.argv[2] || 'example-mfe';

const structure = {
  [`apps/${mfeName}/src`]: {
    app: {},
    components: {},
    hooks: {},
    pages: {},
    services: {},
    state: {},
    styles: {},
    tests: {},
    types: {},
  },
};

function createStructure(base: string, obj: any) {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path.join(base, key);
    if (typeof value === 'object' && value !== null) {
      fs.mkdirSync(fullPath, { recursive: true });
      createStructure(fullPath, value);
    }
  }
}

createStructure('.', structure);
console.log(`✓ MFE scaffold created at apps/${mfeName}`);
```

**File**: `tools/linters/contract-validator.ts`

```typescript
/**
 * Validate contracts are properly exported
 */

import fs from 'fs';
import path from 'path';

const contractsDir = 'contracts/src';
const appsDirs = fs.readdirSync('apps');

appsDirs.forEach((app) => {
  const contractImport = fs.readFileSync(
    path.join('apps', app, 'src', 'types', 'index.ts'),
    'utf-8',
  );

  if (!contractImport.includes('@enterprise-platform/contracts')) {
    console.warn(`⚠️  ${app} not using contracts`);
  }
});

console.log('✓ Contract validation complete');
```

**File**: `tools/scripts/setup-env.sh`

```bash
#!/bin/bash

echo "Setting up environment..."

# Create .env files
for app in apps/*; do
  if [ -d "$app" ]; then
    if [ ! -f "$app/.env.local" ]; then
      cp .env.example "$app/.env.local"
      echo "✓ Created $app/.env.local"
    fi
  fi
done

# Generate types
echo "Generating types from contracts..."
cd contracts && pnpm run generate:types && cd ..

echo "✓ Setup complete!"
```

**File**: `tools/README.md`

```markdown
# Developer Tools

## Generators

### MFE Generator

Create new MFE with scaffolding:

\`\`\`bash
npx ts-node tools/generators/mfe-generator.ts my-new-mfe
\`\`\`

## Linters

### Contract Validator

Validate all apps are using contracts:

\`\`\`bash
npx ts-node tools/linters/contract-validator.ts
\`\`\`

## Scripts

### Setup Environment

Initialize environment:

\`\`\`bash
bash tools/scripts/setup-env.sh
\`\`\`
```

---

### 6. Runtime Directory

**Purpose**: Runtime isolation, retry, fallback patterns

```bash
mkdir -p runtime/src/{isolation,retry,fallback,circuitbreaker}
```

**Files to create**:

**File**: `runtime/src/isolation/mfe-boundary.ts`

```typescript
/**
 * Error isolation boundary for MFEs
 */

import React from 'react';

interface Props {
  mfeName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MFEBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`Error in MFE: ${this.props.mfeName}`, error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: '20px', backgroundColor: '#fee', color: '#c33' }}>
            <h3>Error in {this.props.mfeName}</h3>
            <p>{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**File**: `runtime/src/retry/retry-policy.ts`

```typescript
/**
 * Retry policy with exponential backoff
 */

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry: (error: Error) => boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Retry on network errors, not on 400-level errors
    return !error.message.includes('400') && !error.message.includes('401');
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === policy.maxRetries || !policy.shouldRetry(lastError)) {
        throw error;
      }

      const delay = Math.min(
        policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt),
        policy.maxDelay,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

**File**: `runtime/src/circuitbreaker/circuit-breaker.ts`

```typescript
/**
 * Circuit breaker pattern for fault tolerance
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms before transitioning to HALF_OPEN
}

export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      ...config,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - (this.lastFailureTime || 0) > this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure() {
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

**File**: `runtime/README.md`

```markdown
# Runtime Patterns

## MFE Boundary

React error boundary to isolate MFE errors:

\`\`\`tsx
<MFEBoundary mfeName="analytics" onError={handleError}>
<AnalyticsMFE />
</MFEBoundary>
\`\`\`

## Retry Policy

Automatic retries with exponential backoff:

\`\`\`tsx
const data = await withRetry(() => fetchAnalytics());
\`\`\`

## Circuit Breaker

Prevent cascading failures:

\`\`\`tsx
const breaker = new CircuitBreaker({ failureThreshold: 5 });
await breaker.execute(() => callMFE());
\`\`\`
```

---

## Directory Creation Script

**File**: `scripts/setup-directories.sh`

```bash
#!/bin/bash

echo "Setting up missing directories..."

# Contracts
mkdir -p contracts/src/{openapi/schemas,openapi/v1,events,federation,types,graphql}
echo "✓ contracts/"

# Infra
mkdir -p infra/{k8s/base,k8s/overlays/{dev,staging,prod},docker/{nginx,postgres,redis},terraform/{modules,environments},helm/{charts,values},scripts}
echo "✓ infra/"

# Observability
mkdir -p observability/{logging,tracing,monitoring,dashboards}
echo "✓ observability/"

# Security
mkdir -p security/src/{auth,middleware,rbac,encryption,validation}
echo "✓ security/"

# Tools
mkdir -p tools/{generators,linters,scripts,templates}
echo "✓ tools/"

# Runtime
mkdir -p runtime/src/{isolation,retry,fallback,circuitbreaker}
echo "✓ runtime/"

echo ""
echo "✓ All directories created successfully!"
echo ""
echo "Next steps:"
echo "1. Review API_CONTRACTS_LAYER.md"
echo "2. Review SECURITY_SETUP.md"
echo "3. Review MODULE_FEDERATION_IMPLEMENTATION.md"
echo "4. Review ENVIRONMENT_CONFIGURATION.md"
echo "5. Review STATE_MANAGEMENT.md"
echo "6. Review OBSERVABILITY_SETUP.md"
echo "7. Review CICD_PIPELINES.md"
```

**Run setup**:

```bash
bash scripts/setup-directories.sh
```

---

## Summary

| Directory        | Purpose              | Files to Create                        |
| ---------------- | -------------------- | -------------------------------------- |
| `contracts/`     | API schemas & types  | OpenAPI specs, types, events           |
| `infra/`         | Deployment configs   | K8s, Docker, Terraform                 |
| `observability/` | Logging & monitoring | Logger config, Prometheus, Grafana     |
| `security/`      | Auth & security      | JWT, CORS, CSP, RBAC                   |
| `tools/`         | Developer tools      | Generators, linters, scripts           |
| `runtime/`       | Runtime patterns     | Error boundary, retry, circuit breaker |

See individual guides for detailed implementation of each directory.
