import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  MicroserviceRoutingConfig,
  MicroserviceRegistry,
} from '../../config/microservice-routing.config';

interface MicroserviceRequest {
  serviceName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  requestId?: string;
}

@Injectable()
export class MicroserviceService {
  private readonly logger = new Logger(MicroserviceService.name);
  private registry: MicroserviceRegistry;
  private readonly retryAttempts = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.registry = MicroserviceRoutingConfig.getRegistry(configService);
  }

  async request(requestConfig: MicroserviceRequest): Promise<any> {
    const { serviceName, endpoint, method, data, headers, requestId } = requestConfig;

    try {
      const config = MicroserviceRoutingConfig.getServiceConfig(serviceName, this.registry);
      const url = `${config.url}${endpoint}`;

      const axiosConfig = {
        method,
        url,
        timeout: config.timeout,
        headers: {
          ...headers,
          'X-Request-ID': requestId || '',
          'Content-Type': 'application/json',
        },
        ...(data && { data }),
      };

      this.logger.debug(`[${requestId}] → Calling ${serviceName}: ${method} ${endpoint}`);

      const response = await firstValueFrom(this.httpService.request(axiosConfig));

      this.logger.debug(`[${requestId}] ← Response from ${serviceName}: ${response.status}`);

      return response.data;
    } catch (error) {
      return this.handleError(error, serviceName, endpoint, requestId);
    }
  }

  async requestWithRetry(
    requestConfig: MicroserviceRequest,
    retries: number = this.retryAttempts,
  ): Promise<any> {
    try {
      return await this.request(requestConfig);
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        this.logger.warn(
          `[${requestConfig.requestId}] Retrying ${requestConfig.serviceName} (${retries} attempts left)`,
        );
        await this.delay(1000);
        return this.requestWithRetry(requestConfig, retries - 1);
      }
      throw error;
    }
  }

  async healthCheck(serviceName: string): Promise<boolean> {
    try {
      const config = MicroserviceRoutingConfig.getServiceConfig(serviceName, this.registry);
      if (!config.healthCheck) return true;

      const response = await firstValueFrom(
        this.httpService.get(`${config.url}${config.healthCheck}`, {
          timeout: 3000,
        }),
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error(`Health check failed for ${serviceName}:`, error);
      return false;
    }
  }

  private handleError(error: any, serviceName: string, endpoint: string, requestId?: string) {
    const errorMessage =
      error instanceof AxiosError ? error.response?.data?.message || error.message : String(error);

    this.logger.error(`[${requestId}] Error from ${serviceName}: ${errorMessage}`);

    if (error instanceof AxiosError) {
      throw new HttpException(
        {
          message: errorMessage,
          serviceName,
          endpoint,
          requestId,
          statusCode: error.response?.status || 500,
        },
        error.response?.status || HttpStatus.BAD_GATEWAY,
      );
    }

    throw new HttpException(
      { message: errorMessage, serviceName, endpoint, requestId },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      return status ? [408, 429, 500, 502, 503, 504].includes(status) : true;
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
