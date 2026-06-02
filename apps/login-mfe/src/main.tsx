import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './vite/App';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App bffBaseUrl="http://localhost:4000" />
    </BrowserRouter>
  </React.StrictMode>,
);
