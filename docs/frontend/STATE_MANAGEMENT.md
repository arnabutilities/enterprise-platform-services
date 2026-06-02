# State Management

**Status**: Current implementation reference
**Last reviewed**: 2026-05-25

## Overview

The current platform does not have a central host-shell Zustand store implementation. State coordination is handled through a smaller set of mechanisms:

- React local state inside each app/MFE
- React Router navigation state in the host shell
- session storage helpers in `@enterprise-platform/platform-auth`
- auth and analytics event bridges in `@enterprise-platform/shared-pubsub`
- safe auth `postMessage` helpers in `@enterprise-platform/runtime`
- host-side subscriptions in login and analytics integration code

`zustand` is installed in `host-shell`, but the documented multi-store setup from the older plan is not present in the current codebase.

## Current Auth Session State

Auth session helpers live in [packages/platform-auth/src/session.ts](../../packages/platform-auth/src/session.ts).

They store auth data in `sessionStorage` with these keys:

| Key                          | Purpose                       |
| ---------------------------- | ----------------------------- |
| `platform.auth.user`         | serialized authenticated user |
| `platform.auth.accessToken`  | access token                  |
| `platform.auth.refreshToken` | refresh token                 |

Exports:

- `persistAuthSession(session)`
- `getAuthSession()`
- `getAccessToken()`
- `getAuthUser()`
- `clearAuthSession()`
- `isAuthenticated()`

## Auth Events

Auth event contracts live in [contracts/src/events/auth-events.ts](../../contracts/src/events/auth-events.ts).

Auth event publishing/subscription lives in [packages/shared-pubsub/src/auth.ts](../../packages/shared-pubsub/src/auth.ts).

Supported auth events:

- `auth.session.created`
- `auth.session.failed`
- `auth.session.expired`
- `auth.logout`

The pub/sub helper dispatches events through:

- in-memory handlers
- `window.dispatchEvent`
- `window.parent.postMessage` for allowed origins
- `localStorage` bridge for cross-tab propagation

## Login MFE Integration

The host login container is [apps/host-shell/src/components/mfe-container-components/LoginContainer.tsx](../../apps/host-shell/src/components/mfe-container-components/LoginContainer.tsx).

It:

- reads `VITE_BFF_URL`
- reads `VITE_ALLOWED_MESSAGE_ORIGINS`
- passes `bffBaseUrl`, `allowedOrigins`, and auth callbacks to the login remote
- subscribes to auth events with `subscribeAuthEvent`
- dispatches `host.auth.success` when a session is created
- wraps the remote in `MFEBoundary`

## Analytics Events

Analytics pub/sub exports live in [packages/shared-pubsub/src/index.ts](../../packages/shared-pubsub/src/index.ts).

Current helpers:

- `publishAnalyticsEvent(event)`
- `subscribeAnalyticsEvent(handler)`
- `connectAnalyticsStorageBridge()`

The host also has [apps/host-shell/src/hooks/useMfeEventBus.ts](../../apps/host-shell/src/hooks/useMfeEventBus.ts), which listens for `analytics.filters.changed.v1` custom events and can publish events with `window.dispatchEvent`.

## Runtime Message Safety

Runtime auth message helpers live in [runtime/src/auth/post-message-bridge.ts](../../runtime/src/auth/post-message-bridge.ts):

- `createAuthSafePostMessage(allowedOrigins)`
- `isAllowedAuthMessageOrigin(origin, allowedOrigins)`
- `parseAuthMessageData(data)`

Use these helpers when passing auth events across window boundaries.

## Current Navigation State

The host shell uses React Router. The active entry is [apps/host-shell/src/main.tsx](../../apps/host-shell/src/main.tsx), which wraps the shell in `BrowserRouter` and renders [apps/host-shell/src/vite/App.tsx](../../apps/host-shell/src/vite/App.tsx).

Current host routes include:

- `/`
- `/configure-analytics-mfe`
- `/login`

The sidebar route map also contains `/reports`, but the active Vite route file does not currently render the reports container. Keep these in sync when changing navigation.

## When To Add Zustand

Add a shared Zustand store only when there is a concrete cross-app state requirement that cannot be handled cleanly with the current session/event helpers.

Good candidates:

- global user/session state needed by multiple host components
- notification state owned by the host shell
- durable MFE load/error state
- shared user preferences such as theme

Avoid storing access or refresh tokens in long-lived local storage. The current session helper uses `sessionStorage`; the BFF also sets an HTTP-only access-token cookie during auth exchange.

## Recommended Next Steps

1. Decide whether host-level UI/auth state needs a real Zustand store.
2. If yes, create a small store in `apps/host-shell/src/store` and migrate one concern at a time.
3. Keep token handling centralized in `@enterprise-platform/platform-auth`.
4. Keep cross-MFE communication event-driven through `@enterprise-platform/shared-pubsub`.
5. Align host routes so sidebar links and active Vite routes match.
6. Add tests around auth session persistence and event bridge behavior before expanding state coordination.

## Validation

Useful checks after state or event changes:

```bash
pnpm --filter @enterprise-platform/contracts build
pnpm --filter @enterprise-platform/platform-auth build
pnpm --filter @enterprise-platform/shared-pubsub build
pnpm --filter @enterprise-platform/runtime build
pnpm --filter host-shell build
pnpm --filter login-mfe build
```

Some packages currently do not define full test/lint scripts, so build checks are the most reliable baseline.
