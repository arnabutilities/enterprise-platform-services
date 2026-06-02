import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '@enterprise-platform/contracts';
import { PkceInitiateSchema } from '@enterprise-platform/security';
import { AuthException } from './auth.exception';

@Injectable()
export class UserValidationService {
  constructor(private readonly configService: ConfigService) {}

  getAllowedEmails(): string[] {
    const raw = this.configService.get<string>('auth.demoAllowedEmails') ?? '';
    return raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  assertUserCanSignIn(email: string): void {
    const parsed = PkceInitiateSchema.safeParse({
      email,
      provider: 'local',
    });

    if (!parsed.success) {
      throw new AuthException('INVALID_EMAIL');
    }

    const normalized = email.trim().toLowerCase();
    const allowed = this.getAllowedEmails();

    if (allowed.length > 0 && !allowed.includes(normalized)) {
      throw new AuthException('USER_NOT_FOUND');
    }
  }

  buildUser(email: string): AuthUser {
    const normalized = email.trim().toLowerCase();
    return {
      id: Buffer.from(normalized).toString('base64').slice(0, 12),
      email: normalized,
      name: normalized.split('@')[0],
      picture: null,
      roles: ['user'],
    };
  }
}
