import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './vite/App';
import './globals.css';

// Standalone dev entry. When loaded inside the host shell the federated
// `./Reports` module is used instead.
const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
