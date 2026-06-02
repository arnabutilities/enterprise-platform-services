# Step 4 — Authorization Code Generation & Redirect

> Detailed technical design document for OAuth2 Authorization Code Flow with PKCE — Step 4.

This step begins after successful user authentication and consent approval at the Identity Provider (IDP).  
The step ends when the IDP generates an authorization code and redirects the browser back to the client application's callback endpoint.

Related enterprise integration context: fileciteturn13file0

---

# 1. Objective

The purpose of Step 4 is to:

- Generate short-lived authorization code
- Bind authorization code to PKCE challenge
- Bind authorization code to client session
- Persist temporary authorization transaction
- Generate secure redirect response
- Redirect browser to callback URI
- Preserve state correlation
- Emit observability and audit telemetry
- Prevent replay and code injection attacks

---

# 2. High-Level Flow

```text
Authenticated User Session
          │
          ▼
Identity Provider (IDP)
          │
          ├─ Validate authenticated session
          ├─ Generate authorization code
          ├─ Persist authorization context
          ├─ Associate PKCE challenge
          ├─ Create redirect response
          └─ Redirect browser
                    │
                    ▼
SPA Callback Endpoint
/callback?code=xxx&state=yyy
```

---

# 3. Architecture Components

| Component               | Responsibility                     |
| ----------------------- | ---------------------------------- |
| Identity Provider (IDP) | Authorization code generation      |
| Browser                 | Redirect navigation                |
| SPA / MFE               | Callback receiver                  |
| Redis                   | Temporary auth transaction storage |
| Postgres                | Audit + client validation          |
| Observability Stack     | Metrics/logging/tracing            |
| Security Layer          | Replay protection                  |

---

# 4. UI/UX Design

# 4.1 Authentication Success Screen

The user may briefly see a transition state before redirect.

```text
┌────────────────────────────────────────────┐
│ ACME Identity                              │
│────────────────────────────────────────────│
│                                            │
│          Authentication Successful         │
│                                            │
│     Redirecting back to application...     │
│                                            │
│                  ⏳                        │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.2 UX Behavior

| Scenario         | UX Behavior              |
| ---------------- | ------------------------ |
| Login successful | Show redirect transition |
| Consent approved | Proceed automatically    |
| Redirect delay   | Show spinner             |
| Redirect failure | Display recovery action  |
| Session expired  | Restart login            |

---

# 4.3 Redirect UX State Machine

```text
Authenticated
    │
    ▼
AuthorizationCodeGenerated
    │
    ▼
RedirectPrepared
    │
    ▼
BrowserRedirect
    │
    ▼
CallbackLanding
```

---

# 4.4 Accessibility Requirements

| Requirement                 | Details     |
| --------------------------- | ----------- |
| Loading announcement        | Required    |
| Screen reader compatibility | Required    |
| Keyboard-safe navigation    | Required    |
| Motion reduction support    | Recommended |

---

# 5. Internal Processing Steps

# Step 1 — Validate Authenticated Session

IDP validates active authenticated session.

---

## Validation Rules

| Validation          | Rule     |
| ------------------- | -------- |
| User authenticated  | Required |
| Session active      | Required |
| Session not expired | Required |
| Consent granted     | Required |
| Client valid        | Required |

---

# Step 2 — Validate Authorization Request Context

IDP validates original authorization request.

---

## Validation Items

| Item           | Validation  |
| -------------- | ----------- |
| client_id      | Registered  |
| redirect_uri   | Exact match |
| state          | Present     |
| code_challenge | Present     |
| response_type  | code        |

---

# Step 3 — Generate Authorization Code

Generate cryptographically secure short-lived authorization code.

---

## Authorization Code Rules

| Requirement    | Value          |
| -------------- | -------------- |
| Entropy        | High           |
| Single use     | Yes            |
| Expiration     | 30–120 seconds |
| Replay allowed | No             |

---

## Example

```text
SplxlOBeZQQYbYS6WxSbIA
```

---

# Step 4 — Build Authorization Context

Authorization context includes:

- authorization_code
- client_id
- user_id
- scopes
- redirect_uri
- nonce
- code_challenge
- code_challenge_method
- created_at

---

## Example

```json
{
  "authorization_code": "abc123",
  "client_id": "acme-web",
  "user_id": "u_789",
  "scope": "openid profile email",
  "code_challenge": "xyz999",
  "code_challenge_method": "S256",
  "expires_in": 60
}
```

---

# Step 5 — Persist Authorization Transaction

Persist temporary authorization transaction.

---

## Redis Storage

```text
auth_code:{authorization_code}
```

---

## Stored Metadata

| Field          | Purpose             |
| -------------- | ------------------- |
| client_id      | Client validation   |
| user_id        | User correlation    |
| redirect_uri   | Redirect validation |
| code_challenge | PKCE validation     |
| nonce          | OIDC validation     |
| expires_at     | Expiration control  |

---

# Step 6 — Emit Audit & Observability Events

```json
{
  "event": "authorization_code_issued",
  "client_id": "acme-web",
  "user_id": "u_789",
  "trace_id": "trace_123"
}
```

---

# Step 7 — Build Redirect Response

Construct callback redirect URI.

---

## Example Redirect

```http
https://app.acme.com/callback?
code=abc123&
state=xyz123
```

---

# Step 8 — Browser Redirect

Browser redirected back to SPA callback endpoint.

---

# Step 9 — Browser Lands on Callback Route

SPA callback handler receives:

- authorization code
- state

---

# 6. Sequence Diagram

```text
Browser         IDP           Redis        Observability       SPA
   │              │              │                │             │
   │ Consent OK   │              │                │             │
   │─────────────>│              │                │             │
   │              │ Validate session             │             │
   │              │ Generate auth code           │             │
   │              │─────────────>│ Store tx      │             │
   │              │              │                │             │
   │              │─────────────────────────────>│ Log event   │
   │              │              │                │             │
   │              │ Redirect browser             │             │
   │<──────────────────────────────────────────────────────────│
   │              │              │                │             │
   │ Open callback endpoint                       │             │
```

---

# 7. Authorization Code Contract

# 7.1 Redirect Response

```http
302 Found
Location: https://app.acme.com/callback?code=abc123&state=xyz123
```

---

# 7.2 Redirect Parameters

| Parameter     | Required | Description        |
| ------------- | -------- | ------------------ |
| code          | Yes      | Authorization code |
| state         | Yes      | CSRF correlation   |
| session_state | Optional | Session tracking   |
| iss           | Optional | Issuer identifier  |

---

# 7.3 Callback Example

```http
GET /callback?code=abc123&state=xyz123
```

---

# 8. Authorization Transaction Contract

# 8.1 Redis Data Structure

```json
{
  "authorization_code": "abc123",
  "client_id": "acme-web",
  "user_id": "u_789",
  "redirect_uri": "https://app.acme.com/callback",
  "code_challenge": "xyz999",
  "expires_at": 1716200100
}
```

---

# 8.2 TTL Rules

| Object              | TTL    |
| ------------------- | ------ |
| Authorization Code  | 60 sec |
| Transaction Context | 60 sec |
| Replay Cache        | 5 mins |

---

# 9. Frontend Callback Contract

# 9.1 Callback Route

```http
GET /callback
```

---

# 9.2 Callback Query Parameters

| Parameter         | Description         |
| ----------------- | ------------------- |
| code              | Authorization code  |
| state             | CSRF validation     |
| error             | Optional auth error |
| error_description | Optional details    |

---

# 9.3 Callback Handler

```ts
async function handleAuthorizationCallback(): Promise<void>;
```

---

# 10. Redis Design

# 10.1 Keys

| Key               | Purpose                   |
| ----------------- | ------------------------- |
| auth_code:{id}    | Authorization transaction |
| replay_guard:{id} | Replay prevention         |
| auth_context:{id} | Temporary auth metadata   |

---

# 10.2 Redis Security

| Requirement           | Description |
| --------------------- | ----------- |
| Encryption in transit | Required    |
| Auth enabled          | Required    |
| TTL enforced          | Required    |
| Network isolation     | Recommended |

---

# 11. Postgres Design

# 11.1 Tables

| Table           | Purpose             |
| --------------- | ------------------- |
| oauth_clients   | Client metadata     |
| auth_audit_logs | Security audit      |
| consent_records | Granted permissions |
| user_sessions   | Session history     |

---

# 12. Observability Design

# 12.1 Events

| Event                     | Description      |
| ------------------------- | ---------------- |
| authorization_code_issued | Code generated   |
| redirect_started          | Browser redirect |
| redirect_completed        | Callback reached |
| authorization_code_failed | Failure          |

---

# 12.2 Metrics

| Metric                | Type      |
| --------------------- | --------- |
| auth.code.generated   | Counter   |
| auth.code.expired     | Counter   |
| auth.redirect.latency | Histogram |
| auth.callback.success | Counter   |

---

# 12.3 Distributed Tracing

Tracing propagated using:

```http
traceparent
```

---

# 13. Security Design

# 13.1 Authorization Code Security

| Rule              | Value     |
| ----------------- | --------- |
| Single use        | Mandatory |
| Short expiration  | Mandatory |
| PKCE bound        | Mandatory |
| Replay prevention | Mandatory |

---

# 13.2 Redirect Security

| Rule                     | Description |
| ------------------------ | ----------- |
| Exact redirect URI match | Required    |
| HTTPS only               | Required    |
| Open redirect prevention | Required    |
| State validation         | Required    |

---

# 13.3 PKCE Binding

Authorization code must be associated with:

```text
code_challenge
```

---

# 13.4 Replay Prevention

| Threat                    | Mitigation            |
| ------------------------- | --------------------- |
| Authorization code replay | Single-use codes      |
| Redirect hijacking        | Strict URI validation |
| CSRF                      | state correlation     |
| Session injection         | Session validation    |

---

# 13.5 Browser Security Headers

```http
Cache-Control: no-store
Pragma: no-cache
X-Frame-Options: DENY
```

---

# 14. Failure Handling

| Scenario                             | Action                 |
| ------------------------------------ | ---------------------- |
| Redirect URI mismatch                | Reject request         |
| Authorization code generation failed | Abort flow             |
| Session expired                      | Restart authentication |
| Consent missing                      | Block redirect         |
| Replay attempt                       | Reject request         |

---

# 14.1 Example Failure Response

```http
302 Found
Location: https://app.acme.com/callback?error=access_denied
```

---

# 15. Performance Considerations

| Area                          | Recommendation |
| ----------------------------- | -------------- |
| Authorization code generation | <5ms           |
| Redis write latency           | <10ms          |
| Redirect response             | <50ms          |
| Callback navigation           | <200ms         |

---

# 16. Threat Model

| Threat                          | Mitigation       |
| ------------------------------- | ---------------- |
| Authorization code interception | PKCE             |
| Replay attacks                  | Single-use codes |
| Open redirect                   | URI validation   |
| Session hijacking               | Session binding  |
| CSRF                            | state validation |

---

# 17. Success Criteria

Step 4 is successful when:

- User authenticated
- Consent approved
- Authorization code generated
- PKCE challenge associated
- Authorization transaction persisted
- Browser redirected to callback
- SPA receives authorization code

---

# 18. Next Step

```text
Step 5 — Token Exchange with PKCE Verification
```
