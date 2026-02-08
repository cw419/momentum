import { useEffect, useState } from 'react';
import { isDev } from '../../utils/env';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';
import { forwardTimerManager } from '../../utils/forwardTimer';
import { ruleStateManager } from '../../services/RuleStateManager';
import { migrationCoordinator } from '../../services/migration';
import { systemRuntime } from '../../services/runtime';
import { initializeRuleSystem } from '../../utils/initializeRuleSystem';

interface ServiceLifecycleResult {
  isInitialized: boolean;
}

/**
 * Manages global service lifecycle (start/stop) for the application.
 * Handles: forwardTimerManager, cache runtime, ruleStateManager,
 * and dev-only monitoring runtime.
 */
export function useServiceLifecycle(): ServiceLifecycleResult {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);

    forwardTimerManager.start();
    systemRuntime.cache.start();
    ruleStateManager.start();

    let devCleanup: (() => void) | undefined;
    if (isDev) {
      systemRuntime.monitoring.start();
      devCleanup = () => systemRuntime.monitoring.stop();
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

      void migrationCoordinator.runStartupMigrations();
    };

    const requestIdleCallbackFn = window.requestIdleCallback;
    if (typeof requestIdleCallbackFn === 'function') {
      requestIdleCallbackFn(() => initializeNonCritical(), { timeout: 2000 });
    } else {
      setTimeout(initializeNonCritical, 100);
    }

    return () => {
      forwardTimerManager.stop();
      systemRuntime.cache.stop();
      ruleStateManager.stop();
      devCleanup?.();
    };
  }, []);

  return { isInitialized };
}
