# Step 2 — Redirect to Authorization Server

## Detailed Authorization Workflow Design Document

> Enterprise-grade OAuth2 Authorization Code Flow with PKCE — Step 2 Design  
> Covers redirect orchestration, authorization request generation, user authentication, consent management, role validation, contracts, UI/UX behavior, Redis/Postgres integration, and observability.

Related enterprise integration context: fileciteturn17file0

---

# 1. Objective

The purpose of Step 2 is to:

- Detect unauthenticated or invalid sessions
- Redirect the user securely to the Authorization Server
- Build OAuth2/OIDC authorization request
- Generate PKCE challenge and state values
- Initiate authentication and consent flow
- Trigger runtime role validation
- Validate tenant and permission context
- Establish secure authorization lifecycle
- Prepare for authorization code issuance
- Emit observability and audit events

---

# 2. High-Level Workflow

```text
User Browser / SPA
        │
        ▼
Protected Resource Access
        │
        ▼
API Gateway / BFF
        │
        ├─ Detect Invalid Session
        ├─ Return 401 Unauthorized
        └─ WWW-Authenticate Header
                │
                ▼
SPA Runtime
        │
        ├─ Generate PKCE challenge
        ├─ Generate state + nonce
        ├─ Build authorization request
        └─ Redirect user to IDP
                │
                ▼
Authorization Server (IDP)
        │
        ├─ User Login
        ├─ MFA Validation
        ├─ Consent Screen
        ├─ Role Validation
        └─ Authorization Code Issuance
```

---

# 3. Architecture Components

| Component                  | Responsibility           |
| -------------------------- | ------------------------ |
| SPA Shell                  | Redirect orchestration   |
| API Gateway / BFF          | Unauthorized detection   |
| Authorization Server (IDP) | OAuth2/OIDC              |
| Role Validation Service    | Role & permission checks |
| Redis                      | Session/cache validation |
| Postgres                   | Users/roles/permissions  |
| Observability Stack        | Logs/traces/metrics      |

---

# 4. Internal Workflow Steps

# Step 1 — Detect Authentication Failure

Protected API request fails.

---

## Example

```http
GET /api/v1/reports
Authorization: Bearer <expired_token>
```

---

## API Response

```http
401 Unauthorized
WWW-Authenticate: Bearer
```

---

# Step 2 — Build Authorization Request

SPA constructs OIDC authorization request.

---

## Authorization Endpoint

```http
GET /oauth2/authorize
```

---

## Required Parameters

| Parameter             | Purpose           |
| --------------------- | ----------------- |
| response_type         | code              |
| client_id             | OAuth client      |
| redirect_uri          | Callback URI      |
| scope                 | OIDC scopes       |
| state                 | CSRF protection   |
| nonce                 | Replay prevention |
| code_challenge        | PKCE challenge    |
| code_challenge_method | S256              |

---

## Example Request

```http
GET /oauth2/authorize?
response_type=code&
client_id=acme-web&
redirect_uri=https://app.acme.com/callback&
scope=openid profile email&
state=xyz123&
nonce=abc123&
code_challenge=qwerty&
code_challenge_method=S256
```

---

# Step 3 — Generate PKCE Challenge

SPA generates:

- code_verifier
- code_challenge
- state
- nonce

---

## PKCE Example

```text
code_verifier → random_secure_string
code_challenge → SHA256(code_verifier)
```

---

# Step 4 — Redirect to Authorization Server

Browser redirects to IDP authorize endpoint.

---

## Browser Redirect

```http
302 Redirect → /oauth2/authorize
```

---

# Step 5 — User Authentication at IDP

IDP authenticates user.

---

## Authentication Types

| Method            | Supported |
| ----------------- | --------- |
| Username/password | Yes       |
| MFA               | Yes       |
| SSO/SAML          | Yes       |
| WebAuthn          | Optional  |

---

# Step 6 — Consent Validation

Display requested scopes.

---

## Example Consent

| Scope   | Purpose      |
| ------- | ------------ |
| openid  | Identity     |
| profile | User profile |
| email   | Email access |
| roles   | Role claims  |

---

# Step 7 — Role Validation Workflow

IDP validates runtime authorization.

---

## Role Validation Pipeline

```text
User Authenticated
       │
       ▼
Resolve Roles
       │
       ▼
Resolve Permissions
       │
       ▼
Validate Tenant Mapping
       │
       ▼
Evaluate RBAC
       │
       ▼
Evaluate ABAC
       │
       ▼
Allow Authorization
```

---

# Step 8 — Resolve Effective Permissions

Resolve:

- inherited roles
- tenant-scoped roles
- permission mappings
- feature permissions

---

## Example Effective Permissions

```json
{
  "roles": ["tenant_admin"],
  "permissions": ["reports.read", "analytics.write", "users.manage"]
}
```

---

# Step 9 — Generate Authorization Code

Authorization server issues short-lived code.

---

## Example Redirect

```http
/callback?code=abc123&state=xyz123
```

---

# Step 10 — Emit Audit & Observability Events

Emit:

- login success
- consent granted
- authorization initiated
- role validation success

---

# 5. Detailed Role Validation Steps

| Step | Description                   |
| ---- | ----------------------------- |
| 1    | Validate user identity        |
| 2    | Lookup direct user roles      |
| 3    | Resolve inherited roles       |
| 4    | Resolve effective permissions |
| 5    | Validate tenant ownership     |
| 6    | Evaluate RBAC rules           |
| 7    | Evaluate ABAC policies        |
| 8    | Validate session state        |
| 9    | Emit audit logs               |
| 10   | Allow authorization           |

---

# 6. Role Hierarchy Example

```text
Super Admin
    │
    ├── Tenant Admin
    │      ├── Analyst
    │      └── Viewer
    │
    └── Security Auditor
```

---

# 7. Contracts

# 7.1 Authorization Request Contract

```http
GET /oauth2/authorize
```

---

## Request Parameters

| Parameter             | Example                       |
| --------------------- | ----------------------------- |
| response_type         | code                          |
| client_id             | acme-web                      |
| redirect_uri          | https://app.acme.com/callback |
| state                 | xyz123                        |
| nonce                 | abc123                        |
| code_challenge        | pkce_hash                     |
| code_challenge_method | S256                          |

---

# 7.2 Authorization Response Contract

```http
302 Redirect
Location: /callback?code=abc123&state=xyz123
```

---

# 7.3 Role Validation Contract

```http
POST /internal/role-validation
```

---

## Request Example

```json
{
  "user_id": "u_789",
  "tenant_id": "tenant_123",
  "requested_scopes": ["openid", "profile", "roles"]
}
```

---

## Response Example

```json
{
  "authorized": true,
  "roles": ["tenant_admin"],
  "permissions": ["reports.read"]
}
```

---

# 8. Redis Design

# 8.1 Redis Keys

| Key          | Purpose            |
| ------------ | ------------------ |
| session:{id} | Session tracking   |
| authz:{user} | Cached permissions |
| state:{id}   | OAuth state        |
| nonce:{id}   | Replay protection  |

---

# 8.2 TTL Rules

| Object        | TTL    |
| ------------- | ------ |
| OAuth state   | 5 mins |
| Nonce         | 5 mins |
| Session cache | 1 hour |

---

# 9. Postgres Design

# 9.1 Core Tables

| Table            | Purpose             |
| ---------------- | ------------------- |
| users            | User identities     |
| roles            | Role definitions    |
| permissions      | Permission registry |
| user_roles       | Role mappings       |
| role_permissions | Permission mapping  |
| audit_logs       | Security audit      |

---

# 10. UI / UX Screens

# 10.1 Login Screen

```text
┌──────────────────────────────┐
│ Welcome Back                 │
│ Email                        │
│ Password                     │
│ [ Sign In ]                  │
└──────────────────────────────┘
```

---

# 10.2 MFA Screen

```text
┌──────────────────────────────┐
│ Verify It's You              │
│ Enter 6-digit MFA Code       │
│ [ Verify ]                   │
└──────────────────────────────┘
```

---

# 10.3 Consent Screen

```text
┌──────────────────────────────┐
│ App Permissions              │
│ ✓ Read profile               │
│ ✓ Access reports             │
│ ✓ Access roles               │
│ [ Allow ] [ Deny ]           │
└──────────────────────────────┘
```

---

# 10.4 Redirecting Screen

```text
┌──────────────────────────────┐
│ Redirecting back to app...   │
│ Please wait...               │
└──────────────────────────────┘
```

---

# 10.5 Access Denied Screen

```text
┌──────────────────────────────┐
│ Access Denied                │
│ Contact your administrator   │
└──────────────────────────────┘
```

---

# 11. UX Notes

| Area                 | Recommendation            |
| -------------------- | ------------------------- |
| Redirect transitions | Smooth loading indicators |
| Consent UI           | Minimal requested scopes  |
| MFA UX               | Accessible input flows    |
| Errors               | Clear actionable messages |
| Accessibility        | WCAG 2.1 AA               |

---

# 12. Observability Design

# 12.1 Events

| Event                          | Description        |
| ------------------------------ | ------------------ |
| authorization_redirect_started | Redirect initiated |
| login_success                  | User authenticated |
| mfa_success                    | MFA validated      |
| consent_granted                | Consent approved   |
| role_validation_success        | Roles validated    |

---

# 12.2 Metrics

| Metric                | Type      |
| --------------------- | --------- |
| auth.redirect.count   | Counter   |
| auth.login.success    | Counter   |
| auth.role.validation  | Histogram |
| auth.consent.approved | Counter   |

---

# 12.3 Distributed Tracing

```http
traceparent
```

---

# 13. Security Design

# 13.1 Security Requirements

| Rule             | Requirement |
| ---------------- | ----------- |
| PKCE required    | Mandatory   |
| HTTPS only       | Mandatory   |
| state validation | Mandatory   |
| nonce validation | Mandatory   |
| MFA support      | Recommended |

---

# 13.2 Threat Mitigation

| Threat                          | Mitigation       |
| ------------------------------- | ---------------- |
| Authorization code interception | PKCE             |
| CSRF                            | state parameter  |
| Replay attacks                  | nonce            |
| Privilege escalation            | Role validation  |
| Session fixation                | Session rotation |

---

# 14. Enterprise Architecture Notes

Recommended enterprise implementation:

- Centralized Authorization Server
- Shared MFE auth runtime
- Redis-backed state cache
- Distributed tracing
- SIEM integration
- Runtime role synchronization
- RBAC + ABAC hybrid authorization

---

# 15. Success Criteria

Step 2 is successful when:

- User redirected securely
- PKCE challenge generated
- state/nonce validated
- User authenticated
- Roles validated
- Permissions resolved
- Authorization code issued
- Observability emitted

---

# 16. Related Diagram

This markdown file corresponds to the detailed Step 2 authorization workflow design diagram image.
