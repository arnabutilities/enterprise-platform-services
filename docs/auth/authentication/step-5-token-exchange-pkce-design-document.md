# Step 5 — Token Exchange with PKCE Verification

> Detailed technical design document for OAuth2 Authorization Code Flow with PKCE — Step 5.

This step begins when the SPA/MFE application receives the authorization code from the callback endpoint and ends when the Identity Provider (IDP) validates the PKCE verifier and issues tokens.

Related enterprise integration context: fileciteturn13file0

---

# 1. Objective

The purpose of Step 5 is to:

- Receive authorization code from callback
- Validate state parameter
- Retrieve PKCE code_verifier
- Exchange authorization code for tokens
- Validate PKCE challenge/verifier pair
- Issue access token and refresh token
- Issue ID token (OIDC)
- Prevent replay attacks
- Emit audit and observability telemetry
- Securely return token response

---

# 2. High-Level Flow

```text
SPA Callback Handler
        │
        ├─ Validate state
        ├─ Load code_verifier
        ├─ Build token request
        ├─ Call IDP /token endpoint
        │
        ▼
Identity Provider (IDP)
        │
        ├─ Validate authorization code
        ├─ Validate PKCE verifier
        ├─ Validate client
        ├─ Generate JWT tokens
        └─ Return token response
```

---

# 3. Architecture Components

| Component               | Responsibility            |
| ----------------------- | ------------------------- |
| SPA / MFE               | Token exchange initiator  |
| Browser                 | Secure callback handling  |
| Identity Provider (IDP) | Token issuance            |
| Redis                   | Authorization code lookup |
| Postgres                | Client + user validation  |
| Observability Stack     | Traces/logging/metrics    |
| JWT Signing Service     | JWT generation            |

---

# 4. UI/UX Design

# 4.1 Callback Processing Screen

After redirect from IDP:

```text
┌────────────────────────────────────────────┐
│ ACME Analytics                            │
│────────────────────────────────────────────│
│                                            │
│          Completing Secure Login           │
│                                            │
│       Validating authentication...         │
│                                            │
│                  ⏳                        │
│                                            │
│     Please wait while we prepare           │
│           your session                     │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.2 UX Behavior

| Scenario                   | UX Behavior               |
| -------------------------- | ------------------------- |
| Token exchange started     | Show loading state        |
| Slow response              | Spinner + retry messaging |
| PKCE validation failed     | Force re-login            |
| Authorization code expired | Restart flow              |
| Success                    | Navigate to application   |
| Failure                    | Show support/retry        |

---

# 4.3 UX State Machine

```text
CallbackReceived
      │
      ▼
ValidatingState
      │
      ▼
LoadingCodeVerifier
      │
      ▼
CallingTokenEndpoint
      │
      ▼
PKCEValidation
      │
      ▼
TokenIssued
      │
      ▼
SessionReady
```

---

# 4.4 Accessibility Requirements

| Requirement                 | Details    |
| --------------------------- | ---------- |
| Live region announcements   | Required   |
| Keyboard-safe               | Required   |
| Loading indicators          | Accessible |
| Screen reader compatibility | Required   |

---

# 5. Internal Processing Steps

# Step 1 — Receive Callback Request

SPA callback route receives:

```http
GET /callback?code=abc123&state=xyz123
```

---

# Step 2 — Validate State Parameter

Validate returned state against stored state.

---

## Validation Rules

| Validation        | Required |
| ----------------- | -------- |
| state exists      | Yes      |
| state matches     | Yes      |
| state not expired | Yes      |

---

# Step 3 — Load PKCE code_verifier

Retrieve verifier from session storage.

---

## Example

```text
Kf9A_91abZZ0PqLx2n9x
```

---

# Step 4 — Build Token Exchange Request

Construct token request.

---

## Request Fields

| Field         | Purpose             |
| ------------- | ------------------- |
| grant_type    | authorization_code  |
| code          | Authorization code  |
| redirect_uri  | Redirect validation |
| client_id     | Client identifier   |
| code_verifier | PKCE verification   |

---

# Step 5 — Call Token Endpoint

SPA sends secure POST request to IDP.

---

## Endpoint

```http
POST /oauth2/token
```

---

# Step 6 — Validate Authorization Code

IDP validates:

| Validation           | Rule     |
| -------------------- | -------- |
| Code exists          | Required |
| Code not expired     | Required |
| Code unused          | Required |
| Client matches       | Required |
| Redirect URI matches | Required |

---

# Step 7 — Validate PKCE Verifier

IDP computes:

```text
BASE64URL(SHA256(code_verifier))
```

Compare against stored:

```text
code_challenge
```

---

# Step 8 — Validate User Session

Validate authenticated user context.

---

# Step 9 — Generate Tokens

Generate:

- JWT Access Token
- Refresh Token
- ID Token (OIDC)

---

# Step 10 — Store Session Metadata

Persist session/token metadata.

---

## Redis Session Example

```json
{
  "session_id": "sess_123",
  "user_id": "u_789",
  "client_id": "acme-web",
  "scope": "openid profile email",
  "created_at": 1716200000
}
```

---

# Step 11 — Emit Observability Events

```json
{
  "event": "token_issued",
  "client_id": "acme-web",
  "user_id": "u_789"
}
```

---

# Step 12 — Return Token Response

Return secure JSON response.

---

# 6. Sequence Diagram

```text
SPA/MFE        Browser         IDP         Redis      Observability
   │               │             │             │              │
   │ Callback URL  │             │             │              │
   │<──────────────│             │             │              │
   │ Validate state             │             │              │
   │ Load verifier              │             │              │
   │ POST /token                │             │              │
   │───────────────────────────>│             │              │
   │                            │ Validate code             │
   │                            │────────────>│             │
   │                            │ Validate PKCE             │
   │                            │ Generate tokens           │
   │                            │────────────>│ Store sess  │
   │                            │──────────────────────────>│
   │                            │ Emit telemetry            │
   │ Token response             │                           │
   │<───────────────────────────│                           │
```

---

# 7. Token Exchange Contract

# 7.1 Token Endpoint

```http
POST /oauth2/token
```

---

# 7.2 Request Headers

```http
Content-Type: application/x-www-form-urlencoded
Accept: application/json
```

---

# 7.3 Request Example

```http
grant_type=authorization_code&
client_id=acme-web&
code=abc123&
redirect_uri=https://app.acme.com/callback&
code_verifier=Kf9A_91abZZ0PqLx2n9x
```

---

# 7.4 Request Parameters

| Parameter     | Required | Description        |
| ------------- | -------- | ------------------ |
| grant_type    | Yes      | authorization_code |
| code          | Yes      | Authorization code |
| client_id     | Yes      | OAuth client       |
| redirect_uri  | Yes      | Callback URI       |
| code_verifier | Yes      | PKCE verifier      |

---

# 8. Token Response Contract

# 8.1 Success Response

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "r1.abc123",
  "id_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}
```

---

# 8.2 Response Fields

| Field         | Description              |
| ------------- | ------------------------ |
| access_token  | JWT bearer token         |
| refresh_token | Long-lived refresh token |
| id_token      | OIDC identity token      |
| token_type    | Bearer                   |
| expires_in    | Token expiration         |
| scope         | Granted scopes           |

---

# 8.3 Error Response

```json
{
  "error": "invalid_grant",
  "error_description": "PKCE verification failed"
}
```

---

# 9. JWT Design

# 9.1 Access Token Claims

```json
{
  "sub": "u_789",
  "aud": "acme-api",
  "iss": "https://idp.acme.com",
  "scope": "openid profile email",
  "exp": 1716203600
}
```

---

# 9.2 ID Token Claims

```json
{
  "sub": "u_789",
  "email": "john.doe@acme.com",
  "nonce": "nonce123"
}
```

---

# 10. Redis Design

# 10.1 Keys

| Key            | Purpose                |
| -------------- | ---------------------- |
| auth_code:{id} | Authorization code     |
| session:{id}   | Session metadata       |
| refresh:{id}   | Refresh token metadata |

---

# 10.2 TTL Rules

| Object             | TTL       |
| ------------------ | --------- |
| Authorization Code | 60 sec    |
| Access Session     | 1 hour    |
| Refresh Session    | 7–30 days |

---

# 11. Postgres Design

# 11.1 Tables

| Table            | Purpose             |
| ---------------- | ------------------- |
| oauth_clients    | Client validation   |
| user_sessions    | Active sessions     |
| token_audit_logs | Token issuance logs |
| refresh_tokens   | Refresh metadata    |

---

# 12. Observability Design

# 12.1 Events

| Event                   | Description        |
| ----------------------- | ------------------ |
| token_exchange_started  | Exchange initiated |
| pkce_validation_success | PKCE validated     |
| pkce_validation_failed  | PKCE failed        |
| token_issued            | Tokens generated   |

---

# 12.2 Metrics

| Metric              | Type      |
| ------------------- | --------- |
| auth.token.exchange | Counter   |
| auth.pkce.success   | Counter   |
| auth.pkce.failure   | Counter   |
| auth.token.latency  | Histogram |

---

# 12.3 Distributed Tracing

Tracing propagated using:

```http
traceparent
```

---

# 13. Security Design

# 13.1 PKCE Security

| Rule              | Requirement |
| ----------------- | ----------- |
| S256 only         | Mandatory   |
| Plain challenge   | Forbidden   |
| Verifier entropy  | High        |
| Replay prevention | Required    |

---

# 13.2 Token Security

| Rule                     | Description |
| ------------------------ | ----------- |
| JWT signed               | Required    |
| Access token short-lived | Required    |
| Refresh token rotation   | Recommended |
| HTTPS only               | Required    |

---

# 13.3 Authorization Code Security

| Rule             | Description |
| ---------------- | ----------- |
| Single use       | Required    |
| Short expiration | Required    |
| PKCE-bound       | Required    |

---

# 13.4 Browser Security

| Requirement       | Value              |
| ----------------- | ------------------ |
| Secure transport  | HTTPS              |
| Sensitive storage | Avoid localStorage |
| CSP enabled       | Yes                |
| Cache disabled    | Yes                |

---

# 14. Failure Handling

| Scenario              | Action          |
| --------------------- | --------------- |
| Invalid state         | Restart auth    |
| Invalid code          | Reject exchange |
| PKCE mismatch         | Reject request  |
| Expired code          | Force login     |
| Token signing failure | Abort flow      |

---

# 14.1 Failure Example

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired"
}
```

---

# 15. Performance Considerations

| Area                   | Recommendation |
| ---------------------- | -------------- |
| Token exchange latency | <300ms         |
| PKCE validation        | <5ms           |
| Redis lookup           | <10ms          |
| JWT generation         | <20ms          |

---

# 16. Threat Model

| Threat                          | Mitigation          |
| ------------------------------- | ------------------- |
| Authorization code interception | PKCE                |
| Replay attacks                  | Single-use code     |
| Token theft                     | HTTPS               |
| Session fixation                | Session rotation    |
| JWT forgery                     | Strong signing keys |

---

# 17. Success Criteria

Step 5 is successful when:

- Callback parameters validated
- State verified
- code_verifier loaded
- PKCE validation successful
- Tokens generated
- Session metadata persisted
- Secure token response returned

---

# 18. Next Step

```text
Step 6 — Token Validation & Session Establishment
```
