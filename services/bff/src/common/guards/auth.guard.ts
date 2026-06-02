import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new ForbiddenException('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new ForbiddenException('Invalid token format');
    }

    try {
      // Token validation would be done via JWT strategy
      // This is a basic check
      return true;
    } catch (error) {
      throw new ForbiddenException('Invalid token');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext, requiredRoles?: string[]): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userRoles = (request as any).roles || [];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('User does not have required role');
    }

    return true;
  }
}
