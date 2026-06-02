# Step 8 — Authenticated API Access using Bearer JWT

> Detailed technical design document for OAuth2 Authorization Code Flow with PKCE — Step 8.

This step begins after runtime authorization is initialized and the frontend application starts making authenticated API calls using JWT bearer tokens.  
The step covers secure API access, bearer header propagation, API gateway validation, downstream authorization, observability, and runtime UX behavior.

Related enterprise integration context: fileciteturn13file0

---

# 1. Objective

The purpose of Step 8 is to:

- Enable authenticated API communication
- Attach JWT bearer tokens to requests
- Validate JWTs at API gateway/service layer
- Enforce RBAC/ABAC authorization
- Propagate identity across services
- Enable secure MFE-to-BFF communication
- Protect APIs from unauthorized access
- Emit runtime authorization telemetry
- Support token expiration/retry handling
- Establish secure distributed identity context

---

# 2. High-Level Flow

```text
SPA / MFE
     │
     ├─ Attach Bearer JWT
     ├─ Call API Gateway
     │
     ▼
API Gateway / BFF
     │
     ├─ Validate JWT
     ├─ Validate scopes
     ├─ Validate roles
     ├─ Forward identity context
     │
     ▼
Backend Services
     │
     ├─ Enforce authorization
     ├─ Process request
     └─ Return secure response
```

---

# 3. Architecture Components

| Component           | Responsibility            |
| ------------------- | ------------------------- |
| SPA / MFE           | API invocation            |
| Browser Runtime     | Bearer token attachment   |
| API Gateway         | JWT validation            |
| BFF Layer           | Session orchestration     |
| Backend Services    | Authorization enforcement |
| Redis               | Session/token cache       |
| Postgres            | Permission metadata       |
| Observability Stack | Logs/traces/metrics       |

---

# 4. UI/UX Design

# 4.1 Authenticated Application UX

```text
┌────────────────────────────────────────────┐
│ ACME Analytics Dashboard                  │
│────────────────────────────────────────────│
│                                            │
│ ✓ Authenticated API Session Active        │
│ ✓ Secure Bearer Token Attached            │
│ ✓ Permissions Validated                   │
│                                            │
│ Dashboard Widgets                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ Reports │ │ Metrics │ │ Trends  │       │
│ └─────────┘ └─────────┘ └─────────┘       │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.2 Loading API State UX

```text
┌────────────────────────────────────────────┐
│ Loading secure data...                    │
│                                            │
│              ⏳                            │
│                                            │
│ Validating authorization and fetching     │
│ resources securely                         │
└────────────────────────────────────────────┘
```

---

# 4.3 Unauthorized Access UX

```text
┌────────────────────────────────────────────┐
│ Access Restricted                         │
│────────────────────────────────────────────│
│                                            │
│ You do not have permission to access      │
│ this resource.                            │
│                                            │
│ [ Return to Dashboard ]                   │
│                                            │
└────────────────────────────────────────────┘
```

---

# 4.4 UX Behavior

| Scenario            | UX Behavior            |
| ------------------- | ---------------------- |
| API request started | Show loading state     |
| Token valid         | Continue request       |
| Token expired       | Trigger silent refresh |
| Permission denied   | Show restricted view   |
| Network issue       | Retry/backoff          |
| Session revoked     | Logout user            |

---

# 4.5 Accessibility Requirements

| Requirement               | Details  |
| ------------------------- | -------- |
| Screen reader support     | Required |
| Accessible loaders        | Required |
| Keyboard-safe retry       | Required |
| Error state accessibility | Required |

---

# 5. Internal Processing Steps

# Step 1 — Initialize API Client

Frontend initializes authenticated API client.

---

## Example Axios Interceptor

```ts
axios.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

# Step 2 — Build Authenticated API Request

Construct request with:

- Authorization header
- Correlation ID
- Trace context

---

## Example Request

```http
GET /api/v1/reports
Authorization: Bearer eyJhbGciOi...
traceparent: 00-abc123
```

---

# Step 3 — Browser Sends API Request

Browser transmits secure HTTPS request.

---

# Step 4 — API Gateway Validates JWT

Gateway validates:

| Validation        | Required |
| ----------------- | -------- |
| Signature valid   | Yes      |
| Token not expired | Yes      |
| Audience valid    | Yes      |
| Scope valid       | Yes      |
| Token not revoked | Yes      |

---

# Step 5 — Validate Runtime Authorization

Validate:

- RBAC permissions
- ABAC policies
- Tenant isolation
- Resource ownership

---

# Step 6 — Load Session Context

Session context loaded from Redis/cache.

---

## Example Session Context

```json
{
  "session_id": "sess_123",
  "user_id": "u_789",
  "roles": ["admin"],
  "permissions": ["reports.read"]
}
```

---

# Step 7 — Propagate Identity Context

Forward downstream identity metadata.

---

## Forwarded Headers

```http
x-user-id: u_789
x-tenant-id: tenant_123
x-session-id: sess_123
```

---

# Step 8 — Execute Backend Authorization

Backend services validate authorization rules.

---

## Authorization Rules

| Rule Type      | Example          |
| -------------- | ---------------- |
| RBAC           | admin required   |
| ABAC           | tenant ownership |
| Scope-based    | reports.read     |
| Resource-based | project access   |

---

# Step 9 — Execute Business Logic

Authorized service executes request.

---

# Step 10 — Emit Observability Events

```json
{
  "event": "api_request_authorized",
  "user_id": "u_789",
  "resource": "/reports"
}
```

---

# Step 11 — Return Secure API Response

Return JSON response.

---

## Example Response

```json
{
  "reports": [],
  "status": "success"
}
```

---

# Step 12 — Update Frontend Runtime State

Frontend updates:

- query cache
- Zustand store
- UI widgets
- session metrics

---

# 6. Sequence Diagram

```text
SPA/MFE       Browser      API Gateway      Redis      Backend API
   │              │              │             │              │
   │ Build req    │              │             │              │
   │────────────> │ HTTPS req    │             │              │
   │              │────────────> │ Validate JWT              │
   │              │              │───────────> │ Load sess    │
   │              │              │ Validate RBAC             │
   │              │              │─────────────────────────> │
   │              │              │ Backend auth              │
   │              │              │<───────────────────────── │
   │              │<──────────── │ JSON response             │
   │ Update UI    │              │             │              │
```

---

# 7. Bearer Authorization Contract

# 7.1 Authorization Header

```http
Authorization: Bearer <access_token>
```

---

# 7.2 Example API Request

```http
GET /api/v1/reports
Authorization: Bearer eyJhbGciOi...
Accept: application/json
traceparent: 00-abc123
```

---

# 7.3 JWT Validation Contract

| Validation           | Description          |
| -------------------- | -------------------- |
| Signature validation | JWT integrity        |
| exp validation       | Expiration           |
| iss validation       | Trusted issuer       |
| aud validation       | Audience             |
| scope validation     | Required permissions |

---

# 8. API Response Contract

# 8.1 Success Response

```json
{
  "status": "success",
  "data": {
    "reports": []
  }
}
```

---

# 8.2 Unauthorized Response

```json
{
  "error": "unauthorized",
  "message": "Invalid bearer token"
}
```

---

# 8.3 Forbidden Response

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

---

# 8.4 Expired Token Response

```json
{
  "error": "token_expired",
  "message": "Access token expired"
}
```

---

# 9. Frontend API Client Contract

# 9.1 API Client Interface

```ts
type ApiClient = {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body: unknown): Promise<T>;
};
```

---

# 9.2 Authenticated Request Wrapper

```ts
async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response>;
```

---

# 9.3 Route Authorization Guard

```ts
function canAccess(resource: string): boolean;
```

---

# 10. Redis Design

# 10.1 Keys

| Key             | Purpose             |
| --------------- | ------------------- |
| session:{id}    | Active session      |
| token:{jti}     | Token tracking      |
| revoked:{jti}   | Revoked token       |
| authz:{user_id} | Authorization cache |

---

# 10.2 TTL Rules

| Object              | TTL            |
| ------------------- | -------------- |
| Session cache       | 1 hour         |
| Authorization cache | 15 mins        |
| Revocation cache    | Token lifetime |

---

# 11. Postgres Design

# 11.1 Tables

| Table            | Purpose                |
| ---------------- | ---------------------- |
| role_permissions | RBAC mapping           |
| api_audit_logs   | API authorization logs |
| user_permissions | Effective permissions  |
| service_policies | ABAC rules             |

---

# 12. Observability Design

# 12.1 Events

| Event                 | Description            |
| --------------------- | ---------------------- |
| api_request_started   | Request initiated      |
| jwt_validated         | JWT accepted           |
| authorization_success | Access granted         |
| authorization_failure | Access denied          |
| token_expired         | Expired token detected |

---

# 12.2 Metrics

| Metric              | Type      |
| ------------------- | --------- |
| api.auth.success    | Counter   |
| api.auth.failure    | Counter   |
| api.jwt.validation  | Histogram |
| api.request.latency | Histogram |

---

# 12.3 Distributed Tracing

Tracing propagated using:

```http
traceparent
```

---

# 13. Security Design

# 13.1 Bearer Token Security

| Rule                      | Requirement |
| ------------------------- | ----------- |
| HTTPS only                | Mandatory   |
| Short-lived access tokens | Mandatory   |
| No token in URL           | Mandatory   |
| Signature validation      | Mandatory   |

---

# 13.2 API Authorization Security

| Rule             | Description |
| ---------------- | ----------- |
| RBAC enforced    | Required    |
| ABAC supported   | Recommended |
| Tenant isolation | Mandatory   |
| Scope validation | Mandatory   |

---

# 13.3 Backend Security

| Requirement           | Description    |
| --------------------- | -------------- |
| Zero trust validation | Required       |
| Identity propagation  | Signed/trusted |
| Service authorization | Required       |
| Replay protection     | Required       |

---

# 13.4 Browser Security

| Threat          | Mitigation              |
| --------------- | ----------------------- |
| XSS token theft | Memory storage          |
| CSRF            | Bearer model            |
| Session hijack  | Expiration + revocation |
| Replay attack   | JTI tracking            |

---

# 14. Failure Handling

| Scenario            | Action         |
| ------------------- | -------------- |
| JWT invalid         | Reject request |
| Permission denied   | Return 403     |
| Token expired       | Refresh token  |
| Session revoked     | Force logout   |
| Backend unavailable | Retry/backoff  |

---

# 14.1 HTTP Error Examples

## Unauthorized

```http
401 Unauthorized
```

---

## Forbidden

```http
403 Forbidden
```

---

## Token Expired

```http
401 Token Expired
```

---

# 15. Performance Considerations

| Area                     | Recommendation |
| ------------------------ | -------------- |
| JWT validation           | Cached JWKS    |
| RBAC lookups             | Redis caching  |
| API latency              | <200ms         |
| Authorization middleware | Lightweight    |

---

# 16. Threat Model

| Threat               | Mitigation       |
| -------------------- | ---------------- |
| JWT replay           | JTI + expiration |
| Unauthorized access  | RBAC/ABAC        |
| API abuse            | Rate limiting    |
| Privilege escalation | Scope validation |
| Token theft          | Secure storage   |

---

# 17. Success Criteria

Step 8 is successful when:

- Bearer token attached
- JWT validated successfully
- Authorization rules enforced
- Backend request authorized
- API response returned securely
- Runtime UI updated
- Observability emitted

---

# 18. Next Step

```text
Step 9 — Secure Session Metadata Storage & Audit Tracking
```
