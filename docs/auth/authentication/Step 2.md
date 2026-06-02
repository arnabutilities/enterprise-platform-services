# Step 2 — Authorization Request Redirect to Identity Provider (IDP)

> This document describes the detailed architecture, UI/UX behavior, internal processing, contracts, observability, security controls, and redirect orchestration for **Step 2** of the OAuth2 Authorization Code Flow with PKCE.
> This step begins after PKCE artifacts are generated in Step 1 and ends when the browser lands on the Identity Provider (IDP) login page.

Related enterprise integration context:

---

# 1. Objective

The purpose of Step 2 is to:

- Build OAuth2 `/authorize` request
- Attach PKCE parameters
- Attach OIDC parameters
- Attach CSRF state
- Validate redirect prerequisites
- Redirect browser securely to IDP
- Persist request metadata
- Emit telemetry and distributed tracing
- Start authentication session lifecycle

---

# 2. High-Level Flow

```text id="q2e2j1"
User Browser
     │
     │ Login Clicked (Step 1)
     ▼
SPA / MFE
     │
     ├─ Load PKCE artifacts
     ├─ Build authorize URL
     ├─ Validate config
     ├─ Persist request metadata
     ├─ Emit observability events
     └─ Redirect browser
              │
              ▼
Identity Provider (IDP)
/oauth2/authorize
```

---

# 3. Architecture Components

| Component               | Responsibility               |
| ----------------------- | ---------------------------- |
| SPA / MFE               | Builds authorize request     |
| Browser                 | Executes redirect            |
| Identity Provider (IDP) | Receives auth request        |
| Redis                   | Optional fraud/risk lookup   |
| Postgres                | Client config validation     |
| CDN/WAF                 | TLS termination + protection |
| Observability Stack     | Logs/traces/metrics          |

---

# 4. UI/UX Design

# 4.1 Redirect Transition Screen

Immediately after clicking login, SPA transitions to secure redirect state.

---

## UX Mockup

```text id="r67p3d"
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

# 4.2 Redirect UX Behavior

| Scenario         | UX Behavior             |
| ---------------- | ----------------------- |
| Redirect started | Show progress state     |
| Slow network     | Keep spinner active     |
| Redirect failure | Retry + support link    |
| Popup blocked    | Fallback instructions   |
| Duplicate clicks | Ignore secondary clicks |

---

# 4.3 Redirect State Machine

```text id="q9m9d9"
Idle
  │
  ▼
PreparingAuth
  │
  ▼
GeneratingAuthorizeUrl
  │
  ▼
PersistingRequestState
  │
  ▼
RedirectingToIDP
  │
  ▼
BrowserNavigation
```

---

# 4.4 Accessibility Requirements

| Requirement          | Details                        |
| -------------------- | ------------------------------ |
| WCAG                 | 2.1 AA                         |
| Loading Announcement | Required                       |
| Keyboard Safe        | Yes                            |
| Screen Reader Status | Live region                    |
| Motion Reduction     | Respect prefers-reduced-motion |

---

# 5. Internal Processing Steps

# Step 1 — Load PKCE Session

SPA loads session metadata generated in Step 1.

---

## Example

```json id="xtxxm6"
{
  "code_verifier": "abc123",
  "code_challenge": "xyz999",
  "state": "state-123",
  "nonce": "nonce-456"
}
```

---

# Step 2 — Validate PKCE Artifacts

Frontend validates:

| Validation              | Rule     |
| ----------------------- | -------- |
| code_verifier exists    | Required |
| code_challenge exists   | Required |
| state exists            | Required |
| created_at valid        | Required |
| expiration not exceeded | Required |

---

# Step 3 — Validate Client Configuration

SPA validates static auth configuration.

---

## Required Config

```ts id="1xl12v"
{
  (clientId, authority, redirectUri, scopes);
}
```

---

# Step 4 — Build Authorization Request

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

# Step 5 — Persist Request Metadata

Store request metadata before redirect.

---

## Storage Example

```json id="ow7x61"
{
  "request_id": "req_123",
  "redirect_started_at": 1716200000,
  "client_id": "acme-web",
  "authority": "https://idp.acme.com",
  "redirect_uri": "https://app.acme.com/callback"
}
```

---

# Step 6 — Emit Telemetry

Frontend emits observability events.

---

## Event Example

```json id="1r1ut3"
{
  "event": "auth_redirect_started",
  "trace_id": "trace-123",
  "client_id": "acme-web",
  "timestamp": 1716200000
}
```

---

# Step 7 — Browser Redirect

Browser navigates to IDP.

---

## Redirect Method

```ts id="a3u6ga"
window.location.assign(authorizeUrl);
```

---

# Step 8 — Browser Lands on IDP

IDP receives `/authorize` request and begins authentication flow.

---

# 6. Sequence Diagram

```text id="gk0x5o"
User           SPA/MFE           Observability          IDP
 │                 │                    │                │
 │ Click Login     │                    │                │
 │────────────────>│                    │                │
 │                 │ Load PKCE state    │                │
 │                 │ Validate config    │                │
 │                 │ Build auth URL     │                │
 │                 │ Store metadata     │                │
 │                 │───────────────────>│ Log redirect   │
 │                 │                    │                │
 │                 │ Redirect browser   │                │
 │                 │────────────────────────────────────>│
 │                 │                    │                │
 │                 │                    │                │
 │                 │                    │ Show login UI  │
```

---

# 7. Authorization Request Contract

# 7.1 Endpoint

```http id="0b0kfi"
GET /oauth2/authorize
```

---

# 7.2 Full Redirect URL

```http id="1lyczz"
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

# 7.3 Query Parameters

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

# 7.4 HTTP Headers

```http id="3ln00k"
Accept: text/html
Cache-Control: no-cache
```

---

# 7.5 Browser Redirect Behavior

| Property       | Value                |
| -------------- | -------------------- |
| Redirect Type  | Full page navigation |
| XHR Allowed    | No                   |
| iframe Allowed | No                   |
| Popup Allowed  | Optional             |
| HTTPS Required | Yes                  |

---

# 8. Browser Storage Contracts

# 8.1 Session Storage Keys

| Key                      | Purpose                 |
| ------------------------ | ----------------------- |
| pkce.code_verifier       | PKCE validation         |
| pkce.state               | CSRF protection         |
| pkce.nonce               | Replay protection       |
| auth.redirect.started_at | Metrics/troubleshooting |
| auth.request_id          | Correlation             |

---

# 8.2 TTL Rules

| Item              | TTL             |
| ----------------- | --------------- |
| PKCE State        | Browser session |
| Redirect Metadata | 10 mins         |
| nonce             | Single use      |

---

# 9. Frontend Contracts

# 9.1 TypeScript Auth Request Model

```ts id="td6vck"
type AuthorizationRequest = {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  state: string;
  nonce?: string;
};
```

---

# 9.2 Redirect Function

```ts id="ux8q4w"
async function redirectToAuthorizationServer(): Promise<void>;
```

---

# 9.3 Telemetry Event Contract

```ts id="l1b0e3"
type AuthRedirectStarted = {
  event: 'auth_redirect_started';
  request_id: string;
  trace_id: string;
  timestamp: number;
};
```

---

# 10. Observability Design

# 10.1 Events

| Event                 | Description               |
| --------------------- | ------------------------- |
| auth_redirect_started | Redirect initiated        |
| auth_url_generated    | URL successfully built    |
| auth_redirect_failed  | Redirect failure          |
| auth_config_invalid   | Misconfiguration detected |

---

# 10.2 Metrics

| Metric                | Type      |
| --------------------- | --------- |
| auth.redirect.count   | Counter   |
| auth.redirect.latency | Histogram |
| auth.redirect.failure | Counter   |

---

# 10.3 Distributed Tracing

Tracing context propagated using:

```http id="j5p84g"
traceparent
```

---

# 11. Redis Usage (Optional)

Redis may optionally be used for:

| Use Case      | Description               |
| ------------- | ------------------------- |
| Risk scoring  | Device fingerprint lookup |
| Geo anomaly   | Suspicious login region   |
| Rate limiting | Redirect abuse protection |
| Correlation   | Session mapping           |

---

# 12. Postgres Usage

Postgres typically stores:

| Table            | Purpose             |
| ---------------- | ------------------- |
| oauth_clients    | Client registration |
| redirect_uris    | Allowed redirects   |
| consent_policies | Consent config      |
| auth_audit       | Security audit      |

---

# 13. Security Design

# 13.1 PKCE Requirements

| Rule                  | Value     |
| --------------------- | --------- |
| code_challenge_method | S256 only |
| Plain method          | Forbidden |
| High entropy verifier | Required  |

---

# 13.2 Redirect URI Validation

| Rule            | Description |
| --------------- | ----------- |
| Exact match     | Required    |
| Wildcards       | Forbidden   |
| HTTPS only      | Required    |
| Registered only | Required    |

---

# 13.3 Browser Security

| Requirement     | Value     |
| --------------- | --------- |
| HTTPS           | Mandatory |
| HSTS            | Enabled   |
| CSP             | Enabled   |
| X-Frame-Options | DENY      |

---

# 13.4 CSRF Protection

Implemented using:

```text id="ywvt3o"
state parameter
```

---

# 13.5 Replay Protection

Implemented using:

```text id="t2uy50"
nonce parameter
```

---

# 13.6 Sensitive Data Rules

| Rule                  | Allowed |
| --------------------- | ------- |
| Access token in URL   | No      |
| Refresh token in URL  | No      |
| code_verifier in URL  | No      |
| code_challenge in URL | Yes     |

---

# 14. Failure Handling

# 14.1 Failure Scenarios

| Scenario                   | Action              |
| -------------------------- | ------------------- |
| Missing PKCE data          | Restart flow        |
| Invalid redirect URI       | Block redirect      |
| Crypto unavailable         | Fail login          |
| Browser navigation blocked | Show retry          |
| Config corruption          | Emit security event |

---

# 14.2 Example Failure Response

```json id="33h8v4"
{
  "error": "invalid_auth_configuration",
  "message": "Unable to start secure authentication."
}
```

---

# 15. Performance Considerations

| Area             | Recommendation   |
| ---------------- | ---------------- |
| Redirect latency | <100ms           |
| URL generation   | <5ms             |
| Telemetry        | Async            |
| Bundle loading   | Lazy auth module |
| Redirect startup | Non-blocking     |

---

# 16. Threat Model

| Threat                          | Mitigation                     |
| ------------------------------- | ------------------------------ |
| Authorization code interception | PKCE                           |
| CSRF                            | state                          |
| Replay attacks                  | nonce                          |
| Open redirect                   | Strict redirect URI validation |
| Login CSRF                      | state correlation              |
| Token leakage                   | No tokens issued yet           |

---

# 17. Success Criteria

Step 2 is successful when:

- PKCE artifacts validated
- Authorization URL generated
- state and nonce attached
- Redirect metadata persisted
- Observability events emitted
- Browser redirected successfully
- IDP receives authorize request

---

# 18. Example Data Flow Summary

```text id="vq6g9h"
User Browser
   │
   ▼
SPA/MFE
   │
   ├─ Load PKCE artifacts
   ├─ Build authorize URL
   ├─ Store metadata
   ├─ Emit telemetry
   └─ Redirect
          │
          ▼
IDP /authorize
```

---

# 19. Next Step

Next:

```text id="8f4xvq"
Step 3 — User Authentication & Consent at IDP
```

This begins credential validation, MFA, and user consent workflows.
