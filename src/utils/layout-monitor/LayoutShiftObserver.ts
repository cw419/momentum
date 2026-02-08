import { isDev } from '../env';
import { logger } from '../logger';

function isLayoutShiftEntry(entry: PerformanceEntry): entry is LayoutShift {
  if (entry.entryType !== 'layout-shift') return false;
  const candidate = entry as Partial<LayoutShift>;
  return (
    typeof candidate.value === 'number' &&
    typeof candidate.hadRecentInput === 'boolean'
  );
}

type LayoutShiftHandler = (entry: LayoutShift) => void;

export class LayoutShiftObserver {
  private observer: PerformanceObserver | null = null;
  private readonly onLayoutShift: LayoutShiftHandler;

  constructor(onLayoutShift: LayoutShiftHandler) {
    this.onLayoutShift = onLayoutShift;
  }

  start(): void {
    if (typeof window === 'undefined') return;
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (isLayoutShiftEntry(entry)) {
            this.onLayoutShift(entry);
          }
        }
      });
      this.observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      if (isDev) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.warn('LAYOUT', '布局偏移监控初始化失败', undefined, err);
      }
    }
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
