import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const existingRequestId = req.headers['x-request-id'];
    const requestId = existingRequestId ? String(existingRequestId) : uuid();
    req.id = requestId;
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.debug(
        `${req.method} ${req.path} - ${res.statusCode} (${duration}ms) [${requestId}]`,
      );
    });
    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      requestId?: string;
      userId?: string;
      roles?: string[];
    }
  }
}
