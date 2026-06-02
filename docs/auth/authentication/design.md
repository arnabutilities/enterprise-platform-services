# Step 1 — User Initiates Login (PKCE Authorization Flow)

> Detailed technical design document for OAuth2 Authorization Code Flow with PKCE — Step 1.

This step starts when the user clicks **Login** or **Login with SSO** and ends when the SPA redirects the browser to the Identity Provider (IDP) authorization endpoint.

**Functional reference:** `Step 1.md`  
**Design reference pattern:** `step-2-auth-request-design-document.md` through `step-12-logout-revocation-cleanup-design-document.md`

Related enterprise integration context: `docs/auth/login-mfe-pkce-implementation.md`, `docs/backend/NESTJS_BFF_PKCE_GRAPHQL.md`

---

# 1. Objective

The purpose of Step 1 is to:

- Initialize the OAuth2 Authorization Code + PKCE flow
- Generate PKCE cryptographic artifacts
- Generate CSRF protection state
- Persist transient authentication metadata
- Prepare redirect request to IDP
- Support Google SSO as an external provider variant
- Emit observability/audit telemetry
- Redirect browser securely to `/authorize`

---

# 2. High-Level Flow

```text
User
  │
  │ Click Login / Login with SSO
  ▼
SPA / MFE Application (login-mfe)
  │
  ├─ Generate code_verifier
  ├─ Generate code_challenge
  ├─ Generate state
  ├─ Generate nonce (OIDC)
  ├─ Store transient auth context
  ├─ Emit telemetry
  └─ Redirect browser → IDP /authorize
         │
         ▼
Identity Provider (IDP)
  /oauth2/authorize
```

---

# 3. Architecture Components

| Component                    | Responsibility                                                      |
| ---------------------------- | ------------------------------------------------------------------- |
| SPA / MFE (`apps/login-mfe`) | Initiates login flow, renders login UI                              |
| BFF (`services/bff`)         | Optional PKCE session bootstrap via `POST /api/auth/initiate`       |
| Browser                      | Stores temporary auth state in `sessionStorage`                     |
| Identity Provider (IDP)      | Receives authorize request (Keycloak, Google, or brokered)          |
| Redis                        | BFF-side PKCE session storage (not used directly in browser Step 1) |
| Postgres                     | User/client validation on BFF initiate (optional)                   |
| Observability Stack          | Capture metrics/traces/events                                       |
| CDN/WAF                      | TLS termination + bot protection                                    |

---

# 4. UI/UX Design

## 4.1 Login Screen Layout

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
│   │      Continue with Google        │     │
│   └──────────────────────────────────┘     │
│                                            │
│   Terms • Privacy • Help                   │
│                                            │
└────────────────────────────────────────────┘
```

---

## 4.2 UX Behavior

| User Action                | System Behavior                                   |
| -------------------------- | ------------------------------------------------- |
| Click Login                | Disable button immediately                        |
| Click Continue with Google | Disable button, set provider=`google`, start PKCE |
| During PKCE generation     | Show lightweight loading state                    |
| Redirecting                | Display "Redirecting securely..."                 |
| Failure                    | Show retry-friendly error                         |
| Double click               | Ignore duplicate actions                          |
| Slow network               | Keep spinner + status message                     |

---

## 4.3 UX States

### Idle State

```text
[ Login ]   [ Continue with Google ]
```

### Loading State

```text
[ Redirecting securely... ⏳ ]
Connecting to Identity Provider...
```

### Failure State

```text
Unable to start secure login.
[ Retry ]
```

---

## 4.4 Login State Machine

```text
Idle
  │
  ▼
ProviderSelected (local | google | keycloak)
  │
  ▼
GeneratingPkceArtifacts
  │
  ▼
PersistingAuthContext
  │
  ▼
EmittingTelemetry
  │
  ▼
BuildingAuthorizeUrl
  │
  ▼
RedirectingToIDP
```

---

## 4.5 Accessibility Requirements

| Requirement         | Details                                |
| ------------------- | -------------------------------------- |
| WCAG                | WCAG 2.1 AA                            |
| Keyboard Navigation | Full support                           |
| ARIA Labels         | Required on all buttons                |
| Contrast Ratio      | Minimum 4.5:1                          |
| Focus State         | Visible focus indicators               |
| Screen Readers      | Announce loading state via live region |
| Motion Reduction    | Respect `prefers-reduced-motion`       |

---

# 5. Internal Processing Steps

## Step 1 — User Clicks Login

User selects authentication path:

| Path           | Trigger                        | Provider                               |
| -------------- | ------------------------------ | -------------------------------------- |
| Standard login | Click **Login**                | `local` or enterprise IDP via Keycloak |
| Google SSO     | Click **Continue with Google** | `google`                               |

Frontend invokes:

```ts
startPkceLogin({ provider: 'local' | 'google' | 'keycloak' });
```

---

## Step 2 — Generate PKCE `code_verifier`

Frontend generates high-entropy random string.

| Requirement | Value             |
| ----------- | ----------------- |
| Entropy     | High              |
| Length      | 43–128 chars      |
| Charset     | RFC7636 compliant |

```ts
crypto.getRandomValues();
```

Example:

```text
Kf9A_91abZZ0PqLx2n9x....
```

---

## Step 3 — Generate `code_challenge`

```text
code_challenge = BASE64URL(SHA256(code_verifier))
```

Example:

```text
Q2hhbGxlbmdlRXhhbXBsZQ
```

---

## Step 4 — Generate CSRF `state`

Generate cryptographically random anti-CSRF state.

Example:

```text
xyZ123ABC999
```

---

## Step 5 — Generate Optional `nonce`

Used for OpenID Connect ID token validation in later steps (Step 5–6).

---

## Step 6 — Build Auth Context

Frontend builds transient auth object.

```json
{
  "code_verifier": "Kf9A...",
  "code_challenge": "abc123...",
  "state": "xyz123",
  "nonce": "nonce123",
  "provider": "google",
  "redirect_uri": "https://app.acme.com/callback",
  "created_at": 1716200000
}
```

---

## Step 7 — Optional BFF PKCE Initiate

When using BFF-backed PKCE (recommended for MFE architecture):

```http
POST /api/auth/initiate
Content-Type: application/json

{
  "email": "user@acme.com",
  "provider": "google",
  "codeVerifier": "Kf9A..."
}
```

BFF response:

```json
{
  "sessionId": "sess_abc123",
  "provider": "google",
  "state": "xyz123",
  "codeChallenge": "abc123...",
  "codeVerifier": "Kf9A..."
}
```

BFF stores session in Redis with TTL and returns correlation artifacts to the login MFE.

---

## Step 8 — Persist Auth Context

Store in:

- `sessionStorage`
- memory store
- secure JS runtime state

| Data          | Storage                        |
| ------------- | ------------------------------ |
| code_verifier | sessionStorage                 |
| state         | sessionStorage                 |
| nonce         | sessionStorage                 |
| provider      | sessionStorage                 |
| sessionId     | sessionStorage (if BFF-backed) |
| tokens        | NEVER at this stage            |

---

## Step 9 — Emit Telemetry

Frontend emits:

```json
{
  "event": "login_initiated",
  "client_id": "acme-web",
  "provider": "google",
  "timestamp": 1716200000,
  "trace_id": "trace-abc123"
}
```

---

## Step 10 — Build `/authorize` URL

Construct OAuth2 authorization request. Authority varies by provider:

| Provider   | Authority                                      |
| ---------- | ---------------------------------------------- |
| `local`    | Enterprise Keycloak realm                      |
| `keycloak` | `KEYCLOAK_ISSUER_URL`                          |
| `google`   | `https://accounts.google.com/o/oauth2/v2/auth` |

---

## Step 11 — Browser Redirect

```ts
window.location.href = authorizeUrl;
```

---

# 6. Google SSO Variant

## 6.1 Objective

When the user selects **Continue with Google**, Step 1 follows the same PKCE initialization path but targets Google OAuth 2.0 / OpenID Connect as the external IDP (or via Keycloak identity brokering).

---

## 6.2 Google SSO Flow

```text
User
  │
  │ Click "Continue with Google"
  ▼
login-mfe
  │
  ├─ provider = google
  ├─ Generate PKCE artifacts
  ├─ POST /api/auth/initiate (optional BFF)
  └─ Redirect → Google /o/oauth2/v2/auth
         │
         ▼
Google Accounts
  │
  ├─ User selects Google account
  ├─ Consent (if required)
  └─ Redirect → callback ?code&state
         │
         ▼
Step 4–5 (Authorization Code + Token Exchange)
```

---

## 6.3 Google Authorization Request

```http
GET https://accounts.google.com/o/oauth2/v2/auth?
response_type=code&
client_id={GOOGLE_CLIENT_ID}&
redirect_uri=https%3A%2F%2Fapp.acme.com%2Fcallback&
scope=openid%20profile%20email&
code_challenge={code_challenge}&
code_challenge_method=S256&
state={state}&
nonce={nonce}&
access_type=offline&
prompt=consent
```

---

## 6.4 Google SSO Configuration

| Config Key             | Source                              | Purpose                 |
| ---------------------- | ----------------------------------- | ----------------------- |
| `GOOGLE_CLIENT_ID`     | Environment                         | OAuth client identifier |
| `GOOGLE_CLIENT_SECRET` | BFF only (never exposed to browser) | Token exchange          |
| `GOOGLE_REDIRECT_URI`  | Environment                         | Registered callback URI |

BFF config reference:

```ts
oauth: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
}
```

---

## 6.5 Google SSO UX Behavior

| Scenario                 | UX Behavior                             |
| ------------------------ | --------------------------------------- |
| Google session active    | Skip account picker, fast redirect      |
| Multiple Google accounts | Show Google account chooser             |
| Consent required         | Google consent screen (Step 3)          |
| Domain-restricted tenant | Show enterprise access denied           |
| Google error             | Return to login with actionable message |

---

## 6.6 Google SSO Security Rules

| Rule                 | Requirement                                  |
| -------------------- | -------------------------------------------- |
| PKCE                 | Mandatory (S256)                             |
| Client secret        | BFF-only, never in browser                   |
| Redirect URI         | Exact match with Google Console registration |
| State validation     | Required on callback (Step 5)                |
| Hosted domain (`hd`) | Optional for workspace-only login            |
| Token storage        | No Google tokens in `localStorage`           |

---

# 7. Sequence Diagram

```text
User           login-mfe          BFF (optional)     Observability          IDP/Google
 │                 │                    │                  │                    │
 │ Click Login     │                    │                  │                    │
 │────────────────>│                    │                  │                    │
 │                 │ Generate verifier  │                  │                    │
 │                 │ Generate challenge │                  │                    │
 │                 │ Generate state     │                  │                    │
 │                 │ POST /initiate     │                  │                    │
 │                 │───────────────────>│ Store Redis      │                    │
 │                 │<───────────────────│ sessionId        │                    │
 │                 │ Store session data │                  │                    │
 │                 │───────────────────────────────────────>│ login_initiated    │
 │                 │                    │                  │                    │
 │                 │ Redirect /authorize│                  │                    │
 │                 │────────────────────────────────────────────────────────────>│
```

---

# 8. Authorization Request Contract

## 8.1 Endpoint

```http
GET /oauth2/authorize
```

For Google:

```http
GET https://accounts.google.com/o/oauth2/v2/auth
```

---

## 8.2 Full Example (Enterprise IDP)

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

## 8.3 Query Parameters

| Parameter             | Required        | Description                          |
| --------------------- | --------------- | ------------------------------------ |
| response_type         | Yes             | Must be `code`                       |
| client_id             | Yes             | OAuth client                         |
| redirect_uri          | Yes             | Registered callback                  |
| scope                 | Yes             | Requested scopes                     |
| code_challenge        | Yes             | PKCE challenge                       |
| code_challenge_method | Yes             | `S256`                               |
| state                 | Yes             | CSRF protection                      |
| nonce                 | OIDC only       | Replay protection                    |
| access_type           | Google only     | `offline` for refresh token          |
| prompt                | Optional        | `consent`, `login`, `select_account` |
| hd                    | Google optional | Hosted domain restriction            |

---

## 8.4 HTTP Method

```http
GET
```

---

## 8.5 Headers

```http
Accept: text/html
Cache-Control: no-cache
```

---

# 9. Frontend Contracts

## 9.1 TypeScript Model

```ts
type AuthProvider = 'local' | 'keycloak' | 'google';

type PkceSession = {
  code_verifier: string;
  code_challenge: string;
  state: string;
  nonce?: string;
  provider: AuthProvider;
  redirect_uri: string;
  sessionId?: string;
  created_at: number;
};
```

---

## 9.2 Login Function Contract

```ts
async function startPkceLogin(options: { provider: AuthProvider; email?: string }): Promise<void>;
```

---

## 9.3 BFF Initiate Contract

```ts
type PkceInitiateRequest = {
  email: string;
  provider: AuthProvider;
  codeVerifier?: string;
};

type PkceInitiateResponse = {
  sessionId: string;
  provider: AuthProvider;
  state: string;
  codeChallenge: string;
  codeVerifier: string;
};
```

---

## 9.4 Observability Event Contract

```ts
type LoginInitiatedEvent = {
  event: 'login_initiated';
  timestamp: number;
  client_id: string;
  provider: AuthProvider;
  trace_id: string;
};
```

---

# 10. Browser Storage Design

## 10.1 sessionStorage Keys

| Key                | Purpose                 |
| ------------------ | ----------------------- |
| pkce.code_verifier | PKCE validation         |
| pkce.state         | CSRF validation         |
| pkce.nonce         | OIDC validation         |
| pkce.provider      | Provider correlation    |
| pkce.session_id    | BFF session correlation |
| pkce.created_at    | Expiration tracking     |

---

## 10.2 TTL Rules

| Item              | TTL                         |
| ----------------- | --------------------------- |
| PKCE Session      | Browser session             |
| Max Allowed Age   | 5–10 mins                   |
| BFF Redis session | 10 mins (aligned with PKCE) |

---

# 11. Observability Design

## 11.1 Events

| Event                  | Purpose                  |
| ---------------------- | ------------------------ |
| login_initiated        | User clicked login       |
| google_sso_initiated   | Google SSO path selected |
| pkce_generated         | PKCE success             |
| redirect_started       | Redirect initiated       |
| redirect_failed        | Redirect failure         |
| pkce_generation_failed | Crypto/storage failure   |

---

## 11.2 Metrics

| Metric                    | Type      |
| ------------------------- | --------- |
| auth.login.started        | Counter   |
| auth.login.google.started | Counter   |
| auth.redirect.latency     | Histogram |
| auth.pkce.errors          | Counter   |

---

## 11.3 Tracing

Distributed tracing context propagated using:

```http
traceparent
```

Correlation IDs: `trace_id`, `sessionId`, `auth.request_id`

---

# 12. Security Design

## 12.1 PKCE Requirements

| Rule         | Required  |
| ------------ | --------- |
| S256 only    | Yes       |
| Plain method | Forbidden |
| High entropy | Required  |

---

## 12.2 Storage Security

| Rule                           | Description           |
| ------------------------------ | --------------------- |
| Never LocalStorage             | Avoid XSS persistence |
| Session only                   | Preferred             |
| Tokens not stored              | At this stage         |
| Client secret never in browser | BFF-only              |

---

## 12.3 Transport Security

| Requirement | Value     |
| ----------- | --------- |
| HTTPS only  | Mandatory |
| TLS         | 1.2+      |
| HSTS        | Enabled   |

---

## 12.4 CSP Requirements

```http
Content-Security-Policy:
default-src 'self';
frame-ancestors 'none';
connect-src 'self' https://accounts.google.com https://idp.acme.com;
```

---

## 12.5 CSRF Protection

Implemented using:

```text
state parameter
```

State must be validated in Step 5 token exchange.

---

## 12.6 Replay Protection

Implemented using:

```text
nonce parameter (OIDC)
```

---

# 13. Error Handling

| Scenario                      | Action                                          |
| ----------------------------- | ----------------------------------------------- |
| Crypto API unavailable        | Block login                                     |
| Storage quota exceeded        | Show retry                                      |
| Invalid config                | Fail closed                                     |
| Redirect build failure        | Emit telemetry                                  |
| Double login click            | Debounce                                        |
| Google OAuth misconfiguration | Show support message, log `auth_config_invalid` |
| BFF initiate failure          | Retry once, then surface error                  |

---

## 13.1 Failure Response Example

```json
{
  "error": "pkce_generation_failed",
  "message": "Unable to initialize secure login."
}
```

---

# 14. Performance Considerations

| Area                    | Recommendation        |
| ----------------------- | --------------------- |
| PKCE generation         | <5ms                  |
| Redirect startup        | <100ms                |
| BFF initiate round-trip | <200ms                |
| JS bundle               | Lazy-load auth module |
| Telemetry               | Async/non-blocking    |

---

# 15. Threat Model

| Threat                          | Mitigation                       |
| ------------------------------- | -------------------------------- |
| Authorization code interception | PKCE                             |
| CSRF                            | state                            |
| Replay attack                   | nonce                            |
| Token leakage                   | No tokens at Step 1              |
| XSS persistence                 | Avoid localStorage               |
| Open redirect                   | Strict redirect URI validation   |
| OAuth phishing                  | Branded UI + fixed redirect URIs |

---

# 16. Success Criteria

Step 1 is successful when:

- User clicked login or Google SSO
- PKCE artifacts generated
- state generated
- provider recorded
- auth context persisted (browser + optional BFF)
- telemetry emitted
- browser redirected to IDP/Google authorize endpoint
- no sensitive token or client secret exposed

---

# 17. Next Step

Next:

```text
Step 2 — Authorization Request Redirect to Identity Provider (IDP)
```

See: `step-2-auth-request-design-document.md`

For Google SSO, Step 2 completes the redirect to Google; Step 3 covers Google account selection and consent at `accounts.google.com`.
