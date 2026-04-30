import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1e2e',
            color: '#e2e8f0',
            border: '1px solid #2a2a3d',
            borderRadius: '12px'
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#1e1e2e' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1e1e2e' } }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
