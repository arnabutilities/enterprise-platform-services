import { randomUUID } from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import type { AuthProvider } from '@enterprise-platform/contracts';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandomState,
  validateCodeChallenge,
} from '@enterprise-platform/security';

export interface PkceSessionRecord {
  email: string;
  provider: AuthProvider;
  codeChallenge: string;
  state: string;
}

@Injectable()
export class PkceSessionService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
  ) {}

  private get ttlMs(): number {
    const seconds = this.configService.get<number>('auth.pkceSessionTtlSeconds') ?? 600;
    return seconds * 1000;
  }

  private sessionKey(sessionId: string): string {
    return `pkce:${sessionId}`;
  }

  async createSession(
    input: Pick<PkceSessionRecord, 'email' | 'provider'> & { codeVerifier?: string },
  ): Promise<{
    sessionId: string;
    state: string;
    codeChallenge: string;
    codeVerifier: string;
  }> {
    const codeVerifier = input.codeVerifier ?? generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateRandomState();
    const sessionId = randomUUID();

    const record: PkceSessionRecord = {
      email: input.email.trim().toLowerCase(),
      provider: input.provider,
      codeChallenge,
      state,
    };

    await this.cache.set<PkceSessionRecord>(this.sessionKey(sessionId), record, this.ttlMs);

    return { sessionId, state, codeChallenge, codeVerifier };
  }

  async consumeSession(sessionId: string): Promise<PkceSessionRecord | null> {
    const key = this.sessionKey(sessionId);
    const record = await this.cache.get<PkceSessionRecord>(key);
    if (!record) {
      return null;
    }
    await this.cache.del(key);
    return record;
  }

  validateVerifier(codeVerifier: string, expectedChallenge: string): boolean {
    return validateCodeChallenge(codeVerifier, expectedChallenge);
  }
}
