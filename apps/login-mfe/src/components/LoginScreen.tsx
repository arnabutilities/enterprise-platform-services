import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Visibility,
  VisibilityOff,
  Lock,
  Copyright,
  ArrowForward,
} from '@enterprise-platform/shared-ui';
import { AppScreen } from '@enterprise-platform/shared-types';

// Styled Components for precise design replication
const AppContainer = styled(Box)`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #eeeeee; /* surface-container */
`;

const StyledCard = styled(Card)`
  width: 100%;
  max-width: 448px;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  box-sizing: border-box;
  overflow: hidden;
`;

const CardBody = styled(Box)`
  padding: 0 24px 32px 24px;
`;

const FormLabel = styled.label`
  color: #414752;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
`;

interface LoginScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onSubmitCredentials?: (email: string, password: string) => Promise<void>;
}

const StepOne = ({ onLogin, onSSOLogin }: { onLogin: () => void; onSSOLogin: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // useEffect( async () => {
  //     if(loading){
  //         await fetch('/api/auth/login', {
  //             method: 'GET',
  //             credentials: 'include',
  //         });
  //     }
  // },[loading]);
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: '16px',
        py: '48px',
      }}
    >
      <StyledCard>
        {/* Card Header */}
        <Box sx={{ pt: '32px', px: '24px', pb: '16px', textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#1a1a1a', mb: 1 }}>
            Welcome to ACME Analytics
          </Typography>
          <Typography variant="body2" sx={{ color: '#5f5e5e' }}>
            Sign in to continue securely
          </Typography>
        </Box>

        <CardBody>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 3 }} id="error-alert">
              {errorMsg}
            </Alert>
          )}

          {/* Credentials Form */}
          <Box
            component="form"
            onSubmit={() => {
              /* Implement form submission if needed */
            }}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            id="loginForm"
          >
            {/* login */}
            <Box>
              <Button
                variant="contained"
                fullWidth
                disabled={loading}
                id="login-submit-button"
                startIcon={!loading && <Lock style={{ fontSize: '18px' }} />}
                sx={{
                  py: '12px',
                  backgroundColor: '#005dac',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: '#004786',
                    boxShadow: 'none',
                  },
                }}
                onClick={() => setLoading(true)}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
            </Box>

            {/* sso login */}
            <Box>
              <Button
                variant="outlined"
                fullWidth
                disabled={loading}
                id="sso-login-submit-button"
                sx={{
                  py: '12px',
                }}
                onClick={onSSOLogin}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login with SSO'}
              </Button>
            </Box>
          </Box>
        </CardBody>

        {/* Card Footer */}
        <Box
          sx={{
            bgcolor: '#f3f3f3', // surface-container-low
            px: '24px',
            py: '16px',
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          <Typography variant="body2" sx={{ color: '#5f5e5e' }}>
            New to Analytics?{' '}
            <Button
              onClick={() => {
                /* Implement navigation to signup */
              }}
              variant="text"
              sx={{
                p: 0,
                minWidth: 'auto',
                fontWeight: 500,
                color: '#005dac',
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              Create an account
            </Button>
          </Typography>
        </Box>
      </StyledCard>
    </Box>
  );
};
const StepTwo = ({ onSubmit }: { onSubmit: (email: string, password: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const handlePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.match(/^\S+@\S+\.\S+$/)) {
      setErrorMsg('Please enter a valid business email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    // Simulate enterprise secure handshake
    setTimeout(async () => {
      setLoading(false);

      await onSubmit(email, password);
    }, 1500);
  };
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: '16px',
        py: '48px',
      }}
    >
      <StyledCard>
        {/* Card Header */}
        <Box sx={{ pt: '32px', px: '24px', pb: '16px', textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#1a1a1a', mb: 1 }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" sx={{ color: '#5f5e5e' }}>
            Sign in to continue securely
          </Typography>
        </Box>

        <CardBody>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 3 }} id="error-alert">
              {errorMsg}
            </Alert>
          )}

          {/* Credentials Form */}
          <Box
            component="form"
            onSubmit={handleCredentialsSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            id="loginForm"
          >
            {/* Email Address */}
            <Box>
              <FormLabel htmlFor="email-input">Email Address</FormLabel>
              <TextField
                id="email-input"
                placeholder="name@company.com"
                type="email"
                fullWidth
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </Box>

            {/* Password */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <FormLabel htmlFor="password-input">Password</FormLabel>
                <Button
                  variant="text"
                  onClick={() => {
                    /* Implement forgot password flow */
                  }}
                  disabled={loading}
                  sx={{
                    p: 0,
                    minWidth: 'auto',
                    fontSize: '12px',
                    color: '#005dac',
                    fontWeight: 500,
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot?
                </Button>
              </Box>
              <TextField
                id="password-input"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handlePasswordVisibility}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Submit Button */}
            <Button
              variant="contained"
              type="submit"
              fullWidth
              disabled={loading}
              id="login-submit-button"
              endIcon={!loading && <ArrowForward style={{ fontSize: '18px' }} />}
              sx={{
                py: '12px',
                backgroundColor: '#005dac',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '8px',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#004786',
                  boxShadow: 'none',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
            </Button>
          </Box>
        </CardBody>

        {/* Card Footer */}
        <Box
          sx={{
            bgcolor: '#f3f3f3', // surface-container-low
            px: '24px',
            py: '16px',
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          <Typography variant="body2" sx={{ color: '#5f5e5e' }}>
            New to Analytics?{' '}
            <Button
              onClick={() => {
                /* Implement navigation to signup */
              }}
              variant="text"
              sx={{
                p: 0,
                minWidth: 'auto',
                fontWeight: 500,
                color: '#005dac',
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              Create an account
            </Button>
          </Typography>
        </Box>
      </StyledCard>
    </Box>
  );
};

export default function LoginScreen({ onNavigate, onSubmitCredentials }: LoginScreenProps) {
  const [step, setStep] = useState<React.JSX.Element | null>(null);

  useEffect(() => {
    if (!step) {
      setStep(
        <StepOne
          onLogin={() => setStep(<StepTwo onSubmit={onSubmitCredentials!} />)}
          onSSOLogin={() => {
            /* Implement SSO login flow */
          }}
        />,
      );
    }
  }, []);

  return (
    <AppContainer>
      {step}

      <Copyright />
    </AppContainer>
  );
}
