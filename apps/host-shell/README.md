# Host Shell

The Host Shell is the root container for the enterprise microfrontend platform. It manages:

- **Federation**: Bootstraps and loads remote microfrontends
- **Auth**: Manages authentication and session state
- **Telemetry**: Captures observability across MFEs
- **Events**: Pub/Sub communication between MFEs
- **Resilience**: Error boundaries, retries, and fallbacks
- **Routing**: Navigation and route management

## Directory Structure

```
src/
├── app/              # Next.js App Router pages and layouts
├── shell/            # Shell component and layout
├── federation/       # Module Federation config and loaders
├── runtime/          # Runtime isolation, error boundaries, timeouts
├── auth/             # Authentication and session management
├── telemetry/        # Logging, tracing, and metrics
├── events/           # Event bus and Pub/Sub manager
├── middleware/       # Request/response middleware
├── resilience/       # Retry logic, circuit breakers
├── config/           # Configuration management
├── routing/          # Route definitions and navigation
├── state/            # Global state and store
├── services/         # API clients and service layer
├── components/       # Shared shell components
├── hooks/            # Custom React hooks
├── styles/           # Global and component styles
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── tests/            # Unit and E2E tests
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Build for production
pnpm build
```

## Key Features

- **Event-Driven Communication**: Using RxJS for real-time inter-MFE communication
- **Error Boundaries**: Isolate MFE failures to prevent cascading errors
- **Retry Mechanisms**: Automatic retry with exponential backoff
- **Telemetry**: End-to-end tracing and metrics collection
- **Federation**: Dynamic remote loading and versioning
