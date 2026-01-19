/**
 * Performance-aware logger utility that eliminates console logging in production
 * while providing detailed debugging information in development.
 */

import { isDev } from './env';
import { logger } from './logger';

function parseLogArgs(args: unknown[]): { message: string; context?: Record<string, unknown>; error?: Error } {
  if (args.length === 0) return { message: '' };

  const [first, ...rest] = args;
  const message = typeof first === 'string' ? first : 'log';
  const payload = typeof first === 'string' ? rest : args;
  const error = payload.find(a => a instanceof Error) as Error | undefined;
  const contextArgs = payload.filter(a => !(a instanceof Error));
  const context = contextArgs.length > 0 ? { args: contextArgs } : undefined;

  return { message, context, error };
}

/**
 * Performance logger that only logs in development mode
 */
export const performanceLogger = {
  /**
   * Log general information (only in development)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      const { message, context } = parseLogArgs(args);
      logger.debug('PERFORMANCE', message, context);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      const { message, context, error } = parseLogArgs(args);
      logger.warn('PERFORMANCE', message, context, error);
    }
  },

  /**
   * Log errors (always logged for critical issues)
   */
  error: (...args: unknown[]) => {
    const { message, context, error } = parseLogArgs(args);
    logger.error('PERFORMANCE', message, context, error);
  },

  /**
   * Log performance-related information with timing
   */
  perf: (label: string, fn: () => void) => {
    if (isDev) {
      const start = performance.now();
      fn();
      const end = performance.now();
      logger.performance(label, end - start);
    } else {
      fn();
    }
  },

  /**
   * Time a function execution and log the result (development only)
   */
  time: <T>(label: string, fn: () => T): T => {
    if (isDev) {
      const start = performance.now();
      const result = fn();
      logger.performance(label, performance.now() - start);
      return result;
    } else {
      return fn();
    }
  },

  /**
   * Group related logs together (development only)
   */
  group: (label: string, fn: () => void) => {
    if (isDev) {
      logger.debug('PERFORMANCE', `Group start: ${label}`);
      fn();
      logger.debug('PERFORMANCE', `Group end: ${label}`);
    } else {
      fn();
    }
  },

  /**
   * Debug-level logging for detailed troubleshooting (development only)
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      const { message, context } = parseLogArgs(args);
      logger.debug('PERFORMANCE', message, context);
    }
  },

  /**
   * Trace function calls and performance (development only)
   */
  trace: (label: string, ...args: unknown[]) => {
    if (isDev) {
      logger.debug('PERFORMANCE', `Trace: ${label}`, args.length > 0 ? { args } : undefined);
    }
  },
};
