import { useEffect, useState } from 'react';
import { isDev } from '../../utils/env';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';
import { forwardTimerManager } from '../../utils/forwardTimer';
import { exceptionRuleCache } from '../../utils/exceptionRuleCache';
import { ruleStateManager } from '../../services/RuleStateManager';
import { initializeRuleSystem } from '../../utils/initializeRuleSystem';
import { runMigration } from '../../utils/migration';

interface ServiceLifecycleResult {
  isInitialized: boolean;
}

/**
 * Manages global service lifecycle (start/stop) for the application.
 * Handles: forwardTimerManager, exceptionRuleCache, ruleStateManager,
 * and dev-only tools (performanceMonitor).
 */
export function useServiceLifecycle(): ServiceLifecycleResult {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);

    forwardTimerManager.start();
    exceptionRuleCache.start();
    ruleStateManager.start();

    let devCleanup: (() => void) | undefined;
    if (isDev) {
      import('../../utils/performanceMonitor').then(
        (performanceMonitorModule) => {
          performanceMonitorModule.performanceMonitor.start();
          devCleanup = () => performanceMonitorModule.performanceMonitor.stop();
        },
      );
    }

    const initializeNonCritical = () => {
      initializeRuleSystem()
        .then((result) => {
          if (!result.success) {
            logger.error(
              'SERVICE_LIFECYCLE',
              `Rule system initialization failed: ${result.message}`,
            );
          }
        })
        .catch((error) => {
          logger.error(
            'SERVICE_LIFECYCLE',
            'Rule system initialization error',
            undefined,
            toError(error),
          );
        });

      runMigration();
    };

    const requestIdleCallbackFn = window.requestIdleCallback;
    if (typeof requestIdleCallbackFn === 'function') {
      requestIdleCallbackFn(() => initializeNonCritical(), { timeout: 2000 });
    } else {
      setTimeout(initializeNonCritical, 100);
    }

    return () => {
      forwardTimerManager.stop();
      exceptionRuleCache.stop();
      ruleStateManager.stop();
      devCleanup?.();
    };
  }, []);

  return { isInitialized };
}
