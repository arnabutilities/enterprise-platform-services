# Step 1 — User Initiates Login (PKCE Authorization Flow via NestJS BFF)

> This document describes the detailed architecture, UI/UX behavior, security model, contracts, observability events, storage strategy, and interaction sequence for **Step 1** of the PKCE Authentication Flow in a **Microfrontend (MFE) Architecture with a NestJS BFF layer**.
>
> The step starts when the user clicks **Login** and ends when the browser is redirected to the Identity Provider (IDP) authorization endpoint.

Reference architecture aligned with uploaded integration blueprint and Step 1 design. fileciteturn0file0 fileciteturn0file1

---

# 1. Objective

The purpose of Step 1 is to:

- Initialize the OAuth2 Authorization Code + PKCE flow
- Centralize authentication orchestration through the NestJS BFF
- Generate PKCE cryptographic artifacts
- Generate CSRF protection state
- Persist transient authentication metadata securely
- Build authorization request through the backend layer
- Emit observability/audit telemetry
- Redirect browser securely to `/authorize`
- Prevent direct browser coupling to IDP internals

---

# 2. Updated High-Level Flow (MFE + BFF)

```text
User
  │
  │ Click Login
  ▼
SPA / MFE Application
  │
  ├─ Call NestJS BFF /auth/login
  │
  ▼
NestJS BFF
  │
  ├─ Generate code_verifier
  ├─ Generate code_challenge
  ├─ Generate state
  ├─ Generate nonce
  ├─ Persist transient auth session
  ├─ Emit telemetry/events
  ├─ Build authorize URL
  └─ Return redirect URL
  │
  ▼
Browser Redirect
  │
  ▼
Identity Provider (IDP)
```

---

# 3. Architecture Components

| Component               | Responsibility                                 |
| ----------------------- | ---------------------------------------------- |
| Root App / Shell        | Hosts microfrontends and shared auth boundary  |
| SPA / MFE               | Initiates login flow via BFF                   |
| NestJS BFF              | Central authentication orchestration layer     |
| Redis                   | Stores transient PKCE/auth state               |
| Postgres                | Audit/compliance/event persistence             |
| Identity Provider (IDP) | Receives authorize request                     |
| Observability Stack     | Metrics, tracing, logs, audit events           |
| CDN/WAF                 | TLS termination, bot protection, rate limiting |

---

# 4. Why the BFF Layer Changes the Flow

In a traditional SPA-only PKCE implementation, the frontend generates and stores PKCE artifacts locally.

In this architecture:

- PKCE generation is delegated to the NestJS BFF
- Sensitive transient state is stored server-side
- MFEs do not directly interact with the IDP
- The BFF becomes the trusted authentication orchestrator
- Security policies become centralized
- Observability becomes unified across MFEs
- Token lifecycle management becomes backend-controlled

This significantly improves:

- Security posture
- Auditability
- Enterprise governance
- Session consistency
- Multi-MFE authentication coordination

---

# 5. Updated Login Flow

```text
┌───────────┐
│ User      │
└─────┬─────┘
      │ Click Login
      ▼
┌───────────┐
│ SPA / MFE │
└─────┬─────┘
      │ POST /auth/login
      ▼
┌───────────────┐
│ NestJS BFF    │
├───────────────┤
│ Generate PKCE │
│ Generate state│
│ Persist Redis │
│ Emit telemetry│
│ Build redirect│
└─────┬─────────┘
      │ 302 / redirectUrl
      ▼
┌───────────┐
│ Browser   │
└─────┬─────┘
      │ Redirect
      ▼
┌───────────┐
│ IDP       │
└───────────┘
```

---

# 6. UI/UX Design

# 6.1 Login Screen Layout

```text
┌────────────────────────────────────────────┐
│ ACME Analytics                            │
│────────────────────────────────────────────│
│                                            │
│        Welcome Back                        │
│                                            │
│    Sign in to continue securely            │
│                                            │
│   ┌──────────────────────────────────┐     │
│   │           Login                  │     │
│   └──────────────────────────────────┘     │
│                                            │
│                  OR                        │
│                                            │
│   ┌──────────────────────────────────┐     │
│   │         Login with SSO           │     │
│   └──────────────────────────────────┘     │
│                                            │
│   Terms • Privacy • Help                   │
│                                            │
└────────────────────────────────────────────┘
```

---

# 6.2 UX Behavior

| User Action          | System Behavior                   |
| -------------------- | --------------------------------- |
| Click Login          | Disable button immediately        |
| During BFF request   | Show loading spinner              |
| Waiting for redirect | Display “Redirecting securely...” |
| Network failure      | Retry-safe error state            |
| Double click         | Debounced at frontend + BFF       |
| Slow network         | Spinner + retry messaging         |

---

# 6.3 Accessibility Requirements

| Requirement         | Details                  |
| ------------------- | ------------------------ |
| WCAG                | WCAG 2.1 AA              |
| Keyboard Navigation | Full support             |
| ARIA Labels         | Required                 |
| Contrast Ratio      | Minimum 4.5:1            |
| Focus State         | Visible focus indicators |
| Screen Readers      | Announce loading state   |

---

# 7. Internal Processing Steps

# Step 1 — User Clicks Login

Frontend login component invokes:

```ts
await authService.login();
```

---

# Step 2 — SPA Calls NestJS BFF

Frontend calls:

```http
POST /api/auth/login
```

Request:

```json
{
  "redirect_uri": "https://app.acme.com/callback"
}
```

---

# Step 3 — BFF Generates `code_verifier`

NestJS BFF generates cryptographically secure verifier.

## Requirements

| Requirement | Value             |
| ----------- | ----------------- |
| Entropy     | High              |
| Length      | 43–128 chars      |
| Charset     | RFC7636 compliant |

---

## Example

```text
Kf9A_91abZZ0PqLx2n9x....
```

---

## Node.js API

```ts
crypto.randomBytes();
```

---

# Step 4 — BFF Generates `code_challenge`

```text
code_challenge = BASE64URL(SHA256(code_verifier))
```

---

# Step 5 — BFF Generates `state`

Cryptographically secure anti-CSRF value.

---

# Step 6 — BFF Generates Optional `nonce`

Used for OIDC replay protection.

---

# Step 7 — BFF Persists Auth Session

Transient login session stored in Redis.

```json
{
  "session_id": "sess_123",
  "code_verifier": "Kf9A...",
  "code_challenge": "abc123...",
  "state": "xyz123",
  "nonce": "nonce123",
  "redirect_uri": "https://app.acme.com/callback",
  "created_at": 1716200000
}
```

---

# Step 8 — BFF Emits Observability Events

Telemetry emitted centrally.

```json
{
  "event": "login_initiated",
  "source": "nestjs-bff",
  "client_id": "acme-web",
  "timestamp": 1716200000,
  "trace_id": "trace-123"
}
```

---

# Step 9 — BFF Builds `/authorize` URL

Construct OAuth2 authorization request.

---

# Step 10 — Browser Redirect

BFF returns redirect URL.

Frontend performs:

```ts
window.location.href = response.redirectUrl;
```

---

# 8. Updated Sequence Diagram

```text
User          SPA/MFE          NestJS BFF         Redis          Observability        IDP
 │                │                  │                │                  │              │
 │ Click Login    │                  │                │                  │              │
 │───────────────>│                  │                │                  │              │
 │                │ POST /auth/login │                │                  │              │
 │                │─────────────────>│                │                  │              │
 │                │                  │ Generate PKCE  │                  │              │
 │                │                  │ Generate state │                  │              │
 │                │                  │ Store session  │                  │              │
 │                │                  │───────────────>│                  │              │
 │                │                  │ Emit events    │                  │              │
 │                │                  │──────────────────────────────────>│              │
 │                │                  │ Build redirect │                  │              │
 │                │<─────────────────│ redirectUrl    │                  │              │
 │                │                  │                │                  │              │
 │                │ Redirect browser │                │                  │              │
 │                │────────────────────────────────────────────────────────────────────>│
```

---

# 9. NestJS BFF API Contract

# 9.1 Login Endpoint

```http
POST /api/auth/login
```

---

# 9.2 Request Contract

```json
{
  "redirect_uri": "https://app.acme.com/callback"
}
```

---

# 9.3 Response Contract

```json
{
  "redirectUrl": "https://idp.acme.com/oauth2/authorize?...",
  "expiresIn": 300
}
```

---

# 9.4 NestJS DTO

```ts
export class LoginRequestDto {
  redirect_uri: string;
}
```

---

# 9.5 NestJS Controller Example

```ts
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginRequestDto) {
    return this.authService.startLogin(dto);
  }
}
```

---

# 10. Authorization Request Contract

# 10.1 Endpoint

```http
GET /oauth2/authorize
```

---

# 10.2 Full Example

```http
https://idp.acme.com/oauth2/authorize?
response_type=code&
client_id=acme-web&
redirect_uri=https%3A%2F%2Fapp.acme.com%2Fcallback&
scope=openid%20profile%20email&
code_challenge=abc123&
code_challenge_method=S256&
state=xyz123&
nonce=nonce123
```

---

# 10.3 Query Parameters

| Parameter             | Required  | Description         |
| --------------------- | --------- | ------------------- |
| response_type         | Yes       | Must be `code`      |
| client_id             | Yes       | OAuth client        |
| redirect_uri          | Yes       | Registered callback |
| scope                 | Yes       | Requested scopes    |
| code_challenge        | Yes       | PKCE challenge      |
| code_challenge_method | Yes       | `S256`              |
| state                 | Yes       | CSRF protection     |
| nonce                 | OIDC only | Replay protection   |

---

# 11. Redis Session Design

# 11.1 Redis Keys

| Key                   | Purpose                |
| --------------------- | ---------------------- |
| auth:pkce:{sessionId} | PKCE session state     |
| auth:state:{state}    | CSRF validation lookup |
| auth:nonce:{nonce}    | Replay protection      |

---

# 11.2 Example Redis Object

```json
{
  "session_id": "sess_123",
  "code_verifier": "abc123",
  "state": "xyz123",
  "nonce": "nonce123",
  "created_at": 1716200000
}
```

---

# 11.3 TTL Rules

| Item         | TTL       |
| ------------ | --------- |
| PKCE Session | 5 minutes |
| state        | 5 minutes |
| nonce        | 5 minutes |

---

# 12. Frontend Integration (MFE)

# 12.1 Login Service

```ts
export async function login() {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      redirect_uri: window.location.origin + '/callback',
    }),
  });

  const data = await response.json();

  window.location.href = data.redirectUrl;
}
```

---

# 12.2 Shared Auth Boundary Across MFEs

Authentication state should be centralized in:

- Root shell
- Shared auth SDK
- Zustand/global store
- Shared session context

MFEs should:

- Never generate tokens independently
- Never directly communicate with IDP
- Consume authenticated session from shell/BFF

---

# 13. Observability Design

# 13.1 Events

| Event                | Source | Purpose                 |
| -------------------- | ------ | ----------------------- |
| login_initiated      | SPA    | User clicked login      |
| auth_login_requested | BFF    | Auth flow started       |
| pkce_generated       | BFF    | PKCE generation success |
| redirect_started     | BFF    | Redirect initiated      |
| redirect_failed      | BFF    | Redirect failure        |

---

# 13.2 Metrics

| Metric                   | Type      |
| ------------------------ | --------- |
| auth.login.started       | Counter   |
| auth.pkce.generated      | Counter   |
| auth.redirect.latency    | Histogram |
| auth.pkce.errors         | Counter   |
| auth.redis.write.latency | Histogram |

---

# 13.3 Distributed Tracing

Tracing propagated across:

- Browser
- API Gateway
- NestJS BFF
- Redis
- IDP integrations

Using:

```http
traceparent
```

---

# 14. Security Design

# 14.1 PKCE Requirements

| Rule         | Required  |
| ------------ | --------- |
| S256 only    | Yes       |
| Plain method | Forbidden |
| High entropy | Required  |

---

# 14.2 BFF Security Benefits

| Improvement              | Description                   |
| ------------------------ | ----------------------------- |
| Centralized auth         | One auth orchestration layer  |
| Reduced browser exposure | PKCE artifacts server-managed |
| Unified security policy  | Shared across MFEs            |
| Easier token rotation    | Backend-managed               |
| Better auditing          | Central event stream          |

---

# 14.3 Storage Security

| Rule                         | Description             |
| ---------------------------- | ----------------------- |
| Redis only for verifier      | Avoid browser exposure  |
| HttpOnly cookies preferred   | Avoid JS access         |
| Tokens never in localStorage | Prevent XSS persistence |
| Session-scoped state         | Short-lived only        |

---

# 14.4 Transport Security

| Requirement    | Value     |
| -------------- | --------- |
| HTTPS only     | Mandatory |
| TLS            | 1.2+      |
| HSTS           | Enabled   |
| Secure Cookies | Enabled   |

---

# 14.5 CSP Requirements

```http
Content-Security-Policy:
default-src 'self';
frame-ancestors 'none';
```

---

# 14.6 CSRF Protection

Implemented using:

```text
state parameter
```

Combined with:

- SameSite cookies
- BFF validation
- Origin validation

---

# 15. Error Handling

| Scenario                  | Action              |
| ------------------------- | ------------------- |
| Redis unavailable         | Fail closed         |
| PKCE generation failure   | Emit telemetry      |
| Invalid redirect URI      | Reject request      |
| IDP configuration missing | Block login         |
| Double login click        | Debounce            |
| BFF timeout               | Retry-safe response |

---

# 16. Failure Response Example

```json
{
  "error": "login_initialization_failed",
  "message": "Unable to initialize secure login.",
  "trace_id": "trace-123"
}
```

---

# 17. Performance Considerations

| Area             | Recommendation     |
| ---------------- | ------------------ |
| PKCE generation  | <5ms               |
| Redis write      | <10ms              |
| Redirect startup | <100ms             |
| Telemetry        | Async/non-blocking |
| Auth SDK         | Shared singleton   |

---

# 18. Threat Model

| Threat                          | Mitigation               |
| ------------------------------- | ------------------------ |
| Authorization code interception | PKCE                     |
| CSRF                            | state                    |
| Replay attack                   | nonce                    |
| Token leakage                   | Backend-managed tokens   |
| MFE auth fragmentation          | Centralized BFF          |
| XSS persistence                 | No localStorage tokens   |
| Session fixation                | Short-lived auth session |

---

# 19. Success Criteria

Step 1 is successful when:

- User clicked login
- SPA successfully contacted BFF
- PKCE artifacts generated
- state generated
- Redis auth session persisted
- telemetry emitted
- redirect URL generated
- browser redirected to IDP
- no sensitive token exposed to MFEs

---

# 20. Recommended Enterprise Enhancements

| Enhancement            | Purpose                     |
| ---------------------- | --------------------------- |
| API Gateway before BFF | Central ingress control     |
| Rate limiting          | Prevent auth abuse          |
| Device fingerprinting  | Risk analysis               |
| Bot detection          | Credential stuffing defense |
| OpenTelemetry          | Unified tracing             |
| Shared auth SDK        | MFE consistency             |
| Edge WAF policies      | DDoS mitigation             |

---

# 21. Next Step

Next:

```text
Step 2 — IDP Authorization Request + Authentication Challenge
```

This continues the OAuth2 Authorization Code + PKCE flow through the NestJS BFF orchestration layer.
