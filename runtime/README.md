# Runtime Patterns

## MFE Boundary

React error boundary to isolate MFE errors:

```tsx
<MFEBoundary mfeName="analytics" onError={handleError}>
  <AnalyticsMFE />
</MFEBoundary>
```

## Retry Policy

Automatic retries with exponential backoff:

```tsx
const data = await withRetry(() => fetchAnalytics());
```

## Circuit Breaker

Prevent cascading failures:

```tsx
const breaker = new CircuitBreaker({ failureThreshold: 5 });
await breaker.execute(() => callMFE());
```
