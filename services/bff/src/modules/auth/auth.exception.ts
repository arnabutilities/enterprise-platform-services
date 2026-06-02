import { HttpException, HttpStatus } from '@nestjs/common';
import type { AuthErrorCode } from '@enterprise-platform/contracts';
import { getAuthErrorMessage } from '@enterprise-platform/security';

const STATUS_BY_CODE: Record<AuthErrorCode, HttpStatus> = {
  INVALID_INPUT: HttpStatus.BAD_REQUEST,
  INVALID_EMAIL: HttpStatus.BAD_REQUEST,
  USER_NOT_FOUND: HttpStatus.UNAUTHORIZED,
  USER_DISABLED: HttpStatus.FORBIDDEN,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  INVALID_PKCE_SESSION: HttpStatus.BAD_REQUEST,
  STATE_MISMATCH: HttpStatus.BAD_REQUEST,
  INVALID_TOKEN: HttpStatus.UNAUTHORIZED,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
};

export class AuthException extends HttpException {
  constructor(
    public readonly code: AuthErrorCode,
    message?: string,
    status?: HttpStatus,
    public readonly requestId?: string,
  ) {
    const resolvedStatus = status ?? STATUS_BY_CODE[code] ?? HttpStatus.BAD_REQUEST;
    const resolvedMessage = message ?? getAuthErrorMessage(code);

    super(
      {
        code,
        message: resolvedMessage,
        timestamp: new Date().toISOString(),
        requestId,
      },
      resolvedStatus,
    );
  }
}
