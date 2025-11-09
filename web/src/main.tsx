import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { refreshCsrfToken } from './lib/api';
import { initNetworkInterceptor } from './lib/networkInterceptor';

// Initialize network interceptor (only in development)
if (import.meta.env.DEV) {
  initNetworkInterceptor({
    maxEntries: 100,
    enabled: true,
  });
}

// Initialize CSRF token on app startup
refreshCsrfToken().catch((error) => {
  console.error('Failed to initialize CSRF token:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

