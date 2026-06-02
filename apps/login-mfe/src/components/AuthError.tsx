import { Alert, Typography } from '@enterprise-platform/shared-ui';

interface AuthErrorProps {
  message: string | null;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <Alert severity="error" sx={{ mt: 2 }}>
      <Typography variant="body2">{message}</Typography>
    </Alert>
  );
}
