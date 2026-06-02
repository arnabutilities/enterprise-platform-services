import type { ComponentType } from 'react';
import type { AuthSessionCreatedEvent, AuthSessionFailedEvent } from '../events/auth-events';

export interface LoginRemoteProps {
  bffBaseUrl: string;
  allowedOrigins?: string[];
  onAuthSuccess?: (event: AuthSessionCreatedEvent) => void;
  onAuthFailure?: (event: AuthSessionFailedEvent) => void;
}

export interface LoginRemote {
  Login: ComponentType<LoginRemoteProps>;
}

export const LoginModuleVersion = '1.0.0';
export const LoginRequiredHostVersion = '1.0.0';
