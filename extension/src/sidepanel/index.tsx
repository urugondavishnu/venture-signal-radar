import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../auth/AuthContext';
import { App } from '../popup/App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
