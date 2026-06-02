# Step 11 — Access Token Expiry & Silent Auto Refresh

## Detailed Authorization Workflow Design Document

> Detailed enterprise authorization workflow design based on the Step 11 design diagram.  
> Covers access token expiration detection, silent refresh workflow, refresh token validation, runtime role validation, RBAC/ABAC policy evaluation, API contracts, UI/UX behavior, Redis/Postgres integration, observability, and enterprise security considerations.

---

# 1. Objective

The purpose of Step 11 is to:

- Detect access token expiration automatically
- Perform silent refresh without user interruption
- Validate refresh tokens securely
- Revalidate user roles and permissions dynamically
- Apply updated RBAC/ABAC policies
- Generate updated JWT access tokens
- Support refresh token rotation
- Maintain active user sessions seamlessly
- Emit audit and observability events
- Prevent session hijacking and replay attacks

---

# 2. High-Level Workflow

```text
Client Application
        │
        ├─ Detect Token Expiry
        ├─ Send Silent Refresh Request
        └─ Continue Background Session Handling
                │
                ▼
Authorization Server (Token Endpoint)
        │
        ├─ Validate Client
        ├─ Validate Refresh Token
        ├─ Revalidate User & Roles
        ├─ Evaluate RBAC / ABAC Policies
        ├─ Rotate Refresh Token
        ├─ Generate New Access Token
        ├─ Persist Session Metadata
        ├─ Write Audit Logs
        └─ Return Updated Tokens
                │
                ▼
Client Runtime
        │
        ├─ Replace Tokens
        ├─ Update Auth State
        ├─ Retry Original Request
        └─ Continue Session
```

---

# 3. Architecture Components

| Component               | Responsibility                   |
| ----------------------- | -------------------------------- |
| Client Application      | Silent refresh orchestration     |
| Resource Server         | API validation                   |
| Authorization Server    | Token issuance                   |
| PDP / Decision Engine   | RBAC/ABAC evaluation             |
| Role Validation Service | Runtime authorization validation |
| Refresh Token Store     | Token persistence                |
| Redis                   | Session/token cache              |
| Postgres                | Persistent metadata              |
| Audit & Logging Service | Audit persistence                |
| Observability Stack     | Metrics/logging/tracing          |

---

# 4. Internal Workflow Steps

# Step 1 — Detect Expired Access Token

Client detects expired JWT.

---

## Detection Methods

| Method               | Description        |
| -------------------- | ------------------ |
| exp claim validation | Local JWT check    |
| API 401 response     | Runtime detection  |
| Scheduled refresh    | Preemptive refresh |

---

## Example Logic

```ts
if (jwt.exp < now + 120) {
  silentRefresh();
}
```

---

# Step 2 — Send Silent Refresh Request

Client sends refresh token request.

---

## Token Endpoint

```http
POST /oauth2/token
```

---

## Example Request

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=opaque_refresh_token&
client_id=acme-web
```

---

# Step 3 — Authenticate Client

Validate client identity.

---

## Validation Rules

| Validation            | Required    |
| --------------------- | ----------- |
| client_id valid       | Mandatory   |
| Client active         | Mandatory   |
| Refresh grant enabled | Mandatory   |
| Trusted origin        | Recommended |

---

# Step 4 — Validate Refresh Token

Validate refresh token integrity.

---

## Validation Checks

| Validation          | Description |
| ------------------- | ----------- |
| Token exists        | Required    |
| Not revoked         | Required    |
| Not expired         | Required    |
| Token binding valid | Required    |
| Session active      | Required    |

---

## Example Refresh Token Metadata

```json
{
  "refresh_token_id": "rt_123",
  "user_id": "u1001",
  "tenant_id": "tenant_001",
  "status": "ACTIVE"
}
```

---

# Step 5 — Revalidate User & Roles

Runtime authorization validation occurs again.

---

## Validation Areas

| Area                    | Description |
| ----------------------- | ----------- |
| User active             | Required    |
| Roles active            | Required    |
| Tenant membership valid | Required    |
| Permissions current     | Required    |
| Policies satisfied      | Required    |

---

# 5. Detailed Role Validation Workflow

```text
Extract User Context
        │
        ▼
Fetch Current Roles
        │
        ▼
Validate Role Status
        │
        ▼
Resolve Effective Permissions
        │
        ▼
Validate Tenant Membership
        │
        ▼
Evaluate RBAC Policies
        │
        ▼
Evaluate ABAC Policies
        │
        ▼
Authorize Refresh
```

---

# 6. Detailed Role Validation Steps

| Step | Description                        |
| ---- | ---------------------------------- |
| 1    | Extract user ID from refresh token |
| 2    | Fetch current roles                |
| 3    | Validate active roles              |
| 4    | Resolve inherited permissions      |
| 5    | Validate tenant membership         |
| 6    | Evaluate RBAC                      |
| 7    | Evaluate ABAC                      |
| 8    | Validate scopes                    |
| 9    | Detect policy conflicts            |
| 10   | Approve refresh                    |

---

# Step 6 — Generate New Tokens

Generate updated JWT tokens.

---

## Generated Tokens

| Token         | Purpose                  |
| ------------- | ------------------------ |
| Access Token  | API authorization        |
| ID Token      | Optional identity update |
| Refresh Token | Session continuation     |

---

## Example Access Token Claims

```json
{
  "sub": "u1001",
  "roles": ["Admin", "ReportViewer"],
  "permissions": ["reports.read"],
  "tenant_id": "tenant_001"
}
```

---

# Step 7 — Rotate Refresh Token

Rotate refresh token if policy enabled.

---

## Rotation Rules

| Rule                      | Requirement |
| ------------------------- | ----------- |
| Old token revoked         | Mandatory   |
| New token persisted       | Mandatory   |
| Replay prevention enabled | Mandatory   |

---

# Step 8 — Persist Session Metadata

Persist:

- session ID
- token JTI
- correlation ID
- refresh lineage
- authorization snapshot

---

# Step 9 — Write Audit & Logging Events

Persist silent refresh events.

---

## Example Audit Event

```json
{
  "event": "silent_refresh_success",
  "user_id": "u1001",
  "tenant_id": "tenant_001"
}
```

---

# Step 10 — Return Updated Tokens

Return secure response.

---

## Example Response

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token"
}
```

---

# Step 11 — Retry Original Request

Client retries original request automatically.

---

## Example

```ts
retryRequestWithNewToken();
```

---

# 7. API Contracts

# 7.1 Refresh Token Request

```http
POST /oauth2/token
```

---

## Request Body

```text
grant_type=refresh_token&
refresh_token=opaque_refresh_token&
client_id=acme-web
```

---

# 7.2 Token Response

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "jwt_access_token",
  "refresh_token": "opaque_refresh_token"
}
```

---

# 7.3 Error Response Example

```json
{
  "error": "invalid_grant",
  "error_description": "Refresh token expired"
}
```

---

# 7.4 Role Validation Contract

```http
POST /internal/roles/validate
```

---

## Example Response

```json
{
  "authorized": true,
  "roles": ["Admin"],
  "permissions": ["reports.read"]
}
```

---

# 8. Redis Design

# 8.1 Redis Keys

| Key           | Purpose             |
| ------------- | ------------------- |
| refresh:{id}  | Refresh token       |
| session:{id}  | Active session      |
| revoked:{jti} | Revoked token cache |
| authz:{user}  | Authorization cache |

---

# 8.2 TTL Rules

| Object           | TTL            |
| ---------------- | -------------- |
| Access token     | 1 hour         |
| Refresh token    | 30 days        |
| Session cache    | 1 hour         |
| Revocation cache | Token lifetime |

---

# 9. Postgres Design

# 9.1 Core Tables

| Table          | Purpose             |
| -------------- | ------------------- |
| users          | User registry       |
| roles          | Role definitions    |
| permissions    | Permission registry |
| refresh_tokens | Refresh metadata    |
| sessions       | Session metadata    |
| audit_logs     | Security audit      |

---

# 10. UI / UX Screens

# 10.1 Silent Refresh Screen

```text
No user interface shown.
Refresh occurs silently in background.
```

---

# 10.2 Session Continues Screen

```text
Your session is active.
```

---

# 10.3 Refresh Failed Screen

```text
Your session has expired.
Please sign in again.
[ Go to Login ]
```

---

# 10.4 Security Action Required Screen

```text
We noticed unusual activity.
Please verify your identity.
[ Verify ]
```

---

# 11. UX Notes

| Area               | Recommendation          |
| ------------------ | ----------------------- |
| Silent refresh     | No UI interruption      |
| Refresh failure    | Clear recovery path     |
| Security actions   | Explicit user messaging |
| Accessibility      | WCAG 2.1 AA             |
| Background refresh | Minimal resource impact |

---

# 12. Error Codes

| Code | Meaning               |
| ---- | --------------------- |
| 200  | Success               |
| 400  | Invalid request       |
| 401  | Invalid client        |
| 403  | Invalid refresh token |
| 409  | Token rotation failed |
| 410  | Refresh token expired |
| 429  | Too many requests     |
| 500  | Internal server error |

---

# 13. Observability Design

# 13.1 Events

| Event                   | Description       |
| ----------------------- | ----------------- |
| token_refresh_started   | Refresh initiated |
| refresh_token_validated | Token validated   |
| role_validation_success | Roles validated   |
| silent_refresh_success  | Tokens refreshed  |
| silent_refresh_failed   | Refresh failed    |

---

# 13.2 Metrics

| Metric                       | Type      |
| ---------------------------- | --------- |
| auth.silent_refresh.duration | Histogram |
| auth.silent_refresh.success  | Counter   |
| auth.silent_refresh.failed   | Counter   |
| auth.role.validation         | Histogram |

---

# 13.3 Distributed Tracing

```http
traceparent
```

---

# 14. Security Design

# 14.1 Security Requirements

| Rule                     | Requirement |
| ------------------------ | ----------- |
| HTTPS mandatory          | Yes         |
| Refresh token rotation   | Mandatory   |
| Role validation          | Mandatory   |
| Replay prevention        | Mandatory   |
| Silent refresh isolation | Recommended |

---

# 14.2 Threat Mitigation

| Threat               | Mitigation         |
| -------------------- | ------------------ |
| Refresh token replay | Rotation           |
| Session hijack       | Revocation         |
| Tenant bypass        | Tenant validation  |
| Role escalation      | Runtime validation |
| Refresh abuse        | Rate limiting      |

---

# 15. Enterprise Architecture Notes

Recommended enterprise implementation:

- Centralized Token Service
- Redis-backed refresh token store
- Shared MFE auth runtime
- Distributed tracing
- SIEM integration
- Runtime role synchronization
- Event-driven authorization refresh

---

# 16. Success Criteria

Step 11 is successful when:

- Access token expiration detected
- Silent refresh initiated
- Roles revalidated
- Policies evaluated
- Tokens refreshed
- Original request retried
- Session maintained securely
- Audit logs emitted

---

# 17. Related Diagram

This markdown document corresponds to the detailed Step 11 Access Token Expiry & Silent Auto Refresh design diagram image.
