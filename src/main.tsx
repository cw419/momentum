import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StorageProvider } from './storage/StorageContext';
import { I18nProvider } from './i18n';
import './index.css';
import './styles/mobile-optimizations.css';
import './styles/mobile-touch-optimization.css';
import './styles/rsip-canvas.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <StorageProvider>
        <App />
      </StorageProvider>
    </I18nProvider>
  </StrictMode>
);
