# Step 10 — Silent Token Refresh & Session Continuity

> Detailed technical design document for OAuth2 Authorization Code Flow with PKCE — Step 10.

This step begins when the access token approaches expiration during an active authenticated session.  
The step covers silent token refresh, refresh token rotation, session continuity, retry orchestration, runtime UX behavior, observability, and security enforcement.

Related enterprise integration context: fileciteturn13file0

---

# 1. Objective

The purpose of Step 10 is to:

- Detect access token expiration proactively
- Refresh tokens silently without user interruption
- Rotate refresh tokens securely
- Preserve authenticated application state
- Maintain uninterrupted API access
- Prevent refresh token replay attacks
- Support refresh retry and backoff logic
- Update runtime authorization state
- Emit observability and security telemetry
- Enable seamless session continuity

---

# 2. High-Level Flow

```text
SPA / MFE Runtime
        │
        ├─ Detect token expiration
        ├─ Trigger silent refresh
        ├─ Call /oauth2/token
        │
        ▼
Identity Provider (IDP)
        │
        ├─ Validate refresh token
        ├─ Rotate refresh token
        ├─ Generate new access token
        ├─ Generate new ID token
        └─ Return refreshed tokens
                │
                ▼
SPA Runtime
        │
        ├─ Replace runtime tokens
        ├─ Update session metadata
        ├─ Retry pending requests
        └─ Continue authenticated session
```

---

# 3. Architecture Components

| Component               | Responsibility               |
| ----------------------- | ---------------------------- |
| SPA / MFE               | Silent refresh orchestration |
| Browser Runtime         | Token lifecycle management   |
| Identity Provider (IDP) | Refresh token validation     |
| Redis                   | Refresh session tracking     |
| Postgres                | Refresh audit persistence    |
| Observability Stack     | Metrics/logging/tracing      |
| Security Monitoring     | Replay/anomaly detection     |

---

# 4. UI/UX Design

# 4.1 Silent Refresh UX

Silent refresh typically occurs without visible interruption.

---

## Invisible Background Refresh

```text
User continues using application normally
while refresh executes in background.
```

---

# 4.2 Refresh-in-Progress UX (Optional)

```text
┌────────────────────────────────────────────┐
│ Re-establishing Secure Session             │
│────────────────────────────────────────────│
│                                            │
│ Your secure session is being refreshed.    │
│                                            │
│                  ⏳                        │
│                                            │
│ Please wait...                             │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.3 Session Expired UX

```text
┌────────────────────────────────────────────┐
│ Session Expired                            │
│────────────────────────────────────────────│
│                                            │
│ Your secure session has expired.           │
│                                            │
│ Please sign in again to continue.          │
│                                            │
│ [ Sign In ]                                │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.4 UX Behavior

| Scenario                    | UX Behavior            |
| --------------------------- | ---------------------- |
| Access token nearing expiry | Silent refresh         |
| Refresh successful          | Continue seamlessly    |
| Refresh delayed             | Retry/backoff          |
| Refresh failed              | Logout/re-authenticate |
| Refresh token revoked       | Force login            |
| Network unavailable         | Graceful retry         |

---

# 4.5 Accessibility Requirements

| Requirement                  | Details  |
| ---------------------------- | -------- |
| Accessible expiration alerts | Required |
| Keyboard-safe dialogs        | Required |
| Screen reader support        | Required |
| Accessible retry flows       | Required |

---

# 5. Internal Processing Steps

# Step 1 — Monitor Token Expiration

Runtime scheduler tracks token expiration.

---

## Example Expiration Check

```ts
expiresAt - currentTime < 300;
```

---

# Step 2 — Trigger Silent Refresh

Refresh initiated before expiration threshold.

---

## Refresh Threshold

| Threshold          | Example |
| ------------------ | ------- |
| Pre-expiry refresh | 5 mins  |
| Retry window       | 30 sec  |
| Max retries        | 3       |

---

# Step 3 — Retrieve Refresh Token

Securely retrieve refresh token.

---

## Storage Rules

| Token         | Storage         |
| ------------- | --------------- |
| access_token  | Memory          |
| refresh_token | HttpOnly cookie |

---

# Step 4 — Build Refresh Request

Construct refresh request.

---

## Request Parameters

| Parameter     | Description           |
| ------------- | --------------------- |
| grant_type    | refresh_token         |
| refresh_token | Current refresh token |
| client_id     | OAuth client          |

---

# Step 5 — Call Token Endpoint

Send refresh request to IDP.

---

## Endpoint

```http
POST /oauth2/token
```

---

# Step 6 — Validate Refresh Token

IDP validates:

| Validation           | Required |
| -------------------- | -------- |
| Refresh token exists | Yes      |
| Not expired          | Yes      |
| Not revoked          | Yes      |
| Client matches       | Yes      |
| Session active       | Yes      |

---

# Step 7 — Detect Replay Attacks

Validate refresh token reuse.

---

## Replay Detection

| Threat            | Mitigation           |
| ----------------- | -------------------- |
| Token reuse       | Rotation             |
| Duplicate refresh | Revocation           |
| Token theft       | Session invalidation |

---

# Step 8 — Rotate Refresh Token

Issue new refresh token.

---

## Rotation Rules

| Rule                  | Requirement |
| --------------------- | ----------- |
| Old token invalidated | Yes         |
| New token issued      | Yes         |
| Rotation tracked      | Yes         |

---

# Step 9 — Generate New Access Token

Generate refreshed JWT access token.

---

## New Token Characteristics

```json
{
  "sub": "u_789",
  "scope": "openid profile email",
  "exp": 1716207200
}
```

---

# Step 10 — Persist Updated Session Metadata

Update session state.

---

## Updated Session Example

```json
{
  "session_id": "sess_123",
  "last_refresh_at": 1716203600,
  "refresh_count": 4
}
```

---

# Step 11 — Return Refresh Response

Return updated tokens.

---

## Example Response

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "r1.newxyz",
  "expires_in": 3600
}
```

---

# Step 12 — Replace Runtime Tokens

Frontend replaces expired tokens.

---

# Step 13 — Retry Pending Requests

Resume interrupted API requests.

---

# Step 14 — Emit Observability Events

```json
{
  "event": "token_refreshed",
  "user_id": "u_789",
  "session_id": "sess_123"
}
```

---

# Step 15 — Continue Active Session

Application runtime continues uninterrupted.

---

# 6. Sequence Diagram

```text
SPA/MFE       Browser        IDP         Redis      Observability
   │              │            │             │              │
   │ Detect exp   │            │             │              │
   │ Refresh req  │            │             │              │
   │─────────────>│───────────>│ Validate RT │              │
   │              │            │───────────> │ Lookup sess  │
   │              │            │ Rotate RT   │              │
   │              │            │ Generate AT │              │
   │              │            │───────────> │ Update sess  │
   │              │            │──────────────────────────> │
   │              │            │ Emit telemetry             │
   │<─────────────│<───────────│ Token response             │
   │ Replace tok  │            │             │              │
```

---

# 7. Refresh Token Contract

# 7.1 Token Endpoint

```http
POST /oauth2/token
```

---

# 7.2 Refresh Request Example

```http
grant_type=refresh_token&
refresh_token=r1.abc123&
client_id=acme-web
```

---

# 7.3 Request Headers

```http
Content-Type: application/x-www-form-urlencoded
Accept: application/json
```

---

# 7.4 Refresh Response

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "r1.newxyz",
  "id_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

# 8. Runtime Session Contract

# 8.1 Runtime Auth State

```ts
type RuntimeAuthState = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  refreshInProgress: boolean;
};
```

---

# 8.2 Silent Refresh Function

```ts
async function refreshAccessToken(): Promise<void>;
```

---

# 8.3 Retry Queue Contract

```ts
type PendingRequest = {
  requestId: string;
  retry: () => Promise<void>;
};
```

---

# 9. Redis Design

# 9.1 Keys

| Key           | Purpose          |
| ------------- | ---------------- |
| refresh:{id}  | Refresh session  |
| revoked:{jti} | Revoked tokens   |
| session:{id}  | Active session   |
| replay:{id}   | Replay detection |

---

# 9.2 TTL Rules

| Object        | TTL            |
| ------------- | -------------- |
| Access token  | 1 hour         |
| Refresh token | 30 days        |
| Replay cache  | Token lifetime |

---

# 10. Postgres Design

# 10.1 Tables

| Table            | Purpose              |
| ---------------- | -------------------- |
| refresh_tokens   | Refresh lifecycle    |
| token_rotations  | Rotation audit       |
| session_activity | Runtime activity     |
| security_events  | Replay/security logs |

---

# 10.2 Example Rotation Record

```json
{
  "old_refresh_id": "rt_123",
  "new_refresh_id": "rt_456",
  "rotated_at": 1716203600
}
```

---

# 11. Observability Design

# 11.1 Events

| Event                   | Description       |
| ----------------------- | ----------------- |
| refresh_started         | Refresh initiated |
| refresh_success         | Refresh completed |
| refresh_failed          | Refresh failed    |
| refresh_replay_detected | Replay detected   |
| session_extended        | Session continued |

---

# 11.2 Metrics

| Metric               | Type      |
| -------------------- | --------- |
| auth.refresh.success | Counter   |
| auth.refresh.failure | Counter   |
| auth.refresh.latency | Histogram |
| auth.refresh.replay  | Counter   |

---

# 11.3 Distributed Tracing

Tracing propagated using:

```http
traceparent
```

---

# 12. Security Design

# 12.1 Refresh Token Security

| Rule                | Requirement |
| ------------------- | ----------- |
| Rotation enabled    | Mandatory   |
| Replay detection    | Mandatory   |
| Secure storage      | Mandatory   |
| Expiration enforced | Mandatory   |

---

# 12.2 Browser Security

| Rule                    | Description |
| ----------------------- | ----------- |
| HttpOnly refresh cookie | Required    |
| HTTPS only              | Mandatory   |
| CSP enabled             | Required    |
| Token isolation         | Recommended |

---

# 12.3 Replay Protection

| Threat              | Mitigation           |
| ------------------- | -------------------- |
| Refresh token reuse | Rotation             |
| Token theft         | Revocation           |
| Session hijack      | Session invalidation |
| Concurrent replay   | Replay cache         |

---

# 12.4 Runtime Security

| Requirement         | Description |
| ------------------- | ----------- |
| Single refresh lock | Required    |
| Retry backoff       | Required    |
| Refresh throttling  | Recommended |
| Revocation checks   | Mandatory   |

---

# 13. Failure Handling

| Scenario                | Action         |
| ----------------------- | -------------- |
| Refresh token expired   | Logout         |
| Refresh replay detected | Revoke session |
| Network timeout         | Retry          |
| Refresh denied          | Force login    |
| Concurrent refresh      | Lock queue     |

---

# 13.1 Failure Response Example

```json
{
  "error": "invalid_grant",
  "message": "Refresh token expired"
}
```

---

# 14. Performance Considerations

| Area            | Recommendation      |
| --------------- | ------------------- |
| Refresh latency | <300ms              |
| Rotation lookup | Cached              |
| Replay checks   | Lightweight         |
| Runtime retries | Exponential backoff |

---

# 15. Threat Model

| Threat               | Mitigation      |
| -------------------- | --------------- |
| Refresh token replay | Rotation        |
| Token theft          | Secure cookies  |
| Session hijack       | Session binding |
| Silent refresh abuse | Rate limiting   |
| Infinite retry loops | Retry limits    |

---

# 16. Success Criteria

Step 10 is successful when:

- Expiration detected proactively
- Silent refresh completed
- Refresh token rotated
- Runtime tokens replaced
- Session continuity preserved
- Pending requests resumed
- Observability events emitted

---

# 17. Next Step

```text
Step 11 — Runtime Token Rotation & Authorization Continuity
```
