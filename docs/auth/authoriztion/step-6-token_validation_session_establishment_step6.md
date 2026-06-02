# Step 6 — Token Validation & Session Establishment

# Overview

Step 6 in the Authorization Workflow is responsible for validating the authorization code, verifying PKCE, generating tokens, validating scopes and roles, and establishing a secure user session.

This step is one of the most security-sensitive phases in OAuth2/OpenID Connect architecture because it transforms a short-lived authorization code into usable identity and access tokens.

---

# 1. Objectives

The Token Validation & Session Establishment phase ensures:

- Authorization code integrity
- PKCE verification
- Secure token issuance
- Role and scope validation
- Session creation
- Token persistence
- Auditability and traceability

---

# 2. Inputs

| Input              | Description                       |
| ------------------ | --------------------------------- |
| Authorization Code | Short-lived code issued in Step 5 |
| code_verifier      | PKCE verifier                     |
| client_id          | OAuth client identifier           |
| client_secret      | Confidential client secret        |
| redirect_uri       | Must match original request       |
| Requested scopes   | Authorized scopes                 |
| User session       | Authenticated user context        |

---

# 3. Outputs

| Output         | Description              |
| -------------- | ------------------------ |
| access_token   | JWT/Opaque token         |
| id_token       | OpenID identity token    |
| refresh_token  | Long-lived refresh token |
| user session   | Active secure session    |
| token metadata | Persisted token details  |
| audit logs     | Security logs            |

---

# 4. Internal Workflow

---

# 4.1 Receive Token Request

## Description

Authorization server receives token exchange request.

## Endpoint

```http
POST /oauth2/token
```

## Content-Type

```http
application/x-www-form-urlencoded
```

---

# 4.2 Authenticate Client

## Purpose

Validate confidential client identity.

## Validation Rules

| Validation     | Description         |
| -------------- | ------------------- |
| client exists  | Registered client   |
| client enabled | Active client       |
| secret valid   | Secret verification |
| allowed grant  | authorization_code  |

## Example Authentication

```http
Authorization: Basic base64(client_id:client_secret)
```

---

# 4.3 Validate Authorization Code

## Description

Ensure authorization code is valid and not reused.

## Validation Checks

| Validation       | Description          |
| ---------------- | -------------------- |
| code exists      | Present in storage   |
| not expired      | TTL valid            |
| unused           | Single use only      |
| client binding   | Matches client_id    |
| redirect binding | Matches redirect_uri |

## Failure Cases

| Error         | Description    |
| ------------- | -------------- |
| invalid_grant | Invalid code   |
| expired_code  | TTL exceeded   |
| reused_code   | Replay attempt |

---

# 4.4 Validate PKCE Code Verifier

## Purpose

Prevent authorization code interception attacks.

---

## Validation Flow

### Step 1

Retrieve stored `code_challenge`.

### Step 2

Generate challenge from provided `code_verifier`.

### Step 3

Compare hashes.

---

## Validation Logic

### S256

```text
BASE64URL(SHA256(code_verifier))
```

must equal

```text
stored code_challenge
```

---

## Validation Rules

| Validation       | Description       |
| ---------------- | ----------------- |
| verifier exists  | Required          |
| method supported | S256 preferred    |
| hash matches     | Secure validation |

---

# 4.5 Validate Scopes & Consent

## Description

Ensure requested scopes were previously approved.

## Validation Steps

1. Load scopes from authorization code metadata
2. Compare requested scopes
3. Verify user consent
4. Reject unauthorized scope escalation

---

## Example

Authorized:

```text
invoice.read user.profile
```

Requested During Token Exchange:

```text
invoice.read invoice.write
```

Result:

```text
invoice.write rejected
```

---

# 4.6 Role Validation

# Role Validation Design

Role validation guarantees that the authenticated user still possesses the required permissions during token issuance.

---

## 4.6.1 Fetch User Roles

### Sources

| Source       | Example             |
| ------------ | ------------------- |
| IAM Provider | Keycloak            |
| LDAP         | Corporate directory |
| RBAC DB      | Internal role store |

---

## Example Roles

```json
["FinanceViewer", "Approver", "Admin"]
```

---

# 4.6.2 Map Roles to Permissions

| Role          | Permissions   |
| ------------- | ------------- |
| FinanceViewer | invoice.read  |
| FinanceEditor | invoice.write |
| Admin         | \*            |

---

# 4.6.3 Validate Requested Scopes

## Logic

```text
requested scope
 -> required permission
 -> validate user role
 -> allow or deny
```

---

## Example

Requested:

```text
invoice.write
```

Required Role:

```text
FinanceEditor
```

User Roles:

```text
FinanceViewer
```

Result:

```text
ACCESS DENIED
```

---

# 4.6.4 ABAC Validation

## Optional Context Checks

| Attribute    | Example           |
| ------------ | ----------------- |
| device trust | trusted           |
| location     | corporate network |
| department   | finance           |
| tenant       | enterprise tenant |

---

## Example Rule

```text
user.department == resource.department
```

---

# 4.6.5 Final Decision

Allow token issuance only if:

- scopes valid
- RBAC valid
- ABAC valid
- session trusted

Else:

```json
{
  "error": "access_denied"
}
```

---

# 4.7 Invalidate Authorization Code

## Purpose

Prevent replay attacks.

## Actions

| Action          | Description        |
| --------------- | ------------------ |
| mark used       | Prevent reuse      |
| store timestamp | Audit trace        |
| bind token      | Link issued tokens |

---

# 4.8 Generate Tokens

# Token Types

| Token         | Purpose           |
| ------------- | ----------------- |
| access_token  | API authorization |
| id_token      | User identity     |
| refresh_token | Session renewal   |

---

# Access Token Claims

## Example JWT

```json
{
  "sub": "user123",
  "aud": "invoice-api",
  "scope": "invoice.read user.profile",
  "roles": ["FinanceViewer"],
  "iat": 1712345678,
  "exp": 1712349278
}
```

---

# ID Token Claims

| Claim     | Description         |
| --------- | ------------------- |
| sub       | User ID             |
| email     | User email          |
| name      | Display name        |
| auth_time | Authentication time |
| nonce     | Replay protection   |

---

# Refresh Token

## Characteristics

- Long-lived
- Opaque preferred
- Revocable
- Rotatable

---

# 4.9 Persist Token Metadata

## Stored Metadata

| Field      | Description     |
| ---------- | --------------- |
| token_id   | Unique token ID |
| user_id    | Subject         |
| client_id  | OAuth client    |
| scopes     | Granted scopes  |
| issued_at  | Token creation  |
| expires_at | Expiration      |
| device_id  | Client device   |
| ip_address | User IP         |

---

# 4.10 Establish User Session

## Description

Create or update secure session state.

## Session Components

| Component       | Description           |
| --------------- | --------------------- |
| session_id      | Secure identifier     |
| device binding  | Browser/device        |
| idle timeout    | Inactivity timeout    |
| refresh binding | Refresh token linkage |

---

# Session Security

| Security Control | Description       |
| ---------------- | ----------------- |
| httpOnly cookies | Prevent JS access |
| secure cookies   | HTTPS only        |
| SameSite         | CSRF mitigation   |
| session rotation | Prevent fixation  |

---

# 4.11 Return Token Response

## Success Response

```http
HTTP/1.1 200 OK
```

## Response Body

```json
{
  "access_token": "jwt-access-token",
  "id_token": "jwt-id-token",
  "refresh_token": "opaque-refresh-token",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "invoice.read user.profile"
}
```

---

# 5. API Contracts

---

# 5.1 Token Endpoint

## Request

```http
POST /oauth2/token
```

---

## Headers

| Header        | Description                       |
| ------------- | --------------------------------- |
| Content-Type  | application/x-www-form-urlencoded |
| Authorization | Basic client auth                 |

---

## Body Parameters

| Parameter     | Required | Description           |
| ------------- | -------- | --------------------- |
| grant_type    | Yes      | authorization_code    |
| code          | Yes      | Authorization code    |
| redirect_uri  | Yes      | Original redirect URI |
| client_id     | Yes      | OAuth client          |
| code_verifier | Yes      | PKCE verifier         |
| client_secret | No       | Confidential clients  |

---

# 5.2 Success Contract

## Response

```json
{
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "invoice.read user.profile",
  "id_token": "jwt",
  "access_token": "jwt",
  "refresh_token": "opaque"
}
```

---

# 5.3 Error Contract

## Example

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code invalid or expired",
  "state": "xyz789"
}
```

---

# 6. UI/UX Screens

---

# 6.1 Processing Token Exchange

## UI Goals

- Inform user securely
- Prevent duplicate actions
- Maintain trust

## UI Components

- Loading spinner
- Security messaging
- Progress indicators

---

# 6.2 Session Verification Screen

## Purpose

Verify active session establishment.

## Example Information

| Item     | Example   |
| -------- | --------- |
| Browser  | Chrome    |
| Device   | MacBook   |
| Location | Singapore |

---

# 6.3 Session Established Screen

## Components

- Success icon
- Redirect CTA
- User context

---

# 6.4 New Device Detection

## Security UX

Display additional verification when:

- unknown browser
- suspicious IP
- impossible travel
- risky device

---

# 6.5 Session Expiring Warning

## UX Behavior

Warn before expiration.

## Actions

- Stay signed in
- Logout
- Refresh session

---

# 6.6 Session Expired Screen

## Display

- expiration reason
- re-login option
- support links

---

# 7. Security Considerations

| Control                   | Purpose              |
| ------------------------- | -------------------- |
| PKCE                      | Prevent interception |
| Short-lived access tokens | Reduce exposure      |
| Refresh token rotation    | Prevent replay       |
| JWT signing               | Integrity            |
| HTTPS enforcement         | Secure transport     |
| RBAC validation           | Access governance    |
| ABAC validation           | Context security     |
| Audit logging             | Traceability         |

---

# 8. Audit & Monitoring

---

# Audit Events

| Event                  | Description         |
| ---------------------- | ------------------- |
| token_issued           | Token created       |
| token_denied           | Validation failed   |
| pkce_failed            | Verifier mismatch   |
| session_created        | Session established |
| role_validation_failed | Missing permissions |

---

# Monitoring Metrics

- token issuance latency
- refresh token usage
- authorization failures
- invalid_grant frequency
- replay attempts

---

# 9. Common Error Codes

| Error               | HTTP | Description                |
| ------------------- | ---- | -------------------------- |
| invalid_request     | 400  | Missing parameters         |
| invalid_grant       | 400  | Invalid authorization code |
| unauthorized_client | 401  | Invalid client             |
| invalid_client      | 401  | Bad credentials            |
| access_denied       | 403  | Role validation failed     |
| server_error        | 500  | Internal failure           |

---

# 10. Recommended Architecture

---

# Recommended Components

| Component            | Responsibility        |
| -------------------- | --------------------- |
| Authorization Server | Token issuance        |
| IAM Provider         | User identity         |
| RBAC Engine          | Permission evaluation |
| Session Store        | Session persistence   |
| Redis                | Token cache           |
| Audit Pipeline       | Security logging      |

---

# Suggested Technologies

| Area          | Technologies         |
| ------------- | -------------------- |
| OAuth Server  | Keycloak / Auth0     |
| Session Store | Redis                |
| Policy Engine | OPA / Cedar          |
| Monitoring    | Grafana / Prometheus |
| Logging       | ELK / Loki           |

---

# 11. Best Practices

## Recommended

- Use S256 PKCE only
- Use short-lived access tokens
- Rotate refresh tokens
- Implement token revocation
- Log all token issuance events
- Minimize JWT claims

---

## Avoid

- Long-lived access tokens
- Storing sensitive PII in JWT
- Reusing authorization codes
- Weak client secrets

---

# 12. Final Notes

Token Validation & Session Establishment is the security enforcement point where authentication becomes authorization.

Critical implementation priorities:

- Validate PKCE strictly
- Enforce role validation
- Protect refresh tokens
- Bind tokens to trusted sessions
- Prevent replay attacks
- Maintain full auditability
