import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StorageProvider } from './storage/StorageContext';
import './index.css';
import './styles/mobile-optimizations.css';
import './styles/mobile-touch-optimization.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StorageProvider>
      <App />
    </StorageProvider>
  </StrictMode>
);
