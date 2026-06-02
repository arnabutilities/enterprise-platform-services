# Legacy Express BFF (archived)

These files powered the original Express + Apollo GraphQL BFF entry (`node src/index.js`).
They are **not used** at runtime anymore.

## Current entry point

- **Development:** `pnpm run start:dev` → NestJS `src/main.ts`
- **Production:** `pnpm run start:prod` → `node dist/main.js`

## Archived files

| File              | Purpose                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `index.js`        | Express app, REST auth routes, Apollo middleware                      |
| `schema.js`       | GraphQL typeDefs and resolvers                                        |
| `pkce.js`         | PKCE helper functions (ported to `@enterprise-platform/security`)     |
| `sessionStore.js` | In-memory PKCE/refresh store (replaced by Nest `CacheModule` + Redis) |
| `token.js`        | JWT sign/verify (replaced by Nest `JwtService` in `src/auth/`)        |

Do not import these from application code. Refer to them only for historical comparison.
