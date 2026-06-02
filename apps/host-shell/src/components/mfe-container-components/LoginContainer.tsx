'use client';

import { useEffect, useMemo } from 'react';
import type { AuthSessionCreatedEvent } from '@enterprise-platform/contracts';
import { subscribeAuthEvent } from '@enterprise-platform/shared-pubsub';
import { MFEBoundary } from '@enterprise-platform/runtime';
import { MFELoader } from '@/components/MFELoader';
import { mfeRegistry } from '@/config/mfeRegistry';

const env = import.meta.env as Record<string, string | undefined>;
const bffBaseUrl = env.VITE_BFF_URL ?? 'http://localhost:4000';
const allowedOrigins = (env.VITE_ALLOWED_MESSAGE_ORIGINS ?? 'http://localhost:5003')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export function LoginContainer() {
  const remote = mfeRegistry.login;

  const loginProps = useMemo(
    () => ({
      bffBaseUrl,
      allowedOrigins,
      onAuthSuccess: (event: AuthSessionCreatedEvent) => {
        window.dispatchEvent(new CustomEvent('host.auth.success', { detail: event }));
      },
    }),
    [],
  );

  useEffect(() => {
    const subscription = subscribeAuthEvent((event) => {
      if (event.type === 'auth.session.created') {
        window.dispatchEvent(new CustomEvent('host.auth.success', { detail: event }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <MFEBoundary mfeName="login-mfe">
      <MFELoader
        scope={remote.scope}
        module={remote.module}
        remoteUrl={remote.remoteUrl}
        componentProps={loginProps}
      />
    </MFEBoundary>
  );
}
