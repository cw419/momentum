import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StorageProvider } from './storage/StorageContext';
import { I18nProvider } from './i18n';
import './index.css';
import './styles/mobile-optimizations.css';
import './styles/mobile-touch-optimization.css';
import './styles/rsip-canvas.css';

// Web Vitals 性能监控
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import type { Metric } from 'web-vitals';
import { logger } from './utils/logger';

function reportWebVitals() {
  if (!import.meta.env.DEV) return;

  const logVital = (metric: Metric) => {
    logger.debug('WEB_VITALS', metric.name, {
      value: Number(metric.value.toFixed(2)),
      rating: metric.rating,
    });
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
  </StrictMode>,
);
