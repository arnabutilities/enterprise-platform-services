# Step 2 — Authorization Request Redirect to Identity Provider (IDP) via NestJS BFF

> This document describes the detailed architecture, UI/UX behavior, internal processing, contracts, observability, security controls, and redirect orchestration for **Step 2** of the OAuth2 Authorization Code Flow with PKCE in a **Microfrontend (MFE) Architecture with a NestJS BFF layer**.
>
> This step begins after PKCE artifacts are generated and persisted by the NestJS BFF in Step 1 and ends when the browser lands on the Identity Provider (IDP) login page.

Reference architecture aligned with uploaded integration blueprint and Step 2 design. fileciteturn1file0 fileciteturn1file1

---

# 1. Objective

The purpose of Step 2 is to:

- Initiate OAuth2 `/authorize` redirect through the NestJS BFF
- Attach PKCE parameters securely
- Attach OIDC parameters
- Attach CSRF state
- Validate redirect prerequisites
- Persist redirect metadata centrally
- Emit telemetry and distributed tracing
- Redirect browser securely to IDP
- Start centralized authentication session lifecycle
- Prevent MFEs from directly handling PKCE internals

---

# 2. Updated High-Level Flow (MFE → BFF → IDP)

```text
User Browser
     │
     │ Login Clicked (Step 1)
     ▼
SPA / MFE
     │
     ├─ Call NestJS BFF
     │
     ▼
NestJS BFF
     │
     ├─ Load PKCE session from Redis
     ├─ Validate auth session
     ├─ Build authorize URL
     ├─ Persist redirect metadata
     ├─ Emit telemetry/traces
     └─ Return redirect URL
             │
             ▼
Browser Redirect
             │
             ▼
Identity Provider (IDP)
/oauth2/authorize
```

---

# 3. Architecture Components

| Component               | Responsibility                             |
| ----------------------- | ------------------------------------------ |
| Root App / Shell        | Shared authentication boundary             |
| SPA / MFE               | Initiates redirect flow via BFF            |
| NestJS BFF              | Builds and validates authorization request |
| Redis                   | Stores PKCE/auth redirect session          |
| Postgres                | Client config + redirect URI validation    |
| Identity Provider (IDP) | Receives authorization request             |
| Observability Stack     | Metrics, traces, logs, audit events        |
| CDN/WAF                 | TLS termination + bot/rate protection      |

---

# 4. Why the BFF Layer Changes Step 2

In a SPA-only architecture:

- Frontend builds `/authorize` URL directly
- Frontend stores PKCE metadata locally
- Browser directly manages auth session state

In the MFE + NestJS BFF architecture:

- Authorization URL generation is centralized in BFF
- PKCE artifacts remain server-managed
- Redirect/session metadata is stored in Redis
- MFEs become lightweight UI clients
- Security policies are centralized
- Authentication telemetry is unified
- Redirect validation is enforced consistently

This improves:

- Security
- Auditability
- MFE consistency
- Compliance posture
- Session lifecycle governance

---

# 5. UI/UX Design

# 5.1 Redirect Transition Screen

Immediately after clicking login, MFE transitions to secure redirect state.

---

## UX Mockup

```text
┌────────────────────────────────────────────┐
│ ACME Analytics                            │
│────────────────────────────────────────────│
│                                            │
│             Redirecting Securely           │
│                                            │
│     Connecting to Identity Provider...     │
│                                            │
│                 ⏳                         │
│                                            │
│     Please wait while we sign you in.      │
│                                            │
└────────────────────────────────────────────┘
```

---

# 5.2 Redirect UX Behavior

| Scenario         | UX Behavior               |
| ---------------- | ------------------------- |
| Redirect started | Show progress state       |
| Waiting on BFF   | Show secure loading state |
| Slow network     | Keep spinner active       |
| Redirect failure | Retry + support link      |
| Popup blocked    | Fallback instructions     |
| Duplicate clicks | Ignore secondary clicks   |

---

# 5.3 Redirect State Machine

```text
Idle
  │
  ▼
CallingBFF
  │
  ▼
ValidatingAuthSession
  │
  ▼
GeneratingAuthorizeUrl
  │
  ▼
PersistingRedirectState
  │
  ▼
RedirectingToIDP
  │
  ▼
BrowserNavigation
```

---

# 5.4 Accessibility Requirements

| Requirement          | Details                        |
| -------------------- | ------------------------------ |
| WCAG                 | 2.1 AA                         |
| Loading Announcement | Required                       |
| Keyboard Safe        | Yes                            |
| Screen Reader Status | Live region                    |
| Motion Reduction     | Respect prefers-reduced-motion |

---

# 6. Internal Processing Steps

# Step 1 — MFE Calls NestJS BFF

Frontend invokes:

```http
POST /api/auth/authorize
```

---

## Request Example

```json
{
  "redirect_uri": "https://app.acme.com/callback"
}
```

---

# Step 2 — BFF Loads PKCE Session

NestJS BFF loads PKCE session from Redis.

---

## Example Redis Session

```json
{
  "session_id": "sess_123",
  "code_verifier": "abc123",
  "code_challenge": "xyz999",
  "state": "state-123",
  "nonce": "nonce-456"
}
```

---

# Step 3 — BFF Validates Session State

BFF validates:

| Validation                 | Rule     |
| -------------------------- | -------- |
| PKCE session exists        | Required |
| code_challenge exists      | Required |
| state exists               | Required |
| Session not expired        | Required |
| Redirect URI valid         | Required |
| Client configuration valid | Required |

---

# Step 4 — BFF Loads Client Configuration

BFF validates OAuth client configuration.

---

## Required Config

```ts
{
  (clientId, authority, redirectUri, scopes);
}
```

---

# Step 5 — BFF Builds Authorization Request

Construct OAuth2 authorization URL.

---

## Authorization Parameters

| Parameter                  | Purpose                 |
| -------------------------- | ----------------------- |
| response_type=code         | Authorization code flow |
| client_id                  | OAuth client            |
| redirect_uri               | Callback endpoint       |
| scope                      | Requested permissions   |
| code_challenge             | PKCE verification       |
| code_challenge_method=S256 | PKCE hashing method     |
| state                      | CSRF protection         |
| nonce                      | OIDC replay protection  |

---

# Step 6 — BFF Persists Redirect Metadata

Store redirect metadata in Redis.

---

## Storage Example

```json
{
  "request_id": "req_123",
  "redirect_started_at": 1716200000,
  "client_id": "acme-web",
  "authority": "https://idp.acme.com",
  "redirect_uri": "https://app.acme.com/callback"
}
```

---

# Step 7 — BFF Emits Telemetry

BFF emits observability events.

---

## Event Example

```json
{
  "event": "auth_redirect_started",
  "source": "nestjs-bff",
  "trace_id": "trace-123",
  "client_id": "acme-web",
  "timestamp": 1716200000
}
```

---

# Step 8 — BFF Returns Redirect URL

BFF response:

```json
{
  "redirectUrl": "https://idp.acme.com/oauth2/authorize?..."
}
```

---

# Step 9 — Browser Redirect

Frontend performs redirect:

```ts
window.location.assign(redirectUrl);
```

---

# Step 10 — Browser Lands on IDP

IDP receives `/authorize` request and begins authentication flow.

---

# 7. Updated Sequence Diagram

```text
User          SPA/MFE         NestJS BFF         Redis         Postgres        Observability        IDP
 │                │                 │                │               │                 │              │
 │ Click Login    │                 │                │               │                 │              │
 │───────────────>│                 │                │               │                 │              │
 │                │ POST /authorize │                │               │                 │              │
 │                │────────────────>│                │               │                 │              │
 │                │                 │ Load session   │               │                 │              │
 │                │                 │───────────────>│               │                 │              │
 │                │                 │ Validate config│──────────────>│                 │              │
 │                │                 │ Build auth URL │               │                 │              │
 │                │                 │ Persist metadata                │                 │              │
 │                │                 │───────────────>│               │                 │              │
 │                │                 │ Emit telemetry │               │────────────────>│              │
 │                │<────────────────│ redirectUrl    │               │                 │              │
 │                │                 │                │               │                 │              │
 │                │ Redirect browser                │               │                 │              │
 │                │──────────────────────────────────────────────────────────────────────────────────>│
 │                │                 │                │               │                 │              │
 │                │                 │                │               │                 │ Show login UI│
```

---

# 8. Authorization Request Contract

# 8.1 Endpoint

```http
GET /oauth2/authorize
```

---

# 8.2 Full Redirect URL

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

# 8.3 Query Parameters

| Parameter             | Required  | Description             |
| --------------------- | --------- | ----------------------- |
| response_type         | Yes       | Must be `code`          |
| client_id             | Yes       | OAuth client identifier |
| redirect_uri          | Yes       | Registered redirect URI |
| scope                 | Yes       | Requested scopes        |
| code_challenge        | Yes       | PKCE challenge          |
| code_challenge_method | Yes       | Must be `S256`          |
| state                 | Yes       | CSRF protection         |
| nonce                 | OIDC only | Replay protection       |
| prompt                | Optional  | login/consent           |
| ui_locales            | Optional  | Localization            |
| max_age               | Optional  | Session freshness       |

---

# 8.4 HTTP Headers

```http
Accept: text/html
Cache-Control: no-cache
```

---

# 8.5 Browser Redirect Behavior

| Property       | Value                |
| -------------- | -------------------- |
| Redirect Type  | Full page navigation |
| XHR Allowed    | No                   |
| iframe Allowed | No                   |
| Popup Allowed  | Optional             |
| HTTPS Required | Yes                  |

---

# 9. NestJS BFF Contracts

# 9.1 Redirect Endpoint

```http
POST /api/auth/authorize
```

---

# 9.2 Request DTO

```ts
export class AuthorizationRedirectDto {
  redirect_uri: string;
}
```

---

# 9.3 Response DTO

```ts
export class AuthorizationRedirectResponse {
  redirectUrl: string;
}
```

---

# 9.4 NestJS Controller Example

```ts
@Controller('auth')
export class AuthController {
  @Post('authorize')
  async authorize(@Body() dto: AuthorizationRedirectDto) {
    return this.authService.buildAuthorizeRedirect(dto);
  }
}
```

---

# 10. Redis Session Design

# 10.1 Redis Keys

| Key                       | Purpose            |
| ------------------------- | ------------------ |
| auth:pkce:{sessionId}     | PKCE session state |
| auth:redirect:{requestId} | Redirect tracking  |
| auth:state:{state}        | CSRF validation    |

---

# 10.2 TTL Rules

| Item              | TTL        |
| ----------------- | ---------- |
| PKCE session      | 5 minutes  |
| Redirect metadata | 10 minutes |
| nonce             | Single use |

---

# 11. Frontend Integration (MFE)

# 11.1 Redirect Function

```ts
export async function redirectToAuthorizationServer() {
  const response = await fetch('/api/auth/authorize', {
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

  window.location.assign(data.redirectUrl);
}
```

---

# 11.2 MFE Responsibilities

MFEs should:

- Trigger login initiation only
- Never generate PKCE artifacts
- Never construct authorize URLs
- Never directly communicate with IDP
- Consume centralized auth SDK/session state

---

# 12. Observability Design

# 12.1 Events

| Event                 | Source | Description               |
| --------------------- | ------ | ------------------------- |
| auth_redirect_started | BFF    | Redirect initiated        |
| auth_url_generated    | BFF    | URL successfully built    |
| auth_redirect_failed  | BFF    | Redirect failure          |
| auth_config_invalid   | BFF    | Misconfiguration detected |

---

# 12.2 Metrics

| Metric                         | Type      |
| ------------------------------ | --------- |
| auth.redirect.count            | Counter   |
| auth.redirect.latency          | Histogram |
| auth.redirect.failure          | Counter   |
| auth.redis.lookup.latency      | Histogram |
| auth.config.validation.failure | Counter   |

---

# 12.3 Distributed Tracing

Tracing context propagated across:

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

# 13. Postgres Usage

Postgres typically stores:

| Table            | Purpose             |
| ---------------- | ------------------- |
| oauth_clients    | Client registration |
| redirect_uris    | Allowed redirects   |
| consent_policies | Consent config      |
| auth_audit       | Security audit      |

---

# 14. Security Design

# 14.1 PKCE Requirements

| Rule                  | Value     |
| --------------------- | --------- |
| code_challenge_method | S256 only |
| Plain method          | Forbidden |
| High entropy verifier | Required  |

---

# 14.2 BFF Security Benefits

| Improvement                     | Description                     |
| ------------------------------- | ------------------------------- |
| Centralized redirect validation | Prevent inconsistent auth flows |
| Reduced browser exposure        | PKCE stays backend-managed      |
| Unified auth policy             | Shared across MFEs              |
| Central audit trail             | Enterprise observability        |
| Shared rate limiting            | Auth abuse mitigation           |

---

# 14.3 Redirect URI Validation

| Rule            | Description |
| --------------- | ----------- |
| Exact match     | Required    |
| Wildcards       | Forbidden   |
| HTTPS only      | Required    |
| Registered only | Required    |

---

# 14.4 Browser Security

| Requirement      | Value     |
| ---------------- | --------- |
| HTTPS            | Mandatory |
| HSTS             | Enabled   |
| CSP              | Enabled   |
| X-Frame-Options  | DENY      |
| Secure cookies   | Required  |
| SameSite cookies | Enabled   |

---

# 14.5 CSRF Protection

Implemented using:

```text
state parameter
```

Combined with:

- BFF validation
- SameSite cookies
- Session correlation

---

# 14.6 Replay Protection

Implemented using:

```text
nonce parameter
```

---

# 14.7 Sensitive Data Rules

| Rule                  | Allowed |
| --------------------- | ------- |
| Access token in URL   | No      |
| Refresh token in URL  | No      |
| code_verifier in URL  | No      |
| code_challenge in URL | Yes     |
| Tokens stored in MFE  | No      |

---

# 15. Failure Handling

# 15.1 Failure Scenarios

| Scenario                   | Action              |
| -------------------------- | ------------------- |
| Missing Redis session      | Restart flow        |
| Invalid redirect URI       | Block redirect      |
| Redis unavailable          | Fail closed         |
| Browser navigation blocked | Show retry          |
| Config corruption          | Emit security event |
| BFF timeout                | Retry-safe response |

---

# 15.2 Example Failure Response

```json
{
  "error": "invalid_auth_configuration",
  "message": "Unable to start secure authentication.",
  "trace_id": "trace-123"
}
```

---

# 16. Performance Considerations

| Area             | Recommendation   |
| ---------------- | ---------------- |
| Redirect latency | <100ms           |
| Redis lookup     | <10ms            |
| URL generation   | <5ms             |
| Telemetry        | Async            |
| Redirect startup | Non-blocking     |
| Auth SDK         | Shared singleton |

---

# 17. Threat Model

| Threat                          | Mitigation                     |
| ------------------------------- | ------------------------------ |
| Authorization code interception | PKCE                           |
| CSRF                            | state                          |
| Replay attacks                  | nonce                          |
| Open redirect                   | Strict redirect URI validation |
| Login CSRF                      | state correlation              |
| Token leakage                   | No tokens issued yet           |
| MFE auth fragmentation          | Centralized BFF                |

---

# 18. Success Criteria

Step 2 is successful when:

- PKCE session loaded successfully
- Authorization URL generated
- state and nonce attached
- Redirect metadata persisted in Redis
- Observability events emitted
- Browser redirected successfully
- IDP receives authorize request
- No PKCE secrets exposed to MFEs

---

# 19. Updated Data Flow Summary

```text
User Browser
   │
   ▼
SPA/MFE
   │
   ├─ Call NestJS BFF
   │
   ▼
NestJS BFF
   │
   ├─ Load PKCE session
   ├─ Build authorize URL
   ├─ Store redirect metadata
   ├─ Emit telemetry
   └─ Return redirect URL
          │
          ▼
Browser Redirect
          │
          ▼
IDP /authorize
```

---

# 20. Recommended Enterprise Enhancements

| Enhancement                 | Purpose                     |
| --------------------------- | --------------------------- |
| API Gateway before BFF      | Central ingress control     |
| OpenTelemetry               | Unified tracing             |
| Shared Auth SDK             | MFE consistency             |
| Device fingerprinting       | Risk analysis               |
| Rate limiting               | Redirect abuse protection   |
| WAF bot protection          | Credential stuffing defense |
| Distributed session tracing | End-to-end observability    |

---

# 21. Next Step

Next:

```text
Step 3 — User Authentication & Consent at IDP
```

This begins credential validation, MFA, consent workflows, and identity verification through the centralized NestJS BFF authentication architecture.
