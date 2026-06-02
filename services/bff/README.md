# Backend for Frontend (BFF)

NestJS service — single runtime entry point for authentication, health, and future GraphQL/analytics APIs.

## Run locally

```bash
# From monorepo root
pnpm install

cd services/bff
cp .env.example .env.development   # optional

# Auth-only (no Postgres)
set USE_MEMORY_CACHE=true
set SKIP_DATABASE=true
set DEMO_ALLOWED_EMAILS=test@example.com,admin@example.com
pnpm run start:dev
```

Server: http://localhost:4000  
Auth: http://localhost:4000/api/auth/initiate

## Debug in VS Code

Use the launch config that matches how you opened the workspace:

| Workspace root                    | Launch config location             |
| --------------------------------- | ---------------------------------- |
| `enterprise-platform/` (monorepo) | `.vscode/launch.json` at repo root |
| `services/bff/`                   | `services/bff/.vscode/launch.json` |

Set breakpoints in `src/**/*.ts`, then run **Debug BFF** or **Debug BFF (watch)**. Both debug through compiled `dist/` output with source maps, so breakpoints bind to TypeScript reliably.

| Launch config         | Use when                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| **Debug BFF**         | One-shot debug — builds `dist/` first, then launches under the debugger    |
| **Debug BFF (watch)** | Hot reload — starts `nest start --debug --watch` and attaches to port 9229 |

Requirements:

- Port **4000** must be free (`pnpm run dev:docker:down` from `services/bff` if needed).
- Run `pnpm run infra:up` when using Postgres/Redis.
- If a breakpoint stays hollow/unbound, confirm you are editing files under `services/bff/src/` and that **Build BFF for debug** completed without errors.

## Scripts

| Script                 | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `pnpm run start:dev`   | Nest watch mode (`src/main.ts`)                                                  |
| `pnpm run start:debug` | Nest watch mode with Node inspector on port 9229 (used by **Debug BFF (watch)**) |
| `pnpm run start:prod`  | `node dist/main.js`                                                              |
| `pnpm run build`       | Compile TypeScript                                                               |
| `pnpm test`            | Jest — Nest integration tests                                                    |

## Docker

Build from **monorepo root**:

```bash
docker build -f services/bff/Dockerfile.dev -t enterprise-bff:dev .
docker run -p 4000:4000 enterprise-bff:dev
```

Or start infra and the BFF through compose:

```bash
pnpm run stack:up
pnpm run stack:down
```

Compose files live under [`infra/docker/`](../../infra/docker/). See [`infra/docker/README.md`](../../infra/docker/README.md).

## Documentation

Detailed guides live under [`docs/backend/bff/`](../../docs/backend/bff/):

| Document                                                                      | Purpose                              |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| [QUICK_REFERENCE.md](../../docs/backend/bff/QUICK_REFERENCE.md)               | Endpoints, env vars, troubleshooting |
| [INTEGRATION_GUIDE.md](../../docs/backend/bff/INTEGRATION_GUIDE.md)           | Frontend wiring and deployment       |
| [IMPLEMENTATION_SUMMARY.md](../../docs/backend/bff/IMPLEMENTATION_SUMMARY.md) | Source inventory and status          |
| [EXECUTIVE_SUMMARY.md](../../docs/backend/bff/EXECUTIVE_SUMMARY.md)           | High-level overview                  |

Also see [NestJS BFF quick reference](../../docs/backend/NESTJS_BFF_QUICK_REFERENCE.md) and [auth token sharing guide](../../docs/auth/auth-token-sharing-across-mfes.md).

## Legacy Express stack

Archived under `legacy/`. Not used by npm scripts, Docker, or tests.
