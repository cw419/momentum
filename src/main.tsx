import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StorageProvider } from './storage/StorageContext';
import { I18nProvider } from './i18n';
import './index.css';
import './styles/mobile-optimizations.css';
import './styles/mobile-touch-optimization.css';
import './styles/rsip-canvas.css';

// Web Vitals 性能监控
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

function reportWebVitals() {
  const logVital = (metric: { name: string; value: number; rating: string }) => {
    if (import.meta.env.DEV) {
      console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
    }
  };

  onCLS(logVital);
  onFCP(logVital);
  onLCP(logVital);
  onTTFB(logVital);
  onINP(logVital);
}

reportWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <StorageProvider>
        <App />
      </StorageProvider>
    </I18nProvider>
  </StrictMode>
);
