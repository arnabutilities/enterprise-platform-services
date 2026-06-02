# Migration To Vite React

**Status**: Migration completed
**Current stack**: Vite + React 18 + React Router + `@module-federation/vite`
**Last reviewed**: 2026-05-25

## Summary

The frontend apps have already moved away from the old Next.js/Webpack setup. The active application entry points are Vite React apps, and Module Federation is configured through app-level `vite.config.ts` files.

This document is now a current-state reference, not a future migration checklist.

## Current App Layout

```text
apps/
|-- host-shell/
|   |-- index.html
|   |-- vite.config.ts
|   `-- src/
|       |-- main.tsx
|       |-- vite/App.tsx
|       |-- components/
|       |-- config/
|       |-- federation/
|       `-- pages/
|-- analytics-mfe/
|   |-- index.html
|   |-- vite.config.ts
|   `-- src/
|       |-- main.tsx
|       `-- vite/App.tsx
|-- reports-mfe/
|   |-- index.html
|   |-- vite.config.ts
|   `-- src/
|       |-- main.tsx
|       `-- vite/App.tsx
`-- login-mfe/
    |-- index.html
    |-- vite.config.ts
    `-- src/
        |-- main.tsx
        |-- vite/App.tsx
        `-- components/
```

Some old `src/pages` or `src/deleted-app` files still exist in the host shell as compatibility or leftover migration artifacts. The active browser entry is [apps/host-shell/src/main.tsx](../../apps/host-shell/src/main.tsx), which renders [apps/host-shell/src/vite/App.tsx](../../apps/host-shell/src/vite/App.tsx).

## Current Scripts

From the repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
```

Focused app commands:

```bash
pnpm --filter host-shell dev
pnpm --filter analytics-mfe dev
pnpm --filter reports-mfe dev
pnpm --filter login-mfe dev
```

## Current Ports

| App           | Dev URL               |
| ------------- | --------------------- |
| Host shell    | http://localhost:3002 |
| Analytics MFE | http://localhost:5001 |
| Reports MFE   | http://localhost:5002 |
| Login MFE     | http://localhost:5003 |
| BFF           | http://localhost:4000 |

## Package Baseline

The active frontend apps use:

- `vite` `^5.0.0`
- `@vitejs/plugin-react-swc` `^3.5.0`
- `@module-federation/vite` `^1.15.5`
- `react` and `react-dom` `^18.3.0`
- `react-router-dom` `^6.20.0`

The host shell also uses `zustand` and shared workspace packages.

## Environment Variables

Prefer Vite-prefixed variables for browser runtime configuration:

```bash
VITE_ANALYTICS_URL=http://localhost:5001
VITE_REPORTS_URL=http://localhost:5002
VITE_LOGIN_URL=http://localhost:5003
VITE_BFF_URL=http://localhost:4000
VITE_ALLOWED_MESSAGE_ORIGINS=http://localhost:5003
```

The host has some `NEXT_PUBLIC_*` fallback reads in older compatibility code, but new frontend config should use `VITE_*`.

## Migration Notes For Remaining Cleanup

These are cleanup opportunities rather than setup steps:

- Remove stale Next.js-oriented docs and examples when they are no longer useful.
- Retire unused `src/deleted-app` and old `src/pages` files after confirming no imports depend on them.
- Keep host routes in [apps/host-shell/src/vite/App.tsx](../../apps/host-shell/src/vite/App.tsx) aligned with the sidebar route map in [apps/host-shell/src/main.tsx](../../apps/host-shell/src/main.tsx).
- Keep Docker Compose port mappings aligned with Vite app ports.

## Verification

Use these checks after frontend changes:

```bash
pnpm --filter host-shell build
pnpm --filter analytics-mfe build
pnpm --filter reports-mfe build
pnpm --filter login-mfe build
```

Then run the dev servers and verify the remote entries:

```bash
curl http://localhost:5001/remoteEntry.js
curl http://localhost:5002/remoteEntry.js
curl http://localhost:5003/remoteEntry.js
```
