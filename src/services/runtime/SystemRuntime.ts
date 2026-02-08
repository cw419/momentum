import { exceptionRuleCache } from '../../utils/cache';
import {
  performanceMonitor,
  reactPerformanceMonitor,
  layoutStabilityMonitor,
  performanceLogger,
} from '../../utils/monitoring';

class SystemRuntime {
  readonly cache = {
    main: exceptionRuleCache,
    start: (): void => {
      exceptionRuleCache.start();
    },
    stop: (): void => {
      exceptionRuleCache.stop();
    },
  };

  readonly monitoring = {
    main: performanceMonitor,
    adapters: {
      reactPerformanceMonitor,
      layoutStabilityMonitor,
      performanceLogger,
    },
    start: (): void => {
      performanceMonitor.start();
    },
    stop: (): void => {
      performanceMonitor.stop();
    },
  };
}

export const systemRuntime = new SystemRuntime();
