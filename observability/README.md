# Observability

## Logging

Using Winston for centralized logging. Logs output to:

- Console (development)
- File system (all environments)

## Tracing

Using OpenTelemetry + Jaeger for distributed tracing.

Start Jaeger:

```bash
docker run -d --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

Access UI: http://localhost:16686

## Monitoring

Using Prometheus for metrics collection.

Metrics exposed at: `/metrics`

## Dashboards

Grafana dashboards in `dashboards/` directory.

Import into Grafana for visualization.
