# Step 1 — User Accesses Protected Resource

## Authorization Workflow Detailed Design Document

> Detailed enterprise authorization workflow design for Step 1 of OAuth2 Authorization Code Flow with PKCE, JWT Bearer Authentication, RBAC/ABAC validation, Redis session validation, Postgres role persistence, and observability integration.

Related enterprise integration context: fileciteturn16file0

---

# 1. Objective

The objective of Step 1 is to:

- Detect access to protected application resources
- Validate runtime authentication state
- Validate JWT bearer token
- Perform role validation
- Perform RBAC/ABAC authorization checks
- Validate tenant authorization context
- Validate runtime session integrity
- Decide whether access is allowed or denied
- Emit audit and observability events
- Redirect unauthorized users to authentication flow

---

# 2. High-Level Authorization Flow

```text
User Browser
     │
     ▼
SPA Shell / MFE Runtime
     │
     ├─ Validate Runtime Session
     ├─ Validate JWT Token
     ├─ Validate Roles
     ├─ Resolve Permissions
     ├─ Evaluate RBAC / ABAC
     ├─ Validate Tenant Context
     ├─ Validate Revocation State
     └─ Allow / Deny Access
```

---

# 3. Detailed Internal Workflow

# Step 1 — User Accesses Protected Resource

User opens protected route:

```http
GET /dashboard
```

---

# Step 2 — SPA Runtime Validation

SPA shell checks:

- runtime auth state
- JWT token presence
- token expiration
- runtime authorization cache
- session continuity

---

## Runtime Validation Example

```ts
if (!accessToken || isExpired(accessToken)) {
  redirectToLogin();
}
```

---

# Step 3 — Extract JWT Bearer Token

SPA extracts bearer token.

---

## Authorization Header

```http
Authorization: Bearer <jwt_access_token>
```

---

# Step 4 — Validate JWT Signature

API Gateway or BFF validates:

| Validation          | Required |
| ------------------- | -------- |
| JWT signature valid | Yes      |
| Trusted issuer      | Yes      |
| Valid audience      | Yes      |
| Not expired         | Yes      |
| Not revoked         | Yes      |

---

# Step 5 — Extract Claims

Extract runtime claims from JWT.

---

## JWT Claims Example

```json
{
  "sub": "u_789",
  "roles": ["tenant_admin"],
  "permissions": ["reports.read", "analytics.write"],
  "tenant_id": "tenant_123",
  "scope": "openid profile email",
  "exp": 1716203600
}
```

---

# Step 6 — Role Validation Workflow

Role validation ensures runtime authorization correctness.

---

## Role Validation Lifecycle

```text
JWT Received
    │
    ▼
Validate Signature
    │
    ▼
Extract Claims
    │
    ▼
Resolve Roles
    │
    ▼
Resolve Effective Permissions
    │
    ▼
Evaluate RBAC Rules
    │
    ▼
Evaluate ABAC Policies
    │
    ▼
Authorization Decision
```

---

# 7. Detailed Role Validation Steps

| Step | Description                   |
| ---- | ----------------------------- |
| 1    | Validate JWT signature        |
| 2    | Validate issuer/audience      |
| 3    | Extract role claims           |
| 4    | Resolve inherited roles       |
| 5    | Resolve effective permissions |
| 6    | Validate tenant mapping       |
| 7    | Evaluate RBAC policies        |
| 8    | Evaluate ABAC rules           |
| 9    | Validate revocation cache     |
| 10   | Emit audit logs               |
| 11   | Allow/Deny request            |

---

# 8. Role Hierarchy Example

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

# 9. Effective Permission Resolution

## Example

```json
{
  "roles": ["tenant_admin"],
  "permissions": ["reports.read", "analytics.write", "users.manage"]
}
```

---

# 10. RBAC Validation

## RBAC Rules Example

| Role    | Allowed Permissions |
| ------- | ------------------- |
| admin   | reports.\*          |
| analyst | analytics.read      |
| viewer  | reports.read        |

---

## API Authorization Example

```http
GET /api/v1/reports
Required Permission: reports.read
```

---

# 11. ABAC Validation

## Evaluated Attributes

| Attribute      | Example    |
| -------------- | ---------- |
| tenant_id      | tenant_123 |
| device_trust   | trusted    |
| geo_location   | India      |
| resource_owner | user_id    |

---

## Example ABAC Policy

```text
Allow access if:
tenant_id matches
AND device_trust = trusted
```

---

# 12. Authorization Decision Outcomes

| Outcome             | Action                  |
| ------------------- | ----------------------- |
| Authorized          | Continue to application |
| Unauthorized        | Redirect to login       |
| Expired token       | Trigger silent refresh  |
| Revoked token       | Force logout            |
| Missing permissions | Access denied           |

---

# 13. API Contracts

# 13.1 Protected Resource Contract

```http
GET /dashboard
Authorization: Bearer <jwt_access_token>
```

---

# 13.2 Token Introspection Contract

```http
POST /oauth2/introspect
```

---

## Request Example

```json
{
  "token": "jwt_token",
  "token_type_hint": "access_token"
}
```

---

## Response Example

```json
{
  "active": true,
  "scope": "openid profile",
  "roles": ["tenant_admin"]
}
```

---

# 13.3 JWKS Retrieval Contract

```http
GET /.well-known/jwks.json
```

---

## Response Example

```json
{
  "keys": [
    {
      "kid": "abc123",
      "kty": "RSA"
    }
  ]
}
```

---

# 14. Redis Design

# 14.1 Redis Keys

| Key           | Purpose              |
| ------------- | -------------------- |
| session:{id}  | Active session       |
| authz:{user}  | Cached authorization |
| revoked:{jti} | Revoked JWTs         |
| role:{id}     | Cached roles         |

---

# 14.2 TTL Rules

| Object              | TTL            |
| ------------------- | -------------- |
| Authorization cache | 15 mins        |
| Session cache       | 1 hour         |
| Revocation cache    | Token lifetime |

---

# 15. Postgres Design

# 15.1 Core Tables

| Table            | Purpose             |
| ---------------- | ------------------- |
| users            | User identities     |
| roles            | Role definitions    |
| permissions      | Permission registry |
| user_roles       | User-role mapping   |
| role_permissions | Permission mapping  |
| audit_logs       | Security audit      |

---

# 15.2 Example Schema

```sql
CREATE TABLE roles (
  role_id TEXT PRIMARY KEY,
  role_name TEXT NOT NULL
);

CREATE TABLE permissions (
  permission_id TEXT PRIMARY KEY,
  permission_name TEXT NOT NULL
);
```

---

# 16. Observability Design

# 16.1 Events

| Event                        | Description        |
| ---------------------------- | ------------------ |
| authorization_started        | Validation started |
| authorization_success        | Access granted     |
| authorization_denied         | Access denied      |
| token_revoked                | Session revoked    |
| permission_validation_failed | RBAC rejection     |

---

# 16.2 Metrics

| Metric                     | Type      |
| -------------------------- | --------- |
| auth.jwt.validation        | Histogram |
| auth.authorization.success | Counter   |
| auth.authorization.denied  | Counter   |
| auth.permission.validation | Histogram |

---

# 16.3 Distributed Tracing

```http
traceparent
```

---

# 17. UI / UX Design

# 17.1 Dashboard Loading Screen

```text
┌──────────────────────────────┐
│ Loading secure authorization │
│ context...                   │
└──────────────────────────────┘
```

---

# 17.2 Access Denied Screen

```text
┌──────────────────────────────┐
│ Access Denied                │
│ You do not have permission   │
│ to access this resource      │
└──────────────────────────────┘
```

---

# 17.3 Session Expired Screen

```text
┌──────────────────────────────┐
│ Session Expired              │
│ Please sign in again         │
└──────────────────────────────┘
```

---

# 17.4 UX Notes

| Area            | Recommendation               |
| --------------- | ---------------------------- |
| Loading states  | Skeleton loaders             |
| Runtime refresh | Silent background validation |
| Accessibility   | WCAG 2.1 AA                  |
| Error handling  | Clear actionable messaging   |

---

# 18. Security Design

# 18.1 Security Requirements

| Rule              | Requirement |
| ----------------- | ----------- |
| PKCE required     | Mandatory   |
| JWT validation    | Mandatory   |
| HTTPS only        | Mandatory   |
| Revocation checks | Mandatory   |
| RBAC enforcement  | Mandatory   |

---

# 18.2 Threat Mitigation

| Threat               | Mitigation       |
| -------------------- | ---------------- |
| JWT replay           | JTI revocation   |
| Token theft          | Secure storage   |
| Privilege escalation | Role validation  |
| Cross-tenant access  | Tenant isolation |

---

# 19. Enterprise Architecture Notes

Recommended enterprise implementation:

- Centralized authorization service
- Shared MFE authorization runtime
- Redis-backed permission cache
- API Gateway JWT validation
- Distributed tracing
- SIEM integration
- Runtime role synchronization

---

# 20. Success Criteria

Step 1 is successful when:

- JWT validated successfully
- Roles resolved correctly
- Permissions validated
- RBAC/ABAC checks passed
- Runtime authorization initialized
- Audit events emitted
- User allowed or denied appropriately

---

# 21. Related Design Diagram

This markdown document corresponds to the detailed Step 1 authorization workflow design diagram image.
