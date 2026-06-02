import { z } from 'zod';

export const AuthProviderSchema = z.enum(['local', 'keycloak']);

export const PkceInitiateSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  provider: AuthProviderSchema,
  codeVerifier: z.string().min(43).max(128).optional(),
});

export const PkceExchangeSchema = z.object({
  sessionId: z.string().uuid(),
  state: z.string().min(1),
  codeVerifier: z.string().min(43).max(128),
  code: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export type PkceInitiateInput = z.infer<typeof PkceInitiateSchema>;
export type PkceExchangeInput = z.infer<typeof PkceExchangeSchema>;
