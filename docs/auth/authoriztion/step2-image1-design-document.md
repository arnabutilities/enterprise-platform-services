# Step 2 Authorization Workflow — Design Document (Based on Image 1)

> Detailed explanation and contracts derived from Image 1 design diagram for Step 2 — Redirect to Authorization Server.

Related enterprise integration context: fileciteturn18file0

---

# 1. Objective

This workflow handles:

- Redirecting unauthenticated users
- Building OIDC/OAuth2 authorization requests
- Redirecting users to Identity Provider (IdP)
- Performing authentication and MFA
- Consent management
- Role validation
- Authorization code issuance
- Preparing for token exchange

---

# 2. High-Level Architecture

```text
User
  │
  ▼
Browser / Client (MFE)
  │
  ▼
API Gateway / BFF
  │
  ▼
Authorization Server (IdP)
  │
  ▼
Data Stores
(Users / Roles / Permissions)
```

---

# 3. Internal Workflow Steps

| Step | Description                   |
| ---- | ----------------------------- |
| 1    | Detect authentication failure |
| 2    | Build authorization request   |
| 3    | Redirect to IdP               |
| 4    | Authenticate user             |
| 5    | Consent validation            |
| 6    | Role validation               |
| 7    | Issue authorization code      |
| 8    | Continue to token exchange    |

---

# 4. Detailed Internal Steps

# Step 1 — Detect Authentication Failure

API Gateway detects:

- missing JWT
- expired token
- invalid access token

---

## Example Response

```http
401 Unauthorized
WWW-Authenticate: Bearer
```

---

# Step 2 — Build Authorization Request

Client builds OIDC authorization request.

---

## Authorization Endpoint

```http
GET /oauth2/authorize
```

---

## Request Parameters

| Parameter             | Description       |
| --------------------- | ----------------- |
| client_id             | OAuth client      |
| redirect_uri          | Callback URI      |
| response_type         | code              |
| scope                 | Requested scopes  |
| state                 | CSRF protection   |
| nonce                 | Replay protection |
| code_challenge        | PKCE hash         |
| code_challenge_method | S256              |

---

## Example Request

```http
GET /oauth2/authorize?
client_id=acme-web&
response_type=code&
scope=openid profile email roles&
redirect_uri=https://app.acme.com/callback&
state=xyz123&
nonce=abc123&
code_challenge=pkcehash&
code_challenge_method=S256
```

---

# Step 3 — Redirect to IdP

Browser redirects user.

---

## Redirect Response

```http
302 Redirect
Location: /oauth2/authorize
```

---

# Step 4 — Authenticate User

Identity Provider validates:

- credentials
- MFA
- SSO/SAML

---

## Supported Methods

| Method            | Supported |
| ----------------- | --------- |
| Username/password | Yes       |
| MFA               | Yes       |
| SSO               | Yes       |
| WebAuthn          | Optional  |

---

# Step 5 — Consent Validation

User grants requested scopes.

---

## Example Scopes

| Scope   | Purpose      |
| ------- | ------------ |
| openid  | Identity     |
| profile | User profile |
| email   | Email access |
| roles   | Role claims  |

---

# Step 6 — Role Validation

Role validation performed internally at IdP.

---

## Role Validation Pipeline

```text
Extract JWT Claims
      │
      ▼
Query Role Store
      │
      ▼
Validate Active Roles
      │
      ▼
Resolve Effective Permissions
      │
      ▼
Evaluate RBAC / ABAC
      │
      ▼
Authorization Decision
```

---

# 5. Detailed Role Validation Steps

| Step | Description                   |
| ---- | ----------------------------- |
| 1    | Extract user claims           |
| 2    | Query role store              |
| 3    | Validate active roles         |
| 4    | Resolve inherited roles       |
| 5    | Resolve effective permissions |
| 6    | Validate tenant assignment    |
| 7    | Evaluate RBAC                 |
| 8    | Evaluate ABAC                 |
| 9    | Emit audit events             |

---

# 6. Authorization Code Issuance

Authorization server issues code.

---

## Example Redirect

```http
/callback?code=abc123&state=xyz123
```

---

# 7. Contracts

# 7.1 Redirect Request Contract

```http
GET /oauth2/authorize
```

---

# 7.2 Authorization Code Response

```http
302 Found
Location: /callback?code=AUTH_CODE&state=xyz123
```

---

# 7.3 Role Validation API

```http
POST /internal/roles/validate
```

---

## Example Request

```json
{
  "user_id": "u1001",
  "tenant_id": "t100",
  "resource": "ExampleApp"
}
```

---

## Example Response

```json
{
  "active": true,
  "roles": ["Admin"],
  "permissions": ["read:reports"]
}
```

---

# 8. Redis Design

| Key          | Purpose            |
| ------------ | ------------------ |
| session:{id} | Session state      |
| state:{id}   | OAuth state        |
| nonce:{id}   | Replay prevention  |
| authz:{user} | Cached permissions |

---

# 9. Postgres Design

| Table       | Purpose             |
| ----------- | ------------------- |
| users       | User identities     |
| roles       | Role definitions    |
| permissions | Permission registry |
| user_roles  | User-role mapping   |
| audit_logs  | Security audit      |

---

# 10. UI / UX Screens

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
Enter MFA Code
[ Verify ]
```

---

## Consent Screen

```text
Allow access to:
✓ Read profile
✓ Access reports
✓ Access roles
[ Allow ] [ Deny ]
```

---

## Redirecting Screen

```text
Redirecting back to application...
```

---

## Access Denied Screen

```text
You do not have permission to access this application.
```

---

# 11. Error Codes

| Code | Meaning                 |
| ---- | ----------------------- |
| 302  | Redirect                |
| 401  | Authentication required |
| 403  | Access denied           |
| 419  | Session expired         |
| 500  | Internal server error   |

---

# 12. Observability

| Event                          | Description        |
| ------------------------------ | ------------------ |
| authorization_redirect_started | Redirect initiated |
| login_success                  | User authenticated |
| consent_granted                | Consent approved   |
| role_validation_success        | Roles validated    |

---

# 13. Security Notes

- PKCE required
- HTTPS mandatory
- state validation required
- nonce validation required
- Authorization code lifetime: 5–15 mins
- Role validation mandatory

---

# 14. Success Criteria

Step 2 is successful when:

- User redirected securely
- Authentication completed
- Roles validated
- Permissions resolved
- Authorization code issued
- Audit logs emitted
