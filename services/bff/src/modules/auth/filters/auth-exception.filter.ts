import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthException } from '../auth.exception';

@Catch(AuthException)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(exception: AuthException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as Request & { requestId?: string }).requestId;
    const body = exception.getResponse() as Record<string, unknown>;

    this.logger.warn(`[${requestId ?? 'unknown'}] Auth error: ${exception.code} - ${body.message}`);

    response.status(exception.getStatus()).json({
      ...body,
      requestId: requestId ?? body.requestId,
      path: request.url,
    });
  }
}

@Catch(HttpException)
export class AuthHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const requestId = (request as Request & { requestId?: string }).requestId;
    const exceptionResponse = exception.getResponse();

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'code' in exceptionResponse
    ) {
      response.status(status).json({
        ...exceptionResponse,
        requestId,
        path: request.url,
      });
      return;
    }

    response.status(status).json({
      code: status === HttpStatus.UNAUTHORIZED ? 'UNAUTHORIZED' : 'INVALID_INPUT',
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ?? exception.message),
      timestamp: new Date().toISOString(),
      requestId,
      path: request.url,
    });
  }
}
