export * from './analytics-events';
export * from './reports-events';
export * from './auth-events';

export interface DomainEvent {
  type: string;
  version: number;
  correlationId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface EventBusConfig {
  broker: 'rabbitmq' | 'kafka' | 'redis';
  topics: string[];
  handlers: Record<string, Function>;
}

export interface EventSubscriber {
  eventType: string;
  handler: (event: DomainEvent) => Promise<void>;
}
