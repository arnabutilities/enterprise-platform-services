# Step 2 Authorization Workflow — Design Document (Based on Image 2)

> Detailed explanation and contracts derived from Image 2 design diagram for Step 2 — Redirect to Authorization Server.

Related enterprise integration context: fileciteturn18file0

---

# 1. Objective

This design focuses on:

- Authorization redirect orchestration
- Authentication lifecycle
- MFA and consent management
- Internal role validation
- Authorization code issuance
- Enterprise security validation
- Runtime authorization preparation

---

# 2. High-Level Flow

```text
User
  │
  ▼
Browser / Client
  │
  ▼
API Gateway / BFF
  │
  ▼
Authentication Service
  │
  ▼
Authorization Server (IdP)
  │
  ▼
Database / Data Stores
```

---

# 3. Detailed Workflow Steps

| Step | Description                      |
| ---- | -------------------------------- |
| 1    | Detect authentication failure    |
| 2    | Build auth request               |
| 3    | Redirect to authorization server |
| 4    | Login / MFA                      |
| 5    | Consent screen                   |
| 6    | Validate roles & permissions     |
| 7    | Issue authorization code         |
| 8    | Continue to token exchange       |

---

# 4. Authentication Failure Detection

API Gateway returns:

```http
401 Unauthorized
WWW-Authenticate: Bearer
```

---

# 5. Authorization Request Construction

## Endpoint

```http
GET /oauth2/authorize
```

---

## Query Parameters

| Parameter             | Description       |
| --------------------- | ----------------- |
| response_type         | code              |
| client_id             | OAuth client      |
| redirect_uri          | Callback          |
| scope                 | Requested scopes  |
| state                 | CSRF protection   |
| nonce                 | Replay prevention |
| code_challenge        | PKCE              |
| code_challenge_method | S256              |

---

# 6. Redirect Flow

```http
302 Redirect → /oauth2/authorize
```

---

# 7. Authentication & MFA

## Supported Authentication

| Method            | Supported |
| ----------------- | --------- |
| Username/password | Yes       |
| MFA               | Yes       |
| SSO               | Yes       |
| WebAuthn          | Optional  |

---

## MFA Flow

```text
User Login
    │
    ▼
Send OTP
    │
    ▼
Validate OTP
    │
    ▼
Continue Authorization
```

---

# 8. Consent Management

User approves scopes.

---

## Example Consent Scopes

| Scope   | Purpose             |
| ------- | ------------------- |
| openid  | Identity            |
| profile | User profile        |
| email   | Email               |
| roles   | Roles & permissions |

---

# 9. Role Validation Workflow

## Internal Role Validation Pipeline

```text
Extract Roles
    │
    ▼
Validate Role Status
    │
    ▼
Resolve Role Hierarchy
    │
    ▼
Resolve Effective Permissions
    │
    ▼
Evaluate RBAC / ABAC
    │
    ▼
Authorization Result
```

---

# 10. Detailed Role Validation Steps

| Step | Description                   |
| ---- | ----------------------------- |
| 1    | Extract roles from claims     |
| 2    | Verify roles exist            |
| 3    | Validate active status        |
| 4    | Resolve inheritance           |
| 5    | Resolve effective permissions |
| 6    | Validate tenant mapping       |
| 7    | Evaluate RBAC                 |
| 8    | Evaluate ABAC                 |
| 9    | Cache authorization           |
| 10   | Return validation result      |

---

# 11. Authorization Code Issuance

## Example Redirect

```http
/callback?code=AUTH_CODE&state=xyz123
```

---

# 12. Contracts

# 12.1 Authorization Request

```http
GET /oauth2/authorize
```

---

# 12.2 Authorization Code Response

```http
302 Found
Location: /callback?code=AUTH_CODE&state=xyz123
```

---

# 12.3 Discovery Document

```http
GET /.well-known/openid-configuration
```

---

## Example Response

```json
{
  "issuer": "https://idp.example.com",
  "authorization_endpoint": "https://idp.example.com/authorize",
  "jwks_uri": "https://idp.example.com/jwks.json"
}
```

---

# 12.4 Role Validation API

```http
POST /internal/roles/validate
```

---

## Example Request

```json
{
  "user_id": "u1001",
  "tenant_id": "t100"
}
```

---

## Example Response

```json
{
  "authorized": true,
  "roles": ["Admin"],
  "permissions": ["read:reports"]
}
```

---

# 13. Redis Design

| Key          | Purpose             |
| ------------ | ------------------- |
| session:{id} | Session cache       |
| state:{id}   | OAuth state         |
| nonce:{id}   | Replay prevention   |
| authz:{user} | Authorization cache |

---

# 14. Postgres Design

| Table       | Purpose             |
| ----------- | ------------------- |
| users       | User registry       |
| roles       | Role definitions    |
| permissions | Permission registry |
| user_roles  | User-role mapping   |
| audit_logs  | Security audit      |

---

# 15. UI / UX Screens

## Login Screen

```text
Welcome Back
Email
Password
[ Sign In ]
```

---

## MFA Screen

```text
Verify It's You
Enter OTP
[ Verify ]
```

---

## Consent Screen

```text
✓ Read profile
✓ Access email
✓ Access roles
[ Allow ]
```

---

## Session Expired Screen

```text
Your session has expired.
Please sign in again.
```

---

## Access Denied Screen

```text
You do not have permission to access this application.
```

---

# 16. Error Codes

| Code | Meaning                 |
| ---- | ----------------------- |
| 400  | Invalid request         |
| 401  | Authentication required |
| 403  | Access denied           |
| 409  | Consent required        |
| 410  | Session expired         |
| 429  | Too many requests       |
| 500  | Internal server error   |

---

# 17. Observability

| Event                   | Description          |
| ----------------------- | -------------------- |
| redirect_started        | Redirect initiated   |
| login_success           | User authenticated   |
| mfa_success             | MFA validated        |
| role_validation_success | Authorization passed |

---

# 18. Security Notes

- PKCE mandatory
- HTTPS mandatory
- state parameter required
- nonce validation required
- Authorization code lifetime: 60–300 sec
- Role validation mandatory

---

# 19. Success Criteria

Step 2 succeeds when:

- Redirect completed securely
- MFA validated
- Consent approved
- Roles validated
- Permissions resolved
- Authorization code issued
- Audit events emitted
