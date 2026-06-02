import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, theme, ThemeProvider } from '@enterprise-platform/shared-ui';
import App from './vite/App';
import './globals.css';

// Standalone dev entry. When loaded inside the host shell the federated
// `./Analytics` module is used instead and the host provides the theme.
const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
