import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestValidationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const contentType = req.get('content-type');

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (!contentType && Object.keys(req.body || {}).length > 0) {
        return res.status(400).json({
          error: 'Content-Type header is required for requests with body',
          requestId: req.id,
        });
      }
    }

    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Invalid authorization format. Use: Bearer <token>',
          requestId: req.id,
        });
      }
    }

    next();
  }
}
