import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;
    const requestId = (request as any).requestId;
    const userId = (request as any).userId;

    const start = Date.now();

    this.logger.log(`[${requestId}] → ${method} ${url}${userId ? ` (user: ${userId})` : ''}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - start;
          this.logger.log(`[${requestId}] ← ${method} ${url} ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(`[${requestId}] ✗ ${method} ${url} ${duration}ms: ${error.message}`);
        },
      }),
    );
  }
}

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    response.setHeader('X-Request-ID', (request as any).requestId);

    return next.handle();
  }
}
