import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import type { AuthResponse, AuthUser } from '@enterprise-platform/contracts';
import {
  recordLoginFailure,
  recordPkceExchange,
  recordPkceInitiate,
} from '@enterprise-platform/observability';
import { ExchangePkceDto } from './dto/exchange-pkce.dto';
import { InitiatePkceDto } from './dto/initiate-pkce.dto';
import { AuthException } from './auth.exception';
import { PkceSessionService } from './pkce-session.service';
import { UserValidationService } from './user-validation.service';

interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

interface RefreshTokenPayload extends AccessTokenPayload {
  type: 'refresh';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly pkceSessionService: PkceSessionService,
    private readonly userValidationService: UserValidationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async initiatePkce(dto: InitiatePkceDto) {
    try {
      this.userValidationService.assertUserCanSignIn(dto.email);
      const session = await this.pkceSessionService.createSession({
        email: dto.email,
        provider: dto.provider,
        codeVerifier: dto.codeVerifier,
      });

      recordPkceInitiate();
      this.logger.log(`PKCE initiated for provider=${dto.provider}`);

      return {
        sessionId: session.sessionId,
        provider: dto.provider,
        state: session.state,
        codeChallenge: session.codeChallenge,
        codeVerifier: session.codeVerifier,
      };
    } catch (error) {
      if (error instanceof AuthException) {
        recordLoginFailure(error.code);
      }
      throw error;
    }
  }

  async exchangePkce(dto: ExchangePkceDto): Promise<AuthResponse> {
    try {
      const session = await this.pkceSessionService.consumeSession(dto.sessionId);

      if (!session) {
        recordPkceExchange('failure');
        recordLoginFailure('INVALID_PKCE_SESSION');
        throw new AuthException('INVALID_PKCE_SESSION');
      }

      if (session.state !== dto.state) {
        recordPkceExchange('failure');
        recordLoginFailure('STATE_MISMATCH');
        throw new AuthException('STATE_MISMATCH');
      }

      if (!this.pkceSessionService.validateVerifier(dto.codeVerifier, session.codeChallenge)) {
        recordPkceExchange('failure');
        recordLoginFailure('INVALID_PKCE_SESSION');
        throw new AuthException('INVALID_PKCE_SESSION');
      }

      if (session.provider !== 'local' && !dto.code) {
        throw new AuthException(
          'INVALID_INPUT',
          'Authorization code is required for external providers.',
        );
      }

      this.userValidationService.assertUserCanSignIn(session.email);
      const user = this.userValidationService.buildUser(session.email);
      const tokens = await this.createAuthResponse(user);

      recordPkceExchange('success');
      this.logger.log(`PKCE exchange succeeded for user=${user.id}`);

      return tokens;
    } catch (error) {
      if (error instanceof AuthException) {
        recordLoginFailure(error.code);
      }
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.validateRefreshToken(refreshToken);
    if (!payload) {
      recordLoginFailure('INVALID_TOKEN');
      throw new AuthException('INVALID_TOKEN');
    }

    const user = this.userValidationService.buildUser(payload.email);
    await this.revokeRefreshToken(refreshToken);
    return this.createAuthResponse(user);
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    await this.revokeRefreshToken(refreshToken);
    return { success: true };
  }

  async getUserFromAccessToken(token: string): Promise<AuthUser | null> {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      return this.userValidationService.buildUser(payload.email);
    } catch {
      return null;
    }
  }

  private async createAuthResponse(user: AuthUser): Promise<AuthResponse> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private signAccessToken(user: AuthUser): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('jwt.expiresIn') ?? '1h') as
        | `${number}m`
        | `${number}h`
        | `${number}d`,
    });
  }

  private async signRefreshToken(user: AuthUser): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      type: 'refresh',
    };

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d') as
        | `${number}m`
        | `${number}h`
        | `${number}d`,
    });

    const ttlMs = this.parseDurationMs(
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d',
    );

    await this.cache.set(`refresh:${refreshToken}`, payload, ttlMs);
    return refreshToken;
  }

  private async validateRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token);
      if (payload.type !== 'refresh') {
        return null;
      }

      const stored = await this.cache.get<RefreshTokenPayload>(`refresh:${token}`);
      if (!stored) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    await this.cache.del(`refresh:${token}`);
  }

  private parseDurationMs(value: string): number {
    const amount = Number(value.slice(0, -1));
    if (Number.isNaN(amount)) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    if (value.endsWith('h')) {
      return amount * 60 * 60 * 1000;
    }
    if (value.endsWith('d')) {
      return amount * 24 * 60 * 60 * 1000;
    }
    return Number(value) || 0;
  }
}
