import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-trace-jaeger';

const jaegerExporter = new JaegerExporter({
  serviceName: process.env.SERVICE_NAME || 'enterprise-platform',
  host: process.env.JAEGER_HOST || 'localhost',
  port: parseInt(process.env.JAEGER_PORT || '6831'),
});

export const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
