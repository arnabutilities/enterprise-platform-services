import type { AuthErrorCode } from '@enterprise-platform/contracts';

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_INPUT: 'Please check email and provider.',
  INVALID_EMAIL: 'Enter a valid email address.',
  USER_NOT_FOUND: 'No account found for this email.',
  USER_DISABLED: 'This account has been disabled.',
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  INVALID_PKCE_SESSION: 'Your sign-in session expired. Please try again.',
  STATE_MISMATCH: 'Sign-in could not be verified. Please try again.',
  INVALID_TOKEN: 'Session expired. Please sign in again.',
  RATE_LIMITED: 'Too many attempts. Try again later.',
  UNAUTHORIZED: 'Missing or invalid authorization.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again.',
};

export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.SERVER_ERROR;
}
