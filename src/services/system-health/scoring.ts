import type { HealthStatus } from './types';

export function statusFromScore(score: number): HealthStatus {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
}

