# Security Package

This package provides the enterprise security layer for the platform.

## Features

- JWT authentication and refresh token handling
- CORS policy generation
- Content Security Policy (CSP) header support
- Role-based access control (RBAC)
- Rate limiting middleware
- Request validation and sanitization helpers

## Package layout

- `src/auth/` - JWT helpers and token generation
- `src/middleware/` - Express-compatible middleware for auth, CORS, CSP, and rate limiting
- `src/rbac/` - role and permission definitions plus authorization helpers
- `src/validation/` - request schema validation and input sanitization

## Usage

This package is intended to be consumed by platform services such as the BFF or API gateway.

Build the package with:

```bash
pnpm --filter @enterprise-platform/security run build
```
