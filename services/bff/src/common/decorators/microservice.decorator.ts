import { SetMetadata } from '@nestjs/common';

export interface MicroserviceRouteConfig {
  serviceName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timeout?: number;
  retries?: number;
  roles?: string[];
}

export const Microservice = (config: MicroserviceRouteConfig) => {
  return SetMetadata('microservice', config);
};

export const MICROSERVICE_KEY = 'microservice';

export interface MicroserviceRoute {
  serviceName: string;
  endpoint: string;
  method: string;
  timeout: number;
  retries: number;
  roles: string[];
}
