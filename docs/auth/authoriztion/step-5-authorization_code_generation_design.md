# Step 5: Authorization Code Generation — Detailed Design

## Overview

Step 5 of the Authorization Workflow is responsible for generating a secure, short-lived authorization code after the user has successfully authenticated, consented, and passed role validation.

This step is critical in OAuth 2.0 Authorization Code Flow with PKCE and acts as the bridge between user authentication and token issuance.

---

# 1. Purpose

The Authorization Code Generation process ensures:

- Secure delegation of access
- Short-lived authorization grants
- Client validation and redirect protection
- Scope and role authorization enforcement
- PKCE validation for public clients
- Auditability and traceability

---

# 2. Inputs

| Input                  | Description                     |
| ---------------------- | ------------------------------- |
| Authenticated User     | Valid logged-in user session    |
| client_id              | Registered OAuth client         |
| redirect_uri           | Valid callback URI              |
| response_type          | Must be `code`                  |
| requested scopes       | Requested API permissions       |
| PKCE challenge         | Optional for public clients     |
| Role validation result | RBAC/ABAC authorization outcome |

---

# 3. Outputs

| Output             | Description                    |
| ------------------ | ------------------------------ |
| Authorization Code | One-time secure code           |
| Redirect Response  | Redirect with `code` + `state` |
| Audit Logs         | Security and trace logs        |
| Persisted Metadata | Stored code metadata           |

---

# 4. Internal Workflow

---

## 4.1 Receive Authorization Request

### Description

Authorization Server receives request from client application.

### Endpoint

```http
GET /oauth2/authorize
```

### Validations

- Required parameters exist
- HTTPS enforced
- Request not malformed
- Client exists

### Example Request

```http
GET /oauth2/authorize?
 response_type=code&
 client_id=web-client&
 redirect_uri=https://app.example.com/callback&
 scope=openid profile orders.read&
 state=xyz123&
 code_challenge=abc123&
 code_challenge_method=S256
```

---

## 4.2 Retrieve Client & Redirect URI

### Description

Load client metadata from IAM/Auth Registry.

### Validation Rules

| Validation     | Description                       |
| -------------- | --------------------------------- |
| Client Active  | Client enabled                    |
| Redirect Match | Exact URI match                   |
| Allowed Flow   | Authorization Code allowed        |
| PKCE Policy    | PKCE mandatory for public clients |

### Security Notes

- Prevent open redirect attacks
- Validate callback whitelist
- Reject dynamic redirect URLs

---

## 4.3 Validate Response Type & Flow

### Rules

| Field         | Expected           |
| ------------- | ------------------ |
| response_type | code               |
| grant_type    | authorization_code |

### Failure Cases

| Error                     | Description            |
| ------------------------- | ---------------------- |
| unsupported_response_type | Invalid flow           |
| unauthorized_client       | Client cannot use flow |

---

## 4.4 Validate Requested Scopes

### Scope Processing

1. Parse requested scopes
2. Compare against allowed scopes
3. Validate consent requirements
4. Remove unauthorized scopes

### Example

Requested:

```text
openid profile invoice.read invoice.write
```

Allowed:

```text
openid profile invoice.read
```

Result:

```text
invoice.write rejected
```

---

## 4.5 Validate User Roles & Permissions

# Role Validation Design

Role validation ensures the authenticated user is authorized to request the desired scopes.

---

## 4.5.1 RBAC Validation

### Role Mapping

| Scope         | Required Role |
| ------------- | ------------- |
| invoice.read  | FinanceViewer |
| invoice.write | FinanceEditor |
| admin.users   | Admin         |

### Example Logic

```text
scope invoice.read
 -> requires role FinanceViewer
 -> user roles checked
 -> access granted
```

---

## 4.5.2 Permission Validation

### Example Permissions

| Permission     | Description     |
| -------------- | --------------- |
| invoice.read   | View invoices   |
| invoice.write  | Modify invoices |
| reports.export | Export reports  |

### Validation Steps

1. Fetch user permissions
2. Fetch inherited permissions
3. Merge direct grants
4. Evaluate required permissions

---

## 4.5.3 ABAC Validation

### Optional Attribute-Based Checks

| Attribute    | Example       |
| ------------ | ------------- |
| Department   | Finance       |
| Region       | APAC          |
| Device Trust | Trusted       |
| IP Range     | Corporate VPN |
| Risk Score   | Low           |

### Example Rule

```text
user.department == resource.department
```

---

## 4.5.4 Final Authorization Decision

### Allow Access If

- All required roles exist
- Permissions valid
- Policies pass
- Session trusted

### Deny Access If

- Missing roles
- Invalid scopes
- High risk context
- Policy violations

---

# 5. PKCE Validation

## Purpose

PKCE protects against authorization code interception attacks.

---

## Required Fields

| Field                 | Description |
| --------------------- | ----------- |
| code_challenge        | PKCE hash   |
| code_challenge_method | S256        |

---

## Validation Logic

### Public Clients

- PKCE mandatory
- S256 recommended

### Confidential Clients

- PKCE optional but recommended

---

# 6. Authorization Code Generation

## Requirements

Authorization code must be:

- Cryptographically secure
- Short-lived
- One-time use
- Bound to client + redirect URI

---

## Example Metadata

```json
{
  "code_id": "abc123",
  "client_id": "web-client",
  "user_id": "u-1001",
  "redirect_uri": "https://app.example.com/callback",
  "scopes": ["openid", "profile", "invoice.read"],
  "expires_in": 600
}
```

---

# 7. Persist Authorization Code Metadata

## Stored Data

| Field          | Description          |
| -------------- | -------------------- |
| code_id        | Unique identifier    |
| hashed_code    | Secure code hash     |
| client_id      | OAuth client         |
| user_id        | Authenticated user   |
| scopes         | Granted scopes       |
| expires_at     | Expiration timestamp |
| code_challenge | PKCE challenge       |
| nonce          | OIDC nonce           |

---

# 8. Audit & Monitoring

## Audit Events

| Event                  | Description       |
| ---------------------- | ----------------- |
| auth_code_issued       | Code created      |
| scope_denied           | Scope rejection   |
| role_validation_failed | RBAC failure      |
| redirect_uri_invalid   | Redirect mismatch |

---

## Monitoring Metrics

- Authorization latency
- Denied requests
- PKCE failures
- Scope violations
- Security incidents

---

# 9. Redirect to Client

## Success Response

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback?
 code=abc123&
 state=xyz789
```

---

## Error Response

```json
{
  "error": "access_denied",
  "error_description": "User missing required role"
}
```

---

# 10. API Contracts

---

# 10.1 Authorization Endpoint

## Request

```http
GET /oauth2/authorize
```

### Query Parameters

| Parameter             | Required | Description       |
| --------------------- | -------- | ----------------- |
| response_type         | Yes      | Must be `code`    |
| client_id             | Yes      | OAuth client      |
| redirect_uri          | Yes      | Redirect callback |
| scope                 | No       | Requested scopes  |
| state                 | No       | CSRF token        |
| code_challenge        | No       | PKCE challenge    |
| code_challenge_method | No       | S256              |

---

# 10.2 Success Redirect

```http
302 Redirect
```

### Parameters

| Parameter | Description        |
| --------- | ------------------ |
| code      | Authorization code |
| state     | Original state     |

---

# 10.3 Error Response Contract

```json
{
  "error": "access_denied",
  "error_description": "Missing role FinanceViewer",
  "state": "xyz123"
}
```

---

# 11. UI/UX Screens

---

## 11.1 Authorization Review Screen

### Purpose

Display requested permissions before approval.

### UI Components

- App logo
- Requested scopes
- User identity
- Consent buttons

### UX Goals

- Transparent access
- Clear permission wording
- Minimal friction

---

## 11.2 Role Validation Screen

### Purpose

Optional security review screen.

### Displayed Information

| Field    | Example       |
| -------- | ------------- |
| Role     | FinanceViewer |
| Device   | Chrome        |
| Location | Singapore     |

---

## 11.3 Processing Screen

### UX Behavior

- Loading indicator
- Secure processing messaging
- Session continuity

---

## 11.4 Success Redirect Screen

### UI Features

- Success icon
- Redirect messaging
- Auto-navigation

---

## 11.5 Error Screen

### Failure Reasons

- Missing permissions
- Invalid scope
- Policy denied
- Session expired

### UX Guidelines

- Friendly messaging
- Retry option
- Support links

---

# 12. Security Considerations

| Security Control   | Description            |
| ------------------ | ---------------------- |
| HTTPS Everywhere   | Prevent MITM           |
| PKCE Enforcement   | Public client security |
| Short-lived Codes  | Reduce replay risk     |
| Single-use Codes   | Prevent reuse          |
| Scope Restrictions | Least privilege        |
| RBAC Enforcement   | Access governance      |
| Audit Logging      | Traceability           |

---

# 13. Common Error Codes

| Error                | HTTP | Description            |
| -------------------- | ---- | ---------------------- |
| invalid_request      | 400  | Missing parameters     |
| unauthorized_client  | 401  | Client not allowed     |
| access_denied        | 403  | Role validation failed |
| invalid_scope        | 400  | Invalid scope          |
| invalid_redirect_uri | 400  | Redirect mismatch      |
| server_error         | 500  | Internal failure       |

---

# 14. Recommended Architecture Notes

## Recommended Components

- Centralized Identity Provider
- OAuth2 Authorization Server
- RBAC/ABAC Policy Engine
- Audit Pipeline
- Monitoring Stack

---

## Suggested Technologies

| Area          | Technologies          |
| ------------- | --------------------- |
| Auth Server   | Keycloak, Auth0, Okta |
| API Gateway   | Kong, Apigee          |
| Policy Engine | OPA, Cedar            |
| Cache         | Redis                 |
| Monitoring    | Prometheus + Grafana  |
| Logging       | ELK / Loki            |

---

# 15. Final Notes

Authorization Code Generation is one of the most security-sensitive stages in OAuth2/OpenID Connect workflows.

Key implementation priorities:

- Enforce PKCE
- Minimize token/code lifetime
- Validate redirect URIs strictly
- Implement RBAC + ABAC
- Maintain full auditability
- Protect against replay and interception attacks
