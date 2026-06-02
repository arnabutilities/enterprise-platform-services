# Contracts Package

Shared API contracts, event schemas, and federation module definitions for the enterprise platform.

## Structure

- `src/types/` - Shared TypeScript types for analytics, reports, and common domain models
- `src/openapi/` - OpenAPI schema files for REST APIs
- `src/events/` - Event contracts used for cross-module communication
- `src/federation/` - MFE federation contracts describing exposed and required modules

## Scripts

- `pnpm build` - compile contract package
- `pnpm validate` - validate OpenAPI spec with Spectral
- `pnpm generate:types` - placeholder for contract type generation
