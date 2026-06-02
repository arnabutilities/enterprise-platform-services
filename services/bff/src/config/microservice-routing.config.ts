import { ConfigService } from '@nestjs/config';

export interface MicroserviceRegistry {
  [serviceName: string]: {
    url: string;
    timeout: number;
    retries: number;
    healthCheck?: string;
  };
}

export class MicroserviceRoutingConfig {
  static getRegistry(configService: ConfigService): MicroserviceRegistry {
    return {
      analytics: {
        url: configService.get('microservices.analyticsService') || 'http://localhost:3001',
        timeout: 5000,
        retries: 3,
        healthCheck: '/health',
      },
      reports: {
        url: configService.get('microservices.reportsService') || 'http://localhost:3002',
        timeout: 10000,
        retries: 2,
        healthCheck: '/health',
      },
      users: {
        url: configService.get('microservices.usersService') || 'http://localhost:3003',
        timeout: 5000,
        retries: 3,
        healthCheck: '/health',
      },
    };
  }

  static validateServiceExists(serviceName: string, registry: MicroserviceRegistry): boolean {
    return serviceName in registry;
  }

  static getServiceConfig(serviceName: string, registry: MicroserviceRegistry) {
    const config = registry[serviceName];
    if (!config) {
      throw new Error(`Microservice '${serviceName}' not configured`);
    }
    return config;
  }
}
