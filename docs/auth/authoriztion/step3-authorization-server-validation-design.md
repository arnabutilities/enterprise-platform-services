# Step 3 — Authorization Server Validates & Authorizes

Detailed markdown design document for Step 3.

## Overview

This document explains:

- Token validation
- Role validation
- Policy evaluation
- RBAC / ABAC authorization
- Authorization result generation
- Audit & observability

## Contracts

### Token Introspection

```http
POST /oauth2/introspect
```

### Role Validation

```http
POST /internal/roles/validate
```

### Authorization Decision

```http
POST /internal/authorize/decision
```

## Role Validation Steps

1. Validate role exists
2. Validate role active
3. Resolve inherited permissions
4. Validate tenant membership
5. Evaluate RBAC
6. Evaluate ABAC
7. Return authorization decision

## UI / UX

- Processing Screen
- MFA Challenge
- Access Granted
- Access Denied
- Session Expired

## Security

- JWT validation mandatory
- HTTPS mandatory
- Tenant isolation required
- Revocation cache enabled
