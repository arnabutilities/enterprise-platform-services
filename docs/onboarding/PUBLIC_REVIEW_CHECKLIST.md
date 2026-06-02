# Public Review Checklist

Use this checklist before making the repository public or asking someone external to review it.

## Files That Should Be Public

- `README.md` explains the platform, local startup, package layout, and roadmap.
- `CONTRIBUTING.md` explains setup, commands, formatting, and validation.
- `LICENSE` is present at the repository root.
- `.editorconfig`, `.prettierrc.json`, and `.prettierignore` define formatting expectations.
- `.env.example` files contain local placeholder values only.

## Files That Should Stay Local

Do not commit these unless there is a deliberate, reviewed reason:

- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.*.local`
- private keys, certificates, credentials, or real API tokens
- `dist/`, `.mf/`, `*.tsbuildinfo`, `.turbo/`, `coverage/`, and other generated output

The root `.gitignore` is configured to ignore these by default while still allowing `.env.example` templates.

## Recommended Pre-Publish Commands

Run these from the repository root:

```bash
pnpm install
pnpm format:check
pnpm build
pnpm test
pnpm lint
pnpm --filter @enterprise-platform/contracts validate
```

For a quick frontend federation smoke test:

```bash
pnpm --filter analytics-mfe build
pnpm --filter reports-mfe build
pnpm --filter login-mfe build
```

Each remote build should produce `dist/remoteEntry.js`. The Module Federation DTS plugin may print a non-fatal type-declaration generation warning until generated federation declarations are fully configured.

## Reviewer Notes

- The active frontend stack is Vite + React 18 + `@module-federation/vite`; older Next.js documents are historical references.
- The BFF auth surface is REST (`/api/auth/*`), not GraphQL.
- Observability currently means in-memory auth metrics only. OpenTelemetry, Prometheus, ELK, and Jaeger references are future expansion notes unless wired into `src`.
- Frontend app dev servers run on the host. Docker Compose currently covers Postgres, Redis, the optional BFF container, and optional Redpanda.
