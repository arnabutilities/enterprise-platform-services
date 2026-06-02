# Step 12 — Role / Permission Change & Session Revalidation

## Detailed Authorization Workflow Design Document

> Detailed enterprise authorization workflow design based on the Step 12 design diagram.  
> Covers runtime role/permission changes, session revalidation, token invalidation, RBAC/ABAC enforcement, API contracts, UI/UX behavior, Redis/Postgres integration, observability, and enterprise security considerations.

---

# 1. Objective

The purpose of Step 12 is to:

- Apply role and permission updates dynamically
- Revalidate active sessions after authorization changes
- Recalculate effective permissions
- Enforce updated RBAC/ABAC policies
- Detect impacted user sessions
- Revoke or refresh existing tokens
- Synchronize authorization changes across clients
- Emit audit and observability events
- Prevent stale authorization access
- Maintain tenant isolation and policy consistency

---

# 2. High-Level Workflow

```text
Admin / System
        │
        ├─ Submit Role / Permission Change
        └─ Trigger Authorization Update
                │
                ▼
Authorization Server / PDP
        │
        ├─ Validate Request
        ├─ Validate Admin Permissions
        ├─ Update Roles & Permissions
        ├─ Detect Impacted Sessions
        ├─ Revalidate Runtime Authorization
        ├─ Revoke / Refresh Tokens
        ├─ Publish Events
        ├─ Audit Changes
        └─ Notify Clients
                │
                ▼
Client Runtime
        │
        ├─ Receive Authorization Update
        ├─ Refresh Tokens / Logout
        ├─ Reload Permissions
        └─ Continue with Updated Access
```

---

# 3. Architecture Components

| Component               | Responsibility                   |
| ----------------------- | -------------------------------- |
| Admin UI / API          | Authorization changes            |
| Authorization Server    | Runtime authorization management |
| PDP / Decision Engine   | RBAC/ABAC evaluation             |
| Role Store              | Role & permission persistence    |
| Session Store           | Active session lookup            |
| Token Service           | Token revocation/refresh         |
| Redis                   | Session/token cache              |
| Postgres                | Persistent metadata              |
| Audit & Logging Service | Audit persistence                |
| Observability Stack     | Metrics/logging/tracing          |

---

# 4. Internal Workflow Steps

# Step 1 — Trigger Role / Permission Change

Admin or system triggers authorization update.

---

## Example Sources

| Source    | Description          |
| --------- | -------------------- |
| Admin UI  | Manual admin changes |
| API       | Programmatic update  |
| SCIM      | Identity sync        |
| HR System | Workforce changes    |

---

## Example Request

```http
PUT /admin/users/{userId}/roles
```

---

# Step 2 — Validate Request

Validate:

- admin identity
- tenant ownership
- authorization policies
- request integrity

---

## Validation Rules

| Validation          | Required  |
| ------------------- | --------- |
| Admin authenticated | Mandatory |
| Admin authorized    | Mandatory |
| Tenant valid        | Mandatory |
| Request valid       | Mandatory |

---

# Step 3 — Update Roles & Permissions

Persist updated authorization data.

---

## Example Update

```json
{
  "tenant_id": "tenant_001",
  "roles": ["Editor", "Analyst"],
  "permissions": ["read", "write", "export"]
}
```

---

# Step 4 — Detect Impacted Sessions

Identify active sessions and tokens.

---

## Session Lookup

| Lookup Type     | Description              |
| --------------- | ------------------------ |
| User sessions   | All active sessions      |
| Tenant sessions | Tenant-scoped sessions   |
| Device sessions | Device-specific sessions |

---

## Example Response

```json
{
  "user_id": "u1001",
  "sessions": [
    {
      "session_id": "sess_abc"
    }
  ]
}
```

---

# Step 5 — Revalidate Runtime Authorization

Recalculate effective permissions.

---

# 5. Detailed Role Validation Workflow

```text
Fetch Current Roles
        │
        ▼
Validate Active Roles
        │
        ▼
Resolve Role Hierarchy
        │
        ▼
Resolve Effective Permissions
        │
        ▼
Validate Tenant Boundaries
        │
        ▼
Evaluate RBAC Policies
        │
        ▼
Evaluate ABAC Policies
        │
        ▼
Approve / Restrict Access
```

---

# 6. Detailed Role Validation Steps

| Step | Description                   |
| ---- | ----------------------------- |
| 1    | Fetch updated roles           |
| 2    | Validate role active status   |
| 3    | Resolve inherited roles       |
| 4    | Resolve effective permissions |
| 5    | Validate tenant membership    |
| 6    | Evaluate RBAC                 |
| 7    | Evaluate ABAC                 |
| 8    | Detect conflicting policies   |
| 9    | Compare previous permissions  |
| 10   | Determine authorization delta |

---

# Step 6 — Revoke or Refresh Tokens

Update runtime tokens.

---

## Token Actions

| Action           | Description   |
| ---------------- | ------------- |
| Revoke tokens    | Remove access |
| Force refresh    | Update claims |
| Maintain session | If no changes |

---

## Example Revocation Payload

```json
{
  "user_id": "u1001",
  "tenant_id": "tenant_001",
  "revoke_all": true,
  "reason": "role_change"
}
```

---

# Step 7 — Publish Authorization Events

Publish authorization updates.

---

## Example Event

```json
{
  "event": "authorization.changed",
  "user_id": "u1001",
  "tenant_id": "tenant_001",
  "change_type": "role_update"
}
```

---

# Step 8 — Audit & Logging

Persist authorization changes.

---

## Example Audit Event

```json
{
  "event": "role_permission_updated",
  "user_id": "u1001",
  "changed_by": "admin@example.com",
  "tenant_id": "tenant_001"
}
```

---

# Step 9 — Notify Clients

Clients receive authorization updates.

---

## Example Actions

| Action        | Description         |
| ------------- | ------------------- |
| Force refresh | Reload claims       |
| Force logout  | Session revoked     |
| UI reload     | Updated permissions |

---

# Step 10 — Client Enforces Updated Access

Client applies updated authorization state.

---

## Example

```ts
authStore.reloadPermissions();
```

---

# 7. API Contracts

# 7.1 Update User Roles / Permissions

```http
PUT /admin/users/{userId}/roles
```

---

## Request Headers

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

---

## Request Body

```json
{
  "tenant_id": "tenant_001",
  "roles": ["Editor", "Analyst"],
  "permissions": ["read", "write", "export"],
  "reason": "project_role_update"
}
```

---

# 7.2 Update Response

```json
{
  "status": "success",
  "user_id": "u1001",
  "effective_roles": ["Editor", "Analyst"],
  "affected_sessions": 2
}
```

---

# 7.3 List Impacted Sessions

```http
GET /admin/users/{userId}/sessions
```

---

## Example Response

```json
{
  "user_id": "u1001",
  "sessions": [
    {
      "session_id": "sess_abc",
      "device": "Chrome / Windows"
    }
  ]
}
```

---

# 7.4 Revoke Sessions / Tokens

```http
POST /admin/sessions/revoke
```

---

## Example Payload

```json
{
  "user_id": "u1001",
  "tenant_id": "tenant_001",
  "revoke_all": true
}
```

---

# 7.5 Authorization Event Contract

```http
POST /events/authorization.changed
```

---

## Example Event

```json
{
  "event": "authorization.changed",
  "user_id": "u1001",
  "tenant_id": "tenant_001"
}
```

---

# 8. Redis Design

# 8.1 Redis Keys

| Key           | Purpose             |
| ------------- | ------------------- |
| authz:{user}  | Authorization cache |
| session:{id}  | Active session      |
| revoked:{jti} | Revoked token cache |
| role:{id}     | Cached role         |

---

# 8.2 TTL Rules

| Object              | TTL            |
| ------------------- | -------------- |
| Authorization cache | 15 mins        |
| Session cache       | 1 hour         |
| Revocation cache    | Token lifetime |

---

# 9. Postgres Design

# 9.1 Core Tables

| Table       | Purpose             |
| ----------- | ------------------- |
| users       | User registry       |
| roles       | Role definitions    |
| permissions | Permission registry |
| user_roles  | Role assignments    |
| sessions    | Session metadata    |
| audit_logs  | Security audit      |

---

# 10. UI / UX Screens

# 10.1 Admin Update Screen

```text
Update User Role
[ Save Changes ]
```

---

# 10.2 Change Success Screen

```text
Changes Applied
User roles updated successfully.
```

---

# 10.3 Active Sessions Affected Screen

```text
2 active sessions were revoked.
[ View Sessions ]
```

---

# 10.4 Client Notification Screen

```text
Your session permissions were updated.
Please reload.
```

---

# 11. UX Notes

| Area               | Recommendation              |
| ------------------ | --------------------------- |
| Role changes       | Clear impact summary        |
| Session revocation | Explicit notification       |
| UI updates         | Refresh authorization state |
| Accessibility      | WCAG 2.1 AA                 |
| Security messaging | Avoid sensitive details     |

---

# 12. Error Codes

| Code | Meaning               |
| ---- | --------------------- |
| 200  | Success               |
| 400  | Invalid request       |
| 401  | Unauthorized admin    |
| 403  | Forbidden             |
| 404  | User not found        |
| 409  | Policy conflict       |
| 500  | Internal server error |

---

# 13. Observability Design

# 13.1 Events

| Event                          | Description      |
| ------------------------------ | ---------------- |
| authorization_change_started   | Update initiated |
| role_validation_success        | Roles validated  |
| sessions_revalidated           | Sessions updated |
| tokens_revoked                 | Tokens revoked   |
| authorization_change_completed | Update completed |

---

# 13.2 Metrics

| Metric                    | Type      |
| ------------------------- | --------- |
| auth.role_update.duration | Histogram |
| auth.role_update.success  | Counter   |
| auth.session.revalidation | Histogram |
| auth.tokens.revoked       | Counter   |

---

# 13.3 Distributed Tracing

```http
traceparent
```

---

# 14. Security Design

# 14.1 Security Requirements

| Rule                | Requirement |
| ------------------- | ----------- |
| Admin authorization | Mandatory   |
| Tenant isolation    | Mandatory   |
| Role validation     | Mandatory   |
| Token revocation    | Mandatory   |
| Audit logging       | Mandatory   |

---

# 14.2 Threat Mitigation

| Threat               | Mitigation           |
| -------------------- | -------------------- |
| Privilege escalation | Runtime validation   |
| Tenant bypass        | Tenant isolation     |
| Stale permissions    | Session revalidation |
| Replay attacks       | Token revocation     |
| Unauthorized changes | Admin RBAC           |

---

# 15. Enterprise Architecture Notes

Recommended enterprise implementation:

- Centralized Authorization Service
- Redis-backed authorization cache
- Shared MFE auth runtime
- Distributed tracing
- SIEM integration
- Event-driven authorization refresh
- Runtime session synchronization

---

# 16. Success Criteria

Step 12 is successful when:

- Authorization changes validated
- Roles updated successfully
- Sessions revalidated
- Tokens refreshed or revoked
- Clients notified
- Runtime authorization updated
- Audit logs emitted

---

# 17. Related Diagram

This markdown document corresponds to the detailed Step 12 Role / Permission Change & Session Revalidation design diagram image.
