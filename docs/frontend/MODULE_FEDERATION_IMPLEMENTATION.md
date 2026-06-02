# Module Federation Implementation

**Status**: Current implementation notes
**Stack**: Vite + React 18 + `@module-federation/vite`
**Last reviewed**: 2026-05-25

## Overview

The platform uses Vite-based Module Federation for runtime-loaded microfrontends. The host shell is responsible for navigation, shared layout, auth handoff, and remote loading. Each remote app owns its own Vite build and exposes one federated entry module.

Current apps:

| App           | Package         | Dev URL               | Federation name | Exposes        |
| ------------- | --------------- | --------------------- | --------------- | -------------- |
| Host shell    | `host-shell`    | http://localhost:3002 | `host`          | none currently |
| Analytics MFE | `analytics-mfe` | http://localhost:5001 | `analytics`     | `./Analytics`  |
| Reports MFE   | `reports-mfe`   | http://localhost:5002 | `reports`       | `./Reports`    |
| Login MFE     | `login-mfe`     | http://localhost:5003 | `login`         | `./Login`      |

The host loads remote entries dynamically through [apps/host-shell/src/components/MFELoader.tsx](../../apps/host-shell/src/components/MFELoader.tsx). Remote URL defaults live in [apps/host-shell/src/config/mfeRegistry.ts](../../apps/host-shell/src/config/mfeRegistry.ts).

## Local Development

Install dependencies and start the full local stack:

```bash
pnpm install
pnpm dev
```

The root `dev` script starts Postgres and Redis through `infra/docker/docker-compose.yml`, runs the infra health check, then starts workspace `dev` tasks through Turbo.

If you want the BFF to run in Docker while the frontend apps run as Vite dev servers, use:

```bash
pnpm run start:all
```

For focused MFE work, start only the pieces you need:

```bash
pnpm --filter host-shell dev
pnpm --filter analytics-mfe dev
pnpm --filter reports-mfe dev
pnpm --filter login-mfe dev
pnpm --filter bff dev
```

## Vite Federation Configuration

The current apps use `@module-federation/vite` in each app-level `vite.config.ts`.

Each remote has:

- `index.html` for standalone Vite development
- `src/main.tsx` as the standalone browser entry
- `src/vite/App.tsx` as the federated module exposed to the host
- `vite.config.ts` with the `@module-federation/vite` remote definition

Analytics remote:

```ts
federation({
  name: 'analytics',
  filename: 'remoteEntry.js',
  exposes: {
    './Analytics': './src/vite/App.tsx',
  },
  shared: ['react', 'react-dom'],
});
```

Reports remote:

```ts
federation({
  name: 'reports',
  filename: 'remoteEntry.js',
  exposes: {
    './Reports': './src/vite/App.tsx',
  },
  shared: ['react', 'react-dom'],
});
```

Login remote:

```ts
federation({
  name: 'login',
  filename: 'remoteEntry.js',
  exposes: {
    './Login': './src/vite/App.tsx',
  },
  shared: ['react', 'react-dom'],
});
```

The host is configured with federation name `host` and shared React dependencies. It currently resolves active remotes through the runtime registry rather than a static `remotes` block.

## Runtime Registry

The host registry contains the active remotes:

```ts
export const mfeRegistry = {
  analytics: {
    name: 'Analytics',
    scope: 'analytics',
    module: './Analytics',
    remoteUrl: import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:5001',
  },
  reports: {
    name: 'Reports',
    scope: 'reports',
    module: './Reports',
    remoteUrl: import.meta.env.VITE_REPORTS_URL || 'http://localhost:5002',
  },
  login: {
    name: 'Login',
    scope: 'login',
    module: './Login',
    remoteUrl: import.meta.env.VITE_LOGIN_URL || 'http://localhost:5003',
  },
};
```

Use these Vite variables to point the host at deployed remotes:

```bash
VITE_ANALYTICS_URL=http://localhost:5001
VITE_REPORTS_URL=http://localhost:5002
VITE_LOGIN_URL=http://localhost:5003
```

## Remote Loading Flow

1. A host container reads an MFE definition from `mfeRegistry`.
2. `MFELoader` normalizes the remote URL to `<remoteUrl>/remoteEntry.js`.
3. The remote entry is imported with Vite's dynamic import.
4. The loader initializes the share scope when available.
5. The requested exposed module is resolved with `container.get(module)`.
6. The remote component renders inside a `Suspense` boundary.

The login MFE is also wrapped in `MFEBoundary` from `@enterprise-platform/runtime` and receives BFF/auth props from `LoginContainer`.

## Shared Packages

Current shared workspace packages:

- `@enterprise-platform/shared-ui` - MUI-based shared components and theme
- `@enterprise-platform/shared-types` - shared TypeScript types
- `@enterprise-platform/shared-pubsub` - auth and event bus helpers
- `@enterprise-platform/platform-auth` - auth session and BFF client helpers
- `@enterprise-platform/runtime` - MFE boundary, retry, circuit breaker, auth bridge utilities
- `@enterprise-platform/contracts` - API, event, and federation contracts

## Validation

Run builds for the active frontend apps:

```bash
pnpm --filter host-shell build
pnpm --filter analytics-mfe build
pnpm --filter reports-mfe build
pnpm --filter login-mfe build
```

The Module Federation DTS plugin may print a non-fatal type-declaration generation warning during remote builds. Treat the build exit code and generated `dist/remoteEntry.js` as the source of truth until generated federation declarations are wired into CI.

Then start the host and remotes and verify:

- `http://localhost:3002` loads the host shell.
- `http://localhost:5001/remoteEntry.js` returns the analytics remote entry.
- `http://localhost:5002/remoteEntry.js` returns the reports remote entry.
- `http://localhost:5003/remoteEntry.js` returns the login remote entry.
- Host pages render remote content without console remote-load errors.

## Troubleshooting

### Remote load failed

Confirm the remote dev server is running and the registry URL points to the remote app root, not directly to a nested route.

```bash
curl http://localhost:5001/remoteEntry.js
```

### Shared dependency mismatch

Keep React and React DOM aligned across host and remotes. The current apps use React `^18.3.0`.

### Wrong environment variable prefix

Vite only exposes browser variables with the configured public prefix. For the current host registry, use `VITE_ANALYTICS_URL`, `VITE_REPORTS_URL`, and `VITE_LOGIN_URL`.

### Old Next.js examples

Next.js/Webpack federation is not the current implementation path. Use `vite.config.ts` and `@module-federation/vite`.
