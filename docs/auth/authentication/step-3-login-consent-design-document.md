# Step 3 — User Authentication & Consent at Identity Provider (IDP)

> Detailed technical design document for OAuth2 Authorization Code Flow with PKCE — Step 3.

This step begins after the browser is redirected to the Identity Provider (IDP) `/authorize` endpoint and ends when the user successfully authenticates and grants consent (if required).

Related enterprise integration context: fileciteturn13file0

---

# 1. Objective

The purpose of Step 3 is to:

- Authenticate the user securely
- Validate credentials
- Perform MFA verification (optional)
- Validate session risk posture
- Evaluate consent requirements
- Capture user approval/denial
- Generate authenticated user session
- Generate authorization context
- Prepare authorization code issuance
- Emit observability/audit telemetry

---

# 2. High-Level Flow

```text
Browser
   │
   ▼
IDP Login Page
   │
   ├─ User enters credentials
   ├─ IDP validates credentials
   ├─ MFA challenge (optional)
   ├─ Consent evaluation
   ├─ Consent approval
   ├─ Session creation
   └─ Prepare authorization code
```

---

# 3. Architecture Components

| Component                  | Responsibility            |
| -------------------------- | ------------------------- |
| Browser                    | User interaction          |
| IDP Authentication Service | Login + MFA               |
| Consent Service            | Consent evaluation        |
| Redis                      | Temporary session storage |
| Postgres                   | Users, clients, consent   |
| Observability Stack        | Metrics/logging/tracing   |
| Risk Engine                | Device/IP risk checks     |

---

# 4. UI/UX Design

# 4.1 Login Screen

```text
┌────────────────────────────────────────────┐
│ ACME Identity                              │
│────────────────────────────────────────────│
│                                            │
│            Sign in to ACME                 │
│                                            │
│  Email                                     │
│  ┌──────────────────────────────────────┐  │
│  │ john.doe@acme.com                   │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Password                                  │
│  ┌──────────────────────────────────────┐  │
│  │ ***************                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│        [ Sign In ]                         │
│                                            │
│  Forgot Password?                          │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.2 MFA Screen

```text
┌────────────────────────────────────────────┐
│ Verify Your Identity                       │
│────────────────────────────────────────────│
│                                            │
│ Enter the 6-digit code from your app       │
│                                            │
│           [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ]  │
│                                            │
│            [ Verify ]                      │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.3 Consent Screen

```text
┌────────────────────────────────────────────┐
│ ACME Analytics wants access to:            │
│────────────────────────────────────────────│
│ ✓ Read profile                             │
│ ✓ Read email                               │
│ ✓ Access analytics data                    │
│                                            │
│      [ Deny ]   [ Allow ]                  │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.4 UX Behavior

| Scenario                | UX Behavior             |
| ----------------------- | ----------------------- |
| Invalid password        | Inline validation       |
| MFA required            | Step-up challenge       |
| Consent already granted | Skip consent screen     |
| Suspicious login        | Additional verification |
| Session timeout         | Restart login           |
| Rate limit exceeded     | Cooldown screen         |

---

# 4.5 Accessibility Requirements

| Requirement          | Details      |
| -------------------- | ------------ |
| WCAG                 | 2.1 AA       |
| Keyboard Navigation  | Full support |
| Screen Reader Labels | Required     |
| Error Messaging      | Accessible   |
| Focus Management     | Mandatory    |

---

# 5. Internal Processing Steps

# Step 1 — Receive Authorization Request

IDP receives `/authorize` request from browser.

---

## Request Validation

| Validation              | Rule     |
| ----------------------- | -------- |
| client_id valid         | Required |
| redirect_uri registered | Required |
| state exists            | Required |
| PKCE challenge present  | Required |
| response_type=code      | Required |

---

# Step 2 — Display Login Screen

User is prompted for credentials.

---

# Step 3 — Validate Credentials

IDP validates:

- username/email
- password hash
- account status
- password expiration
- tenant restrictions

---

## Password Validation

```text
bcrypt/argon2 hash comparison
```

---

# Step 4 — Risk Evaluation

Risk engine evaluates:

| Signal              | Purpose            |
| ------------------- | ------------------ |
| Device fingerprint  | Fraud detection    |
| Geo location        | Impossible travel  |
| IP reputation       | Bot/risk analysis  |
| Browser fingerprint | Session validation |

---

# Step 5 — MFA Challenge (Optional)

If MFA enabled:

- Generate challenge
- Send OTP/push
- Validate response

---

## MFA Methods

| Method   | Supported |
| -------- | --------- |
| TOTP     | Yes       |
| Push     | Yes       |
| SMS      | Optional  |
| WebAuthn | Preferred |

---

# Step 6 — Consent Evaluation

Consent engine checks:

| Validation       | Description         |
| ---------------- | ------------------- |
| Existing consent | Previously granted  |
| New scopes       | Re-consent required |
| Tenant policy    | Enterprise approval |
| High-risk scope  | Elevated consent    |

---

# Step 7 — Display Consent Screen

User reviews requested permissions.

---

# Step 8 — Capture Consent Decision

User chooses:

```text
Allow / Deny
```

---

# Step 9 — Create Authenticated Session

Session metadata stored.

---

## Session Metadata

```json
{
  "session_id": "sess_123",
  "user_id": "u_789",
  "client_id": "acme-web",
  "ip": "203.0.113.10",
  "created_at": 1716200000
}
```

---

# Step 10 — Prepare Authorization Context

Authorization context includes:

- user_id
- scopes
- client_id
- redirect_uri
- PKCE challenge
- nonce
- state

---

# Step 11 — Emit Observability Events

```json
{
  "event": "user_authenticated",
  "user_id": "u_789",
  "client_id": "acme-web",
  "mfa": true
}
```

---

# Step 12 — Proceed to Authorization Code Generation

Flow moves to Step 4.

---

# 6. Sequence Diagram

```text
Browser        IDP         Redis      Postgres    Observability
   │             │             │             │             │
   │ GET /authorize            │             │             │
   │────────────>│             │             │             │
   │             │ Show login  │             │             │
   │<────────────│             │             │             │
   │ Credentials │             │             │             │
   │────────────>│             │             │             │
   │             │ Validate user            │             │
   │             │────────────>│────────────>│             │
   │             │ MFA check                │             │
   │             │ Consent eval             │             │
   │             │ Create session           │             │
   │             │────────────>│             │             │
   │             │───────────────────────────────────────>│
   │             │ Emit telemetry                         │
```

---

# 7. Login Contract

# 7.1 Login Endpoint

```http
POST /login
```

---

# 7.2 Request Example

```json
{
  "username": "john.doe@acme.com",
  "password": "********"
}
```

---

# 7.3 Response Example

```json
{
  "status": "MFA_REQUIRED",
  "challenge_id": "mfa_123"
}
```

---

# 8. MFA Contract

# 8.1 Verify MFA Endpoint

```http
POST /mfa/verify
```

---

# 8.2 Request Example

```json
{
  "challenge_id": "mfa_123",
  "otp": "123456"
}
```

---

# 8.3 Success Response

```json
{
  "status": "SUCCESS"
}
```

---

# 9. Consent Contract

# 9.1 Consent Submit Endpoint

```http
POST /consent/approve
```

---

# 9.2 Request Example

```json
{
  "client_id": "acme-web",
  "scopes": ["openid", "profile", "email"],
  "decision": "allow"
}
```

---

# 9.3 Consent Denied Example

```json
{
  "error": "access_denied"
}
```

---

# 10. Redis Design

# 10.1 Stored Data

| Key                | Purpose               |
| ------------------ | --------------------- |
| auth_session:{id}  | Temporary session     |
| mfa_challenge:{id} | MFA verification      |
| auth_context:{id}  | Authorization context |

---

# 10.2 TTL Rules

| Data                  | TTL     |
| --------------------- | ------- |
| MFA Challenge         | 5 mins  |
| Auth Session          | 30 mins |
| Authorization Context | 2 mins  |

---

# 11. Postgres Design

# 11.1 Tables

| Table            | Purpose         |
| ---------------- | --------------- |
| users            | User identities |
| user_credentials | Password hashes |
| user_mfa         | MFA settings    |
| consents         | Granted scopes  |
| auth_audit_logs  | Security events |

---

# 12. Observability Design

# 12.1 Events

| Event           | Purpose                |
| --------------- | ---------------------- |
| login_attempt   | Login started          |
| login_success   | Authentication success |
| login_failed    | Invalid credentials    |
| mfa_required    | MFA challenge          |
| consent_shown   | Consent displayed      |
| consent_granted | Consent approved       |

---

# 12.2 Metrics

| Metric                | Type    |
| --------------------- | ------- |
| auth.login.success    | Counter |
| auth.login.failure    | Counter |
| auth.mfa.challenge    | Counter |
| auth.consent.approved | Counter |

---

# 12.3 Tracing

Distributed tracing propagated using:

```http
traceparent
```

---

# 13. Security Design

# 13.1 Authentication Security

| Rule                   | Description                      |
| ---------------------- | -------------------------------- |
| Password hashing       | Argon2/bcrypt                    |
| MFA support            | Required for privileged accounts |
| Rate limiting          | Required                         |
| Brute force protection | Required                         |

---

# 13.2 Session Security

| Requirement      | Value       |
| ---------------- | ----------- |
| Secure cookies   | Enabled     |
| HttpOnly         | Required    |
| SameSite         | Lax/Strict  |
| Session rotation | Recommended |

---

# 13.3 Consent Security

| Rule               | Description |
| ------------------ | ----------- |
| Explicit consent   | Required    |
| Scope visibility   | Required    |
| Consent revocation | Supported   |
| Audit logging      | Mandatory   |

---

# 13.4 Risk Detection

| Threat              | Mitigation       |
| ------------------- | ---------------- |
| Credential stuffing | Rate limiting    |
| Account takeover    | MFA              |
| Session hijack      | Secure cookies   |
| Consent phishing    | Trusted branding |

---

# 14. Failure Handling

| Scenario         | Action           |
| ---------------- | ---------------- |
| Invalid password | Retry allowed    |
| MFA failure      | Retry limited    |
| Consent denied   | Abort flow       |
| Session expired  | Restart auth     |
| Account locked   | Support workflow |

---

# 15. Performance Considerations

| Area              | Recommendation |
| ----------------- | -------------- |
| Login response    | <300ms         |
| MFA verification  | <2s            |
| Consent rendering | <200ms         |
| Redis lookup      | <5ms           |

---

# 16. Threat Model

| Threat               | Mitigation       |
| -------------------- | ---------------- |
| Password brute force | Rate limiting    |
| MFA bypass           | Device binding   |
| Consent manipulation | Signed requests  |
| Session fixation     | Session rotation |
| Replay attacks       | nonce validation |

---

# 17. Success Criteria

Step 3 is successful when:

- User authenticated
- MFA validated (if enabled)
- Consent approved
- Authenticated session created
- Authorization context stored
- Observability events emitted
- Flow proceeds to authorization code issuance

---

# 18. Next Step

```text
Step 4 — Authorization Code Generation & Redirect
```
