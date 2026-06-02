# Step 7 — Issue Authorization Code (Redirect to Client)

## Detailed Authorization Workflow Design Document

> Detailed enterprise authorization workflow design based on the Step 7 design diagram.  
> Covers authorization code issuance, redirect handling, role validation, RBAC/ABAC evaluation, API contracts, UI/UX behavior, Redis/Postgres integration, observability, and enterprise security considerations.

Related enterprise integration context: fileciteturn22file0

---

# 1. Objective

The purpose of Step 7 is to:

- Generate a secure authorization code
- Persist authorization metadata securely
- Bind authorization code to the authenticated client
- Associate authorization code with validated roles and permissions
- Redirect user securely back to the client application
- Support OAuth2 Authorization Code + PKCE flow
- Preserve tenant and session context
- Emit audit and observability events
- Prevent replay and authorization abuse

---

# 2. High-Level Workflow

```text
Authorization Server (IdP / OAuth2)
        │
        ├─ Finalize Authorization Decision
        ├─ Generate Authorization Code
        ├─ Persist Code & Metadata
        ├─ Associate Roles & Scopes
        ├─ Create Redirect Response
        ├─ Audit Authorization Event
        └─ Redirect User to Client
                │
                ▼
Client Application
        │
        ├─ Validate state parameter
        ├─ Store authorization code
        ├─ Prepare token exchange
        └─ Continue OAuth2 Flow
```

---

# 3. Architecture Components

| Component                  | Responsibility                  |
| -------------------------- | ------------------------------- |
| Authorization Server (IdP) | Authorization code issuance     |
| Decision Engine (PDP)      | Final authorization decision    |
| Role Validation Service    | Role verification               |
| Code Store (Cache / DB)    | Authorization code persistence  |
| Audit & Logging Service    | Audit persistence               |
| Client Application         | Authorization callback handling |
| Redis                      | Authorization code cache        |
| Postgres                   | Persistent audit & metadata     |
| Observability Stack        | Metrics/logging/tracing         |

---

# 4. Internal Workflow Steps

# Step 1 — Finalize Authorization Decision

Authorization server finalizes allow/deny decision.

---

## Inputs Used

| Input                 | Description          |
| --------------------- | -------------------- |
| Authenticated user    | Verified identity    |
| Effective roles       | Validated roles      |
| Effective permissions | Resolved permissions |
| Tenant policies       | Tenant authorization |
| Scopes                | Approved scopes      |

---

## Example Decision

```json
{
  "decision": "allow",
  "scopes": ["openid", "profile", "reports.read"]
}
```

---

# Step 2 — Generate Authorization Code

Generate short-lived cryptographically secure authorization code.

---

## Requirements

| Requirement | Value     |
| ----------- | --------- |
| Randomized  | Mandatory |
| Short-lived | 5–10 mins |
| Single-use  | Mandatory |
| PKCE-bound  | Mandatory |

---

## Example Code

```text
auth_code = "SplxlOBeZQQYbYS6WxSbIA"
```

---

# Step 3 — Persist Authorization Code & Metadata

Persist code securely.

---

## Persisted Metadata

| Field          | Description        |
| -------------- | ------------------ |
| code           | Authorization code |
| client_id      | OAuth client       |
| redirect_uri   | Callback URI       |
| user_id        | Authenticated user |
| scopes         | Approved scopes    |
| roles          | Effective roles    |
| tenant_id      | Tenant context     |
| nonce          | Replay protection  |
| correlation_id | Traceability       |

---

## Example Metadata

```json
{
  "code": "SplxlOBeZQQYbYS6WxSbIA",
  "client_id": "acme-web",
  "user_id": "u1001",
  "roles": ["Admin"],
  "tenant_id": "tenant_001"
}
```

---

# Step 4 — Bind PKCE Parameters

Associate authorization code with PKCE values.

---

## PKCE Data

| Field                 | Description       |
| --------------------- | ----------------- |
| code_challenge        | SHA256 hash       |
| code_challenge_method | S256              |
| nonce                 | Replay protection |

---

# Step 5 — Build Redirect Response

Construct secure redirect.

---

## Redirect Example

```http
302 Found
Location: https://client.example.com/callback?
code=SplxlOBeZQQYbYS6WxSbIA&
state=xyz123
```

---

# Step 6 — Audit & Logging

Persist authorization code issuance event.

---

## Example Audit Event

```json
{
  "event": "authorization_code_issued",
  "user_id": "u1001",
  "tenant_id": "tenant_001",
  "client_id": "acme-web"
}
```

---

# Step 7 — Client Receives Authorization Code

Client validates:

- state parameter
- redirect_uri
- authorization code presence
- correlation ID

---

# Step 8 — Prepare Token Exchange

Client securely stores code temporarily.

---

## Example

```ts
authorizationCodeStore.set(code);
```

---

# 5. Detailed Role Validation Workflow

```text
Roles Already Validated
        │
        ▼
Capture Effective Roles
        │
        ▼
Persist Roles in Metadata
        │
        ▼
Bind Roles to Tenant Context
        │
        ▼
Store Role Snapshot
        │
        ▼
Pass Roles to Token Exchange
```

---

# 6. Detailed Role Validation Steps

| Step | Description                     |
| ---- | ------------------------------- |
| 1    | Validate active roles           |
| 2    | Resolve inherited roles         |
| 3    | Resolve effective permissions   |
| 4    | Validate tenant membership      |
| 5    | Bind role snapshot to auth code |
| 6    | Persist authorization metadata  |
| 7    | Detect conflicting roles        |
| 8    | Store role context securely     |

---

# 7. API Contracts

# 7.1 Authorization Redirect Contract

```http
302 Found
Location: https://client.example.com/callback?
code=AUTH_CODE&
state=xyz123
```

---

# 7.2 Authorization Code Metadata Contract

```json
{
  "code": "AUTH_CODE",
  "client_id": "acme-web",
  "redirect_uri": "https://client.example.com/callback",
  "user_id": "u1001",
  "tenant_id": "tenant_001",
  "roles": ["Admin"],
  "scopes": ["openid", "profile"]
}
```

---

# 7.3 Role Validation Contract

```http
POST /internal/roles/validate
```

---

## Example Request

```json
{
  "user_id": "u1001",
  "tenant_id": "tenant_001"
}
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

| Key            | Purpose              |
| -------------- | -------------------- |
| auth_code:{id} | Authorization code   |
| session:{id}   | Active session       |
| authz:{user}   | Cached authorization |
| state:{id}     | OAuth state          |

---

# 8.2 TTL Rules

| Object              | TTL       |
| ------------------- | --------- |
| Authorization code  | 5–10 mins |
| OAuth state         | 5 mins    |
| Authorization cache | 15 mins   |

---

# 9. Postgres Design

# 9.1 Core Tables

| Table               | Purpose             |
| ------------------- | ------------------- |
| users               | User registry       |
| roles               | Role definitions    |
| permissions         | Permission registry |
| authorization_codes | Auth code metadata  |
| audit_logs          | Security audit      |

---

# 10. UI / UX Screens

# 10.1 Authorizing Screen

```text
Authorizing...
Please wait while we redirect you.
```

---

# 10.2 Redirecting Screen

```text
Authorization Successful
Redirecting back to application...
```

---

# 10.3 Access Denied Screen

```text
Access Denied
You do not have permission.
```

---

# 10.4 Session Expired Screen

```text
Your session has expired.
Please sign in again.
```

---

# 10.5 Authorization Failed Screen

```text
Authorization Failed
Please retry again later.
```

---

# 11. UX Notes

| Area                 | Recommendation             |
| -------------------- | -------------------------- |
| Redirect transitions | Smooth loading states      |
| Access denied        | Clear remediation guidance |
| Session expiry       | Fast recovery flow         |
| Accessibility        | WCAG 2.1 AA                |
| Errors               | Retry + support links      |

---

# 12. Error Codes

| Code | Meaning                    |
| ---- | -------------------------- |
| 302  | Redirect                   |
| 400  | Invalid redirect URI       |
| 401  | Unauthorized               |
| 403  | Access denied              |
| 409  | State mismatch             |
| 410  | Authorization code expired |
| 500  | Internal server error      |

---

# 13. Observability Design

# 13.1 Events

| Event                     | Description          |
| ------------------------- | -------------------- |
| authorization_code_issued | Code generated       |
| redirect_completed        | Redirect sent        |
| role_validation_success   | Roles validated      |
| authorization_success     | Access granted       |
| authorization_failed      | Authorization denied |

---

# 13.2 Metrics

| Metric                    | Type      |
| ------------------------- | --------- |
| auth.code.issued          | Counter   |
| auth.redirect.success     | Counter   |
| auth.role.validation      | Histogram |
| auth.authorization.failed | Counter   |

---

# 13.3 Distributed Tracing

```http
traceparent
```

---

# 14. Security Design

# 14.1 Security Requirements

| Rule                 | Requirement |
| -------------------- | ----------- |
| PKCE required        | Mandatory   |
| HTTPS only           | Mandatory   |
| Single-use auth code | Mandatory   |
| State validation     | Mandatory   |
| Role validation      | Mandatory   |

---

# 14.2 Threat Mitigation

| Threat                          | Mitigation        |
| ------------------------------- | ----------------- |
| Authorization code interception | PKCE              |
| Replay attack                   | Single-use codes  |
| Tenant bypass                   | Tenant validation |
| Role escalation                 | Role validation   |
| State tampering                 | State validation  |

---

# 15. Enterprise Architecture Notes

Recommended enterprise implementation:

- Centralized Authorization Server
- Redis-backed authorization code cache
- Shared MFE authorization runtime
- Distributed tracing
- SIEM integration
- Runtime role synchronization
- Event-driven authorization refresh

---

# 16. Success Criteria

Step 7 is successful when:

- Authorization decision finalized
- Authorization code generated
- PKCE binding persisted
- Roles validated
- Authorization metadata stored
- Redirect response returned
- Client callback received
- Audit logs emitted

---

# 17. Related Diagram

This markdown document corresponds to the detailed Step 7 Authorization Code Issuance design diagram image.
