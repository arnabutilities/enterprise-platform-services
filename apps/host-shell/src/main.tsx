import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, theme, ThemeProvider } from '@enterprise-platform/shared-ui';
import { LoginContainer } from './components/mfe-container-components/LoginContainer';

// Browser entry for the host shell. It wraps the app in the shared MUI theme
// and renders the login flow, which gates access to the federated MFEs.
function HostShellLayout() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <LoginContainer />
    </ThemeProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <HostShellLayout />
    </BrowserRouter>
  </React.StrictMode>,
);
