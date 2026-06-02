import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceService } from '../microservice/microservice.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    [serviceName: string]: {
      status: boolean;
      responseTime?: number;
    };
  };
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly microserviceService: MicroserviceService,
    private readonly configService: ConfigService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const services = ['analytics', 'reports', 'users'];
    const serviceStatus: any = {};

    for (const serviceName of services) {
      const start = Date.now();
      const isHealthy = await this.microserviceService.healthCheck(serviceName);
      const responseTime = Date.now() - start;

      serviceStatus[serviceName] = {
        status: isHealthy,
        responseTime,
      };
    }

    const healthyCount = Object.values(serviceStatus).filter((s: any) => s.status).length;

    const overallStatus =
      healthyCount === services.length ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus as any,
      timestamp: new Date().toISOString(),
      services: serviceStatus,
      uptime: Date.now() - this.startTime,
    };
  }
}
