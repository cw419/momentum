import { exceptionRuleCache } from '../../utils/exceptionRuleCache';
import type { RuleValidationResult } from './types';

const NAMESPACE = 'validation' as const;

const VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟缓存

export function getCachedPreValidation(cacheKey: string): RuleValidationResult | null {
  return exceptionRuleCache.getNamespaced<RuleValidationResult>(NAMESPACE, cacheKey);
}

export function setCachedPreValidation(cacheKey: string, value: RuleValidationResult): void {
  exceptionRuleCache.setNamespaced(NAMESPACE, cacheKey, value, VALIDATION_CACHE_TTL_MS);
}

export function clearValidationCache(): void {
  exceptionRuleCache.invalidateNamespace(NAMESPACE);
}

export function cleanupExpiredCache(): void {
  exceptionRuleCache.clearExpired();
}
