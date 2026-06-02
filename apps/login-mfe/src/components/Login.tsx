import React from 'react';
import type { LoginRemoteProps } from '@enterprise-platform/contracts';
import { AuthError } from '@/components/AuthError';
import { usePkceLogin } from '@/hooks/usePkceLogin';
import LoginScreen from './LoginScreen';
import { AppScreen, UserSession } from '@enterprise-platform/shared-types/src/Login';

const defaultBffUrl =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_BFF_URL ??
  'http://localhost:4000';

export function Login({
  bffBaseUrl = defaultBffUrl,
  allowedOrigins,
  onAuthSuccess,
  onAuthFailure,
}: Partial<LoginRemoteProps>) {
  const { email, setEmail, loading, error, signIn } = usePkceLogin({
    bffBaseUrl,
    provider:
      ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_OAUTH_PROVIDER as
        | 'local'
        | 'keycloak'
        | undefined) ?? 'local',
    allowedOrigins,
    onAuthSuccess,
    onAuthFailure,
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void signIn();
  };

  console.log('Login component rendered with props:', {
    bffBaseUrl,
    allowedOrigins,
    email,
    loading,
    error,
    handleSubmit: handleSubmit.toString(),
    setEmail: setEmail.toString(),
  });

  return (
    <LoginScreen
      onSubmitCredentials={async (email, password) => {
        // Implementation for submitting credentials
      }}
      onNavigate={() => {}}
    />
  );
}

export default Login;
